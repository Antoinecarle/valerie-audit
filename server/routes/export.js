/**
 * Export route — PPTX download for audit reports
 * GET /api/audits/:id/export?format=pptx
 */

import { Router } from 'express';
import { getAudit, getAuditSections } from '../db/index.js';
import { generateReport } from '../services/report-generator.js';

const router = Router({ mergeParams: true });

// GET /api/audits/:id/export?format=pptx
router.get('/', async (req, res) => {
  const { id } = req.params;
  const format = (req.query.format || 'pptx').toLowerCase();

  try {
    const audit = await getAudit(id);
    if (!audit) return res.status(404).json({ error: 'Audit non trouvé' });

    const sections = await getAuditSections(id);

    console.log(`[Export] Generating ${format.toUpperCase()} for audit ${id} — ${audit.address}`);

    const pptxBuffer = await generateReport(audit, sections);

    const safeName = (audit.address || `audit-${id}`)
      .replace(/[^a-z0-9\-_]/gi, '_')
      .substring(0, 60);
    const filename = `valerie_audit_${safeName}_${new Date().toISOString().slice(0, 10)}.pptx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pptxBuffer.length);
    res.send(pptxBuffer);
  } catch (err) {
    console.error('[Export] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
