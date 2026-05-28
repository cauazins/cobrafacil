const https = require("https");

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { phone, message } = req.body;
  const INSTANCE = "3F3CE97D54D7521BD014BE824EEE0644";
  const TOKEN = "ACA1A0C6D5CDAD87A4F5ED87";

  const body = JSON.stringify({ phone, message });

  return new Promise((resolve) => {
    const options = {
      hostname: "api.z-api.io",
      path: `/instances/${INSTANCE}/token/${TOKEN}/send-text`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const request = https.request(options, (response) => {
      let data = "";
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => {
        res.status(200).json({ ok: true, data });
        resolve();
      });
    });

    request.on("error", (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    request.write(body);
    request.end();
  });
}
