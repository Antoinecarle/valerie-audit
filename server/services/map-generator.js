/**
 * Map Generator — Mapbox Static Images API
 * Generates PNG map images for PPTX report slides
 */

const MAPBOX_TOKEN = process.env.MAPBOX_PUBLIC_TOKEN;
const STREETS = 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static';
const SATELLITE = 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static';
const GEOCODE = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

// Convert fetched PNG to base64 data URI
async function fetchAsBase64(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    console.warn(`[Maps] Fetch failed (${res.status}): ${url.substring(0, 80)}`);
    return null;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buf.toString('base64')}`;
}

// Geocode an address to [lng, lat]
async function geocode(address) {
  try {
    const url = `${GEOCODE}/${encodeURIComponent(address)}.json?country=fr&language=fr&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    if (data.features?.[0]?.geometry?.coordinates) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      return { lat, lng };
    }
  } catch (e) {
    console.warn('[Maps] Geocode error:', e.message);
  }
  return null;
}

/**
 * Simple map centered on location with a single orange pin
 */
export async function generateLocationMap(lat, lng, zoom = 14) {
  if (!MAPBOX_TOKEN) return null;
  const marker = `pin-l+e67e22(${lng},${lat})`;
  const url = `${STREETS}/${marker}/${lng},${lat},${zoom}/900x500@2x?access_token=${MAPBOX_TOKEN}`;
  return fetchAsBase64(url);
}

/**
 * Satellite view centered on location
 */
export async function generateSatelliteMap(lat, lng, zoom = 16) {
  if (!MAPBOX_TOKEN) return null;
  const marker = `pin-l+e67e22(${lng},${lat})`;
  const url = `${SATELLITE}/${marker}/${lng},${lat},${zoom}/900x500@2x?access_token=${MAPBOX_TOKEN}`;
  return fetchAsBase64(url);
}

/**
 * Map with numbered markers for establishments (schools, competitors)
 * @param {number} lat - center latitude
 * @param {number} lng - center longitude
 * @param {Array<{nom: string, adresse: string}>} items - list of items to place on map
 * @param {string} markerColor - hex color without # (e.g. 'f19015')
 * @param {number} zoom - zoom level for fallback
 */
export async function generateMarkersMap(lat, lng, items, markerColor = 'f19015', zoom = 11) {
  if (!MAPBOX_TOKEN) return null;

  // Geocode each item (up to 8)
  const toGeocode = items.slice(0, 8);
  const geocoded = await Promise.all(
    toGeocode.map(async (item, i) => {
      const address = item.adresse || item.nom;
      if (!address) return null;
      const coords = await geocode(address);
      if (!coords) return null;
      // Labels: 1-9
      const label = String(i + 1);
      return { ...coords, label };
    })
  );

  const validMarkers = geocoded.filter(Boolean);

  // Always include the main audit pin (red)
  const mainPin = `pin-l+d63031(${lng},${lat})`;

  if (validMarkers.length === 0) {
    // Fallback: just the main pin
    const url = `${STREETS}/${mainPin}/${lng},${lat},${zoom}/900x500@2x?access_token=${MAPBOX_TOKEN}`;
    return fetchAsBase64(url);
  }

  // Build overlay string
  const overlays = [
    mainPin,
    ...validMarkers.map(m => `pin-s-${m.label}+${markerColor}(${m.lng},${m.lat})`),
  ];

  const overlayStr = overlays.join(',');
  const url = `${STREETS}/${overlayStr}/auto/900x500@2x?padding=60&access_token=${MAPBOX_TOKEN}`;
  return fetchAsBase64(url);
}

/**
 * Concurrence map — color-coded by category
 * privées = orange, crous = blue, conventionnées = green
 */
export async function generateConcurrenceMap(lat, lng, concurrence) {
  if (!MAPBOX_TOKEN) return null;

  const allResidences = [
    ...(concurrence?.privees?.residences || []).map(r => ({ ...r, color: 'e17055' })),     // orange
    ...(concurrence?.crous?.residences || []).map(r => ({ ...r, color: '0984e3' })),       // blue
    ...(concurrence?.conventionnees?.residences || []).map(r => ({ ...r, color: '00b894' })), // green
  ].slice(0, 9);

  if (allResidences.length === 0) {
    return generateLocationMap(lat, lng, 12);
  }

  const geocoded = await Promise.all(
    allResidences.map(async (r, i) => {
      const address = r.adresse || r.nom;
      if (!address) return null;
      const coords = await geocode(address);
      if (!coords) return null;
      return { ...coords, label: String(i + 1), color: r.color };
    })
  );

  const validMarkers = geocoded.filter(Boolean);
  const mainPin = `pin-l+d63031(${lng},${lat})`;

  if (validMarkers.length === 0) {
    return generateLocationMap(lat, lng, 12);
  }

  const overlays = [
    mainPin,
    ...validMarkers.map(m => `pin-s-${m.label}+${m.color}(${m.lng},${m.lat})`),
  ];

  const url = `${STREETS}/${overlays.join(',')}/auto/900x500@2x?padding=60&access_token=${MAPBOX_TOKEN}`;
  return fetchAsBase64(url);
}
