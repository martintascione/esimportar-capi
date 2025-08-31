// api/send-capi.js — Vercel serverless function
export default async function handler(req, res) {
  // --- CORS (permite que tu web pueda llamar a esta URL) ---
  res.setHeader('Access-Control-Allow-Origin', 'https://esimportar.com'); // tu dominio
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const PIXEL_ID = process.env.META_PIXEL_ID;        // 2306180889802008
  const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;  // tu token
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const { event_id, page, email, phone, test_event_code } = req.body || {};
  const client_ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  const user_agent = req.headers['user-agent'];

  // Hasheo si algún día pasás email/teléfono
  const sha256 = async (v) => {
    if (!v) return undefined;
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');
  };

  const payload = {
    data: [{
      event_name: 'Contact',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: page || 'https://esimportar.com',
      event_id, // ¡mismo ID que el Pixel!
      user_data: {
        client_ip_address: client_ip,
        client_user_agent: user_agent,
        ...(email ? { em: [await sha256(email)] } : {}),
        ...(phone ? { ph: [await sha256(phone)] } : {}),
      }
    }],
    ...(test_event_code ? { test_event_code } : {})
  };

  const r = await fetch(
    `https://graph.facebook.com/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  const out = await r.json();
  return res.status(200).json(out);
}
