/*
 * Reference backend for durable lead capture — appends Agent Tidal Wave entries
 * to a Google Sheet. You deploy this under your own Google account (I can't deploy
 * or create accounts for you).
 *
 * Deploy:
 *   1. Open a new Google Sheet → Extensions ▸ Apps Script.
 *   2. Paste this file, Save.
 *   3. Deploy ▸ New deployment ▸ type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   4. Copy the resulting /exec URL into data.js → config.submitUrl.
 *
 * The client POSTs JSON as text/plain (no CORS preflight), fire-and-forget. Entries
 * that fail to send (flaky booth wifi) are queued in the browser and retried, and a
 * local CSV is always available via awExport() — so leads are not lost.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['timestamp', 'email', 'name', 'damage']);
    }
    sheet.appendRow([
      data.ts || new Date().toISOString(),
      data.email || '',
      data.name || '',
      data.damage || '',
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
