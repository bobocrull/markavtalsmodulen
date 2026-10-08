const https = require('https');

/**
 * Roaring.io Integration Service
 * 
 * Tillhandahåller:
 * 1. Folkbokföringsuppgifter via SPAR (Statens personadressregister)
 * 2. Registrerade telefonnummer via nummeroperatörerna
 * 3. Fastighetsinnehav (Lantmäteriet)
 * 
 * Om ROARING_CLIENT_KEY och ROARING_CLIENT_SECRET finns i process.env anropas Roaring live/sandbox.
 * Annars används en smart, realistisk mockup-generator för demo & utveckling.
 */

// Kända testprofiler för snabbverifiering
const MOCK_PROFILES = {
  '197505121234': {
    name: 'Sven-Erik Lindqvist',
    personalNumber: '19750512-1234',
    address: 'Kullahalvön Gård 12, 263 76 Nyhamnsläge',
    streetAddress: 'Kullahalvön Gård 12',
    postalCode: '263 76',
    city: 'Nyhamnsläge',
    municipality: 'Höganäs kommun',
    phone: '070-554 32 10',
    status: 'Folkbokförd',
    deregistrationReason: null,
    properties: ['Höganäs 4:21', 'Höganäs 4:22'],
    source: 'SPAR (Statens personadressregister) via Roaring.io (Mockup)',
    isMock: true
  },
  '198203245678': {
    name: 'Anna Maria Karlsson',
    personalNumber: '19820324-5678',
    address: 'Gamla Kyrkvägen 4B, 263 36 Höganäs',
    streetAddress: 'Gamla Kyrkvägen 4B',
    postalCode: '263 36',
    city: 'Höganäs',
    municipality: 'Höganäs kommun',
    phone: '073-890 12 34',
    status: 'Folkbokförd',
    deregistrationReason: null,
    properties: ['Höganäs 7:15'],
    source: 'SPAR (Statens personadressregister) via Roaring.io (Mockup)',
    isMock: true
  },
  '196111099876': {
    name: 'Lars Göran Bergström',
    personalNumber: '19611109-9876',
    address: 'Enebacken 18, 281 33 Hässleholm',
    streetAddress: 'Enebacken 18',
    postalCode: '281 33',
    city: 'Hässleholm',
    municipality: 'Hässleholms kommun',
    phone: '072-456 78 90',
    status: 'Folkbokförd',
    deregistrationReason: null,
    properties: ['Hässleholm Skog 2:1'],
    source: 'SPAR (Statens personadressregister) via Roaring.io (Mockup)',
    isMock: true
  }
};

/**
 * Normaliserar personnummer till 12 siffror (ÅÅÅÅMMDDNNNN)
 */
function normalizePersonalNumber(pnr) {
  if (!pnr) return null;
  const digits = pnr.replace(/\D/g, '');
  if (digits.length === 10) {
    const year = parseInt(digits.substring(0, 2), 10);
    const currentYearShort = new Date().getFullYear() % 100;
    const century = year > currentYearShort ? '19' : '20';
    return `${century}${digits}`;
  }
  if (digits.length === 12) {
    return digits;
  }
  return null;
}

/**
 * Formaterar personnummer till ÅÅÅÅMMDD-NNNN
 */
function formatPersonalNumber(digits12) {
  if (!digits12 || digits12.length !== 12) return digits12;
  return `${digits12.substring(0, 8)}-${digits12.substring(8)}`;
}

/**
 * Genererar en realistisk svensk personprofil baserat på personnummer
 */
function generateRealisticMockPerson(digits12) {
  const pnrFormatted = formatPersonalNumber(digits12);
  const year = parseInt(digits12.substring(0, 4), 10);
  const month = parseInt(digits12.substring(4, 6), 10);
  const day = parseInt(digits12.substring(6, 8), 10);
  const checkDigit = parseInt(digits12.charAt(10), 10); // udda = man, jämn = kvinna
  const isMale = checkDigit % 2 !== 0;

  const maleNames = ['Karl', 'Erik', 'Lars', 'Anders', 'Johan', 'Per', 'Nils', 'Jan', 'Mikael', 'Olof', 'Fredrik', 'Göran'];
  const femaleNames = ['Maria', 'Anna', 'Margareta', 'Elisabeth', 'Eva', 'Birgitta', 'Karin', 'Ingrid', 'Kristina', 'Linnéa', 'Helena', 'Sara'];
  const lastNames = ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Lindqvist', 'Bergström'];

  const streetNames = ['Storgatan', 'Björkvägen', 'Skogsvägen', 'Strandvägen', 'Lantmätarvägen', 'Ekbacken', 'Prästgårdsvägen', 'Ringvägen', 'Åkervägen', 'Ängsvägen'];
  const cities = [
    { city: 'Höganäs', zip: '263 36', municipality: 'Höganäs kommun' },
    { city: 'Helsingborg', zip: '252 20', municipality: 'Helsingborgs stad' },
    { city: 'Ängelholm', zip: '262 32', municipality: 'Ängelholms kommun' },
    { city: 'Hässleholm', zip: '281 33', municipality: 'Hässleholms kommun' },
    { city: 'Kristianstad', zip: '291 30', municipality: 'Kristianstads kommun' },
    { city: 'Lund', zip: '222 21', municipality: 'Lunds kommun' }
  ];

  const seed = (year * 10000 + month * 100 + day + parseInt(digits12.substring(8), 10)) % 1000;
  const firstName = isMale ? maleNames[seed % maleNames.length] : femaleNames[seed % femaleNames.length];
  const lastName = lastNames[(seed + 3) % lastNames.length];
  const street = streetNames[(seed + 5) % streetNames.length];
  const streetNumber = ((seed % 45) + 1);
  const cityObj = cities[(seed + 2) % cities.length];
  const phoneSuffix = String(1000 + (seed * 7) % 9000);

  return {
    name: `${firstName} ${lastName}`,
    personalNumber: pnrFormatted,
    address: `${street} ${streetNumber}, ${cityObj.zip} ${cityObj.city}`,
    streetAddress: `${street} ${streetNumber}`,
    postalCode: cityObj.zip,
    city: cityObj.city,
    municipality: cityObj.municipality,
    phone: `070-${String((seed % 800) + 100).padStart(3, '0')} ${phoneSuffix.substring(0, 2)} ${phoneSuffix.substring(2)}`,
    status: 'Folkbokförd',
    deregistrationReason: null,
    properties: [`${cityObj.city} ${((seed % 20) + 1)}:${((seed % 15) + 1)}`],
    source: 'SPAR (Statens personadressregister) via Roaring.io (Mockup)',
    isMock: true,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Huvudfunktion för att slå upp person via Roaring.io eller Mockup
 */
async function lookupPerson(personalNumber) {
  const digits12 = normalizePersonalNumber(personalNumber);
  if (!digits12) {
    throw new Error('Ogiltigt personnummerformat. Ange 10 eller 12 siffror (ÅÅÅÅMMDD-XXXX).');
  }

  const clientKey = process.env.ROARING_CLIENT_KEY;
  const clientSecret = process.env.ROARING_CLIENT_SECRET;
  const roaringEnv = process.env.ROARING_ENV || 'sandbox';

  // Om API-nycklar inte finns: Kör mockup direkt
  if (!clientKey || !clientSecret || clientKey.trim() === '' || clientSecret.trim() === '') {
    if (MOCK_PROFILES[digits12]) {
      return {
        ...MOCK_PROFILES[digits12],
        fetchedAt: new Date().toISOString()
      };
    }
    return generateRealisticMockPerson(digits12);
  }

  // Om API-nycklar finns: Anropa Roaring
  return callRoaringApi(digits12, clientKey, clientSecret, roaringEnv);
}

/**
 * Anropar Roaring.io API
 */
async function callRoaringApi(digits12, clientKey, clientSecret, env) {
  const baseUrl = env === 'production' ? 'https://api.roaring.io' : 'https://api-sandbox.roaring.io';

  const token = await getRoaringToken(baseUrl, clientKey, clientSecret);
  const personData = await fetchRoaringEndpoint(`${baseUrl}/se/person/overview/1.0/${digits12}`, token);

  let contactData = null;
  try {
    contactData = await fetchRoaringEndpoint(`${baseUrl}/se/person/contact/1.0/${digits12}`, token);
  } catch (err) {
    console.warn('Kunde inte hämta kontaktuppgifter från Roaring:', err.message);
  }

  const name = personData.firstname && personData.lastname 
    ? `${personData.firstname} ${personData.lastname}`
    : personData.name || 'Okänd';

  const address = personData.address || {};
  const fullAddress = [
    address.street,
    address.coAddress ? `c/o ${address.coAddress}` : null,
    address.postalCode,
    address.city
  ].filter(Boolean).join(', ');

  const phone = contactData?.phoneNumbers?.[0]?.number || null;

  return {
    name,
    personalNumber: formatPersonalNumber(digits12),
    address: fullAddress || 'Adressuppgift saknas i SPAR',
    streetAddress: address.street || '',
    postalCode: address.postalCode || '',
    city: address.city || '',
    municipality: address.municipality || '',
    phone: phone || 'Ej registrerat telefonnummer',
    status: personData.status || 'Folkbokförd',
    deregistrationReason: personData.deregistrationReason || null,
    source: `SPAR (Statens personadressregister) via Roaring.io (${env})`,
    isMock: false,
    fetchedAt: new Date().toISOString()
  };
}

function getRoaringToken(baseUrl, key, secret) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${key}:${secret}`).toString('base64');
    const postData = 'grant_type=client_credentials';

    const url = new URL(`${baseUrl}/token`);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.access_token) {
            resolve(json.access_token);
          } else {
            reject(new Error(`Roaring auth failed: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function fetchRoaringEndpoint(urlString, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`Roaring API error (${res.statusCode}): ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = {
  lookupPerson,
  normalizePersonalNumber,
  formatPersonalNumber
};
