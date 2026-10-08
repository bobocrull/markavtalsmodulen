const https = require('https');

/**
 * Kleer Ekonomisystem Integration Service
 * 
 * Tillhandahåller:
 * 1. Direktöverföring via Kleer REST API (eller mockup-läge)
 * 2. Kleer-kompatibel CSV-export för manuell filinläsning
 * 3. SIE-4 bokföringsorder/verifikat för Kleers huvudbok
 */

/**
 * Synkroniserar en bunt utbetalningar direkt till Kleer
 */
async function syncToKleer(project, landowners) {
  if (!landowners || landowners.length === 0) {
    throw new Error('Inga markägare angivna för utbetalning.');
  }

  const kleerApiKey = process.env.KLEER_API_KEY;
  const kleerApiUrl = process.env.KLEER_API_URL;

  const validTransactions = landowners.filter(lo => (lo.compensation_sum || 0) > 0);
  if (validTransactions.length === 0) {
    throw new Error('Inga av de valda markägarna har ett ersättningsbelopp över 0 kr.');
  }

  const totalAmount = validTransactions.reduce((acc, lo) => acc + (parseFloat(lo.compensation_sum) || 0), 0);

  // Om API-nyckel finns: Utför anrop till Kleer API
  if (kleerApiKey && kleerApiKey.trim() !== '') {
    return callKleerApi(project, validTransactions, totalAmount, kleerApiKey, kleerApiUrl);
  }

  // Mockup-läge: Generera realistisk kvittens från Kleer
  const batchId = `KLEER-BUNT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
  const verNumber = `V-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    success: true,
    batch_id: batchId,
    verification_number: verNumber,
    system: 'Kleer Ekonomisystem',
    status: 'Mottagen & Attesterad',
    message: `Utbetalningsorder för ${validTransactions.length} markägare på totalt ${totalAmount.toLocaleString('sv-SE')} kr har skapats i Kleer.`,
    project_name: project.name,
    transactions_count: validTransactions.length,
    total_amount: totalAmount,
    accounting_accounts: {
      debet: '6990 (Markintrång och servitut)',
      kredit: '1930 (Företagskonto / Utbetalningar)'
    },
    transferred_at: new Date().toISOString(),
    is_mock: true
  };
}

/**
 * Genererar Kleer-anpassad CSV-fil för utbetalning
 */
function generateKleerCsv(project, landowners) {
  const headers = [
    'Mottagarnamn',
    'Personnummer',
    'Bankkonto',
    'Belopp_SEK',
    'Kostnadskonto',
    'Motkonto',
    'Projektreferens',
    'Fastighetsbeteckning',
    'Arende_ID',
    'Bokforingstext'
  ];

  const rows = landowners
    .filter(lo => (lo.compensation_sum || 0) > 0)
    .map(lo => {
      const cleanName = (lo.name || '').replace(/;/g, ',');
      const cleanPnr = lo.personal_number || '';
      const cleanBank = (lo.bank_account || '').replace(/;/g, ' ');
      const amount = (parseFloat(lo.compensation_sum) || 0).toFixed(2);
      const projRef = (project.name || '').replace(/;/g, ' ');
      const fastighet = (lo.properties_list || 'Fastighet').replace(/;/g, ' ');
      const arendeId = `LO-${lo.id}`;
      const text = `Markintrång ${fastighet} (${projRef})`;

      return [
        `"${cleanName}"`,
        `"${cleanPnr}"`,
        `"${cleanBank}"`,
        amount,
        '6990',
        '1930',
        `"${projRef}"`,
        `"${fastighet}"`,
        `"${arendeId}"`,
        `"${text}"`
      ].join(';');
    });

  return [headers.join(';'), ...rows].join('\r\n');
}

/**
 * Genererar en svensk standardiserad SIE-4 verifikatfil för Kleer
 */
function generateSie4(project, landowners) {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const verNum = Math.floor(1000 + Math.random() * 9000);
  const totalAmount = landowners.reduce((acc, lo) => acc + (parseFloat(lo.compensation_sum) || 0), 0);

  let lines = [];
  lines.push('#FLAGGA 0');
  lines.push('#PROGRAM "Markagarplattform MVP" 2.0');
  lines.push('#FORMAT PC8');
  lines.push(`#GEN ${dateStr}`);
  lines.push('#SIETYP 4');
  lines.push(`#FNAMN "${project.name}"`);
  lines.push('#VALUTA SEK');
  lines.push(`\n#VER A ${verNum} ${dateStr} "Utbetalning Markintrång - ${project.name}"`);
  lines.push('{');

  // Debetpost: Konto 6990 (Markintrång och servitut)
  lines.push(`  #TRANS 6990 {} ${totalAmount.toFixed(2)} ${dateStr} "Intrångsersättning ${landowners.length} markägare"`);

  // Kreditpost: Konto 1930 (Företagskonto)
  lines.push(`  #TRANS 1930 {} -${totalAmount.toFixed(2)} ${dateStr} "Utbetalning från projektkonto"`);

  lines.push('}');

  return lines.join('\r\n');
}

/**
 * Gör ett skarpt REST-anrop till Kleer API
 */
function callKleerApi(project, transactions, totalAmount, apiKey, apiUrl) {
  return new Promise((resolve, reject) => {
    const targetUrl = new URL(apiUrl || 'https://api.kleer.se/v1/payout-batches');
    const postData = JSON.stringify({
      project_name: project.name,
      project_id: project.id,
      total_amount: totalAmount,
      currency: 'SEK',
      payouts: transactions.map(lo => ({
        recipient_name: lo.name,
        personal_number: lo.personal_number,
        bank_account: lo.bank_account,
        amount: parseFloat(lo.compensation_sum) || 0,
        reference: `LO-${lo.id}`,
        property: lo.properties_list
      }))
    });

    const req = https.request({
      hostname: targetUrl.hostname,
      port: targetUrl.port || 443,
      path: targetUrl.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`Kleer API error (${res.statusCode}): ${body}`));
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

module.exports = {
  syncToKleer,
  generateKleerCsv,
  generateSie4
};
