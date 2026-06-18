# Nektab Markägarplattform (MVP)

Detta projekt är en MVP (Minimum Viable Product) för Nektabs markägarplattform. Systemet är byggt för att hantera markägarkontakter, intrångskalkyler (EBR-baserade skogs- och stolpkalkyler), fastighetsförteckningar, kommunikationsloggar samt sammanställning av bilagda handlingar och bankutbetalningar (ISO 20022 pain.001 bankfiler).

---

## Projektets Arkitektur & Kodstruktur

Systemet består av en modern webbapplikation uppdelad i en frontend och en backend:

*   **Frontend (`/frontend`)**: En React-applikation byggd med Vite. Den använder Tailwind CSS för styling samt ett anpassat designsystem baserat på Nektabs grafiska profil (Space Mono/Mulish typografi samt Nektab-grön accentfärg). Kartfunktionen bygger på Leaflet för interaktiv uppritning av ledningssträckor.
*   **Backend (`/backend`)**: En RESTful API-server byggd på Node.js och Express, med SQLite3 som databas. Den hanterar affärslogik, PDF-sammanställning med `pdf-lib` samt ISO 20022 XML-generering.

---

## Säkerhetsåtgärder (CIS Controls & OWASP)

I enlighet med **CIS Controls kapitel 16 (Application Software Security)**, **OWASP Secure Coding Practices & Development Guide** samt **SAFECode Application Security Addendum** har applikationen härdats på flera nivåer för att upprätta en säker utvecklings- och produktionsmiljö.

### 1. Säker Utvecklingsmiljö & Secrets Management
*   **Hänvisning**: *CIS Control 16.2 (Establish and Maintain a Secure Software Development Process)*.
*   **Implementering**: En rot-nivå [.gitignore](file:///.gitignore) har upprättats för att förhindra att lokala databaser (`*.sqlite`), uppladdade filer (`uploads/`) och miljövariabler (`.env`) versionshanteras i Git. En [backend/.env.example](file:///backend/.env.example) tillhandahålls som en säker mall för nya utvecklare.
*   **Produktions-Safeguard**: Om servern körs i produktion (`NODE_ENV=production`) och `JWT_SECRET` saknas eller har kvar standardvärdet `supersecretmvpkey123!`, kraschar servern omedelbart vid uppstart för att förhindra att osäkra nycklar används i produktion.

### 2. Säkra HTTP-svar & Headers (Helmet)
*   **Hänvisning**: *OWASP Section 11 (Communication Security)*.
*   **Implementering**: Integrerat `helmet` middleware i Express. Detta sätter automatiskt säkra HTTP-headers för att skydda klienter och server mot vanliga sårbarheter:
    *   `X-Content-Type-Options: nosniff` (hindrar MIME-sniffing).
    *   `X-Frame-Options: SAMEORIGIN` (skyddar mot clickjacking).
    *   `Content-Security-Policy (CSP)` (begränsar godkända resurskällor och motverkar skadlig kodexekvering).
    *   `Strict-Transport-Security (HSTS)` (påtvingar HTTPS).

### 3. Skydd mot Överbelastning & Brute-force (Rate Limiting)
*   **Hänvisning**: *OWASP Section 12 (System Configuration)*.
*   **Implementering**: Integrerat `express-rate-limit` för att förhindra brute-force och DoS-attacker (Denial of Service):
    *   **Global Rate Limiter**: Begränsar allmänna anrop till API:et till maximalt 200 anrop per 15 minuter per IP-adress.
    *   **Strikt Login Limiter**: Begränsar inloggningsförsök till `/api/auth/login` till maximalt 15 försök per 15 minuter per IP-adress för att försvåra lösenordsattacker.

### 4. Indatavalidering (Input Validation)
*   **Hänvisning**: *OWASP Section 1 (Data Validation)*.
*   **Implementering**: Ett validerings-middleware (`validateFields`) har implementerats på alla känsliga inskicknings- och uppdateringspunkter (t.ex. vid skapande av markägare och värderingar) för att garantera dataintegritet:
    *   **E-post**: Valideras mot en strikt reguljär uttrycksmall.
    *   **Personnummer**: Valideras enligt svenskt format (`ÅÅÅÅMMDD-XXXX` eller `ÅÅMMDD-XXXX`) samt tillåter GDPR-maskerat format (`XXXXXX-XXXX`).
    *   **Telefonnummer**: Begränsas till siffror, mellanslag och standardtecken `+`, `-`, `()`.
    *   **Ersättningsbelopp**: Tvingas att vara ett positivt numeriskt värde ($\ge 0$).
    *   **Bankkonto**: Valideras för att endast innehålla tillåtna tecken (bokstäver, siffror, bindestreck, mellanslag), vilket förhindrar SQL-injektionsmönster och ogiltig data.

### 5. XSS-Sanitering (Cross-Site Scripting)
*   **Hänvisning**: *OWASP Section 8 (Input Sanitization)*.
*   **Implementering**: Ett globalt saniterings-middleware (`sanitizeInput`) rengör rekursivt alla inkommande strängar i `req.body` och `req.query` innan de når databasen eller affärslogiken. Det strippar effektivt bort `<script>`, `javascript:`, inline event-handlers som `onload` eller `onerror` samt HTML-taggar.

### 6. Säker Felhantering (Error Masking)
*   **Hänvisning**: *OWASP Section 9 (Error Handling and Logging)*.
*   **Implementering**: Ett globalt felhanterings-middleware fångar upp alla interna undantag. I produktionsläge maskeras alla interna databasfel och systemkrascher till ett generiskt felmeddelande: `500 Internal Server Error / Ett internt serverfel inträffade`. Stack traces visas endast i utvecklingsläge (`NODE_ENV !== 'production'`) för att förhindra informationsläckage (*Information Disclosure*) av databastabeller, filvägar eller kodstrukturer.

---

## Verifiering av Säkerhetsåtgärder

Det finns ett dedikerat testskript för att automatiskt verifiera ovanstående skyddsmekanismer:
*   [test_security.js](file:///C:/Users/asg02/.gemini/antigravity/brain/994613d2-8e3f-416e-ba14-9e63b03cea89/scratch/test_security.js)

Du kan köra detta skript med:
```bash
node scratch/test_security.js
```
Det skickar ogiltiga värden, XSS-vektorer samt upprepade inloggningar till den lokala servern och bekräftar att rätt HTTP-statuskoder (400, 429) och sanerad data returneras.
