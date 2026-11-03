function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || "{}");
    const expectedSecret = PropertiesService.getScriptProperties()
      .getProperty("REGISTRATION_SHARED_SECRET");

    if (!expectedSecret || data.secret !== expectedSecret) {
      return jsonResponse_({ ok: false, error: "unauthorized" });
    }

    lock.waitLock(10000);

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName("Registrations");
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
        "Banquet / Excursion",
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
      Array.isArray(data.events) ? data.events.join(", ") : "",
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
