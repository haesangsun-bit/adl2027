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
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
}

module.exports = async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const origin = req.headers.origin || "";
  if (origin && !allowedOrigins().includes(origin)) {
    return res.status(403).json({ ok: false, error: "origin_not_allowed" });
  }

  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const sharedSecret = process.env.REGISTRATION_SHARED_SECRET;
  if (!scriptUrl || !sharedSecret) {
    return res.status(503).json({ ok: false, error: "participants_not_configured" });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: sharedSecret,
        action: "listParticipants"
      }),
      redirect: "follow"
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      result = null;
    }

    if (!response.ok || !result || result.ok !== true || !Array.isArray(result.participants)) {
      console.error("Participant storage error", response.status, text.slice(0, 500));
      return res.status(502).json({ ok: false, error: "storage_failed" });
    }

    const participants = result.participants
      .map((item) => ({
        name: String(item.name || "").trim().slice(0, 120),
        affiliation: String(item.affiliation || "").trim().slice(0, 180)
      }))
      .filter((item) => item.name && item.affiliation);

    return res.status(200).json({ ok: true, participants });
  } catch (error) {
    console.error("Participant relay error", error);
    return res.status(502).json({ ok: false, error: "storage_unreachable" });
  }
};
