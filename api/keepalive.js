// ============================================================================
// api/keepalive.js — Ping quotidien anti-pause Supabase (plan gratuit).
// ============================================================================

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Configuration serveur incomplète" });
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/crm_kv?select=key&limit=1`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });
    res.status(200).json({ ok: response.ok, status: response.status, pingedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
}
