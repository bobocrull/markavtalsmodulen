/**
 * aiConfig.js
 * Central konfiguration för AI-motorn (Claude 3.5 Sonnet / Anthropic).
 * 
 * Tre sätt att göra AI-nyckeln tillgänglig för alla användare automatiskt:
 * 1. Hårdkoda direkt: Klistra in nyckeln nedan i HARDCODED_ANTHROPIC_API_KEY.
 * 2. Vercel Miljövariabel: Sätt ANTHROPIC_API_KEY i Vercel Project Settings -> Environment Variables.
 * 3. Webbgränssnittet: Spara den via admin-modalen (sparas persistent i system_settings-databastabellen för alla).
 */

module.exports = {
  // Om du vill hårdkoda nyckeln direkt i koden, klistra in den här:
  HARDCODED_ANTHROPIC_API_KEY: ''
};
