const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Genererar ett komplett postalt avtalspaket:
 * 1. Sida 1: Separat "Instruktions- & Spegelblad" (Följebrev som guidar underskriften så originalet förblir 100% juridiskt rent).
 * 2. Sida 2-N: Det rena juridiska Originalavtalet (MUA) med valbar förtryckning av delägarnamn under linjerna.
 */
async function generateAgreementPackage({
  project,
  landowner,
  properties = [],
  valuation = {},
  includePreprintedLines = false,
  customInstructions = ''
}) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Färger
  const darkSlate = rgb(0.08, 0.12, 0.18);
  const textDark = rgb(0.12, 0.15, 0.20);
  const textMuted = rgb(0.4, 0.45, 0.52);
  const brandGreen = rgb(0.22, 0.65, 0.42); // Nektab-grön
  const lightBg = rgb(0.96, 0.97, 0.98);
  const alertRed = rgb(0.85, 0.2, 0.2);
  const alertBg = rgb(0.99, 0.94, 0.94);
  const yellowGuide = rgb(0.98, 0.92, 0.72);
  const yellowBorder = rgb(0.92, 0.75, 0.25);

  const propertyNames = properties.map(p => p.designation).filter(Boolean).join(', ') || 'Enligt förteckning';
  const ownerName = landowner.name || 'Fastighetsägare';
  const compensationSum = valuation.compensation_sum || landowner.compensation_sum || 0;
  const nisNumber = project.nis_number || 'NIS-Saknas';
  const networkOwner = project.network_owner || 'Vattenfall Eldistribution AB';

  // Identifiera delägare om det finns kommatecken eller "och"
  let coOwners = [ownerName];
  if (ownerName.includes(' och ')) {
    coOwners = ownerName.split(' och ').map(s => s.trim());
  } else if (ownerName.includes(',')) {
    coOwners = ownerName.split(',').map(s => s.trim());
  }

  // =========================================================================
  // SIDA 1: DET SEPARATA INSTRUKTIONS- & SPEGELBLADET (FÖLJEBREVET)
  // =========================================================================
  const guidePage = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width: pWidth, height: pHeight } = guidePage.getSize();

  // Sidhuvud - Märkning
  guidePage.drawRectangle({
    x: 40, y: pHeight - 75, width: pWidth - 80, height: 45,
    color: lightBg, borderColor: brandGreen, borderWidth: 1
  });
  guidePage.drawText('INSTRUKTION FÖR UNDERTECKNANDE AV AVTAL', {
    x: 55, y: pHeight - 50, size: 13, font: fontBold, color: brandGreen
  });
  guidePage.drawText(`Projekt: ${project.name} | Nätägare: ${networkOwner} | NIS: ${nisNumber}`, {
    x: 55, y: pHeight - 65, size: 9, font: fontRegular, color: textMuted
  });

  // Mottagarruta
  guidePage.drawText('Till fastighetsägare för:', { x: 50, y: pHeight - 100, size: 9, font: fontBold, color: textMuted });
  guidePage.drawText(`Fastighet: ${propertyNames}`, { x: 50, y: pHeight - 116, size: 12, font: fontBold, color: darkSlate });
  guidePage.drawText(`Mottagare: ${ownerName}`, { x: 50, y: pHeight - 132, size: 10, font: fontRegular, color: textDark });
  if (landowner.address) {
    guidePage.drawText(`Postadress: ${landowner.address}`, { x: 50, y: pHeight - 146, size: 9, font: fontRegular, color: textMuted });
  }

  // Viktigt-meddelande
  guidePage.drawText('Viktigt: Behåll detta instruktionsblad som din egen kopia.', {
    x: pWidth - 280, y: pHeight - 100, size: 8.5, font: fontOblique, color: textMuted
  });
  guidePage.drawText('Endast det bifogade originalavtalet (sida 2-3) ska undertecknas och returneras.', {
    x: pWidth - 280, y: pHeight - 112, size: 8, font: fontRegular, color: textMuted
  });

  // Horisontell avskiljare
  guidePage.drawLine({
    start: { x: 50, y: pHeight - 160 }, end: { x: pWidth - 50, y: pHeight - 160 },
    thickness: 0.8, color: textMuted
  });

  // STEG-FÖR-STEG INSTRUKTION
  let stepY = pHeight - 180;
  guidePage.drawText('4 ENKLA STEG FÖR ATT DITT AVTAL SKA BLI GILTIGT:', {
    x: 50, y: stepY, size: 10.5, font: fontBold, color: darkSlate
  });

  const steps = [
    { num: '1', title: 'Läs igenom originalavtalet', desc: `Kontrollera sträckning, intrång och ersättning (${compensationSum.toLocaleString('sv-SE')} kr).` },
    { num: '2', title: 'Skriv under på sida 3 (Originalets sista sida)', desc: 'Skriv under med bläckpenna. OBS: Om ni är flera delägare måste ALLA skriva under!' },
    { num: '3', title: 'Fyll i ditt bankkonto för utbetalning', desc: 'Ange bank, clearing- och kontonummer längst ner på avtalssidan.' },
    { num: '4', title: 'Posta i bifogat svarskuvert', desc: 'Portot är redan betalt. Lägg det undertecknade originalet på brevlådan.' }
  ];

  stepY -= 20;
  steps.forEach(st => {
    guidePage.drawCircle({ x: 62, y: stepY + 3, size: 9, color: brandGreen });
    guidePage.drawText(st.num, { x: 59, y: stepY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    guidePage.drawText(st.title, { x: 80, y: stepY + 1, size: 9.5, font: fontBold, color: darkSlate });
    guidePage.drawText(st.desc, { x: 80, y: stepY - 11, size: 8.5, font: fontRegular, color: textDark });
    stepY -= 28;
  });

  // DEN VISUELLA SPEGELBILDEN / MINIATYREN
  stepY -= 8;
  guidePage.drawText('VISUELL GUIDE: SÅ HÄR SER SISTA SIDAN UT I ORIGINALAVTALET', {
    x: 50, y: stepY, size: 10, font: fontBold, color: brandGreen
  });

  stepY -= 15;
  // Ram för miniatyren
  const mirrorX = 50;
  const mirrorY = stepY - 260;
  const mirrorW = pWidth - 100;
  const mirrorH = 250;

  guidePage.drawRectangle({
    x: mirrorX, y: mirrorY, width: mirrorW, height: mirrorH,
    color: rgb(0.98, 0.99, 1.0), borderColor: rgb(0.7, 0.75, 0.82), borderWidth: 1
  });

  // Miniatyr-huvud
  guidePage.drawText('MINIATYR AV AVTALETS UNDERSKRIFTSSIDA (SIDA 3)', {
    x: mirrorX + 15, y: mirrorY + mirrorH - 18, size: 8, font: fontBold, color: textMuted
  });
  guidePage.drawLine({
    start: { x: mirrorX + 15, y: mirrorY + mirrorH - 24 },
    end: { x: mirrorX + mirrorW - 15, y: mirrorY + mirrorH - 24 },
    thickness: 0.5, color: rgb(0.8, 0.85, 0.9)
  });

  // RUTA 1: FASTIGHETSÄGARENS UNDERSKRIFT (MED GULA PILAR)
  const signBoxY = mirrorY + mirrorH - 120;
  guidePage.drawRectangle({
    x: mirrorX + 15, y: signBoxY, width: mirrorW - 30, height: 90,
    color: yellowGuide, borderColor: yellowBorder, borderWidth: 1.5
  });

  guidePage.drawText('>>> HÄR SKA DU OCH DINA DELÄGARE SKRIVA UNDER MED BLÄCKPENNA <<<', {
    x: mirrorX + 25, y: signBoxY + 72, size: 8, font: fontBold, color: rgb(0.5, 0.35, 0.05)
  });

  // Peka ut delägarna
  coOwners.slice(0, 2).forEach((co, idx) => {
    const lineOffset = idx * 26;
    guidePage.drawLine({
      start: { x: mirrorX + 45, y: signBoxY + 45 - lineOffset },
      end: { x: mirrorX + 240, y: signBoxY + 45 - lineOffset },
      thickness: 1, color: darkSlate
    });
    guidePage.drawText(`[Pil] Rad ${idx + 1}: Namnteckning för ${co}`, {
      x: mirrorX + 45, y: signBoxY + 34 - lineOffset, size: 7.5, font: fontBold, color: darkSlate
    });
  });

  guidePage.drawText('Datum & Ort: _____________________', {
    x: mirrorX + 270, y: signBoxY + 45, size: 7.5, font: fontRegular, color: textDark
  });

  // RUTA 2: FÖRBJUDEN RUTA (LEDNINGSÄGARENS UNDERSKRIFT)
  const forbiddenBoxY = mirrorY + 50;
  guidePage.drawRectangle({
    x: mirrorX + 15, y: forbiddenBoxY, width: (mirrorW - 30) / 2 - 5, height: 60,
    color: alertBg, borderColor: alertRed, borderWidth: 1
  });
  guidePage.drawText('STOPP! SKRIV INTE HÄR!', {
    x: mirrorX + 25, y: forbiddenBoxY + 46, size: 8, font: fontBold, color: alertRed
  });
  guidePage.drawText('Fältet "Ledningsägarens underskrift"', {
    x: mirrorX + 25, y: forbiddenBoxY + 32, size: 7.5, font: fontRegular, color: textDark
  });
  guidePage.drawText('Detta signeras av Vattenfall/Nektab vid mottagandet.', {
    x: mirrorX + 25, y: forbiddenBoxY + 18, size: 6.5, font: fontOblique, color: textMuted
  });

  // RUTA 3: BANKKONTO FÖR ERSÄTTNING
  const bankBoxX = mirrorX + 15 + (mirrorW - 30) / 2 + 5;
  guidePage.drawRectangle({
    x: bankBoxX, y: forbiddenBoxY, width: (mirrorW - 30) / 2 - 5, height: 60,
    color: lightBg, borderColor: brandGreen, borderWidth: 1
  });
  guidePage.drawText('BANKKONTO FÖR UTBETALNING', {
    x: bankBoxX + 10, y: forbiddenBoxY + 46, size: 8, font: fontBold, color: brandGreen
  });
  guidePage.drawText('Clearingnr: [____] Kontonr: [______________]', {
    x: bankBoxX + 10, y: forbiddenBoxY + 32, size: 7, font: fontRegular, color: textDark
  });
  guidePage.drawText(`Ersättningsbelopp: ${compensationSum.toLocaleString('sv-SE')} kr`, {
    x: bankBoxX + 10, y: forbiddenBoxY + 18, size: 7, font: fontBold, color: darkSlate
  });

  // Kontaktfot
  guidePage.drawRectangle({
    x: 40, y: 35, width: pWidth - 80, height: 45,
    color: lightBg, borderColor: rgb(0.85, 0.88, 0.92), borderWidth: 1
  });
  guidePage.drawText('Frågor om avtalet eller ledningsdragningen?', {
    x: 55, y: 64, size: 8.5, font: fontBold, color: darkSlate
  });
  guidePage.drawText(`Kontakta beredningsansvarig hos Nektab: ${project.lead_preparer || 'Beredningsavdelningen'} | Tel: 070-XXX XX XX`, {
    x: 55, y: 50, size: 8, font: fontRegular, color: textDark
  });
  guidePage.drawText('Vänligen returnera avtalet snarast för att inte försena nätförstärkningen i området.', {
    x: 55, y: 39, size: 7.5, font: fontOblique, color: textMuted
  });


  // =========================================================================
  // SIDA 2-3: DET RENODLADE JURIDISKA ORIGINALAVTALET (MUA)
  // 100% orört, rent och formellt giltigt för Lantmäteriets Inskrivningsmyndighet
  // =========================================================================
  const contractPage1 = pdfDoc.addPage([595.28, 841.89]);
  
  // Huvud på originalavtalet
  contractPage1.drawText('MARKUPPLÅTELSEAVTAL', {
    x: 50, y: pHeight - 65, size: 16, font: fontBold, color: darkSlate
  });
  contractPage1.drawText('Elektrisk starkströmsledning (EBR-standard)', {
    x: 50, y: pHeight - 82, size: 10, font: fontRegular, color: textMuted
  });
  contractPage1.drawLine({
    start: { x: 50, y: pHeight - 92 }, end: { x: pWidth - 50, y: pHeight - 92 },
    thickness: 1.5, color: darkSlate
  });

  // Avtalsparter
  let cY = pHeight - 115;
  contractPage1.drawText('MELLAN UNDERTECKNADE PARTER ÄR FÖLJANDE AVTAL TRÄFFAT:', {
    x: 50, y: cY, size: 8.5, font: fontBold, color: textMuted
  });

  cY -= 20;
  contractPage1.drawText('Ledningsägare (Koncessionshavare):', { x: 50, y: cY, size: 9, font: fontBold, color: darkSlate });
  contractPage1.drawText(`${networkOwner}, Org.nr: 556000-0000`, { x: 220, y: cY, size: 9, font: fontRegular, color: textDark });

  cY -= 18;
  contractPage1.drawText('Fastighetsägare / Upplåtare:', { x: 50, y: cY, size: 9, font: fontBold, color: darkSlate });
  contractPage1.drawText(`${ownerName} (${landowner.personal_number || 'Personnr ej angivet'})`, { x: 220, y: cY, size: 9, font: fontRegular, color: textDark });

  cY -= 18;
  contractPage1.drawText('Berörd fastighet:', { x: 50, y: cY, size: 9, font: fontBold, color: darkSlate });
  contractPage1.drawText(`${propertyNames}, ${project.municipality || 'Kommun'}`, { x: 220, y: cY, size: 9, font: fontRegular, color: textDark });

  cY -= 18;
  contractPage1.drawText('Projekt & Nätnummer:', { x: 50, y: cY, size: 9, font: fontBold, color: darkSlate });
  contractPage1.drawText(`${project.name} (NIS-ref: ${nisNumber})`, { x: 220, y: cY, size: 9, font: fontRegular, color: textDark });

  cY -= 25;
  contractPage1.drawLine({
    start: { x: 50, y: cY }, end: { x: pWidth - 50, y: cY },
    thickness: 0.5, color: rgb(0.8, 0.8, 0.8)
  });

  // Avtalsklausuler
  const clauses = [
    {
      title: '§ 1 Upplåtelsens omfattning och ändamål',
      text: 'Fastighetsägaren upplåter härmed till Ledningsägaren rätt att inom fastigheten för all framtid bibehålla, anlägga, förnya och underhålla elektrisk starkströmsledning jämte tillhörande transformatorstationer, kabelskåp och optokabel, i huvudsaklig överensstämmelse med bifogad kartskiss.'
    },
    {
      title: '§ 2 Intrång och arbetsområde',
      text: 'Upplåtelsen avser ett ledningsområde med rätt att utföra schaktning, kabelplöjning samt upplag av material under byggnadstiden. Arbetet ska utföras så skonsamt som möjligt med hänsyn till pågående markanvändning.'
    },
    {
      title: '§ 3 Ersättning',
      text: `För upplåtelsen och intrånget erlägger Ledningsägaren en engångsersättning om sammanlagt ${compensationSum.toLocaleString('sv-SE')} SEK enligt gällande EBR-avtal (Elnätets beräknings- och ersättningsnormer). Beloppet utbetalas inom 30 dagar efter att detta avtal undertecknats av båda parter.`
    },
    {
      title: '§ 4 Skadereglering och markåterställning',
      text: 'Eventuella skador på mark, gröda, skog eller anläggningar (t.ex. täckdikning) som uppkommer vid anläggnings- eller underhållsarbeten ersätts särskilt av Ledningsägaren efter besiktning i samråd med fastighetsägaren.'
    },
    {
      title: '§ 5 Servitut och ledningsrätt',
      text: 'Fastighetsägaren medger att detta avtal får inskrivas som servitut i fastighetsregistret hos Lantmäteriet. Ledningsägaren äger även rätt att ansöka om ledningsrätt enligt ledningsrättslagen (1973:1144) med detta avtal som grund.'
    }
  ];

  cY -= 20;
  clauses.forEach(cl => {
    contractPage1.drawText(cl.title, { x: 50, y: cY, size: 9.5, font: fontBold, color: darkSlate });
    cY -= 14;
    
    // Enkel ord-brytning
    const words = cl.text.split(' ');
    let line = '';
    words.forEach(w => {
      const test = line + w + ' ';
      if (test.length > 95) {
        contractPage1.drawText(line, { x: 50, y: cY, size: 8, font: fontRegular, color: textDark });
        line = w + ' ';
        cY -= 11;
      } else {
        line = test;
      }
    });
    if (line) {
      contractPage1.drawText(line, { x: 50, y: cY, size: 8, font: fontRegular, color: textDark });
      cY -= 11;
    }
    cY -= 8;
  });

  // SIGNATURSEKTION PÅ SIDA 2 (ELLER SIDA 3)
  cY -= 15;
  contractPage1.drawText('UNDERSKRIFTER', { x: 50, y: cY, size: 10, font: fontBold, color: darkSlate });
  contractPage1.drawText('Detta avtal har upprättats i två likalydande exemplar, varav parterna tagit var sitt.', {
    x: 50, y: cY - 14, size: 8, font: fontOblique, color: textMuted
  });

  cY -= 45;
  // Sida vid sida: Fastighetsägare till vänster, Ledningsägare till höger
  const leftColX = 50;
  const rightColX = 320;

  // FASTIGHETSÄGARENS RUTA
  contractPage1.drawText('FASTIGHETSÄGARE (UPPLÅTARE):', { x: leftColX, y: cY, size: 8.5, font: fontBold, color: darkSlate });
  
  let ownerSignY = cY - 35;
  coOwners.forEach((ownerItem, idx) => {
    contractPage1.drawLine({
      start: { x: leftColX, y: ownerSignY },
      end: { x: leftColX + 220, y: ownerSignY },
      thickness: 1, color: darkSlate
    });

    if (includePreprintedLines) {
      // VALBART TILLVAL: Förtryckta delägarnamn, personnummer och andel under linjen
      const pnum = (idx === 0 ? landowner.personal_number : '') || 'Personnr: Enligt folkbokföring';
      const share = landowner.share || (coOwners.length > 1 ? `Andel: 1/${coOwners.length}` : 'Andel: 1/1');
      contractPage1.drawText(`Namnteckning: ${ownerItem}`, {
        x: leftColX, y: ownerSignY - 12, size: 8, font: fontBold, color: darkSlate
      });
      contractPage1.drawText(`${pnum} | ${share}`, {
        x: leftColX, y: ownerSignY - 22, size: 7, font: fontRegular, color: textMuted
      });
    } else {
      // Standard tom linje (originalets helt rena standardform)
      contractPage1.drawText('Namnteckning', {
        x: leftColX, y: ownerSignY - 12, size: 7.5, font: fontRegular, color: textMuted
      });
      contractPage1.drawText('Namnförtydligande: _________________________________', {
        x: leftColX, y: ownerSignY - 24, size: 7, font: fontRegular, color: textMuted
      });
    }

    ownerSignY -= 45;
  });

  contractPage1.drawText('Datum: __________________ Ort: __________________', {
    x: leftColX, y: ownerSignY, size: 7.5, font: fontRegular, color: textDark
  });

  // BANKKONTORUTA FÖR FASTIGHETSÄGAREN
  ownerSignY -= 28;
  contractPage1.drawRectangle({
    x: leftColX, y: ownerSignY - 25, width: 220, height: 40,
    color: lightBg, borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 0.8
  });
  contractPage1.drawText('Bankuppgifter för utbetalning av ersättning:', {
    x: leftColX + 8, y: ownerSignY + 3, size: 7, font: fontBold, color: darkSlate
  });
  const bankAccStr = landowner.bank_account ? `Konto: ${landowner.bank_account}` : 'Bank & Clearing: ____________ Konto: ____________';
  contractPage1.drawText(bankAccStr, {
    x: leftColX + 8, y: ownerSignY - 12, size: 7, font: fontRegular, color: textDark
  });

  // LEDNINGSÄGARENS RUTA (TILL HÖGER)
  contractPage1.drawText('FÖR LEDNINGSÄGAREN (VATTENFALL / NEKTAB):', {
    x: rightColX, y: cY, size: 8, font: fontBold, color: textMuted
  });
  contractPage1.drawText('(Ifylles ej av fastighetsägaren)', {
    x: rightColX, y: cY - 10, size: 7, font: fontOblique, color: textMuted
  });

  const netSignY = cY - 35;
  contractPage1.drawLine({
    start: { x: rightColX, y: netSignY },
    end: { x: rightColX + 220, y: netSignY },
    thickness: 1, color: textMuted
  });
  contractPage1.drawText('Behörig firmatecknare / Ombud', {
    x: rightColX, y: netSignY - 12, size: 7.5, font: fontRegular, color: textMuted
  });
  contractPage1.drawText(`Datum: __________________ Ort: Solna`, {
    x: rightColX, y: netSignY - 28, size: 7.5, font: fontRegular, color: textMuted
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = {
  generateAgreementPackage
};
