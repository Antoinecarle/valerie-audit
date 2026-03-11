/**
 * One-time script: geocode existing audits without coordinates
 * Run: node server/scripts/backfill-coords.js
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dBatOMUFtFXYOOZVZEOMFCzmxGLTdxgA@trolley.proxy.rlwy.net:30467/railway',
  ssl: { rejectUnauthorized: false },
});

async function geocodeAddress(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODE_API_KEY;
  if (!key) throw new Error('No Google API key');

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', key);
  url.searchParams.set('region', 'fr');

  const r = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  const data = await r.json();

  if (data.results?.[0]?.geometry?.location) {
    return data.results[0].geometry.location; // { lat, lng }
  }
  return null;
}

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      'SELECT id, address FROM audits WHERE lat IS NULL ORDER BY created_at ASC'
    );

    console.log(`Found ${rows.length} audits without coordinates`);

    for (const audit of rows) {
      console.log(`Geocoding: "${audit.address}"...`);
      try {
        const coords = await geocodeAddress(audit.address);
        if (coords) {
          await client.query(
            'UPDATE audits SET lat = $1, lng = $2 WHERE id = $3',
            [coords.lat, coords.lng, audit.id]
          );
          console.log(`  ✓ lat=${coords.lat}, lng=${coords.lng}`);
        } else {
          console.log(`  ✗ No result`);
        }
      } catch (err) {
        console.error(`  ✗ Error: ${err.message}`);
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('Done!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
