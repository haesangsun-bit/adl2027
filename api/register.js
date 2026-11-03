const DEFAULT_ALLOWED_ORIGINS = [
  "https://haesangsun-bit.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
];

function allowedOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (allowedOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function clean(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  return {};
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const origin = req.headers.origin || "";
  if (origin && !allowedOrigins().includes(origin)) {
    return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const sharedSecret = process.env.REGISTRATION_SHARED_SECRET;
  if (!scriptUrl || !sharedSecret) {
    return res.status(503).json({ ok: false, error: "registration_not_configured" });
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  // Honeypot: real users never see or fill this field.
  if (clean(body.website, 200)) {
    return res.status(200).json({ ok: true });
  }

  const name = clean(body.name, 120);
  const affiliation = clean(body.affiliation, 180);
  const position = clean(body.position, 120);
    const dietary = clean(body.dietary, 80);
  const comments = clean(body.comments, 1200);
  const attendance = Array.isArray(body.attendance)
    ? body.attendance.map((v) => clean(v, 32)).filter(Boolean).slice(0, 5)
    : [];

  if (!name || !affiliation || !position || !attendance.length || !dietary) {
    return res.status(400).json({ ok: false, error: "missing_or_invalid_fields" });
  }

  const payload = {
    secret: sharedSecret,
    submittedAt: new Date().toISOString(),
    name,
    affiliation,
    position,
    attendance,
    dietary,
    comments
  };

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow"
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = null;
    }

    if (!response.ok || !result || result.ok !== true) {
      console.error("Registration storage error", response.status, text.slice(0, 500));
      return res.status(502).json({ ok: false, error: "storage_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Registration relay error", error);
    return res.status(502).json({ ok: false, error: "storage_unreachable" });
  }
};
