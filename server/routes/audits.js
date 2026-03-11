import { Router } from 'express';
import {
  createAudit, getAudits, getAudit, updateAudit, deleteAudit,
  getAuditSections, upsertSection
} from '../db/index.js';
import { SECTIONS } from '../services/ai-pipeline.js';

const router = Router();

// GET /api/audits
router.get('/', async (req, res) => {
  try {
    const audits = await getAudits();
    res.json(audits);
  } catch (err) {
    console.error('[Audits] List error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audits
router.post('/', async (req, res) => {
  try {
    const { address, city, postalCode } = req.body;
    if (!address?.trim()) return res.status(400).json({ error: 'Adresse requise' });

    const audit = await createAudit({ address: address.trim(), city, postalCode });
    res.status(201).json(audit);
  } catch (err) {
    console.error('[Audits] Create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audits/:id
router.get('/:id', async (req, res) => {
  try {
    const audit = await getAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit non trouvé' });

    const sections = await getAuditSections(req.params.id);
    res.json({ ...audit, sections });
  } catch (err) {
    console.error('[Audits] Get error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/audits/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteAudit(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/audits/:id/sections/:type — Manual section edit
router.put('/:id/sections/:type', async (req, res) => {
  try {
    const audit = await getAudit(req.params.id);
    if (!audit) return res.status(404).json({ error: 'Audit non trouvé' });

    const section = await upsertSection(req.params.id, req.params.type, {
      status: 'done',
      content: req.body.content,
    });
    res.json(section);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audits/:id/generate — Start full generation (SSE streaming)
router.post('/:id/generate', async (req, res) => {
  const audit = await getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit non trouvé' });

  const sectionsToGenerate = req.body.sections || SECTIONS.map(s => s.type);

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await updateAudit(audit.id, { status: 'generating' });
    send('start', { auditId: audit.id, sections: sectionsToGenerate });

    for (const sectionDef of SECTIONS) {
      if (!sectionsToGenerate.includes(sectionDef.type)) continue;

      send('section_start', { type: sectionDef.type, label: sectionDef.label });

      // Mark as generating
      await upsertSection(audit.id, sectionDef.type, { status: 'generating' });

      try {
        const result = await sectionDef.fn(audit.address);
        await upsertSection(audit.id, sectionDef.type, {
          status: 'done',
          content: result.content,
          rawAiResponse: result.rawAiResponse,
        });
        send('section_done', {
          type: sectionDef.type,
          label: sectionDef.label,
          content: result.content,
        });
      } catch (sectionErr) {
        console.error(`[Audits] Section ${sectionDef.type} error:`, sectionErr.message);
        await upsertSection(audit.id, sectionDef.type, {
          status: 'error',
          error: sectionErr.message,
        });
        send('section_error', {
          type: sectionDef.type,
          label: sectionDef.label,
          error: sectionErr.message,
        });
      }
    }

    await updateAudit(audit.id, { status: 'done' });
    send('complete', { auditId: audit.id });
  } catch (err) {
    console.error('[Audits] Generation error:', err);
    await updateAudit(audit.id, { status: 'error', error: err.message });
    send('error', { message: err.message });
  } finally {
    res.end();
  }
});

// POST /api/audits/:id/regenerate/:type — Regenerate a specific section
router.post('/:id/regenerate/:type', async (req, res) => {
  const audit = await getAudit(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit non trouvé' });

  const sectionDef = SECTIONS.find(s => s.type === req.params.type);
  if (!sectionDef) return res.status(400).json({ error: 'Type de section invalide' });

  // SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await upsertSection(audit.id, req.params.type, { status: 'generating' });
    send('section_start', { type: sectionDef.type, label: sectionDef.label });

    const result = await sectionDef.fn(audit.address);
    await upsertSection(audit.id, req.params.type, {
      status: 'done',
      content: result.content,
      rawAiResponse: result.rawAiResponse,
    });

    send('section_done', {
      type: sectionDef.type,
      label: sectionDef.label,
      content: result.content,
    });
    send('complete', {});
  } catch (err) {
    await upsertSection(audit.id, req.params.type, {
      status: 'error',
      error: err.message,
    });
    send('section_error', { type: req.params.type, error: err.message });
    send('complete', {});
  } finally {
    res.end();
  }
});

export default router;
