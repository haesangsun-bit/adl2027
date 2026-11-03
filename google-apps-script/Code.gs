function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || "{}");
    const expectedSecret = PropertiesService.getScriptProperties()
      .getProperty("REGISTRATION_SHARED_SECRET");

    if (!expectedSecret || data.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: "unauthorized" });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName("Registrations");

    if (data.action === "listParticipants") {
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse_({ ok: true, participants: [] });
      }

      const values = sheet.getDataRange().getDisplayValues();
      const headers = values[0];
      const nameIndex = headers.indexOf("Name");
      const affiliationIndex = headers.indexOf("Affiliation");

      if (nameIndex < 0 || affiliationIndex < 0) {
        return jsonResponse_({ ok: false, error: "missing_columns" });
      }

      const seen = {};
      const participants = [];

      for (let i = 1; i < values.length; i++) {
        const name = String(values[i][nameIndex] || "").trim();
        const affiliation = String(values[i][affiliationIndex] || "").trim();
        if (!name || !affiliation) continue;

        const key = (name + "\n" + affiliation).toLowerCase();
        if (seen[key]) continue;
        seen[key] = true;
        participants.push({ name: name, affiliation: affiliation });
      }

      return jsonResponse_({ ok: true, participants: participants });
    }

    lock.waitLock(10000);

    if (!sheet) {
      sheet = spreadsheet.insertSheet("Registrations");
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Name",
        "Affiliation",
        "Position",
        "Attendance dates",
        "Dietary requirements",
        "Comments"
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      String(data.submittedAt || ""),
      String(data.name || ""),
      String(data.affiliation || ""),
      String(data.position || ""),
      Array.isArray(data.attendance) ? data.attendance.join(", ") : "",
      String(data.dietary || ""),
      String(data.comments || "")
    ]);

    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: "server_error" });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
