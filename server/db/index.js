import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function migrate() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  await query(schema);
  console.log('[DB] Migrations applied');
}

// Audit CRUD
export async function createAudit(data) {
  const r = await query(
    `INSERT INTO audits (address, city, postal_code, lat, lng, status)
     VALUES ($1, $2, $3, $4, $5, 'draft') RETURNING *`,
    [data.address, data.city || null, data.postalCode || null, data.lat || null, data.lng || null]
  );
  return r.rows[0];
}

export async function getAudits() {
  const r = await query(
    `SELECT a.*,
       COUNT(s.id) FILTER (WHERE s.status = 'done') as sections_done,
       COUNT(s.id) as sections_total
     FROM audits a
     LEFT JOIN audit_sections s ON s.audit_id = a.id
     GROUP BY a.id
     ORDER BY a.created_at DESC`
  );
  return r.rows;
}

export async function getAudit(id) {
  const r = await query('SELECT * FROM audits WHERE id = $1', [id]);
  return r.rows[0];
}

export async function updateAudit(id, data) {
  const fields = [];
  const values = [];
  let i = 1;
  for (const [key, val] of Object.entries(data)) {
    fields.push(`${key} = $${i++}`);
    values.push(val);
  }
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const r = await query(
    `UPDATE audits SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return r.rows[0];
}

export async function deleteAudit(id) {
  await query('DELETE FROM audits WHERE id = $1', [id]);
}

// Sections CRUD
export async function getAuditSections(auditId) {
  const r = await query(
    'SELECT * FROM audit_sections WHERE audit_id = $1 ORDER BY created_at ASC',
    [auditId]
  );
  return r.rows;
}

export async function upsertSection(auditId, sectionType, data) {
  const r = await query(
    `INSERT INTO audit_sections (audit_id, section_type, status, content, raw_ai_response, error)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (audit_id, section_type) DO UPDATE SET
       status = EXCLUDED.status,
       content = EXCLUDED.content,
       raw_ai_response = EXCLUDED.raw_ai_response,
       error = EXCLUDED.error,
       updated_at = NOW()
     RETURNING *`,
    [auditId, sectionType, data.status, data.content ? JSON.stringify(data.content) : null, data.rawAiResponse || null, data.error || null]
  );
  return r.rows[0];
}

export async function updateSection(auditId, sectionType, data) {
  const r = await query(
    `UPDATE audit_sections SET status = $3, content = $4, raw_ai_response = $5, error = $6, updated_at = NOW()
     WHERE audit_id = $1 AND section_type = $2 RETURNING *`,
    [auditId, sectionType, data.status, data.content ? JSON.stringify(data.content) : null, data.rawAiResponse || null, data.error || null]
  );
  return r.rows[0];
}

// Add unique constraint if not exists (run after schema)
export async function addConstraints() {
  try {
    await query(
      `ALTER TABLE audit_sections ADD CONSTRAINT audit_sections_unique_type UNIQUE (audit_id, section_type)`
    );
  } catch {
    // Already exists
  }
}
