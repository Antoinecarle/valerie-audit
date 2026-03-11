import { Router } from 'express';

const router = Router();

/**
 * GET /api/places/autocomplete?input=...
 * Uses France's BAN (Base Adresse Nationale) — free, no key needed
 * Response: { features: GeoJSON Feature[] }
 * Each feature.properties: { label, name, postcode, city, context, type, housenumber, street }
 */
router.get('/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input || input.trim().length < 3) return res.json({ features: [] });

  try {
    const url = new URL('https://api-adresse.data.gouv.fr/search/');
    url.searchParams.set('q', input.trim());
    url.searchParams.set('limit', '6');
    url.searchParams.set('autocomplete', '1');

    const r = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'ValerieAudit/1.0' },
    });
    const data = await r.json();
    res.json({ features: data.features || [] });
  } catch (err) {
    console.error('[Places] Autocomplete error:', err.message);
    res.status(502).json({ error: 'Address API error', features: [] });
  }
});

export default router;
