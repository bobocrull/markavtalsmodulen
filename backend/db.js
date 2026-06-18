const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Kunde inte ansluta till SQLite-databasen:', err.message);
  } else {
    console.log('Ansluten till SQLite-databasen.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // 1. users
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. projects
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        project_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        logo_path TEXT,
        center_latitude REAL,
        center_longitude REAL,
        zoom_level INTEGER DEFAULT 12,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. project_assignments
    db.run(`
      CREATE TABLE IF NOT EXISTS project_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 4. landowners
    db.run(`
      CREATE TABLE IF NOT EXISTS landowners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        personal_number TEXT,
        address TEXT,
        email TEXT,
        phone TEXT,
        bank_account TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 5. land_valuations
    db.run(`
      CREATE TABLE IF NOT EXISTS land_valuations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landowner_id INTEGER UNIQUE NOT NULL,
        valuation_text TEXT,
        compensation_sum REAL DEFAULT 0,
        file_path TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landowner_id) REFERENCES landowners(id) ON DELETE CASCADE
      )
    `);

    // 6. properties
    db.run(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landowner_id INTEGER NOT NULL,
        designation TEXT NOT NULL,
        area REAL,
        latitude REAL,
        longitude REAL,
        FOREIGN KEY (landowner_id) REFERENCES landowners(id) ON DELETE CASCADE
      )
    `);

    // 7. documents
    db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER,
        landowner_id INTEGER,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        requires_shipping INTEGER DEFAULT 1,
        target_send_date TEXT,
        property_designation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (landowner_id) REFERENCES landowners(id) ON DELETE CASCADE
      )
    `);

    db.run("ALTER TABLE documents ADD COLUMN property_designation TEXT", (err) => {
      // Ignorera om kolumnen redan finns
    });

    db.run("ALTER TABLE projects ADD COLUMN route_coordinates TEXT", (err) => {
      // Ignorera om kolumnen redan finns
    });

    db.run("ALTER TABLE land_valuations ADD COLUMN calculator_data TEXT", (err) => {
      // Ignorera om kolumnen redan finns
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS communication_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landowner_id INTEGER NOT NULL,
        log_type TEXT NOT NULL,
        summary TEXT NOT NULL,
        description TEXT,
        user_id INTEGER,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landowner_id) REFERENCES landowners(id) ON DELETE CASCADE
      )
    `);

    // 8. shipments
    db.run(`
      CREATE TABLE IF NOT EXISTS shipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landowner_id INTEGER NOT NULL,
        postnord_shipment_id TEXT,
        status TEXT DEFAULT 'booked',
        shipping_label_url TEXT,
        tracking_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landowner_id) REFERENCES landowners(id) ON DELETE CASCADE
      )
    `);

    // 9. delivery_log
    db.run(`
      CREATE TABLE IF NOT EXISTS delivery_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landowner_id INTEGER NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        compiled_file_name TEXT,
        status TEXT,
        FOREIGN KEY (landowner_id) REFERENCES landowners(id) ON DELETE CASCADE
      )
    `);

    // 10. landowner_obligations
    db.run(`
      CREATE TABLE IF NOT EXISTS landowner_obligations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        landowner_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (landowner_id) REFERENCES landowners(id) ON DELETE CASCADE
      )
    `);

    // Lägg till testanvändare om tabellen är tom
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (err) {
        console.error("Kunde inte kontrollera users-tabellen:", err.message);
        return;
      }
      if (row.count === 0) {
        seedUsers();
      } else {
        console.log("Databasen är redan populerad med användare.");
      }
    });
  });
}

function seedUsers() {
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('admin123', salt);
  const beredareHash = bcrypt.hashSync('beredare123', salt);

  db.serialize(() => {
    db.run(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
      ['admin', adminHash, 'admin'],
      (err) => {
        if (err) console.error("Kunde inte skapa admin-användare:", err.message);
        else console.log("Admin-användare skapad (admin / admin123)");
      }
    );

    db.run(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
      ['beredare', beredareHash, 'beredare'],
      (err) => {
        if (err) console.error("Kunde inte skapa beredare-användare:", err.message);
        else console.log("Beredare-användare skapad (beredare / beredare123)");
      }
    );
  });
}

module.exports = db;
