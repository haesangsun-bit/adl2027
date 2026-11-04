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

    // Backward-compatible participant-list action.
    if (data.action === "listParticipants") {
      return jsonResponse_({
        ok: true,
        participants: participantList_(sheet)
      });
    }

    lock.waitLock(10000);

    if (!sheet) {
      sheet = spreadsheet.insertSheet("Registrations");
    }

    ensureRegistrationSchema_(sheet);

    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getDisplayValues()[0];

    const values = {
      "Timestamp": String(data.submittedAt || ""),
      "Name": String(data.name || ""),
      "Email": String(data.email || ""),
      "Affiliation": String(data.affiliation || ""),
      "Position": String(data.position || ""),
      "Attendance dates": Array.isArray(data.attendance)
        ? data.attendance.join(", ")
        : "",
      "Dietary requirements": String(data.dietary || ""),
      "Comments": String(data.comments || "")
    };

    sheet.appendRow(headers.map(function (header) {
      return Object.prototype.hasOwnProperty.call(values, header)
        ? values[header]
        : "";
    }));

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

function doGet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName("Registrations");

  return jsonResponse_({
    ok: true,
    participants: participantList_(sheet)
  });
}

function ensureRegistrationSchema_(sheet) {
  const desiredHeaders = [
    "Timestamp",
    "Name",
    "Email",
    "Affiliation",
    "Position",
    "Attendance dates",
    "Dietary requirements",
    "Comments"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, desiredHeaders.length)
      .setValues([desiredHeaders]);
    sheet.setFrozenRows(1);
    return;
  }

  let headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];

  if (headers.indexOf("Email") < 0) {
    const nameIndex = headers.indexOf("Name");

    if (nameIndex >= 0) {
      sheet.insertColumnAfter(nameIndex + 1);
      sheet.getRange(1, nameIndex + 2).setValue("Email");
    } else {
      sheet.insertColumnAfter(sheet.getLastColumn());
      sheet.getRange(1, sheet.getLastColumn()).setValue("Email");
    }
  }

  sheet.setFrozenRows(1);
}

function participantList_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0];

  const nameIndex = headers.indexOf("Name");
  const affiliationIndex = headers.indexOf("Affiliation");

  if (nameIndex < 0 || affiliationIndex < 0) {
    return [];
  }

  const seen = {};
  const participants = [];

  for (let i = 1; i < values.length; i++) {
    const name = String(values[i][nameIndex] || "").trim();
    const affiliation =
      String(values[i][affiliationIndex] || "").trim();

    if (!name || !affiliation) continue;

    const key = (name + "\n" + affiliation).toLowerCase();
    if (seen[key]) continue;

    seen[key] = true;
    participants.push({
      name: name,
      affiliation: affiliation
    });
  }

  return participants;
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
