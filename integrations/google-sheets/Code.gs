/**
 * Avenrix form receiver: stores website signups in this Google Sheet and emails you.
 *
 * Setup (about 5 minutes, see README step 2):
 *  1. Create a Google Sheet. Extensions > Apps Script. Paste this file in, replacing everything.
 *  2. Deploy > New deployment > type "Web app". Execute as: Me. Who has access: Anyone.
 *  3. Copy the Web app URL (ends in /exec) into site.config.json "formEndpoint", then rebuild.
 */

// Email for new-signup alerts. Empty means the Google account that owns this script.
var NOTIFY_EMAIL = "nexa@avenrixservices.com";
// Set to false once signups get busy. Free Gmail accounts can send about 100 emails a day.
var SEND_EMAIL_ALERTS = true;

var SHEET_NAME = "Signups";
var COLUMNS = ["Received", "Type", "Name", "Email", "Location", "Field", "Company", "Hours/week",
               "Days", "About", "Role applied for", "Page", "Status", "Notes"];
var MAX_LEN = 3000;

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    var multi = (e && e.parameters) || {};

    // Spam traps: the hidden "website" field must stay empty, and humans take more than 3 seconds.
    // Bots get a success response so they don't retry.
    if (p.website) return json({ ok: true });
    var started = Number(p.started || 0);
    if (started && Date.now() - started < 3000) return json({ ok: true });

    var email = clean(p.email).toLowerCase();
    var name = clean(p.name);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "Name and a valid email are required." });
    if (p.consent !== "yes") return json({ ok: false, error: "Consent is required." });

    var type = p.type === "business" ? "Business" : "Worker";
    var days = (multi.days || []).map(clean).join(", ");

    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var sheet = getSheet();
      sheet.appendRow([
        new Date(), type, safe(name), safe(email), safe(clean(p.location)),
        type === "Worker" ? safe(clean(p.field)) : "", safe(clean(p.company)),
        Number(p.hours) || "", safe(days), safe(clean(p.about)), safe(clean(p.role)),
        safe(clean(p.page)), "New", ""
      ]);
    } finally {
      lock.releaseLock();
    }

    if (SEND_EMAIL_ALERTS) {
      try {
        var to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
        var subject = "New Avenrix " + type.toLowerCase() + ": " + name + (p.role ? " (" + clean(p.role) + ")" : "");
        var body = [
          "Type: " + type, "Name: " + name, "Email: " + email,
          "Location: " + clean(p.location), "Field: " + clean(p.field), "Company: " + clean(p.company),
          "Hours/week: " + clean(p.hours), "Days: " + days, "Role: " + clean(p.role), "",
          clean(p.about), "", "Sheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
        ].join("\n");
        MailApp.sendEmail({ to: to, subject: subject, body: body, replyTo: email });
      } catch (mailErr) {
        // The row is already saved; a failed alert (for example, the daily quota) shouldn't fail the signup.
        console.warn("Alert email failed: " + mailErr);
      }
    }
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: "Server error" });
  }
}

// Lets you open the /exec URL in a browser to check the deployment is live.
function doGet() {
  return json({ ok: true, service: "avenrix-form" });
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(COLUMNS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold");
  }
  return sheet;
}

function clean(v) {
  return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, MAX_LEN);
}

// Stops a submitted value from running as a spreadsheet formula (e.g. "=HYPERLINK(...)").
function safe(v) {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the editor (select setup > Run) to create the sheet and grant permissions.
function setup() {
  getSheet();
  if (SEND_EMAIL_ALERTS) MailApp.getRemainingDailyQuota();
}
