import { Router } from 'express';

const router = Router();

// GET /api/places/autocomplete?input=...
router.get('/autocomplete', async (req, res) => {
  const { input } = req.query;
  if (!input || input.trim().length < 2) return res.json({ predictions: [] });

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODE_API_KEY;
  if (!key) return res.status(500).json({ error: 'Google Maps API key missing' });

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input.trim());
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'fr');
    url.searchParams.set('types', 'address');
    url.searchParams.set('components', 'country:fr');

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    res.json({ predictions: data.predictions || [] });
  } catch (err) {
    console.error('[Places] Autocomplete error:', err.message);
    res.status(502).json({ error: 'Places API error' });
  }
});

// GET /api/places/details?place_id=...
router.get('/details', async (req, res) => {
  const { place_id } = req.query;
  if (!place_id) return res.status(400).json({ error: 'place_id required' });

  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODE_API_KEY;
  if (!key) return res.status(500).json({ error: 'Google Maps API key missing' });

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', place_id);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'fr');
    url.searchParams.set('fields', 'formatted_address,address_components,geometry');

    const r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    res.json(data.result || {});
  } catch (err) {
    res.status(502).json({ error: 'Places API error' });
  }
});

export default router;
