// In das Google Sheet einfuegen unter: Erweiterungen -> Apps Script
// Danach als Web App deployen (siehe README.md im Projekt-Root).

const SHEET_NAME = "Zeiten";

function doPost(e) {
  const sheet = getOrCreateSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.date || "",
    data.project || "",
    data.start || "",
    data.end || "",
    data.durationMin || "",
    data.note || "",
    new Date(),
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["Datum", "Projekt", "Start", "Ende", "Dauer (min)", "Notiz", "Erfasst am"]);
  }
  return sheet;
}
