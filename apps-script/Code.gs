// In das Google Sheet einfuegen unter: Erweiterungen -> Apps Script
// Danach als Web App (neu) deployen (siehe README.md im Projekt-Root).

const SHEET_TIME = "Zeiten";
const SHEET_KM = "Kilometer";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  if (data.type === "km") {
    upsertKm(data);
  } else {
    upsertTime(data);
  }

  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok" })
  ).setMimeType(ContentService.MimeType.JSON);
}

function upsertTime(data) {
  const sheet = getOrCreateSheet(SHEET_TIME, [
    "ID", "Datum", "Projekt", "Start", "Ende", "Dauer (min)", "Notiz", "Zuletzt aktualisiert",
  ]);
  upsertRow(sheet, data.id, [
    data.id,
    data.date || "",
    data.project || "",
    data.start || "",
    data.end || "",
    data.durationMin || "",
    data.note || "",
    new Date(),
  ]);
}

function upsertKm(data) {
  const sheet = getOrCreateSheet(SHEET_KM, [
    "ID", "Datum", "Zweck", "Kilometer", "Satz (€/km)", "Betrag (€)", "Notiz", "Zuletzt aktualisiert",
  ]);
  upsertRow(sheet, data.id, [
    data.id,
    data.date || "",
    data.project || "",
    data.km || "",
    data.rate || "",
    data.amount || "",
    data.note || "",
    new Date(),
  ]);
}

function upsertRow(sheet, id, row) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (ids[i][0] === id) {
        sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
        return;
      }
    }
  }
  sheet.appendRow(row);
}

function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}
