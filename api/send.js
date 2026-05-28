export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { phone, message } = req.body;
  const INSTANCE = "3F3CE97D54D7521BD014BE824EEE0644";
  const TOKEN = "ACA1A0C6D5CDAD87A4F5ED87";

  try {
    const r = await fetch(
      `https://api.z-api.io/instances/${INSTANCE}/token/${TOKEN}/send-text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      }
    );
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
