export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { phone, message } = req.body || {};
    if (!phone || !message) return res.status(400).json({ error: "phone e message obrigatorios" });

    const INSTANCE = "3F3CE97D54D7521BD014BE824EEE0644";
    const TOKEN = "ACA1A0C6D5CDAD87A4F5ED87";
    const CLIENT_TOKEN = "F17ed351ec4414ecab5c045dd97bc0b93S";

    const response = await fetch(
      `https://api.z-api.io/instances/${INSTANCE}/token/${TOKEN}/send-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": CLIENT_TOKEN
        },
        body: JSON.stringify({ phone, message }),
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
