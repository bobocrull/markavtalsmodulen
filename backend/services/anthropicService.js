let Anthropic = null;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (e) {
  console.warn('Varning: @anthropic-ai/sdk kunde inte laddas i runtime:', e.message);
}
const fs = require('fs');
const path = require('path');

let anthropicClient = null;

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return null;
  }
  if (!Anthropic) {
    try {
      Anthropic = require('@anthropic-ai/sdk');
    } catch (e) {
      console.warn('@anthropic-ai/sdk inte tillgänglig:', e.message);
      return null;
    }
  }
  if (!anthropicClient || anthropicClient.apiKey !== apiKey) {
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

function isConfigured() {
  const key = process.env.ANTHROPIC_API_KEY;
  return Boolean(key && key.trim().length > 10);
}

/**
 * 1. AI-VISION SIGNATUR- & RETURGRANSKARE
 * Läser inscannat markupplåtelseavtal (MUA) med Claude 3.5 Sonnet Vision.
 * Kontrollerar:
 * - Har samtliga förväntade delägare skrivit under?
 * - Har någon skrivit i nätägarens/ledningsägarens ruta (klassisk felkälla)?
 * - Finns datum ifyllt?
 * - Finns bankkonto/clearing ifyllt för utbetalning?
 * - Finns det handskrivna reservationer/ändringar i marginalerna?
 */
async function analyzeScannedAgreement({ imageBuffer, mimeType = 'image/jpeg', projectContext = {}, landownerContext = {} }) {
  const client = getClient();
  const expectedOwners = landownerContext.owners || [landownerContext.name || 'Fastighetsägaren'];
  const propertyDesignation = landownerContext.property || 'Fastigheten';

  // Fallback simulator om ingen nyckel lagts till ännu
  if (!client) {
    const isMultiOwner = expectedOwners.length > 1;
    return {
      simulated: true,
      status: 'approved',
      all_signatures_present: true,
      signatures_detected: expectedOwners.map((owner, idx) => ({
        owner_name: owner,
        signature_found: true,
        confidence: 'high',
        row: idx + 1
      })),
      signed_in_network_owner_box: false,
      has_signature_date: true,
      signature_date: new Date().toISOString().split('T')[0],
      bank_account_found: true,
      clearing_number: '8105-9',
      account_number: '924 112 344',
      margin_notes: '',
      has_alterations: false,
      summary: `Inscannat avtal för ${propertyDesignation} granskat. Alla namnteckningar (${expectedOwners.join(', ')}) finns på korrekt fastighetsägarrad. Inga otillåtna reservationer i marginaler. Bankkonto identifierat.`,
      recommendation: 'Godkänd för arkivering och utbetalning i Kleer.'
    };
  }

  const base64Data = imageBuffer.toString('base64');
  const validMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const safeMime = validMimes.includes(mimeType) ? mimeType : 'image/jpeg';

  const systemPrompt = `Du är en svensk juridisk och administrativ granskningsexpert för markupplåtelseavtal (MUA), ledningsrätt och infrastrukturprojekt (Vattenfall, Ellevio, E.ON, Nektab).
Din uppgift är att noggrant syna en inskannad sida av ett undertecknat markavtal och svara med strikt strukturerad JSON.
Fokusera särskilt på:
1. Är samtliga förväntade fastighetsägare undertecknade med handskriven namnteckning?
2. Har någon undertecknat i FEL ruta, specifikt i "Ledningsägarens underskrift" / "Nätägarens underskrift" istället för fastighetsägarens ruta? (Detta är ett mycket vanligt misstag och gör avtalet ogiltigt).
3. Finns datum ifyllt?
4. Finns bankkontouppgifter (clearing- och kontonummer) ifyllt för ersättningsutbetalning?
5. Finns det några handskrivna tillägg, reservationer eller överstrykningar i marginaler eller avtalstext?

Svara ENDAST med ett giltigt JSON-objekt enligt följande struktur:
{
  "status": "approved" | "flagged_missing_signature" | "flagged_wrong_box" | "flagged_alteration",
  "all_signatures_present": boolean,
  "signatures_detected": [
    { "owner_name": string, "signature_found": boolean, "confidence": "high"|"medium"|"low", "row": number }
  ],
  "signed_in_network_owner_box": boolean,
  "has_signature_date": boolean,
  "signature_date": string,
  "bank_account_found": boolean,
  "clearing_number": string,
  "account_number": string,
  "margin_notes": string,
  "has_alterations": boolean,
  "summary": string,
  "recommendation": string
}`;

  const promptText = `Granska detta inskannade avtal för fastighet: ${propertyDesignation}.
Förväntade lagfarna delägare som måste signera: ${expectedOwners.join(', ')}.
Projekt: ${projectContext.name || 'Ledningsprojekt'} (Nätägare: ${projectContext.network_owner || 'Vattenfall Eldistribution'}).`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: safeMime,
                data: base64Data
              }
            },
            {
              type: 'text',
              text: promptText
            }
          ]
        }
      ]
    });

    const responseText = response.content?.[0]?.text || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(responseText);
  } catch (err) {
    console.error('Claude Vision fel vid avtalsanalys:', err);
    throw new Error(`Kunde inte granska avtalet via Anthropic: ${err.message}`);
  }
}

/**
 * 2. ETT-KLICKS VECKORAPPORT TILL NÄTÄGARE (Vattenfall / Ellevio PM)
 * Genererar en komplett lägesrapport för projektadministratören att skicka till nätägarens projektledare.
 */
async function generateWeeklyReport({ project, stats = {}, landowners = [], permits = [] }) {
  const client = getClient();
  const total = landowners.length;
  const signed = landowners.filter(l => ['signed', 'paid', 'easement'].includes(l.status)).length;
  const percent = total > 0 ? Math.round((signed / total) * 100) : 0;
  const missing = landowners.filter(l => !['signed', 'paid', 'easement'].includes(l.status));
  const estates = landowners.filter(l => (l.notes || '').toLowerCase().includes('dödsbo') || (l.name || '').toLowerCase().includes('dödsbo'));

  if (!client) {
    return {
      simulated: true,
      generated_at: new Date().toISOString(),
      recipient: project.client_pm || 'Projektledare Vattenfall',
      subject: `Lägesrapport vecka ${getWeekNumber(new Date())}: ${project.name} (NIS: ${project.nis_number || 'N/A'})`,
      summary: `Projektet har nått ${percent}% signeringsgrad (${signed} av ${total} markägare klara). Under den senaste perioden har beredningsarbetet fortskridit enligt tidsplan.`,
      highlights: [
        `${signed} av ${total} markägaravtal är färdigtecknade och validerade.`,
        `${permits.length} st tillståndsärenden och sidoavtal är kartlagda.`,
        `Inga akuta markägartvister har eskalerats till expropriationshot.`
      ],
      bottlenecks: missing.slice(0, 4).map(m => `Fastighet ${m.property_designation || m.name}: Avtal utskickat, inväntar retur eller kontakt.`),
      next_steps: [
        'Genomföra påminnelseutskick 2 för resterande oinlämnade avtal.',
        'Kvalitetsgranska inkomna fullmakter för eventuella dödsbon.',
        'Initiera första utbetalningsbunten i Kleer för godkända avtal.'
      ],
      estimated_completion: 'Enligt ordinarie etapptidsplan'
    };
  }

  const prompt = `Skapa en professionell lägesrapport / veckorapport från Nektab till Vattenfall/nätägarens projektledare.
Projektdata:
- Projektnamn: ${project.name}
- NIS-nummer: ${project.nis_number || 'Ej angivet'}
- Nätägare: ${project.network_owner || 'Vattenfall Eldistribution'}
- Kommun: ${project.municipality || 'Ej angivet'}
- Beredare Nektab: ${project.lead_preparer || 'Beredningsansvarig'}
- Projektledare kund: ${project.client_pm || 'Projektledare'}
- Totala markägare: ${total}
- Signerade/klara: ${signed} (${percent}%)
- Väntande ärenden (${missing.length} st): ${missing.slice(0, 5).map(m => `${m.name} (${m.status})`).join(', ')}
- Registrerade tillstånd: ${permits.map(p => `${p.title} (${p.status})`).join(', ') || 'Inga'}

Skriv en formell, koncis och förtroendeingivande rapport med följande sektioner (i ren JSON):
{
  "subject": string,
  "summary": string,
  "highlights": string[],
  "bottlenecks": string[],
  "next_steps": string[],
  "estimated_completion": string
}`;

  try {
    const res = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1800,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = res.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  } catch (err) {
    console.error('Claude fel vid rapportgenerering:', err);
    throw new Error(`Kunde inte generera rapport via Anthropic: ${err.message}`);
  }
}

/**
 * 3. PRE-FLIGHT AUDIT INNAN LEVERANS TILL LANTMÄTERIET / NÄTÄGAREN
 * Granskar hela projektet och varnar för brister som kan ge avvisning eller kompletteringsföreläggande.
 */
async function auditProjectDelivery({ project, landowners = [], permits = [] }) {
  const issues = [];
  const warnings = [];
  const passed = [];

  landowners.forEach((lo) => {
    const isSigned = ['signed', 'paid', 'easement'].includes(lo.status);
    
    // 1. Saknas bankkonto vid signerat avtal?
    if (isSigned && (!lo.bank_account || lo.bank_account.trim() === '')) {
      warnings.push({
        type: 'missing_bank',
        severity: 'medium',
        property: lo.properties_list || lo.property_designation || lo.name,
        landowner: lo.name,
        message: 'Avtalet är signerat men bankkontouppgifter saknas för ersättningsutbetalning.'
      });
    }

    // 2. Personnummer saknas eller ogiltigt format?
    if (!lo.personal_number || lo.personal_number.length < 10) {
      issues.push({
        type: 'missing_pnum',
        severity: 'high',
        property: lo.properties_list || lo.property_designation || lo.name,
        landowner: lo.name,
        message: 'Personnummer saknas eller är ofullständigt. Lantmäteriet kräver personnummer för inskrivning.'
      });
    }

    // 3. Dödsbo utan anteckning om fullmakt?
    const isEstate = (lo.name || '').toLowerCase().includes('dödsbo') || (lo.notes || '').toLowerCase().includes('dödsbo');
    if (isEstate && !(lo.notes || '').toLowerCase().includes('fullmakt')) {
      issues.push({
        type: 'estate_missing_power_of_attorney',
        severity: 'high',
        property: lo.properties_list || lo.property_designation || lo.name,
        landowner: lo.name,
        message: 'Fastigheten ägs av dödsbo men saknar registrerad fullmakt/bouppteckning.'
      });
    }

    // 4. Ersättningssumma saknas?
    if ((lo.compensation_sum || 0) <= 0 && isSigned) {
      warnings.push({
        type: 'zero_compensation',
        severity: 'low',
        property: lo.properties_list || lo.property_designation || lo.name,
        landowner: lo.name,
        message: 'Ersättningsbeloppet är 0 kr. Kontrollera om vederlagsfri upplåtelse eller missad kalkyl.'
      });
    }

    if (isSigned && lo.personal_number && (lo.bank_account || lo.compensation_sum === 0)) {
      passed.push({
        property: lo.properties_list || lo.name,
        landowner: lo.name,
        message: 'Fullständigt granskad och redo för inskrivningsakt.'
      });
    }
  });

  // Kontrollera tillstånd
  permits.forEach((p) => {
    if (p.status === 'Ansökt' || p.status === 'Ej påbörjad') {
      warnings.push({
        type: 'unresolved_permit',
        severity: 'medium',
        property: 'Projektövergripande',
        landowner: p.authority || 'Myndighet',
        message: `Tillstånd '${p.title}' har status '${p.status}'. Måste vinna laga kraft innan schaktstart.`
      });
    }
  });

  const client = getClient();
  let aiExecutiveReview = '';

  if (client) {
    try {
      const prompt = `Gör en kort, skarp revisionssammanfattning (2-3 meningar) för en projektadministratör inför slutleverans av projekt ${project.name} till Lantmäteriet.
Identifierade avvikelser: ${issues.length} allvarliga fel, ${warnings.length} varningar. Godkända: ${passed.length} st.`;
      const res = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 350,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }]
      });
      aiExecutiveReview = res.content?.[0]?.text || '';
    } catch (e) {
      console.warn('AI executive review failed:', e.message);
    }
  }

  if (!aiExecutiveReview) {
    aiExecutiveReview = issues.length === 0
      ? 'Projektet uppfyller formkraven för slutleverans till Lantmäteriet och arkivering.'
      : `Projektet har ${issues.length} kritiska formfel som måste åtgärdas för att undvika kompletteringsföreläggande från Lantmäteriet.`;
  }

  return {
    projectName: project.name,
    nisNumber: project.nis_number,
    auditDate: new Date().toISOString(),
    isReadyForDelivery: issues.length === 0,
    summary: {
      criticalIssuesCount: issues.length,
      warningsCount: warnings.length,
      passedCount: passed.length,
      readinessPercent: Math.round((passed.length / Math.max(1, landowners.length)) * 100)
    },
    aiExecutiveReview,
    criticalIssues: issues,
    warnings,
    passed
  };
}

/**
 * 4. DÖDSBO- & FULLMAKTSANALYS
 * Läser inscannad bouppteckning och fullmakter, listar alla arvingar och jämför mot de som signerat.
 */
async function analyzeEstateDocument({ imageBuffer, mimeType = 'image/jpeg', propertyDesignation, expectedOwners = [] }) {
  const client = getClient();

  if (!client) {
    return {
      simulated: true,
      propertyDesignation,
      estate_deceased_name: 'Karl Göran Lindqvist',
      estate_date_of_death: '2025-11-14',
      heirs_identified: [
        { name: 'Mikael Lindqvist', share: '1/3', personal_number: '19740512-XXXX', power_of_attorney_present: true },
        { name: 'Sara Lindqvist', share: '1/3', personal_number: '19780820-XXXX', power_of_attorney_present: true },
        { name: 'Karin Nilsson', share: '1/3', personal_number: '19820215-XXXX', power_of_attorney_present: false }
      ],
      is_complete: false,
      missing_heirs: ['Karin Nilsson'],
      summary: 'Bouppteckningen fastställer 3 dödsbodelägare. Fullmakt finns från Mikael och Sara, men fullmakt från Karin Nilsson saknas fortfarande.',
      recommendation: 'Skicka fullmaktsblankett till Karin Nilsson innan avtalet skickas till Lantmäteriet.'
    };
  }

  const base64Data = imageBuffer.toString('base64');
  const safeMime = ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) ? mimeType : 'image/jpeg';

  const systemPrompt = `Du är en svensk jurist specialiserad på dödsbon, bouppteckningar och fastighetsrätt.
Analysera det bifogade dokumentet (bouppteckning eller fullmakt) och extrahera:
1. Den avlidnes namn och dödsdatum.
2. Samtliga dödsbodelägare och deras arvslotter/andelar.
3. Vilka delägare som har godkänt/undertecknat fullmakt.
4. Vilka delägare som saknar fullmakt.

Svara ENDAST med ett giltigt JSON-objekt:
{
  "estate_deceased_name": string,
  "estate_date_of_death": string,
  "heirs_identified": [
    { "name": string, "share": string, "personal_number": string, "power_of_attorney_present": boolean }
  ],
  "is_complete": boolean,
  "missing_heirs": string[],
  "summary": string,
  "recommendation": string
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      temperature: 0.1,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: safeMime, data: base64Data }
            },
            {
              type: 'text',
              text: `Analysera denna bouppteckning/fullmakt för fastighet: ${propertyDesignation}.`
            }
          ]
        }
      ]
    });

    const text = response.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  } catch (err) {
    console.error('Claude bouppteckningsanalys fel:', err);
    throw new Error(`Kunde inte analysera bouppteckning via Anthropic: ${err.message}`);
  }
}

/**
 * 5. ADMINISTRATIV MORGON-RADAR (Portfolio Overview)
 * Sammanfattar vad projektadministratören bör prioritera idag över alla projekt.
 */
async function generatePortfolioRadar({ projects = [], stats = {}, pendingReturns = [] }) {
  const client = getClient();
  const activeProjectsCount = projects.length;
  const totalLandowners = projects.reduce((acc, p) => acc + (p.total_landowners || 0), 0);
  const totalSigned = projects.reduce((acc, p) => acc + (p.signed_landowners || 0), 0);

  // Samla åtgärder
  const urgentItems = [];
  if (pendingReturns && pendingReturns.length > 0) {
    urgentItems.push({
      priority: 'high',
      title: `${pendingReturns.length} inkomna avtal väntar på attest & granskning`,
      description: `Bland annat för ${pendingReturns.map(r => r.name).slice(0, 3).join(', ')}.`,
      action: 'Öppna Inkorgen och granska'
    });
  }

  // Identifiera projekt med låg framdrift
  projects.forEach((p) => {
    if (p.total_landowners > 0 && (p.signed_landowners / p.total_landowners) < 0.3) {
      urgentItems.push({
        priority: 'medium',
        title: `Låg framdrift i ${p.name}`,
        description: `Endast ${p.signed_landowners} av ${p.total_landowners} avtal klara. Påminnelseomgång 1 rekommenderas.`,
        action: `Gå till ${p.name}`
      });
    }
  });

  let aiBriefing = '';
  if (client) {
    try {
      const prompt = `Skapa en personlig, uppmuntrande och skarp morgonbriefing (3 meningar) för en svensk projektadministratör som hanterar ${activeProjectsCount} infrastrukturprojekt med totalt ${totalLandowners} markägare (${totalSigned} klara). ${pendingReturns.length} avtal väntar på attest idag.`;
      const res = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }]
      });
      aiBriefing = res.content?.[0]?.text || '';
    } catch (e) {
      console.warn('AI Radar briefing failed:', e.message);
    }
  }

  if (!aiBriefing) {
    aiBriefing = `God morgon! Du har ${activeProjectsCount} aktiva projekt igång. ${totalSigned} av ${totalLandowners} avtal är klara (${Math.round((totalSigned / Math.max(1, totalLandowners)) * 100)}%). Idag har du ${pendingReturns.length} inkomna returer att attestera i inkorgen.`;
  }

  return {
    date: new Date().toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    aiBriefing,
    metrics: {
      activeProjectsCount,
      totalLandowners,
      totalSigned,
      overallProgress: totalLandowners > 0 ? Math.round((totalSigned / totalLandowners) * 100) : 0,
      pendingAttestCount: pendingReturns.length
    },
    urgentItems
  };
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
  isConfigured,
  analyzeScannedAgreement,
  generateWeeklyReport,
  auditProjectDelivery,
  analyzeEstateDocument,
  generatePortfolioRadar
};
