require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security check for JWT secret in production
if (NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretmvpkey123!' || process.env.JWT_SECRET.trim() === '') {
    console.error('FATAL SECURITY ERROR: JWT_SECRET is not configured or uses default value in production!');
    process.exit(1);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretmvpkey123!';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Rate Limiter Configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  message: { error: 'För många anrop från denna IP-adress, försök igen senare.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login attempts per 15 minutes
  message: { error: 'För många inloggningsförsök, försök igen om 15 minuter.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json());
app.use(generalLimiter);
app.use(sanitizeInput);

// Specific rate limiters for sensitive endpoints
app.use('/api/auth/login', loginLimiter);

app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

// XSS Sanitering & Indatavalidering Middleware (OWASP Secure Coding Guideline)
function sanitizeInput(req, res, next) {
  const clean = (val) => {
    if (typeof val === 'string') {
      return val
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+="[^"]*"/g, '')
        .replace(/on\w+='[^']*'/g, '')
        .trim();
    } else if (Array.isArray(val)) {
      return val.map(clean);
    } else if (typeof val === 'object' && val !== null) {
      const sanitizedObj = {};
      for (const key in val) {
        if (Object.prototype.hasOwnProperty.call(val, key)) {
          sanitizedObj[key] = clean(val[key]);
        }
      }
      return sanitizedObj;
    }
    return val;
  };

  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  next();
}

function validateFields(req, res, next) {
  const { email, personal_number, phone, compensation_sum, bank_account } = req.body;

  // 1. E-postvalidering
  if (email && email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Ogiltigt e-postformat.' });
    }
  }

  // 2. Personnummervalidering (Svenskt personnummer: YYYYMMDD-XXXX, YYMMDD-XXXX eller GDPR-maskerad XXXXXX-XXXX)
  if (personal_number && personal_number.trim() !== '') {
    const pnrRegex = /^(?:(?:19|20)?\d{6}[-+]?\d{4}|XXXXXX-XXXX)$/;
    if (!pnrRegex.test(personal_number)) {
      return res.status(400).json({ error: 'Ogiltigt personnummer. Formatet ska vara ÅÅÅÅMMDD-XXXX eller ÅÅMMDD-XXXX.' });
    }
  }

  // 3. Telefonnummervalidering
  if (phone && phone.trim() !== '') {
    const phoneRegex = /^[\d\s\-+()]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Ogiltigt telefonnummer.' });
    }
  }

  // 4. Ersättningsbeloppsvalidering
  if (compensation_sum !== undefined && compensation_sum !== null && compensation_sum !== '') {
    const sum = Number(compensation_sum);
    if (isNaN(sum) || sum < 0) {
      return res.status(400).json({ error: 'Ersättningsbeloppet måste vara ett positivt tal.' });
    }
  }

  // 5. Bankkontovalidering (säkerställ att det inte innehåller skadliga tecken, endast siffror, bokstäver, bindestreck, kommatecken, mellanslag)
  if (bank_account && bank_account.trim() !== '') {
    const bankRegex = /^[a-zA-Z0-9\s\-–,.:()]+$/;
    if (!bankRegex.test(bank_account)) {
      return res.status(400).json({ error: 'Ogiltigt bankkontoformat.' });
    }
  }

  next();
}

// Konfigurera Multer för filuppladdningar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'documents';
    if (req.path.includes('/logo')) {
      subfolder = 'logos';
    }
    const destDir = path.join(__dirname, UPLOAD_DIR, subfolder);
    fs.mkdirSync(destDir, { recursive: true });
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ----------------------------------------------------
// AUTH MIDDLEWARE
// ----------------------------------------------------
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Om ingen token finns i headern, sök i query-parametrar (t.ex. vid filnedladdning)
  if (!token && req.query.authorization) {
    const queryAuth = req.query.authorization;
    token = queryAuth && queryAuth.split(' ')[1];
  }
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Behörighet saknas (token saknas).' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Ogiltig eller utgången token.' });
    }
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// AUTH API
// ----------------------------------------------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Ange användarnamn och lösenord.' });
  }

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Fel användarnamn eller lösenord.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Hämta alla användare (för tilldelning)
app.get('/api/users', authenticateToken, (req, res) => {
  db.all("SELECT id, username, role FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta användare.' });
    res.json(rows);
  });
});

// ----------------------------------------------------
// STATISTIK & DASHBOARD API
// ----------------------------------------------------
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    const totalProjects = await new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM projects", [], (err, row) => resolve(row ? row.count : 0));
    });

    const activeProjects = await new Promise((resolve) => {
      db.get("SELECT COUNT(*) as count FROM projects WHERE status = 'active'", [], (err, row) => resolve(row ? row.count : 0));
    });

    // Dokument som ska skickas (requires_shipping = 1) och tillhör markägare som inte är klara/skickade
    const overdue = await new Promise((resolve) => {
      const query = `
        SELECT COUNT(*) as count FROM documents d
        JOIN landowners l ON d.landowner_id = l.id
        WHERE d.requires_shipping = 1 
          AND d.target_send_date < ?
          AND l.status IN ('draft', 'processing')
      `;
      db.get(query, [today], (err, row) => resolve(row ? row.count : 0));
    });

    const approaching = await new Promise((resolve) => {
      const query = `
        SELECT COUNT(*) as count FROM documents d
        JOIN landowners l ON d.landowner_id = l.id
        WHERE d.requires_shipping = 1 
          AND d.target_send_date >= ?
          AND d.target_send_date <= ?
          AND l.status IN ('draft', 'processing')
      `;
      db.get(query, [today, inThreeDays], (err, row) => resolve(row ? row.count : 0));
    });

    const onTime = await new Promise((resolve) => {
      const query = `
        SELECT COUNT(*) as count FROM documents d
        JOIN landowners l ON d.landowner_id = l.id
        WHERE d.requires_shipping = 1 
          AND (d.target_send_date > ? OR d.target_send_date IS NULL OR d.target_send_date = '')
          AND l.status IN ('draft', 'processing')
      `;
      db.get(query, [inThreeDays], (err, row) => resolve(row ? row.count : 0));
    });

    res.json({
      total_projects: totalProjects,
      active_projects: activeProjects,
      overdue,
      approaching,
      on_time: onTime
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kunde inte beräkna statistik.' });
  }
});

// ----------------------------------------------------
// PROJEKT API
// ----------------------------------------------------
app.get('/api/projects', authenticateToken, (req, res) => {
  const query = `
    SELECT p.*,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id) as total_landowners,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status IN ('signed', 'paid', 'easement', 'delivered', 'archived')) as signed_landowners,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'draft') as draft_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'queued') as queued_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'posted') as posted_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'received') as received_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'signed') as signed_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'paid') as paid_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'easement') as easement_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'delivered') as delivered_count,
      (SELECT COUNT(*) FROM landowners WHERE project_id = p.id AND status = 'archived') as archived_count
    FROM projects p
    ORDER BY p.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta projekt.' });
    res.json(rows);
  });
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
  db.get("SELECT * FROM projects WHERE id = ?", [req.params.id], (err, project) => {
    if (err || !project) return res.status(404).json({ error: 'Projektet hittades inte.' });
    res.json(project);
  });
});

function seedProjectData(projectId, callback) {
  const landowners = [
    {
      name: 'Anna Karlsson',
      personal_number: '19740312-1122',
      address: 'Strandvägen 12, 263 75 Mölle',
      email: 'anna.karlsson@gmail.com',
      phone: '070-123 45 67',
      bank_account: 'Swedbank 8327-9, 943 122 344-5',
      status: 'draft',
      compensation: 8400,
      properties: [
        { designation: 'Höganäs 4:21', area: 1200, latitude: 56.2625, longitude: 12.5642 }
      ]
    },
    {
      name: 'Erik Karlsson',
      personal_number: '19710824-3344',
      address: 'Strandvägen 12, 263 75 Mölle',
      email: 'erik.karlsson@gmail.com',
      phone: '070-987 65 43',
      bank_account: 'Nordea 3300, 4123984',
      status: 'draft',
      compensation: 8400,
      properties: [
        { designation: 'Höganäs 4:21', area: 1200, latitude: 56.2625, longitude: 12.5642 }
      ]
    },
    {
      name: 'Bo Lindqvist',
      personal_number: '19621105-4433',
      address: 'Möllevägen 4, 263 77 Mölle',
      email: 'bo.lindqvist@hotmail.com',
      phone: '073-555 12 34',
      bank_account: 'SEB 5000, 1029384',
      status: 'draft',
      compensation: 12500,
      properties: [
        { designation: 'Mölle 2:55', area: 2500, latitude: 56.2845, longitude: 12.5321 }
      ]
    },
    {
      name: 'Cecilia Andersson',
      personal_number: '19850918-7788',
      address: 'Viksvägen 88, 263 62 Viken',
      email: 'cecilia.a@outlook.com',
      phone: '076-444 88 99',
      bank_account: 'Handelsbanken 6102, 555 666 777',
      status: 'draft',
      compensation: 6200,
      properties: [
        { designation: 'Viken 1:15', area: 850, latitude: 56.1422, longitude: 12.5841 }
      ]
    }
  ];

  let insertedCount = 0;
  if (landowners.length === 0) {
    return callback();
  }

  landowners.forEach((lo) => {
    const loQuery = `
      INSERT INTO landowners (project_id, name, personal_number, address, email, phone, bank_account, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(loQuery, [projectId, lo.name, lo.personal_number, lo.address, lo.email, lo.phone, lo.bank_account, lo.status], function(err) {
      if (err) {
        console.error('Error seeding landowner:', err);
        return;
      }
      const loId = this.lastID;
      
      // Spara värdering
      db.run("INSERT INTO land_valuations (landowner_id, valuation_text, compensation_sum) VALUES (?, 'Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.', ?)", [loId, lo.compensation]);
      
      // Spara fastigheter
      lo.properties.forEach((prop) => {
        db.run("INSERT INTO properties (landowner_id, designation, area, latitude, longitude) VALUES (?, ?, ?, ?, ?)", 
          [loId, prop.designation, prop.area, prop.latitude, prop.longitude]
        );
      });

      // Spara standarddokument
      const docs = [
        { name: 'Markägarkarta', doc_type: 'map', sort_order: 1 },
        { name: 'Avtalsblankett', doc_type: 'agreement', sort_order: 2 },
        { name: 'Värderingsprotokoll', doc_type: 'valuation', sort_order: 3 }
      ];

      docs.forEach((doc) => {
        db.run(`
          INSERT INTO documents (project_id, landowner_id, name, file_path, doc_type, sort_order, requires_shipping, target_send_date, property_designation)
          VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
        `, [
          projectId, 
          loId, 
          doc.name, 
          `/uploads/documents/mock-${doc.doc_type}.pdf`, 
          doc.doc_type, 
          doc.sort_order, 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          lo.properties[0].designation
        ]);
      });

      insertedCount++;
      if (insertedCount === landowners.length) {
        callback();
      }
    });
  });
}

async function ensureMockPdfFiles() {
  const docsDir = path.join(__dirname, UPLOAD_DIR, 'documents');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  const mockFiles = ['mock-map.pdf', 'mock-agreement.pdf', 'mock-valuation.pdf'];
  for (const filename of mockFiles) {
    const filePath = path.join(docsDir, filename);
    if (!fs.existsSync(filePath)) {
      try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.276, 841.890]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        page.drawText(`MOCK DOKUMENT: ${filename.replace('mock-', '').replace('.pdf', '').toUpperCase()}`, {
          x: 50, y: 700, size: 20, font
        });
        page.drawText("Detta ar ett automatiskt genererat testdokument for markagarplattformen.", {
          x: 50, y: 650, size: 12, font
        });
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(filePath, pdfBytes);
        console.log(`Created mock PDF: ${filePath}`);
      } catch (err) {
        console.error(`Kunde inte skapa mock-pdf ${filename}:`, err);
      }
    }
  }
}

app.post('/api/projects', authenticateToken, (req, res) => {
  const { name, project_type, center_latitude, center_longitude, zoom_level, seed } = req.body;
  if (!name || !project_type) {
    return res.status(400).json({ error: 'Projektnamn och typ krävs.' });
  }

  const query = `
    INSERT INTO projects (name, project_type, status, center_latitude, center_longitude, zoom_level)
    VALUES (?, ?, 'active', ?, ?, ?)
  `;
  db.run(query, [name, project_type, center_latitude || 59.3293, center_longitude || 18.0686, zoom_level || 12], function(err) {
    if (err) return res.status(500).json({ error: 'Kunde inte skapa projektet.' });
    
    const projectId = this.lastID;
    db.run("INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)", [projectId, req.user.id], () => {
      if (seed) {
        seedProjectData(projectId, () => {
          res.status(201).json({ id: projectId, name, project_type, seeded: true });
        });
      } else {
        res.status(201).json({ id: projectId, name, project_type, seeded: false });
      }
    });
  });
});

// Ladda upp projektlogotyp
app.post('/api/projects/:id/logo', authenticateToken, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen fil uppladdad.' });
  
  const logoPath = `/uploads/logos/${req.file.filename}`;
  db.run("UPDATE projects SET logo_path = ? WHERE id = ?", [logoPath, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte spara logotypsökväg.' });
    res.json({ logo_path: logoPath });
  });
});

// Hämta och uppdatera samarbetspartners/beredare på projektet
app.get('/api/projects/:id/collaborators', authenticateToken, (req, res) => {
  const query = `
    SELECT u.id, u.username, u.role FROM users u
    JOIN project_assignments pa ON u.id = pa.user_id
    WHERE pa.project_id = ?
  `;
  db.all(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta medarbetare.' });
    res.json(rows);
  });
});

app.post('/api/projects/:id/collaborators', authenticateToken, (req, res) => {
  const { user_id } = req.body;
  db.run("INSERT INTO project_assignments (project_id, user_id) VALUES (?, ?)", [req.params.id, user_id], (err) => {
    if (err) return res.status(400).json({ error: 'Användaren är redan tilldelad eller felaktigt ID.' });
    res.status(201).json({ message: 'Beredare tillagd på projektet.' });
  });
});

app.delete('/api/projects/:id/collaborators/:userId', authenticateToken, (req, res) => {
  db.run("DELETE FROM project_assignments WHERE project_id = ? AND user_id = ?", [req.params.id, req.params.userId], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte ta bort medarbetare.' });
    res.json({ message: 'Beredare borttagen från projektet.' });
  });
});

// ----------------------------------------------------
// MARKÄGARE & FASTIGHET API
// ----------------------------------------------------
app.get('/api/projects/:projectId/landowners', authenticateToken, (req, res) => {
  const query = `
    SELECT l.*, 
      (SELECT GROUP_CONCAT(designation, ', ') FROM properties WHERE landowner_id = l.id) as properties_list,
      (SELECT compensation_sum FROM land_valuations WHERE landowner_id = l.id) as compensation_sum
    FROM landowners l
    WHERE l.project_id = ?
  `;
  db.all(query, [req.params.projectId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta markägare.' });
    res.json(rows);
  });
});

app.get('/api/landowners/:id', authenticateToken, (req, res) => {
  const landownerQuery = "SELECT * FROM landowners WHERE id = ?";
  db.get(landownerQuery, [req.params.id], (err, landowner) => {
    if (err || !landowner) return res.status(404).json({ error: 'Markägare hittades inte.' });

    db.all("SELECT * FROM properties WHERE landowner_id = ?", [landowner.id], (err, properties) => {
      db.get("SELECT * FROM land_valuations WHERE landowner_id = ?", [landowner.id], (err, valuation) => {
        db.all("SELECT * FROM shipments WHERE landowner_id = ? ORDER BY created_at DESC", [landowner.id], (err, shipments) => {
          res.json({
            ...landowner,
            properties: properties || [],
            valuation: valuation || { valuation_text: '', compensation_sum: 0, file_path: null },
            shipments: shipments || []
          });
        });
      });
    });
  });
});

app.post('/api/projects/:projectId/landowners', authenticateToken, validateFields, (req, res) => {
  const { name, personal_number, address, email, phone, bank_account } = req.body;
  if (!name) return res.status(400).json({ error: 'Namn krävs.' });

  const query = `
    INSERT INTO landowners (project_id, name, personal_number, address, email, phone, bank_account, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')
  `;
  db.run(query, [req.params.projectId, name, personal_number, address, email, phone, bank_account], function(err) {
    if (err) return res.status(500).json({ error: 'Kunde inte lägga till markägare.' });
    const landownerId = this.lastID;
    
    // Initiera en tom markvärderingsrad
    db.run("INSERT INTO land_valuations (landowner_id, valuation_text, compensation_sum) VALUES (?, '', 0)", [landownerId], () => {
      res.status(201).json({ id: landownerId, name, status: 'draft' });
    });
  });
});

app.put('/api/landowners/:id', authenticateToken, validateFields, (req, res) => {
  const { name, personal_number, address, email, phone, bank_account, status } = req.body;
  const query = `
    UPDATE landowners
    SET name = ?, personal_number = ?, address = ?, email = ?, phone = ?, bank_account = ?, status = ?
    WHERE id = ?
  `;
  db.run(query, [name, personal_number, address, email, phone, bank_account, status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte uppdatera markägare.' });
    res.json({ message: 'Markägare uppdaterad.' });
  });
});

app.delete('/api/landowners/:id', authenticateToken, (req, res) => {
  db.run("DELETE FROM landowners WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte ta bort markägare.' });
    res.json({ message: 'Markägare raderad.' });
  });
});

// Fastigheter kopplade till markägare
app.post('/api/landowners/:id/properties', authenticateToken, (req, res) => {
  const { designation, area, latitude, longitude } = req.body;
  if (!designation) return res.status(400).json({ error: 'Fastighetsbeteckning krävs.' });

  const query = "INSERT INTO properties (landowner_id, designation, area, latitude, longitude) VALUES (?, ?, ?, ?, ?)";
  db.run(query, [req.params.id, designation, area, latitude, longitude], function(err) {
    if (err) return res.status(500).json({ error: 'Kunde inte spara fastighet.' });
    res.status(201).json({ id: this.lastID, designation, area, latitude, longitude });
  });
});

app.delete('/api/properties/:id', authenticateToken, (req, res) => {
  db.run("DELETE FROM properties WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte ta bort fastighet.' });
    res.json({ message: 'Fastighet raderad.' });
  });
});

// ----------------------------------------------------
// MARKVÄRDERING API
// ----------------------------------------------------
app.get('/api/landowners/:id/valuation', authenticateToken, (req, res) => {
  db.get("SELECT * FROM land_valuations WHERE landowner_id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta markvärdering.' });
    if (!row) {
      db.run("INSERT INTO land_valuations (landowner_id, valuation_text, compensation_sum) VALUES (?, '', 0)", [req.params.id], () => {
        res.json({ valuation_text: '', compensation_sum: 0, file_path: null });
      });
    } else {
      res.json(row);
    }
  });
});

app.put('/api/landowners/:id/valuation', authenticateToken, validateFields, (req, res) => {
  const { valuation_text, compensation_sum } = req.body;
  const query = `
    UPDATE land_valuations
    SET valuation_text = ?, compensation_sum = ?, updated_at = CURRENT_TIMESTAMP
    WHERE landowner_id = ?
  `;
  db.run(query, [valuation_text, compensation_sum, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte uppdatera markvärdering.' });
    res.json({ message: 'Markvärdering uppdaterad.' });
  });
});

app.post('/api/landowners/:id/valuation/file', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen fil uppladdad.' });
  const filePath = `/uploads/documents/${req.file.filename}`;
  db.run("UPDATE land_valuations SET file_path = ? WHERE landowner_id = ?", [filePath, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte spara värderingsfil.' });
    res.json({ file_path: filePath });
  });
});

// Spara ledningssträckning för projekt
app.put('/api/projects/:id/route', authenticateToken, (req, res) => {
  const { route_coordinates } = req.body;
  db.run("UPDATE projects SET route_coordinates = ? WHERE id = ?", [route_coordinates, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte spara ledningssträckning.' });
    res.json({ message: 'Ledningssträckning sparad.' });
  });
});

// Hämta kommunikationsloggar för markägare
app.get('/api/landowners/:id/communication-logs', authenticateToken, (req, res) => {
  db.all("SELECT * FROM communication_logs WHERE landowner_id = ? ORDER BY logged_at DESC", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta kommunikationsloggar.' });
    res.json(rows);
  });
});

// Lägg till kommunikationslogg för markägare
app.post('/api/landowners/:id/communication-logs', authenticateToken, (req, res) => {
  const { log_type, summary, description } = req.body;
  if (!log_type || !summary) {
    return res.status(400).json({ error: 'Typ och sammanfattning krävs.' });
  }
  const query = `
    INSERT INTO communication_logs (landowner_id, log_type, summary, description, user_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  db.run(query, [req.params.id, log_type, summary, description || '', req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Kunde inte skapa kommunikationslogg.' });
    res.status(201).json({ id: this.lastID, log_type, summary, description, logged_at: new Date().toISOString() });
  });
});

// Spara EBR kalkylvärde
app.put('/api/landowners/:id/valuation-calculator', authenticateToken, validateFields, (req, res) => {
  const { calculator_data, compensation_sum } = req.body;
  const query = `
    UPDATE land_valuations
    SET calculator_data = ?, compensation_sum = ?, updated_at = CURRENT_TIMESTAMP
    WHERE landowner_id = ?
  `;
  db.run(query, [JSON.stringify(calculator_data), compensation_sum, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte spara värderingskalkyl.' });
    res.json({ message: 'Värderingskalkyl sparad.', compensation_sum });
  });
});

// ----------------------------------------------------
// DOKUMENT API
// ----------------------------------------------------
// Hämta enbart projektspecifika dokument (gemensamma)
app.get('/api/projects/:projectId/documents', authenticateToken, (req, res) => {
  db.all("SELECT * FROM documents WHERE project_id = ? AND landowner_id IS NULL ORDER BY sort_order ASC, created_at ASC", [req.params.projectId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta projektdokument.' });
    res.json(rows);
  });
});

app.post('/api/projects/:projectId/documents', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen fil uppladdad.' });
  const filePath = `/uploads/documents/${req.file.filename}`;
  const { name, doc_type, requires_shipping, property_designation } = req.body;
  const reqShip = requires_shipping !== undefined ? parseInt(requires_shipping) : 1;
  const propDesignation = property_designation || null;

  const query = "INSERT INTO documents (project_id, name, file_path, doc_type, requires_shipping, property_designation) VALUES (?, ?, ?, ?, ?, ?)";
  db.run(query, [req.params.projectId, name || req.file.originalname, filePath, doc_type || 'other', reqShip, propDesignation], function(err) {
    if (err) return res.status(500).json({ error: 'Kunde inte spara projektdokument.' });
    res.status(201).json({ id: this.lastID, name: name || req.file.originalname, file_path: filePath, requires_shipping: reqShip, property_designation: propDesignation });
  });
});

app.post('/api/landowners/:landownerId/documents', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen fil uppladdad.' });
  const filePath = `/uploads/documents/${req.file.filename}`;
  const { name, doc_type, requires_shipping } = req.body;
  const reqShip = requires_shipping !== undefined ? parseInt(requires_shipping) : 1;

  const query = "INSERT INTO documents (landowner_id, name, file_path, doc_type, requires_shipping) VALUES (?, ?, ?, ?, ?)";
  db.run(query, [req.params.landownerId, name || req.file.originalname, filePath, doc_type || 'other', reqShip], function(err) {
    if (err) return res.status(500).json({ error: 'Kunde inte spara markägardokument.' });
    res.status(201).json({ id: this.lastID, name: name || req.file.originalname, file_path: filePath, requires_shipping: reqShip });
  });
});

// Hämta sammanställd dokumentlista för en markägare (projektdokument + markägardokument)
app.get('/api/landowners/:id/documents', authenticateToken, (req, res) => {
  db.get("SELECT project_id FROM landowners WHERE id = ?", [req.params.id], (err, landowner) => {
    if (err || !landowner) return res.status(404).json({ error: 'Markägare hittades inte.' });

    const query = `
      SELECT * FROM documents
      WHERE landowner_id = ? 
         OR (project_id = ? AND landowner_id IS NULL AND (property_designation IS NULL OR property_designation IN (SELECT designation FROM properties WHERE landowner_id = ?)))
      ORDER BY sort_order ASC, created_at ASC
    `;
    db.all(query, [req.params.id, landowner.project_id, req.params.id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Kunde inte hämta dokument.' });
      res.json(rows);
    });
  });
});

// Toggle leveransstatus (requires_shipping)
app.put('/api/documents/:id/toggle-shipping', authenticateToken, (req, res) => {
  db.run(
    "UPDATE documents SET requires_shipping = CASE WHEN requires_shipping = 1 THEN 0 ELSE 1 END WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Kunde inte uppdatera leveransstatus.' });
      res.json({ message: 'Leveransstatus uppdaterad.' });
    }
  );
});

// Uppdatera dokumentets detaljer (namn, leveranskrav och måldatum)
app.put('/api/documents/:id', authenticateToken, (req, res) => {
  const { name, requires_shipping, target_send_date } = req.body;
  const reqShip = requires_shipping !== undefined ? parseInt(requires_shipping) : 1;
  const query = `
    UPDATE documents
    SET name = ?, requires_shipping = ?, target_send_date = ?
    WHERE id = ?
  `;
  db.run(query, [name, reqShip, target_send_date || null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte uppdatera dokument.' });
    res.json({ message: 'Dokument uppdaterat.' });
  });
});

// Uppdatera ordning
app.put('/api/documents/:id/order', authenticateToken, (req, res) => {
  const { sort_order } = req.body;
  db.run("UPDATE documents SET sort_order = ? WHERE id = ?", [sort_order, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte uppdatera ordning.' });
    res.json({ message: 'Sorteringsordning uppdaterad.' });
  });
});

// Ta bort dokument
app.delete('/api/documents/:id', authenticateToken, (req, res) => {
  db.get("SELECT file_path FROM documents WHERE id = ?", [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Dokument hittades inte.' });
    
    // Radera fil fysiskt
    const fullPath = path.join(__dirname, row.file_path);
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch(e) { console.error(e); }
    }
    
    db.run("DELETE FROM documents WHERE id = ?", [req.params.id], () => {
      res.json({ message: 'Dokument borttaget.' });
    });
  });
});

// ----------------------------------------------------
// PDF SAMMANSTÄLLNING & COMPILER
// ----------------------------------------------------
app.get('/api/landowners/:id/compile', authenticateToken, async (req, res) => {
  const landownerId = req.params.id;

  try {
    // 1. Hämta markägare, tillhörande projekt, samt värdering
    const landowner = await new Promise((resolve, reject) => {
      db.get("SELECT l.*, p.name as project_name, p.logo_path, p.project_type FROM landowners l JOIN projects p ON l.project_id = p.id WHERE l.id = ?", [landownerId], (err, row) => {
        if (err || !row) reject('Markägare eller projekt hittades inte.');
        else resolve(row);
      });
    });

    const valuation = await new Promise((resolve) => {
      db.get("SELECT * FROM land_valuations WHERE landowner_id = ?", [landownerId], (err, row) => {
        resolve(row || { valuation_text: 'Ingen värdering inmatad.', compensation_sum: 0 });
      });
    });

    const properties = await new Promise((resolve) => {
      db.all("SELECT designation FROM properties WHERE landowner_id = ?", [landownerId], (err, rows) => {
        resolve(rows || []);
      });
    });

    // 2. Hämta alla sorterade PDF-dokument (projektdokument + markägardokument)
    const documents = await new Promise((resolve) => {
      const query = `
        SELECT * FROM documents
        WHERE (landowner_id = ? 
           OR (project_id = ? AND landowner_id IS NULL AND (property_designation IS NULL OR property_designation IN (SELECT designation FROM properties WHERE landowner_id = ?))))
          AND requires_shipping = 1
        ORDER BY sort_order ASC, created_at ASC
      `;
      db.all(query, [landownerId, landowner.project_id, landownerId], (err, rows) => {
        resolve(rows || []);
      });
    });

    // 3. Skapa försättsblad med pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.276, 841.890]); // A4 storlek i punkter
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Rita en snygg bakgrund eller dekorativa linjer
    page.drawRectangle({
      x: 0, y: 0, width: 25, height: 841.890,
      color: rgb(0.3725, 0.7843, 0.5686) // Nektabgrön accent
    });

    // Försättsblad Rubrik
    page.drawText('BYGGHANDLINGAR & AVTALSPAKET', {
      x: 60, y: 700, size: 24, font: fontBold, color: rgb(0.3725, 0.7843, 0.5686)
    });

    // Rita en horisontell linje
    page.drawLine({
      start: { x: 60, y: 685 }, end: { x: 500, y: 685 },
      thickness: 2, color: rgb(0.3725, 0.7843, 0.5686)
    });

    // Projektinformation
    page.drawText('PROJEKTINFORMATION', { x: 60, y: 640, size: 14, font: fontBold });
    page.drawText(`Projektnamn: ${landowner.project_name}`, { x: 60, y: 620, size: 11, font });
    page.drawText(`Projekttyp: ${landowner.project_type.toUpperCase()}`, { x: 60, y: 600, size: 11, font });
    page.drawText(`Beredare: ${req.user.username}`, { x: 60, y: 580, size: 11, font });

    // Markägarinformation
    page.drawText('MOTTAGARE (MARKÄGARE)', { x: 60, y: 530, size: 14, font: fontBold });
    page.drawText(`Namn: ${landowner.name}`, { x: 60, y: 510, size: 11, font });
    page.drawText(`Fastigheter: ${properties.map(p => p.designation).join(', ') || 'Inga registrerade'}`, { x: 60, y: 490, size: 11, font });
    page.drawText(`Adress: ${landowner.address || 'Ej angiven'}`, { x: 60, y: 470, size: 11, font });

    // Markvärdering och ersättning
    page.drawText('MARKVÄRDERINGSÖVERSIKT', { x: 60, y: 420, size: 14, font: fontBold });
    page.drawText(`Överenskommen ersättning: ${valuation.compensation_sum.toLocaleString('sv-SE')} kr`, { x: 60, y: 400, size: 11, font });
    
    // Hantera flerradig fritext på ett enkelt sätt
    const valText = valuation.valuation_text || 'Ingen kalkylbeskrivning inmatad.';
    const lines = valText.split('\n').slice(0, 5); // begränsa till 5 rader för försättsbladet
    let yPos = 380;
    lines.forEach((line) => {
      page.drawText(line.substring(0, 80), { x: 60, y: yPos, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
      yPos -= 18;
    });

    // Dokumentförteckning (Bokmärkeslista på framsidan)
    page.drawText('INGÅENDE BILAGOR (ORDNING):', { x: 60, y: 240, size: 12, font: fontBold });
    let docY = 220;
    documents.forEach((doc, idx) => {
      page.drawText(`${idx + 1}. ${doc.name} (${doc.doc_type})`, { x: 80, y: docY, size: 10, font });
      docY -= 18;
    });

    // Skapa försättsbladets bytes
    const coverPdfBytes = await pdfDoc.save();
    
    // Slå samman försättsbladet med alla ingående PDF-bilagor
    const mergedPdf = await PDFDocument.create();
    const coverPdf = await PDFDocument.load(coverPdfBytes);
    const copiedCoverPages = await mergedPdf.copyPages(coverPdf, coverPdf.getPageIndices());
    copiedCoverPages.forEach(p => mergedPdf.addPage(p));

    // Läs in och slå ihop varje bilaga som har filtyp .pdf
    for (const doc of documents) {
      const fullFilePath = path.join(__dirname, doc.file_path);
      if (fs.existsSync(fullFilePath) && path.extname(fullFilePath).toLowerCase() === '.pdf') {
        try {
          const docBytes = fs.readFileSync(fullFilePath);
          const donorPdf = await PDFDocument.load(docBytes);
          const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
          copiedPages.forEach(p => mergedPdf.addPage(p));
        } catch (pdfErr) {
          console.error(`Kunde inte lägga till PDF ${doc.name}:`, pdfErr.message);
        }
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    
    // Spara filen lokalt som en sammanslagen leverans
    const compiledFileName = `compiled_${landownerId}_${Date.now()}.pdf`;
    const compiledPath = path.join(__dirname, UPLOAD_DIR, 'documents', compiledFileName);
    fs.writeFileSync(compiledPath, mergedPdfBytes);

    // Registrera i leveranslogg
    db.run("INSERT INTO delivery_log (landowner_id, compiled_file_name, status) VALUES (?, ?, 'success')", [landownerId, `/uploads/documents/${compiledFileName}`]);

    // Skicka till klienten för nedladdning
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Avtalspaket_${landowner.name.replace(/\s+/g, '_')}.pdf"`);
    res.send(Buffer.from(mergedPdfBytes));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kunde inte sammanställa PDF-leveransen: ' + err });
  }
});

// ----------------------------------------------------
// GDPR PURGE (GALLRING) API
// ----------------------------------------------------
app.post('/api/landowners/:id/gdpr-purge', authenticateToken, async (req, res) => {
  const landownerId = req.params.id;

  db.get("SELECT * FROM landowners WHERE id = ?", [landownerId], (err, landowner) => {
    if (err || !landowner) return res.status(404).json({ error: 'Markägare hittades inte.' });

    // 1. Radera alla dokument kopplade specifikt till markägaren från disken
    db.all("SELECT file_path FROM documents WHERE landowner_id = ?", [landownerId], (err, docs) => {
      if (docs) {
        docs.forEach(doc => {
          const fullPath = path.join(__dirname, doc.file_path);
          if (fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch(e) { console.error(e); }
          }
        });
      }

      // Radera dokumenten ur databasen
      db.run("DELETE FROM documents WHERE landowner_id = ?", [landownerId], () => {
        
        // 2. Radera kalkylfil från markvärdering från disken
        db.get("SELECT file_path FROM land_valuations WHERE landowner_id = ?", [landownerId], (err, valuation) => {
          if (valuation && valuation.file_path) {
            const fullValPath = path.join(__dirname, valuation.file_path);
            if (fs.existsSync(fullValPath)) {
              try { fs.unlinkSync(fullValPath); } catch(e) { console.error(e); }
            }
          }

          // Rensa fältet i värderingstabellen (kalkylfilen tas bort)
          db.run("UPDATE land_valuations SET file_path = NULL WHERE landowner_id = ?", [landownerId], () => {
            
            // 3. Maskera personuppgifter i databasen och ändra status
            const query = `
              UPDATE landowners
              SET personal_number = 'XXXXXX-XXXX',
                  address = 'Maskerad (GDPR-gallrad)',
                  email = 'maskerad@gdpr.se',
                  phone = '000-0000000',
                  bank_account = 'Maskerat bankkonto',
                  status = 'completed',
                  completed_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `;
            db.run(query, [landownerId], (err) => {
              if (err) return res.status(500).json({ error: 'Kunde inte utföra maskering.' });
              res.json({ message: 'GDPR-gallring framgångsrikt genomförd. Känsliga uppgifter har maskerats och tillhörande dokument raderats.' });
            });
          });
        });
      });
    });
  });
});

// ----------------------------------------------------
// POSTNORD MASS SHIPPING API
// ----------------------------------------------------
app.post('/api/projects/:projectId/mass-ship', authenticateToken, async (req, res) => {
  const { landowner_ids } = req.body;
  if (!landowner_ids || !Array.isArray(landowner_ids) || landowner_ids.length === 0) {
    return res.status(400).json({ error: 'Inga markägare valda.' });
  }

  const labelUrl = '/uploads/sample_label.pdf';
  const uploadDest = path.join(__dirname, UPLOAD_DIR);
  fs.mkdirSync(uploadDest, { recursive: true });
  fs.writeFileSync(path.join(uploadDest, 'sample_label.pdf'), 'Fiktiv PostNord-fraktsedel. Streckkod: [|||||  ||| ||| ||]');

  let successCount = 0;

  try {
    for (const ownerId of landowner_ids) {
      const shipmentId = 'PN-' + Math.floor(10000000 + Math.random() * 90000000);
      const trackingUrl = `https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall?shipmentId=${shipmentId}`;
      
      await new Promise((resolve, reject) => {
        db.run(
          "INSERT INTO shipments (landowner_id, postnord_shipment_id, status, shipping_label_url, tracking_url) VALUES (?, ?, 'booked', ?, ?)",
          [ownerId, shipmentId, labelUrl, trackingUrl],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE landowners SET status = 'processing' WHERE id = ?",
          [ownerId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      successCount++;
    }

    res.json({
      message: `Massutskick bokat för ${successCount} markägare via PostNord.`,
      count: successCount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ett fel inträffade under massutskicket: ' + err });
  }
});

// ----------------------------------------------------
// POSTNORD MOCK SHIPPING API
// ----------------------------------------------------
app.post('/api/landowners/:id/ship', authenticateToken, (req, res) => {
  const landownerId = req.params.id;
  const shipmentId = 'PN-' + Math.floor(10000000 + Math.random() * 90000000);
  
  // Generera en spårningslänk
  const trackingUrl = `https://www.postnord.se/vara-verktyg/spara-brev-paket-och-pall?shipmentId=${shipmentId}`;
  
  // Vi sparar en fiktiv fraktsedel
  const labelUrl = '/uploads/sample_label.pdf';
  
  // Skapa en fiktiv fraktsedel-fil om den inte finns, så att användaren kan klicka på länken utan 404
  const uploadDest = path.join(__dirname, UPLOAD_DIR);
  fs.mkdirSync(uploadDest, { recursive: true });
  fs.writeFileSync(path.join(uploadDest, 'sample_label.pdf'), 'Fiktiv PostNord-fraktsedel. Streckkod: [|||||  ||| ||| ||]');

  const query = `
    INSERT INTO shipments (landowner_id, postnord_shipment_id, status, shipping_label_url, tracking_url)
    VALUES (?, ?, 'booked', ?, ?)
  `;
  db.run(query, [landownerId, shipmentId, labelUrl, trackingUrl], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte registrera PostNord-sändning.' });

    // Uppdatera status hos markägaren till 'processing' (avtal skickat)
    db.run("UPDATE landowners SET status = 'processing' WHERE id = ?", [landownerId], () => {
      res.json({
        message: 'Frakt bokad och registrerad via PostNord API (Simulerad).',
        shipment_id: shipmentId,
        tracking_url: trackingUrl,
        shipping_label_url: labelUrl
      });
    });
  });
});

// ----------------------------------------------------
// OBLIGATIONS (ÅTAGANDEN) API
// ----------------------------------------------------
app.get('/api/landowners/:id/obligations', authenticateToken, (req, res) => {
  db.all("SELECT * FROM landowner_obligations WHERE landowner_id = ? ORDER BY created_at DESC", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Kunde inte hämta åtaganden.' });
    res.json(rows);
  });
});

app.post('/api/landowners/:id/obligations', authenticateToken, (req, res) => {
  const { title, description, due_date } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Titel krävs för åtagandet.' });
  }
  const query = `
    INSERT INTO landowner_obligations (landowner_id, title, description, due_date, status)
    VALUES (?, ?, ?, ?, 'pending')
  `;
  db.run(query, [req.params.id, title, description || '', due_date || ''], function(err) {
    if (err) return res.status(500).json({ error: 'Kunde inte skapa åtagande.' });
    res.status(201).json({ id: this.lastID, landowner_id: req.params.id, title, description, due_date, status: 'pending' });
  });
});

app.put('/api/obligations/:id', authenticateToken, (req, res) => {
  const { title, description, due_date, status } = req.body;
  const query = `
    UPDATE landowner_obligations
    SET title = ?, description = ?, due_date = ?, status = ?
    WHERE id = ?
  `;
  db.run(query, [title, description, due_date, status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte uppdatera åtagande.' });
    res.json({ message: 'Åtagande uppdaterat.' });
  });
});

app.delete('/api/obligations/:id', authenticateToken, (req, res) => {
  db.run("DELETE FROM landowner_obligations WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Kunde inte radera åtagande.' });
    res.json({ message: 'Åtagande raderat.' });
  });
});

// ----------------------------------------------------
// ISO 20022 pain.001 BANKFIL-GENERATOR API
// ----------------------------------------------------
app.post('/api/projects/:projectId/generate-payment-file', authenticateToken, async (req, res) => {
  const { landowner_ids } = req.body;
  const projectId = req.params.projectId;

  if (!landowner_ids || !Array.isArray(landowner_ids) || landowner_ids.length === 0) {
    return res.status(400).json({ error: 'Inga markägare valda för utbetalning.' });
  }

  try {
    // Hämta projektet
    const project = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM projects WHERE id = ?", [projectId], (err, row) => {
        if (err || !row) reject('Projektet hittades inte.');
        else resolve(row);
      });
    });

    // Hämta valda markägare med deras bankkonto, ersättningsbelopp och fastigheter
    const placeholders = landowner_ids.map(() => '?').join(',');
    const query = `
      SELECT l.id, l.name, l.bank_account,
             (SELECT compensation_sum FROM land_valuations WHERE landowner_id = l.id) as compensation_sum,
             (SELECT GROUP_CONCAT(designation, ', ') FROM properties WHERE landowner_id = l.id) as properties_list
      FROM landowners l
      WHERE l.id IN (${placeholders}) AND l.project_id = ?
    `;

    const landowners = await new Promise((resolve, reject) => {
      db.all(query, [...landowner_ids, projectId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (landowners.length === 0) {
      return res.status(400).json({ error: 'Hittade inga giltiga markägare för utbetalning.' });
    }

    // Skapa XML pain.001
    const creationDateTime = new Date().toISOString().substring(0, 19);
    const executionDate = new Date().toISOString().split('T')[0];
    const msgId = 'MSG-' + Date.now();
    const pmtInfId = 'PMT-' + Date.now();

    // Räkna transaktioner och kontrollsumma
    let numberOfTx = 0;
    let controlSum = 0;
    let transactionsXml = '';

    landowners.forEach((lo) => {
      const compensationSum = lo.compensation_sum || 0;
      if (compensationSum <= 0) return; // Hoppa över om ingen ersättning ska betalas

      numberOfTx++;
      controlSum += compensationSum;

      const bankAccClean = (lo.bank_account || 'Ej angivet').replace(/[^a-zA-Z0-9-]/g, '');
      const endToEndId = `E2E-${lo.id}-${Date.now().toString().substring(8)}`;
      const propList = lo.properties_list || 'Fastighet';

      transactionsXml += `
      <CdtTrfTxInf>
        <PmtId>
          <EndToEndId>${endToEndId}</EndToEndId>
        </PmtId>
        <Amt>
          <InstdAmt Ccy="SEK">${compensationSum.toFixed(2)}</InstdAmt>
        </Amt>
        <CdtrAgt>
          <FinInstnId>
            <Othr>
              <Id>SWEDSEXT</Id>
            </Othr>
          </FinInstnId>
        </CdtrAgt>
        <Cdtr>
          <Nm>${lo.name}</Nm>
        </Cdtr>
        <CdtrAcct>
          <Id>
            <Othr>
              <Id>${bankAccClean}</Id>
              <SchmeNm>
                <Cd>BBAN</Cd>
              </SchmeNm>
            </Othr>
          </Id>
        </CdtrAcct>
        <RmtInf>
          <Ustrd>Intrångsersättning - Fastighet: ${propList}</Ustrd>
        </RmtInf>
      </CdtTrfTxInf>`;
    });

    if (numberOfTx === 0) {
      return res.status(400).json({ error: 'Inga av de valda markägarna har ett registrerat ersättningsbelopp över 0 kr.' });
    }

    const debtorIban = 'SE8950000000012345678901'; // Fiktivt debitorkonto
    const debtorBic = 'ANDE22SE';

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03 pain.001.001.03.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${numberOfTx}</NbOfTxs>
      <CtrlSum>${controlSum.toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>Nektab AB</Nm>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${pmtInfId}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${numberOfTx}</NbOfTxs>
      <CtrlSum>${controlSum.toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
      </PmtTpInf>
      <ReqdExctnDt>${executionDate}</ReqdExctnDt>
      <Dbtr>
        <Nm>Nektab AB (Projektkonto)</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>${debtorIban}</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BIC>${debtorBic}</BIC>
        </FinInstnId>
      </DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>${transactionsXml}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    // Uppdatera statusen för markägarna till 'paid'
    await new Promise((resolve, reject) => {
      const updateQuery = `UPDATE landowners SET status = 'paid' WHERE id IN (${placeholders})`;
      db.run(updateQuery, [...landowner_ids], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="pain.001_${project.name.replace(/\s+/g, '_')}_${executionDate}.xml"`);
    res.send(xmlContent);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kunde inte generera bankutbetalningsfilen: ' + err });
  }
});

// Test-rutt för att verifiera felmaskering (OWASP)
app.get('/api/test-error', (req, res, next) => {
  next(new Error('Denna feldetalj ska döljas i produktion!'));
});

// Hälso-check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API är vid god hälsa.' });
});

// Global felhanterare (Global Error Handler) för att maskera känslig information i produktion (OWASP)
app.use((err, req, res, next) => {
  console.error('SERVER FEL:', err.stack || err);
  
  const status = err.status || 500;
  let message = 'Ett internt serverfel inträffade.';
  
  // Visa endast detaljer i icke-produktionsmiljöer för att förhindra information disclosure (OWASP)
  if (process.env.NODE_ENV !== 'production') {
    message = err.message || message;
  }
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack ? err.stack.split('\n') : undefined })
  });
});

// Hantera okontrollerade undantag globalt (CIS Control 16)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection på:', promise, 'orsak:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception kastad:', error);
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, async () => {
    await ensureMockPdfFiles();
    console.log(`Server körs på port ${PORT}`);
  });
}

module.exports = app;
