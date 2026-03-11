/**
 * Valerie Audit AI Pipeline
 * Uses Gemini 2.5 Flash with Google Search grounding to generate each audit section
 */

const GEMINI_MODEL = 'gemini-2.5-flash';

function getGoogleKey() {
  return process.env.GOOGLE_AI_API_KEY;
}

function getOpenAIKey() {
  return process.env.OPENAI_API_KEY;
}

/**
 * Call Gemini with optional Google Search grounding
 */
async function callGemini(prompt, { useSearch = true, maxTokens = 8192, retries = 1 } = {}) {
  const key = getGoogleKey();
  if (!key) throw new Error('GOOGLE_AI_API_KEY manquante');

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.1,
    },
  };

  if (useSearch) {
    body.tools = [{ googleSearch: {} }];
  }

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180000), // 3 minutes
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error ${res.status}: ${err}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      const groundingMetadata = data.candidates?.[0]?.groundingMetadata || null;
      return { text, groundingMetadata };
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        console.warn(`[AI] Attempt ${attempt + 1} failed (${err.message}), retrying...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  throw lastErr;
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
function parseJSON(text) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}/s) || text.match(/\[[\s\S]*\]/s);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1 — LOCALISATION
// ═══════════════════════════════════════════════════════════════

export async function generateLocalisation(address) {
  const prompt = `Tu es un expert en audit immobilier de résidences étudiantes en France.

Analyse la localisation de cette résidence étudiante : **${address}**

Recherche et fournis les informations suivantes en JSON strict :

{
  "ville": {
    "nom": "...",
    "population": 0,
    "populationEtudiante": 0,
    "anneeReference": "2023",
    "description": "..."
  },
  "quartier": {
    "nom": "...",
    "description": "...",
    "caracteristiques": ["...", "..."],
    "programmeImmobilier": {
      "logementsTotal": 0,
      "logementsSeniors": 0,
      "logementsLocatifs": 0,
      "logementsEtudiants": 0,
      "description": "..."
    }
  },
  "pointsReperes": [
    { "nom": "Mairie", "distance": "X km / X min à pied", "type": "administratif" },
    { "nom": "Gare", "distance": "...", "type": "transport" },
    { "nom": "...", "distance": "...", "type": "loisirs" }
  ],
  "transports": {
    "description": "...",
    "arrets": [
      {
        "nom": "...",
        "distance": "...",
        "lignes": [
          { "type": "bus|tram|metro", "numero": "..." }
        ]
      }
    ]
  },
  "evolutionsMetropole": [
    {
      "projet": "...",
      "description": "...",
      "horizon": "..."
    }
  ]
}

IMPORTANT: Utilise Google Search pour trouver les vraies données actuelles. Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.`;

  const { text, groundingMetadata } = await callGemini(prompt, { useSearch: true });
  const content = parseJSON(text);
  return { content: content || { rawText: text }, rawAiResponse: text, groundingMetadata };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2 — ENSEIGNEMENT SUPÉRIEUR
// ═══════════════════════════════════════════════════════════════

export async function generateEnseignement(address) {
  const prompt = `Tu es un expert en audit de résidences étudiantes en France.

Analyse les pôles d'enseignement supérieur proches de : **${address}**

Recherche et fournis les informations suivantes en JSON strict :

{
  "universites": [
    {
      "nom": "...",
      "poles": ["Pôle 1", "Pôle 2"],
      "adresse": "...",
      "distanceKm": 0.0,
      "lien": "https://...",
      "nombreEtudiants": 0
    }
  ],
  "ecolesSuperieures": [
    {
      "nom": "...",
      "type": "Grande école / École d'ingénieurs / École de commerce / ...",
      "adresse": "...",
      "distanceKm": 0.0,
      "lien": "https://..."
    }
  ],
  "lyceesSuperieurs": [
    {
      "nom": "...",
      "filiere": "BTS / CPGE / ...",
      "adresse": "...",
      "distanceKm": 0.0,
      "lien": "https://..."
    }
  ],
  "evolutionsFutures": [
    {
      "etablissement": "...",
      "type": "...",
      "horizon": "...",
      "description": "..."
    }
  ],
  "totalEtudiantsZone": 0,
  "resume": "Résumé de l'offre d'enseignement supérieur dans la zone"
}

IMPORTANT: Utilise Google Search pour des données à jour. Inclus tous les établissements dans un rayon de 15 km. Réponds UNIQUEMENT en JSON valide.`;

  const { text, groundingMetadata } = await callGemini(prompt, { useSearch: true });
  const content = parseJSON(text);
  return { content: content || { rawText: text }, rawAiResponse: text, groundingMetadata };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3 — CONCURRENCE
// ═══════════════════════════════════════════════════════════════

export async function generateConcurrence(address) {
  const prompt = `Tu es un expert en audit de résidences étudiantes en France.

Analyse la concurrence en logement étudiant autour de : **${address}**

Recherche et fournis les informations suivantes en JSON strict :

{
  "crous": {
    "residences": [
      {
        "nom": "...",
        "adresse": "...",
        "distanceKm": 0.0,
        "nbLogements": 0,
        "lien": "https://..."
      }
    ],
    "resume": "..."
  },
  "conventionnees": {
    "residences": [
      {
        "nom": "...",
        "operateur": "Erylia / Autre bailleur social...",
        "adresse": "...",
        "distanceKm": 0.0,
        "loyer": "...",
        "nbLogements": 0,
        "lien": "https://..."
      }
    ],
    "resume": "..."
  },
  "privees": {
    "residences": [
      {
        "nom": "...",
        "operateur": "Nexity / Uxco / Les Belles Années / Autre...",
        "adresse": "...",
        "distanceKm": 0.0,
        "loyer": "...",
        "nbLogements": 0,
        "lien": "https://..."
      }
    ],
    "resume": "..."
  },
  "analyseConcurrentielle": {
    "niveauConcurrence": "faible|modéré|élevé",
    "points_forts": ["...", "..."],
    "points_attention": ["...", "..."],
    "resume": "..."
  }
}

IMPORTANT: Utilise Google Search pour trouver les vraies résidences actuelles. Couvre un rayon de 5-10 km. Réponds UNIQUEMENT en JSON valide.`;

  const { text, groundingMetadata } = await callGemini(prompt, { useSearch: true });
  const content = parseJSON(text);
  return { content: content || { rawText: text }, rawAiResponse: text, groundingMetadata };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4 — COURT SÉJOUR
// ═══════════════════════════════════════════════════════════════

export async function generateCourtSejour(address) {
  const prompt = `Tu es un expert en audit de résidences étudiantes en France.

Recherche les employeurs saisonniers potentiels à proximité de : **${address}**

L'objectif est de trouver des employeurs qui recrutent des saisonniers l'été (hôtels, restaurants, parcs d'attractions, plages, centres de loisirs) et qui pourraient loger leurs saisonniers dans la résidence.

Fournis les informations en JSON strict :

{
  "contexte": "Description de l'activité saisonnière dans cette zone",
  "employeurs": [
    {
      "nom": "...",
      "activite": "Hôtel / Restaurant / Parc d'attractions / Plagiste / Centre de loisirs / ...",
      "categorie": "hotellerie|restauration|loisirs|parcs|plages|autre",
      "adresse": "...",
      "distanceKm": 0.0,
      "telephone": "...",
      "siteWeb": "https://...",
      "periodeRecrutement": "Avril-Septembre / ...",
      "profils": "Serveurs, réceptionnistes, animateurs, ..."
    }
  ],
  "resume": "Synthèse des opportunités court séjour estival dans cette zone",
  "potentielEstival": "faible|modéré|élevé",
  "activitesTouristiques": [
    {
      "nom": "...",
      "type": "Plage / Musée / Parc / Festival / Sport nautique / ...",
      "description": "Brève description de l'activité et de son attrait touristique"
    }
  ]
}

IMPORTANT: Utilise Google Search pour trouver de vrais employeurs avec leurs coordonnées. Vise 15-25 employeurs. Réponds UNIQUEMENT en JSON valide.`;

  const { text, groundingMetadata } = await callGemini(prompt, { useSearch: true });
  const content = parseJSON(text);
  return { content: content || { rawText: text }, rawAiResponse: text, groundingMetadata };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5 — FICHE INFO
// ═══════════════════════════════════════════════════════════════

export async function generateFicheInfo(address) {
  const prompt = `Tu es un expert en audit de résidences étudiantes en France.

À partir de l'adresse : **${address}**

Génère la fiche descriptive complète de cette résidence étudiante en JSON strict :

{
  "nomResidence": "Nom probable ou générique de la résidence",
  "exploitant": "Nom de l'exploitant / gestionnaire probable (Nexity, Uxco, Réside Études, etc.)",
  "adresse": "${address}",
  "ville": "...",
  "codePostal": "...",
  "nbLogements": 0,
  "typesLogements": ["Studio", "T1", "T1 bis"],
  "surfacesMoyennes": {
    "studio": 0,
    "t1": 0,
    "t1bis": 0
  },
  "loyersMoyens": {
    "studio": "... €/mois",
    "t1": "... €/mois",
    "t1bis": "... €/mois"
  },
  "anneeConstruction": 0,
  "uls": "Oui / Non / En cours",
  "classementEtoiles": 0,
  "labelQualite": "NF Habitat / Qualiresid / Aucun",
  "services": ["Wifi", "Laverie", "Parking", "Salle de sport", "..."],
  "accessibilite": "PMR / Non PMR",
  "acces": {
    "voiture": "Description accès voiture / parking",
    "transport": "Arrêts bus/tram/métro les plus proches"
  },
  "description": "Description commerciale de la résidence pour le rapport"
}

IMPORTANT: Utilise Google Search pour trouver les vraies données si la résidence existe. Sinon génère des données plausibles pour la zone. Réponds UNIQUEMENT en JSON valide.`;

  const { text, groundingMetadata } = await callGemini(prompt, { useSearch: true });
  const content = parseJSON(text);
  return { content: content || { rawText: text }, rawAiResponse: text, groundingMetadata };
}

// ═══════════════════════════════════════════════════════════════
// FULL PIPELINE
// ═══════════════════════════════════════════════════════════════

export const SECTIONS = [
  { type: 'localisation', label: 'Localisation', fn: generateLocalisation },
  { type: 'enseignement', label: 'Enseignement supérieur', fn: generateEnseignement },
  { type: 'concurrence', label: 'Concurrence', fn: generateConcurrence },
  { type: 'court_sejour', label: 'Court séjour', fn: generateCourtSejour },
  { type: 'fiche_info', label: 'Fiche info', fn: generateFicheInfo },
];
