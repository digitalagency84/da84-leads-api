// ============================================================================
// api/lead.js — Fonction serverless Vercel (projet indépendant da84-leads-api)
// Reçoit le POST du popup de devis (landing page energie.digitalagency84.com)
// et ajoute le prospect dans Supabase, table "crm_kv" (clé "crm:data"),
// tableau prospects, à l'étape "Nouveau lead".
//
// Variables d'environnement requises (Vercel → Settings → Environment Variables) :
//   SUPABASE_URL              = https://hajpxhtgazmtzdyspsua.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = clé service_role (jamais la clé anon)
// ============================================================================

const ALLOWED_ORIGINS = [
  "https://energie.digitalagency84.com",
  "http://localhost:3000",
];

function setCorsHeaders(res, origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function generateId() {
  return "l" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6);
}

const PROJECT_LABELS = { PV: "Photovoltaïque", PAC: "Pompe à chaleur" };

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  setCorsHeaders(res, origin);

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Méthode non autorisée" }); return; }
  if (!ALLOWED_ORIGINS.includes(origin)) { res.status(403).json({ error: "Origine non autorisée" }); return; }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Variables d'environnement Supabase manquantes");
    res.status(500).json({ error: "Configuration serveur incomplète" });
    return;
  }

  try {
    const body = req.body || {};
    const {
      projectType, natureProjet, usageElectricite, typePac, ancienChauffage,
      postalCode, housingType, incomeInfo, dpe, notes, name, phone, email,
      utmSource, utmMedium, utmCampaign, utmContent,
    } = body;

    if (!projectType || !["PV", "PAC"].includes(projectType)) {
      res.status(400).json({ error: "projectType doit être 'PV' ou 'PAC'" });
      return;
    }
    if (!name || !phone || !email) {
      res.status(400).json({ error: "Nom, téléphone et e-mail sont requis" });
      return;
    }

    const detailsParts = [`Intérêt pour ${PROJECT_LABELS[projectType]}`];
    if (natureProjet) detailsParts.push(`Nature : ${natureProjet}`);
    if (projectType === "PV" && usageElectricite) detailsParts.push(`Usage électricité : ${usageElectricite}`);
    if (projectType === "PAC" && typePac) detailsParts.push(`Type PAC : ${typePac}`);
    if (projectType === "PAC" && ancienChauffage) detailsParts.push(`Chauffage actuel : ${ancienChauffage}`);
    detailsParts.push(`Code postal : ${postalCode || "non renseigné"}`);
    detailsParts.push(`Logement : ${housingType || "non renseigné"}`);
    if (incomeInfo) detailsParts.push(`RFR : ${incomeInfo}`);
    if (dpe) detailsParts.push(`DPE : ${dpe}`);
    if (notes) detailsParts.push(`Notes : ${notes}`);
    if (utmSource) detailsParts.push(`Source UTM : ${utmSource}`);
    if (utmMedium) detailsParts.push(`Support UTM : ${utmMedium}`);
    if (utmCampaign) detailsParts.push(`Campagne UTM : ${utmCampaign}`);
    if (utmContent) detailsParts.push(`Contenu UTM : ${utmContent}`);
    detailsParts.push(`Tél : ${phone}`, `E-mail : ${email}`);

    const source = utmSource
      ? `Landing page (${utmSource}${utmMedium ? "/" + utmMedium : ""})`
      : "Landing page";

    const prospect = {
      id: generateId(),
      nom: name,
      stage: "Nouveau lead",
      source,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      utmContent: utmContent || null,
      details: detailsParts.join(" · "),
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/crm_append_prospect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ p_prospect: prospect }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur Supabase (crm_append_prospect):", response.status, errText);
      res.status(502).json({ error: "Erreur lors de l'enregistrement du lead" });
      return;
    }

    res.status(200).json({ ok: true, lead: prospect });
  } catch (err) {
    console.error("Erreur api/lead:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

