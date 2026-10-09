// Mockup- och standarddata för Markägarplattform MVP
// Populerar databasen automatiskt om den är tom (t.ex. vid ny Supabase/PostgreSQL eller återställd SQLite)

const initialProjects = [
  {
    id: 1,
    name: "Ledning FT3",
    project_type: "el",
    status: "active",
    center_latitude: 60.1282,
    center_longitude: 15.1873,
    zoom_level: 12,
    route_coordinates: "[[60.128, 15.187], [60.135, 15.201], [60.142, 15.215]]",
    network_owner: "Vattenfall Eldistribution AB",
    nis_number: "NIS-FT3-2026",
    line_littera: "FT3",
    substation_numbers: "ST101, ST102",
    client_pm: "Mikael Lindqvist",
    lead_preparer: "Andreas Strandberg",
    municipality: "Smedjebacken"
  },
  {
    id: 2,
    name: "Vattenfall Eldistribution - Sikberget",
    project_type: "el",
    status: "active",
    center_latitude: 56.2625,
    center_longitude: 12.5642,
    zoom_level: 12,
    route_coordinates: "[[56.2625, 12.5642], [56.2845, 12.5321], [56.1422, 12.5841]]",
    network_owner: "Vattenfall Eldistribution AB",
    nis_number: "NIS-SIK-2026",
    line_littera: "SIK4",
    substation_numbers: "ST201",
    client_pm: "Johan Ekström",
    lead_preparer: "Andreas Strandberg",
    municipality: "Höganäs"
  },
  {
    id: 3,
    name: "E.ON Energidistribution - Test möte",
    project_type: "el",
    status: "active",
    center_latitude: 56.1422,
    center_longitude: 12.5841,
    zoom_level: 12,
    route_coordinates: "[[56.1422, 12.5841], [56.1550, 12.5900]]",
    network_owner: "E.ON Energidistribution AB",
    nis_number: "EON-TM-2026",
    line_littera: "EON12",
    substation_numbers: "ST301",
    client_pm: "Karin Berg",
    lead_preparer: "Andreas Strandberg",
    municipality: "Höganäs"
  },
  {
    id: 4,
    name: "Vattenfall Testlinje Beredning",
    project_type: "Elnät",
    status: "active",
    center_latitude: 56.2000,
    center_longitude: 12.5500,
    zoom_level: 12,
    route_coordinates: "[[56.200, 12.550], [56.210, 12.560]]",
    network_owner: "Vattenfall Eldistribution AB",
    nis_number: "NIS5501",
    line_littera: "L5501",
    substation_numbers: "T14",
    client_pm: "Anders Nilsson",
    lead_preparer: "Andreas Strandberg",
    municipality: "Höganäs"
  }
];

const initialLandowners = [
  // Projekt 1: Ledning FT3
  { id: 1, project_id: 1, name: "Sven Svensson", personal_number: "19680512-4321", address: "Storgatan 12, 777 30 Smedjebacken", email: "sven.svensson@example.se", phone: "070-1234567", bank_account: "8105-9, 123 456 789-0", status: "paid" },
  { id: 2, project_id: 1, name: "Sven Svensson", personal_number: "19800101-1234", address: "Skogsvägen 4, 777 30 Smedjebacken", email: "sven2@example.se", phone: "070-2345678", bank_account: "", status: "draft" },
  { id: 3, project_id: 1, name: "Sven Svensson", personal_number: "19800101-1234", address: "Björkvägen 8, 777 30 Smedjebacken", email: "sven3@example.se", phone: "070-3456789", bank_account: "", status: "draft" },
  { id: 4, project_id: 1, name: "Sven Svensson", personal_number: "19800101-1234", address: "Tallvägen 1, 777 30 Smedjebacken", email: "sven4@example.se", phone: "070-4567890", bank_account: "", status: "draft" },
  { id: 5, project_id: 1, name: "Sven Svensson", personal_number: "19800101-1234", address: "Granvägen 15, 777 30 Smedjebacken", email: "sven5@example.se", phone: "070-5678901", bank_account: "", status: "draft" },

  // Projekt 2: Vattenfall Sikberget
  { id: 6, project_id: 2, name: "Anna Karlsson", personal_number: "19740312-1122", address: "Strandvägen 4, 263 36 Höganäs", email: "anna.karlsson@example.se", phone: "070-6789012", bank_account: "5432-1, 987 654 321-0", status: "signed" },
  { id: 7, project_id: 2, name: "Cecilia Andersson", personal_number: "19850918-7788", address: "Bygatan 12, 263 61 Viken", email: "cecilia.a@example.se", phone: "070-7890123", bank_account: "6123-4, 555 666 777-8", status: "signed" },
  { id: 8, project_id: 2, name: "Bo Lindqvist", personal_number: "19621105-4433", address: "Möllevägen 7, 263 77 Mölle", email: "bo.lindqvist@example.se", phone: "070-8901234", bank_account: "8327-9, 111 222 333-4", status: "signed" },
  { id: 9, project_id: 2, name: "Erik Karlsson", personal_number: "19710824-3344", address: "Kullagatan 9, 263 38 Höganäs", email: "erik.k@example.se", phone: "070-9012345", bank_account: "", status: "draft" },

  // Projekt 3: E.ON Test möte
  { id: 10, project_id: 3, name: "Anna Karlsson", personal_number: "19740312-1122", address: "Strandvägen 4, 263 36 Höganäs", email: "anna.karlsson@example.se", phone: "070-6789012", bank_account: "5432-1, 987 654 321-0", status: "paid" },
  { id: 11, project_id: 3, name: "Erik Karlsson", personal_number: "19710824-3344", address: "Kullagatan 9, 263 38 Höganäs", email: "erik.k@example.se", phone: "070-9012345", bank_account: "", status: "draft" },
  { id: 12, project_id: 3, name: "Cecilia Andersson", personal_number: "19850918-7788", address: "Bygatan 12, 263 61 Viken", email: "cecilia.a@example.se", phone: "070-7890123", bank_account: "", status: "draft" },
  { id: 13, project_id: 3, name: "Sven-Erik Lindqvist", personal_number: "19750512-1234", address: "Fyrvägen 2, 263 77 Mölle", email: "sven-erik@example.se", phone: "070-0123456", bank_account: "8327-9, 444 555 666-7", status: "paid" },

  // Projekt 4: Vattenfall Testlinje Beredning
  { id: 14, project_id: 4, name: "Göran Svensson", personal_number: "19680512-1234", address: "Kullagatan 15, 263 38 Höganäs", email: "goran.svensson@example.se", phone: "070-1122334", bank_account: "8105-9, 999 888 777-6", status: "signed" }
];

const initialProperties = [
  { id: 1, landowner_id: 1, designation: "Nektab 1:3", area: 500, latitude: 60.128, longitude: 15.187, municipality: "Smedjebacken" },
  { id: 2, landowner_id: 1, designation: "Gonäs 1:4", area: 500, latitude: 60.135, longitude: 15.201, municipality: "Smedjebacken" },
  { id: 3, landowner_id: 6, designation: "Höganäs 4:21", area: 1200, latitude: 56.2625, longitude: 12.5642, municipality: "Höganäs" },
  { id: 4, landowner_id: 8, designation: "Mölle 2:55", area: 2500, latitude: 56.2845, longitude: 12.5321, municipality: "Höganäs" },
  { id: 5, landowner_id: 7, designation: "Viken 1:15", area: 850, latitude: 56.1422, longitude: 12.5841, municipality: "Höganäs" },
  { id: 6, landowner_id: 9, designation: "Höganäs 4:21", area: 1200, latitude: 56.2625, longitude: 12.5642, municipality: "Höganäs" },
  { id: 7, landowner_id: 10, designation: "Höganäs 4:21", area: 1200, latitude: 56.2625, longitude: 12.5642, municipality: "Höganäs" },
  { id: 8, landowner_id: 11, designation: "Höganäs 4:21", area: 1200, latitude: 56.2625, longitude: 12.5642, municipality: "Höganäs" },
  { id: 9, landowner_id: 12, designation: "Viken 1:15", area: 850, latitude: 56.1422, longitude: 12.5841, municipality: "Höganäs" },
  { id: 10, landowner_id: 13, designation: "Mölle 2:55", area: 2500, latitude: 56.2845, longitude: 12.5321, municipality: "Höganäs" },
  { id: 11, landowner_id: 14, designation: "Höganäs 12:4", area: 1800, latitude: 56.2000, longitude: 12.5500, municipality: "Höganäs" }
];

const initialValuations = [
  {
    id: 1,
    landowner_id: 1,
    valuation_text: "Ledningsservitut på altanen",
    compensation_sum: 208250,
    calculator_data: JSON.stringify({
      fieldEnabled: true, fieldLength: 50, fieldWidth: 40,
      forestEnabled: true, forestLength: 100, forestWidth: 40, forestType: "gran", forestDensity: "normal",
      cutTreesCount: 67, avgTreePrice: 400, gardenEnabled: false, gardenLength: 0, gardenWidth: 0,
      polesCount: 40, staysCount: 20
    })
  },
  {
    id: 6,
    landowner_id: 6,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 63075,
    calculator_data: JSON.stringify({
      fieldEnabled: true, fieldLength: 0, fieldWidth: 0,
      forestEnabled: true, forestLength: 40, forestWidth: 20, forestType: "tall", forestDensity: "normal",
      cutTreesCount: 50, avgTreePrice: 400, gardenEnabled: false, gardenLength: 0, gardenWidth: 0,
      polesCount: 15, staysCount: 0
    })
  },
  {
    id: 7,
    landowner_id: 7,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 6200,
    calculator_data: null
  },
  {
    id: 8,
    landowner_id: 8,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 72450,
    calculator_data: JSON.stringify({
      fieldEnabled: true, fieldLength: 0, fieldWidth: 0,
      forestEnabled: true, forestLength: 40, forestWidth: 20, forestType: "tall", forestDensity: "normal",
      cutTreesCount: 50, avgTreePrice: 400, gardenEnabled: false, gardenLength: 0, gardenWidth: 0,
      polesCount: 20, staysCount: 0
    })
  },
  {
    id: 9,
    landowner_id: 9,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 8400,
    calculator_data: null
  },
  {
    id: 10,
    landowner_id: 10,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 8400,
    calculator_data: null
  },
  {
    id: 11,
    landowner_id: 11,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 8400,
    calculator_data: null
  },
  {
    id: 12,
    landowner_id: 12,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 6200,
    calculator_data: null
  },
  {
    id: 13,
    landowner_id: 13,
    valuation_text: "Beredning utförd enligt standardmall. Ledningsrätt och markintrång kalkyleras baserat på areal.",
    compensation_sum: 12500,
    calculator_data: null
  },
  {
    id: 14,
    landowner_id: 14,
    valuation_text: "Importerad från Vattenfall-mall (NIS5501). EBR-intrång: 120m 24kV, 0m 0.4kV, 1 nätstationer, 0 kabelskåp.",
    compensation_sum: 15400,
    calculator_data: JSON.stringify({ cable_hsp_m: 120, substations_count: 1 })
  }
];

function seedMockData(db) {
  console.log("Startar populering av standardmockup-data...");

  // 1. Projects
  initialProjects.forEach((p) => {
    const sql = `
      INSERT INTO projects (id, name, project_type, status, center_latitude, center_longitude, zoom_level, route_coordinates, network_owner, nis_number, line_littera, substation_numbers, client_pm, lead_preparer, municipality)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [
      p.id, p.name, p.project_type, p.status, p.center_latitude, p.center_longitude, p.zoom_level,
      p.route_coordinates, p.network_owner, p.nis_number, p.line_littera, p.substation_numbers,
      p.client_pm, p.lead_preparer, p.municipality
    ], () => {});
  });

  // 2. Landowners
  initialLandowners.forEach((l) => {
    const sql = `
      INSERT INTO landowners (id, project_id, name, personal_number, address, email, phone, bank_account, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [
      l.id, l.project_id, l.name, l.personal_number, l.address, l.email, l.phone, l.bank_account, l.status
    ], () => {});
  });

  // 3. Properties
  initialProperties.forEach((pr) => {
    const sql = `
      INSERT INTO properties (id, landowner_id, designation, area, latitude, longitude, municipality)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(sql, [
      pr.id, pr.landowner_id, pr.designation, pr.area, pr.latitude, pr.longitude, pr.municipality
    ], () => {});
  });

  // 4. Valuations
  initialValuations.forEach((v) => {
    const sql = `
      INSERT INTO land_valuations (landowner_id, valuation_text, compensation_sum, calculator_data)
      VALUES (?, ?, ?, ?)
    `;
    db.run(sql, [
      v.landowner_id, v.valuation_text, v.compensation_sum, v.calculator_data
    ], () => {});
  });

  console.log("Standardmockup-data populerad med framgång (4 projekt, 14 markägare).");
}

module.exports = { seedMockData };
