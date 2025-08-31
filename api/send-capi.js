// api/send-capi.js — Vercel serverless function con CORS flexible
export default async function handler(req, res) {
  // --- CORS: permitir prod y previews de Lovable ---
  const origin = req.headers.origin || '';
  const allow =
    origin === 'https://esimportar.com' ||
    origin === 'https://www.esimportar.com' ||
    origin.endsWith('.lovable.dev') ||
    origin.endsWith('.lovable.app') ||
    origin === 'https://lovable.dev';

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Origin', allow ? origin : 'https://esimportar.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // --- Env secrets ---
  const PIXEL_ID = process.env.META_PIXEL_ID;        // 2306180889802008
  const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;  // tu token
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  // --- Body + datos del cliente ---
  const { event_id, page, test_event_code } = req.body || {};
  const client_ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
  const user_agent = req.headers['user-agent'];

  // --- Payload para CAPI ---
  const payload = {
    data: [{
      event_name: 'Contact',
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: page || 'https://esimportar.com',
      event_id,
      user_data: {
        client_ip_address: client_ip,
        client_user_agent: user_agent
      }
    }],
    ...(test_event_code ? { test_event_code } : {})
  };

  // --- Envío a Meta ---
  const r = await fetch(
    `https://graph.facebook.com/v17.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
  );
  const out = await r.json();
  return res.status(200).json(out);
}
