const xlsx = require('xlsx');

/**
 * Normaliserar personnummer / organisationsnummer till svenskt standardformat (YYYYMMDD-XXXX / XXXXXX-XXXX)
 */
function normalizePersonalNumber(val) {
  if (!val) return '';
  const str = String(val).replace(/[\s–-]/g, '').trim();
  if (!str) return '';

  // 12 siffror: YYYYMMDDXXXX -> YYYYMMDD-XXXX
  if (/^\d{12}$/.test(str)) {
    return `${str.slice(0, 8)}-${str.slice(8)}`;
  }
  // 10 siffror: YYMMDDXXXX -> bestäm 19YY eller 20YY
  if (/^\d{10}$/.test(str)) {
    const yearPrefix = parseInt(str.slice(0, 2), 10) > 30 ? '19' : '20';
    return `${yearPrefix}${str.slice(0, 6)}-${str.slice(6)}`;
  }
  // Om redan har bindestreck
  if (/^\d{8}-\d{4}$/.test(String(val).trim())) {
    return String(val).trim();
  }
  if (/^\d{6}-\d{4}$/.test(String(val).trim())) {
    const cleaned = String(val).trim().replace('-', '');
    const yearPrefix = parseInt(cleaned.slice(0, 2), 10) > 30 ? '19' : '20';
    return `${yearPrefix}${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
  }

  return String(val).trim();
}

/**
 * Konverterar Excel-datum, serienummer eller datumsträng till YYYY-MM-DD
 */
function formatDate(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number' && val > 1000) {
    // Excel serial date to JS date
    const d = new Date((val - (25567 + 2)) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }
  const str = String(val).trim();
  if (!str) return null;

  // Matcha YYYY-MM-DD eller YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Matcha DD/MM/YYYY eller DD.MM.YYYY
  const eurMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (eurMatch) {
    const [, d, m, y] = eurMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Returnera originalsträng om den innehåller text som "OK 24-05-12"
  return str;
}

/**
 * Beräknar uppskattat EBR-ersättningsbelopp baserat på Vattenfalls intrångsmått
 */
function calculateEbrCompensation(intrusion) {
  const cableHsp = Number(intrusion.cable_hsp_m) || 0;
  const cableLsp = Number(intrusion.cable_lsp_m) || 0;
  const substations = Number(intrusion.substations_count) || 0;
  const cabinets = Number(intrusion.cabinets_count) || 0;
  const serviceCable = Number(intrusion.service_cable_m) || 0;
  const overheadHsp = Number(intrusion.overhead_hsp_m) || 0;
  const overheadLsp = Number(intrusion.overhead_lsp_m) || 0;
  const tempDamage = Number(intrusion.temp_damage_comp) || 0;

  // EBR Schablonpriser (SEK)
  const rateHspCable = 50;      // 50 kr/m för 24 kV jordkabel
  const rateLspCable = 30;      // 30 kr/m för 0.4 kV jordkabel
  const rateSubstation = 5000;  // 5000 kr per nätstation
  const rateCabinet = 1500;     // 1500 kr per kabelskåp
  const rateService = 20;       // 20 kr/m serviskabel
  const rateOverheadHsp = 40;   // 40 kr/m luftledning 24 kV
  const rateOverheadLsp = 25;   // 25 kr/m luftledning 0.4 kV
  const baseFee = (cableHsp > 0 || cableLsp > 0 || substations > 0 || cabinets > 0) ? 1500 : 0;

  const total = (cableHsp * rateHspCable) +
    (cableLsp * rateLspCable) +
    (substations * rateSubstation) +
    (cabinets * rateCabinet) +
    (serviceCable * rateService) +
    (overheadHsp * rateOverheadHsp) +
    (overheadLsp * rateOverheadLsp) +
    tempDamage +
    baseFee;

  return Math.round(total);
}

/**
 * Avgör livscykelstatus baserat på datum och ifyllda fält i Vattenfall-mallen
 */
function deriveStatus(dates) {
  if (dates.mua_inskrivet || dates.mua_till_im) {
    return 'easement'; // Steg 7: Servitut / Inskrivet
  }
  if (dates.mua_ok || dates.mok_ok || dates.muntligt_ok) {
    return 'signed'; // Steg 5: Signerat original
  }
  if (dates.mua_pamin || dates.mok_pamin) {
    return 'received'; // Steg 4: Mottaget / Påmint
  }
  if (dates.mua_sant || dates.mok_sant || dates.brev_datum) {
    return 'posted'; // Steg 3: Postat / Utskickat
  }
  return 'draft'; // Steg 1: Utkast
}

/**
 * Huvudfunktion för att parsa Vattenfall Excel/CSV-buffer
 */
function parseVattenfallFile(buffer, filename = 'vattenfall.xlsx') {
  let workbook;
  try {
    workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true, codepage: 65001 });
  } catch (err) {
    throw new Error(`Kunde inte läsa filen: ${err.message}. Kontrollera att det är en giltig Excel- (.xlsx, .xls) eller CSV-fil.`);
  }

  // Välj lämpligt kalkylblad
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase();
    if (lower.includes('mäfört') || lower.includes('mafort') || lower.includes('markägar') || lower.includes('markagar') || lower.includes('nis')) {
      sheetName = name;
      break;
    }
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error('Inget giltigt kalkylblad hittades i filen.');
  }

  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    throw new Error('Kalkylbladet är tomt.');
  }

  // 1. Extrahera Projektmetadata (rad 0-8)
  const metadata = {
    name: '',
    network_owner: 'Vattenfall Eldistribution AB',
    nis_number: '',
    line_littera: '',
    substation_numbers: '',
    municipality: '',
    client_pm: '',
    lead_preparer: '',
    project_type: 'Elnät'
  };

  const headerSearchLimit = Math.min(9, rawRows.length);
  for (let r = 0; r < headerSearchLimit; r++) {
    const row = rawRows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] || '').trim();
      if (!cell) continue;

      // Hitta nästa icke-tomma cell på samma rad
      let val = '';
      for (let nextC = c + 1; nextC < Math.min(row.length, c + 10); nextC++) {
        if (row[nextC] !== null && row[nextC] !== undefined && String(row[nextC]).trim() !== '') {
          val = String(row[nextC]).trim();
          break;
        }
      }

      const extractAfterLabel = (text) => {
        if (!text) return '';
        if (text.includes(':')) {
          return text.substring(text.indexOf(':') + 1).trim();
        }
        return '';
      };

      if (/projektnamn/i.test(cell)) {
        metadata.name = extractAfterLabel(cell) || val || metadata.name;
      } else if (/n[äa]t[äa]gare/i.test(cell)) {
        metadata.network_owner = extractAfterLabel(cell) || val || metadata.network_owner;
      } else if (/nis[\s-]*nummer|^nis\b/i.test(cell)) {
        metadata.nis_number = extractAfterLabel(cell) || val || metadata.nis_number;
      } else if (/ledningslittera/i.test(cell)) {
        metadata.line_littera = extractAfterLabel(cell) || val || metadata.line_littera;
      } else if (/n[äa]tstation-er|n[äa]tstationer/i.test(cell)) {
        metadata.substation_numbers = extractAfterLabel(cell) || val || metadata.substation_numbers;
      } else if (/berörda fastigheter ligger inom|berorda fastigheter ligger inom/i.test(cell)) {
        const after = cell.replace(/ber[öo]rda fastigheter ligger inom[:\s]*/i, '').trim();
        metadata.municipality = after || val || metadata.municipality;
      } else if (/projektledare/i.test(cell)) {
        metadata.client_pm = extractAfterLabel(cell) || val || metadata.client_pm;
      } else if (/beredare/i.test(cell)) {
        metadata.lead_preparer = extractAfterLabel(cell) || val || metadata.lead_preparer;
      }
    }
  }

  if (!metadata.name) {
    const baseClean = filename.replace(/\.(xlsx|xls|csv)$/i, '').replace(/[-_]/g, ' ');
    metadata.name = metadata.nis_number ? `Vattenfall ${metadata.nis_number}` : baseClean;
  }

  // 2. Lokalisera tabellhuvud för fastighetsdatan
  let dataHeaderRowIdx = -1;
  for (let r = 0; r < Math.min(25, rawRows.length); r++) {
    const row = rawRows[r] || [];
    const hasFastighet = row.some(cell => typeof cell === 'string' && /^(fastighet|fastighetsbeteckning)$/i.test(cell.trim()));
    const hasAgare = row.some(cell => typeof cell === 'string' && /^([äa]gare|namn|lagfaren [äa]gare)$/i.test(cell.trim()));
    if (hasFastighet || (hasAgare && row.some(cell => typeof cell === 'string' && /kommun/i.test(cell.trim())))) {
      dataHeaderRowIdx = r;
      break;
    }
  }

  // Fallback till standardrad 12 om Vattenfall standardmall
  if (dataHeaderRowIdx === -1 && rawRows.length > 12) {
    dataHeaderRowIdx = 12;
  }

  // 3. Bygg kolumnmappning
  const colMap = {};
  if (dataHeaderRowIdx !== -1) {
    // Slå ihop eventuella underrubriker från raderna ovanför
    const primaryHeader = rawRows[dataHeaderRowIdx] || [];
    const prevHeader1 = rawRows[dataHeaderRowIdx - 1] || [];
    const prevHeader2 = rawRows[dataHeaderRowIdx - 2] || [];
    const prevHeader3 = rawRows[dataHeaderRowIdx - 3] || [];
    const nextHeader = rawRows[dataHeaderRowIdx + 1] || [];

    for (let c = 0; c < Math.max(primaryHeader.length, 65); c++) {
      const combined = [
        prevHeader3[c],
        prevHeader2[c],
        prevHeader1[c],
        primaryHeader[c],
        nextHeader[c]
      ].filter(Boolean).map(x => String(x).trim()).join(' ').toLowerCase();

      // Mappning för Fastighets- och Ägaruppgifter
      if (/fastighetsnr|fnr/i.test(combined)) colMap.fnr = c;
      else if (/fastighet/i.test(combined)) colMap.fastighet = c;
      else if (/kommun/i.test(combined) && !/ligger inom/i.test(combined)) colMap.kommun = c;
      else if (/typkod/i.test(combined)) colMap.typkod = c;
      else if (/\btyp\b/i.test(combined)) colMap.typ = c;
      else if (/[äa]gare|lagfaren/i.test(combined) && !/taxerad/i.test(combined)) colMap.agare = c;
      else if (/andel/i.test(combined)) colMap.andel = c;
      else if (/person|orgnr|pnr/i.test(combined)) colMap.person = c;
      else if (/adress|gata/i.test(combined) && !/post/i.test(combined)) colMap.adress = c;
      else if (/postnummer|postadress|postnr|ort/i.test(combined)) colMap.postnummer = c;
      else if (/tele|mobil|telefon/i.test(combined)) colMap.tele = c;
      else if (/bank|konto|bankgiro|postgiro/i.test(combined)) colMap.bank = c;
      else if (/e-post|epost|email/i.test(combined)) colMap.epost = c;
      else if (/taxerad/i.test(combined)) colMap.taxerad_agare = c;
      else if (/anm[äa]rkning|anteckning/i.test(combined)) colMap.anmarkning = c;

      // Intrångskolumner
      if (/jordkabel.*24|24.*jordkabel/i.test(combined)) colMap.cable_hsp_m = c;
      if (/jordkabel.*n[äa]|n[äa].*jordkabel/i.test(combined)) colMap.substations_count = c;
      if (/jordkabel.*0\.4|0\.4.*jordkabel/i.test(combined)) colMap.cable_lsp_m = c;
      if (/jordkabel.*k\.s|k\.s.*st/i.test(combined)) colMap.cabinets_count = c;
      if (/servis/i.test(combined)) colMap.service_cable_m = c;
      if (/tillf[äa]llig.*skada|skada.*kr/i.test(combined)) colMap.temp_damage_comp = c;
      if (/luftledning.*24|24.*luftledning/i.test(combined)) colMap.overhead_hsp_m = c;
      if (/luftledning.*0\.4|0\.4.*luftledning/i.test(combined)) colMap.overhead_lsp_m = c;
      if (/ras.*hsp/i.test(combined)) colMap.demolish_hsp = c;
      if (/ras.*lsp/i.test(combined)) colMap.demolish_lsp = c;
      if (/\banl\b/i.test(combined)) colMap.facility_ref = c;

      // Status och datum
      if (/info.*brev|brev.*datum/i.test(combined)) colMap.brev_datum = c;
      if (/muntligt|skriv.*ok/i.test(combined)) colMap.muntligt_ok = c;
      if (/mua.*s[äa]nt/i.test(combined)) colMap.mua_sant = c;
      if (/mua.*ok/i.test(combined)) colMap.mua_ok = c;
      if (/mua.*p[åa]min/i.test(combined)) colMap.mua_pamin = c;
      if (/mua.*till im|till im/i.test(combined)) colMap.mua_till_im = c;
      if (/mua.*inskrivet|inskrivet/i.test(combined)) colMap.mua_inskrivet = c;
      if (/ärendenummer|arendenummer/i.test(combined)) colMap.mua_arendenummer = c;
      if (/mua.*till n[äa]t[äa]g/i.test(combined)) colMap.mua_till_natag = c;
      if (/m[öo]k.*s[äa]nt/i.test(combined)) colMap.mok_sant = c;
      if (/m[öo]k.*ok/i.test(combined)) colMap.mok_ok = c;
      if (/m[öo]k.*p[åa]min/i.test(combined)) colMap.mok_pamin = c;
      if (/m[öo]k.*till n[äa]t[äa]g/i.test(combined)) colMap.mok_till_natag = c;

      // Sidoavtal & Tillstånd
      if (/abel07.*s[äa]nt/i.test(combined)) colMap.abel07_sant = c;
      if (/abel07.*ok/i.test(combined)) colMap.abel07_ok = c;
      if (/korsning.*s[äa]nt/i.test(combined)) colMap.korsning_sant = c;
      if (/korsning.*ok/i.test(combined)) colMap.korsning_ok = c;
      if (/bygglov.*s[äa]nt/i.test(combined)) colMap.bygglov_sant = c;
      if (/bygglov.*ok/i.test(combined)) colMap.bygglov_ok = c;
      if (/lst.*samr[åa]d.*s[äa]nt|samr[åa]d.*s[äa]nt/i.test(combined)) colMap.lst_sant = c;
      if (/lst.*samr[åa]d.*ok|samr[åa]d.*ok/i.test(combined)) colMap.lst_ok = c;
      if (/strandskydd.*s[äa]nt/i.test(combined)) colMap.strandskydd_sant = c;
      if (/strandskydd.*ok/i.test(combined)) colMap.strandskydd_ok = c;
      if (/vattenverksamhet.*s[äa]nt/i.test(combined)) colMap.vatten_sant = c;
      if (/vattenverksamhet.*ok/i.test(combined)) colMap.vatten_ok = c;
    }
  }

  // Fallback till exakta kolumnindex för Vattenfalls officiella mall om autodetektering saknar nyckelkolumner
  const defaultVattenfallIndices = {
    cable_hsp_m: 5,
    substations_count: 6,
    cable_lsp_m: 7,
    cabinets_count: 8,
    service_cable_m: 9,
    temp_damage_comp: 10,
    overhead_hsp_m: 11,
    overhead_lsp_m: 12,
    demolish_hsp: 13,
    demolish_lsp: 14,
    facility_ref: 15,
    kommun: 16,
    fastighet: 17,
    typ: 18,
    typkod: 19,
    agare: 20,
    andel: 21,
    person: 24,
    fnr: 25,
    adress: 26,
    postnummer: 27,
    tele: 28,
    bank: 29,
    epost: 30,
    taxerad_agare: 31,
    anmarkning: 32,
    brev_datum: 33,
    muntligt_ok: 34,
    mua_sant: 35,
    mua_ok: 36,
    mua_pamin: 37,
    mua_till_im: 38,
    mua_inskrivet: 39,
    mua_arendenummer: 40,
    mua_till_natag: 41,
    mok_sant: 42,
    mok_ok: 43,
    mok_pamin: 44,
    mok_till_natag: 45,
    abel07_sant: 52,
    abel07_ok: 53,
    korsning_sant: 54,
    korsning_ok: 55,
    bygglov_sant: 56,
    bygglov_ok: 57,
    lst_sant: 58,
    lst_ok: 59,
    strandskydd_sant: 60,
    strandskydd_ok: 61,
    vatten_sant: 62,
    vatten_ok: 63
  };

  for (const [key, defaultCol] of Object.entries(defaultVattenfallIndices)) {
    if (colMap[key] === undefined) {
      colMap[key] = defaultCol;
    }
  }

  // 4. Läs datarader
  let startRow = dataHeaderRowIdx + 1;
  if (dataHeaderRowIdx !== -1 && rawRows.length > dataHeaderRowIdx + 1) {
    const nextRow = rawRows[dataHeaderRowIdx + 1] || [];
    const hasOnlyUnitsOrEmpty = nextRow.every(c => {
      const s = String(c || '').trim().toLowerCase();
      return !s || ['m', 'st', 'kr', 'x', 'antal', 'meter'].includes(s);
    });
    if (hasOnlyUnitsOrEmpty && rawRows.length > dataHeaderRowIdx + 2) {
      startRow = dataHeaderRowIdx + 2;
    }
  } else if (startRow < 14 && rawRows.length > 14) {
    startRow = 14;
  }

  const landowners = [];
  const propertiesMap = new Map();
  const warnings = [];

  for (let r = startRow; r < rawRows.length; r++) {
    const row = rawRows[r] || [];
    const rawFastighet = String(row[colMap.fastighet] || '').trim();
    const rawAgare = String(row[colMap.agare] || '').trim();

    // Hoppa över tomma rader
    if (!rawFastighet && !rawAgare) {
      continue;
    }

    const rawPnr = row[colMap.person];
    const adress = String(row[colMap.adress] || '').trim();

    // Hoppa över mallens beskrivningsrad (t.ex. Ägare: "Namn", Person: "nummer", Adress: "Postadress")
    const isTemplateGuideRow =
      (/^(namn|[äa]gare|lagfaren [äa]gare)$/i.test(rawAgare) &&
       (/^(nummer|personnummer|pnr|orgnr)$/i.test(String(rawPnr || '').trim()) || !rawFastighet || /fastighet/i.test(rawFastighet))) ||
      (/^fastighet$/i.test(rawFastighet) && /^[äa]gare$/i.test(rawAgare));
    if (isTemplateGuideRow) {
      continue;
    }

    const kommun = String(row[colMap.kommun] || metadata.municipality || '').trim();
    const typ = String(row[colMap.typ] || '').trim();
    const typkod = String(row[colMap.typkod] || '').trim();
    const fnr = String(row[colMap.fnr] || '').trim();
    const andel = String(row[colMap.andel] || '1/1').trim();
    const personalNumber = normalizePersonalNumber(rawPnr);
    const postnummer = String(row[colMap.postnummer] || '').trim();
    const phone = String(row[colMap.tele] || '').trim();
    const bankAccount = String(row[colMap.bank] || '').trim();
    const email = String(row[colMap.epost] || '').trim();
    const taxeradAgare = String(row[colMap.taxerad_agare] || '').trim();
    const anmarkning = String(row[colMap.anmarkning] || '').trim();

    // Tekniska intrång
    const intrusion = {
      cable_hsp_m: Number(row[colMap.cable_hsp_m]) || 0,
      substations_count: Number(row[colMap.substations_count]) || 0,
      cable_lsp_m: Number(row[colMap.cable_lsp_m]) || 0,
      cabinets_count: Number(row[colMap.cabinets_count]) || 0,
      service_cable_m: Number(row[colMap.service_cable_m]) || 0,
      temp_damage_comp: Number(row[colMap.temp_damage_comp]) || 0,
      overhead_hsp_m: Number(row[colMap.overhead_hsp_m]) || 0,
      overhead_lsp_m: Number(row[colMap.overhead_lsp_m]) || 0,
      demolish_hsp: Boolean(row[colMap.demolish_hsp]),
      demolish_lsp: Boolean(row[colMap.demolish_lsp]),
      facility_ref: String(row[colMap.facility_ref] || '').trim()
    };

    const compensationSum = calculateEbrCompensation(intrusion);

    // Avtals- och sidoavtalsdatum
    const dates = {
      brev_datum: formatDate(row[colMap.brev_datum]),
      muntligt_ok: formatDate(row[colMap.muntligt_ok]),
      mua_sant: formatDate(row[colMap.mua_sant]),
      mua_ok: formatDate(row[colMap.mua_ok]),
      mua_pamin: formatDate(row[colMap.mua_pamin]),
      mua_till_im: formatDate(row[colMap.mua_till_im]),
      mua_inskrivet: formatDate(row[colMap.mua_inskrivet]),
      mua_arendenummer: String(row[colMap.mua_arendenummer] || '').trim(),
      mua_till_natag: formatDate(row[colMap.mua_till_natag]),
      mok_sant: formatDate(row[colMap.mok_sant]),
      mok_ok: formatDate(row[colMap.mok_ok]),
      mok_pamin: formatDate(row[colMap.mok_pamin]),
      mok_till_natag: formatDate(row[colMap.mok_till_natag])
    };

    const status = deriveStatus(dates);

    // Sidoavtal & Myndighetstillstånd
    const permits = [];
    if (row[colMap.abel07_sant] || row[colMap.abel07_ok]) {
      permits.push({
        permit_type: 'abel07',
        title: 'ABEL07 Vägavtal',
        sent_date: formatDate(row[colMap.abel07_sant]),
        approved_date: formatDate(row[colMap.abel07_ok]),
        status: row[colMap.abel07_ok] ? 'approved' : 'sent'
      });
    }
    if (row[colMap.korsning_sant] || row[colMap.korsning_ok]) {
      permits.push({
        permit_type: 'crossing',
        title: 'Korsningsavtal',
        sent_date: formatDate(row[colMap.korsning_sant]),
        approved_date: formatDate(row[colMap.korsning_ok]),
        status: row[colMap.korsning_ok] ? 'approved' : 'sent'
      });
    }
    if (row[colMap.bygglov_sant] || row[colMap.bygglov_ok]) {
      permits.push({
        permit_type: 'building_permit',
        title: 'Bygglov',
        sent_date: formatDate(row[colMap.bygglov_sant]),
        approved_date: formatDate(row[colMap.bygglov_ok]),
        status: row[colMap.bygglov_ok] ? 'approved' : 'sent'
      });
    }
    if (row[colMap.lst_sant] || row[colMap.lst_ok]) {
      permits.push({
        permit_type: 'lst_samrad',
        title: 'Länsstyrelsen Samråd (12:6 MB)',
        sent_date: formatDate(row[colMap.lst_sant]),
        approved_date: formatDate(row[colMap.lst_ok]),
        status: row[colMap.lst_ok] ? 'approved' : 'sent'
      });
    }
    if (row[colMap.strandskydd_sant] || row[colMap.strandskydd_ok]) {
      permits.push({
        permit_type: 'beach_protection',
        title: 'Strandskyddsdispens',
        sent_date: formatDate(row[colMap.strandskydd_sant]),
        approved_date: formatDate(row[colMap.strandskydd_ok]),
        status: row[colMap.strandskydd_ok] ? 'approved' : 'sent'
      });
    }
    if (row[colMap.vatten_sant] || row[colMap.vatten_ok]) {
      permits.push({
        permit_type: 'water_activity',
        title: 'Vattenverksamhet',
        sent_date: formatDate(row[colMap.vatten_sant]),
        approved_date: formatDate(row[colMap.vatten_ok]),
        status: row[colMap.vatten_ok] ? 'approved' : 'sent'
      });
    }

    if (!rawAgare) {
      warnings.push(`Rad ${r + 1}: Markägarnamn saknas för fastighet ${rawFastighet || '(okänd)'}.`);
    }

    // Samla fastighet
    if (rawFastighet && !propertiesMap.has(rawFastighet)) {
      propertiesMap.set(rawFastighet, {
        designation: rawFastighet,
        municipality: kommun,
        property_type: typ,
        type_code: typkod,
        fnr: fnr,
        assessed_owner: taxeradAgare
      });
    }

    landowners.push({
      row_index: r + 1,
      name: rawAgare || `Ägare till ${rawFastighet || 'fastighet'}`,
      personal_number: personalNumber,
      raw_personal_number: rawPnr ? String(rawPnr).trim() : '',
      share: andel,
      address: [adress, postnummer].filter(Boolean).join(', ') || adress,
      postal_code_city: postnummer,
      phone: phone,
      email: email,
      bank_account: bankAccount,
      status: status,
      notes: anmarkning,
      lm_case_number: dates.mua_arendenummer,
      compensation_sum: compensationSum,
      intrusion: intrusion,
      property_designation: rawFastighet,
      dates: dates,
      permits: permits
    });
  }

  return {
    metadata,
    summary: {
      total_rows: landowners.length,
      unique_properties: propertiesMap.size,
      total_compensation: landowners.reduce((sum, lo) => sum + (lo.compensation_sum || 0), 0),
      status_counts: landowners.reduce((acc, lo) => {
        acc[lo.status] = (acc[lo.status] || 0) + 1;
        return acc;
      }, {})
    },
    properties: Array.from(propertiesMap.values()),
    landowners,
    warnings
  };
}

/**
 * Genererar en Vattenfall-standard Excel-fil utifrån systemets projektdata
 */
function generateVattenfallSpreadsheet(project, landowners = [], properties = [], permits = []) {
  const wb = xlsx.utils.book_new();
  const rows = [];

  // Rad 0 - 8: Metadata
  rows[0] = ['', 'OBS', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Förteckning över samtliga fastighetsägare, berörda av planerad ombygnadtion av distributionsnät.'];
  rows[1] = ['', 'Infoga kommentarer för markslag vid nätstationer och kabelskåp', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Berörda fastigheter ligger inom ${project.municipality || ''}`];
  rows[2] = ['', 'Infoga kommentarer om lämpligt språk i skriftväxling med utlänska fastighetsägare', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Nätägare: ${project.network_owner || 'Vattenfall Eldistribution AB'}`];
  rows[3] = ['', 'Infoga kommentarer om värderings frågor ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Ledningslittera: ${project.line_littera || ''}`];
  rows[4] = ['', 'Infoga kommentarer om eventuellt borttaget intrång <30år', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Nätstation-er(nr): ${project.substation_numbers || ''}`];
  rows[5] = ['', 'Infoga kommentarer om eventuellt tillfällig skada', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Nis nummer: ${project.nis_number || ''}`];
  rows[6] = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Projektnamn: ${project.name || ''}`];
  rows[7] = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Projektledare på Vattenfall Eldistribution AB: ${project.client_pm || ''}`];
  rows[8] = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', `Beredare Nektab/Avtalshantering: ${project.lead_preparer || ''}`];

  // Rad 9 - 13: Tabellhuvud
  rows[9] = ['', 'Ref nr', '', 'Nätstation nr', '', 'Nytt intrång', '', '', '', 'Egen', 'Ersätt.', 'Nytt intrång', '', '', '', '', '', '', '', ''];
  rows[10] = ['', '', '', '', '', 'jordkabel', '', '', '', 'Servis', 'tillfällig', 'luftledning', '', '', '', '', '', '', '', ''];
  rows[11] = ['', 'S nr', 'Alla nr', 'S nr', 'Alla nr', 'Ny', 'Ny', 'Ny', 'Nytt', '', 'skada', 'Ny', 'Ny', 'Ras', 'Ras', '', '', '', '', ''];
  rows[12] = [
    '', 'Hsp', 'Hsp', 'Lsp', 'Lsp', '24', 'Nä', '0.4', 'K.S', '', '', '24', '0.4', 'Hsp', 'Lsp', 'Anl.',
    'Kommun', 'Fastighet', 'Typ', 'Typkod', 'Ägare', 'Andel', 'MUA', 'MÖK', 'Person', 'Fastighetsnr',
    'Adress', 'Postnummer', 'Tele', 'Bank', 'E-post', 'Taxerad ägare', 'Anmärkning',
    'brev', 'OK', 'Sänt', 'OK', 'Påmin', 'Till IM', 'Inskrivet', 'Ärendenummer', 'Till Nätäg',
    'Sänt', 'OK', 'Påmin', 'Till Nätäg', 'INFO Sänt', 'INFO Sänt', 'ÖK Sänt', 'OK',
    'REV Sänt', 'OK', 'ABEL07 Sänt', 'OK', 'Korsning Sänt', 'OK', 'Bygglov Sänt', 'OK',
    'LST Sänt', 'OK', 'Strand Sänt', 'OK', 'Vatten Sänt', 'OK'
  ];
  rows[13] = ['', '', '', '', '', 'm', 'st', 'm', 'st', 'm', 'Kr', 'm', 'm', 'x', 'x'];

  // Indexera fastigheter och tillstånd
  const permitsByLandowner = new Map();
  for (const perm of permits) {
    if (!permitsByLandowner.has(perm.landowner_id)) {
      permitsByLandowner.set(perm.landowner_id, {});
    }
    permitsByLandowner.get(perm.landowner_id)[perm.permit_type] = perm;
  }

  // Fyll på datarader
  for (const lo of landowners) {
    let calc = {};
    try {
      calc = lo.calculator_data ? JSON.parse(lo.calculator_data) : {};
    } catch {
      calc = {};
    }

    const loPermits = permitsByLandowner.get(lo.id) || {};
    const prop = properties.find(p => p.landowner_id === lo.id) || {};

    const dataRow = new Array(64).fill('');
    dataRow[5] = calc.cable_hsp_m || '';
    dataRow[6] = calc.substations_count || '';
    dataRow[7] = calc.cable_lsp_m || '';
    dataRow[8] = calc.cabinets_count || '';
    dataRow[9] = calc.service_cable_m || '';
    dataRow[10] = calc.temp_damage_comp || '';
    dataRow[11] = calc.overhead_hsp_m || '';
    dataRow[12] = calc.overhead_lsp_m || '';
    dataRow[13] = calc.demolish_hsp ? 'x' : '';
    dataRow[14] = calc.demolish_lsp ? 'x' : '';
    dataRow[15] = calc.facility_ref || '';

    dataRow[16] = prop.municipality || project.municipality || '';
    dataRow[17] = prop.designation || '';
    dataRow[18] = prop.property_type || '';
    dataRow[19] = prop.type_code || '';
    dataRow[20] = lo.name || '';
    dataRow[21] = lo.share || '1/1';
    dataRow[22] = 'x';
    dataRow[24] = lo.personal_number || '';
    dataRow[25] = prop.fnr || '';
    dataRow[26] = lo.address || '';
    dataRow[28] = lo.phone || '';
    dataRow[29] = lo.bank_account || '';
    dataRow[30] = lo.email || '';
    dataRow[31] = prop.assessed_owner || '';
    dataRow[32] = lo.notes || '';

    // Statusdatum
    if (lo.status === 'posted' || lo.status === 'received' || lo.status === 'signed' || lo.status === 'easement') {
      dataRow[35] = lo.created_at ? lo.created_at.split('T')[0] : '';
    }
    if (lo.status === 'signed' || lo.status === 'easement' || lo.status === 'paid') {
      dataRow[36] = lo.completed_at ? lo.completed_at.split('T')[0] : '';
    }
    if (lo.status === 'easement') {
      dataRow[39] = lo.completed_at ? lo.completed_at.split('T')[0] : '';
    }
    dataRow[40] = lo.lm_case_number || '';

    // Sidoavtal
    if (loPermits.abel07) {
      dataRow[52] = loPermits.abel07.sent_date || '';
      dataRow[53] = loPermits.abel07.approved_date || '';
    }
    if (loPermits.crossing) {
      dataRow[54] = loPermits.crossing.sent_date || '';
      dataRow[55] = loPermits.crossing.approved_date || '';
    }
    if (loPermits.building_permit) {
      dataRow[56] = loPermits.building_permit.sent_date || '';
      dataRow[57] = loPermits.building_permit.approved_date || '';
    }
    if (loPermits.lst_samrad) {
      dataRow[58] = loPermits.lst_samrad.sent_date || '';
      dataRow[59] = loPermits.lst_samrad.approved_date || '';
    }
    if (loPermits.beach_protection) {
      dataRow[60] = loPermits.beach_protection.sent_date || '';
      dataRow[61] = loPermits.beach_protection.approved_date || '';
    }
    if (loPermits.water_activity) {
      dataRow[62] = loPermits.water_activity.sent_date || '';
      dataRow[63] = loPermits.water_activity.approved_date || '';
    }

    rows.push(dataRow);
  }

  const sheet = xlsx.utils.aoa_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, sheet, `Mäfört ${project.nis_number || 'Vattenfall'}`);
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  parseVattenfallFile,
  generateVattenfallSpreadsheet,
  normalizePersonalNumber,
  formatDate,
  calculateEbrCompensation,
  deriveStatus
};
