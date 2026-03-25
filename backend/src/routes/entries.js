const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, toPlain, toPlainArray } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/forms/:formId/entries
router.get('/forms/:formId/entries', requireAuth, (req, res) => {
  const form = toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(req.params.formId));
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const entries = toPlainArray(
    db.prepare('SELECT * FROM form_entries WHERE form_id = ? ORDER BY submitted_at DESC').all(req.params.formId)
  );

  res.json(entries);
});

// GET /api/entries/:entryId – full entry with field values
router.get('/entries/:entryId', requireAuth, (req, res) => {
  const entry = toPlain(db.prepare('SELECT * FROM form_entries WHERE entry_id = ?').get(req.params.entryId));
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const values = toPlainArray(
    db.prepare(`
      SELECT fev.value_id, fev.field_id, ff.field_label, ff.field_type, fev.field_value
      FROM form_entry_values fev
      JOIN form_fields ff ON ff.field_id = fev.field_id
      WHERE fev.entry_id = ?
      ORDER BY ff.display_order ASC
    `).all(req.params.entryId)
  );

  res.json({ ...entry, values });
});

// POST /api/forms/:formId/entries – any authenticated user
router.post('/forms/:formId/entries', requireAuth, (req, res) => {
  const form = toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(req.params.formId));
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const fields = toPlainArray(
    db.prepare('SELECT * FROM form_fields WHERE form_id = ? ORDER BY display_order ASC').all(req.params.formId)
  );

  const { values = {}, status = 'submitted' } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────────
  const errors = [];

  for (const field of fields) {
    const raw = values[field.field_id];
    const isEmpty = raw === undefined || raw === null || String(raw).trim() === '';

    if (field.required && isEmpty) {
      errors.push({ field_id: field.field_id, field_label: field.field_label, error: 'Required field is missing' });
      continue;
    }
    if (isEmpty) continue;

    // Type checks
    if (field.field_type === 'number' && isNaN(Number(raw))) {
      errors.push({ field_id: field.field_id, field_label: field.field_label, error: 'Must be a number' });
    }
    if (field.field_type === 'date' && isNaN(Date.parse(raw))) {
      errors.push({ field_id: field.field_id, field_label: field.field_label, error: 'Must be a valid date' });
    }
    if (['radio', 'select'].includes(field.field_type) && field.options) {
      const opts = JSON.parse(field.options);
      if (!opts.includes(raw)) {
        errors.push({ field_id: field.field_id, field_label: field.field_label, error: `Value must be one of: ${opts.join(', ')}` });
      }
    }
    if (field.field_type === 'checkbox' && field.options) {
      const opts = JSON.parse(field.options);
      const selected = Array.isArray(raw) ? raw : [raw];
      const invalid = selected.filter(v => !opts.includes(v));
      if (invalid.length > 0) {
        errors.push({ field_id: field.field_id, field_label: field.field_label, error: `Invalid options: ${invalid.join(', ')}` });
      }
    }
  }

  // Reject unknown field ids
  const fieldIds = new Set(fields.map(f => f.field_id));
  for (const key of Object.keys(values)) {
    if (!fieldIds.has(key)) {
      errors.push({ field_id: key, error: 'Unknown field' });
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({ error: 'Validation failed', details: errors });
  }

  // ── Persist using manual transaction ────────────────────────────────────────
  const entryId = uuidv4();

  const insertEntry = db.prepare(
    `INSERT INTO form_entries (entry_id, project_id, form_id, submitted_by, status)
     VALUES (?, ?, ?, ?, ?)`
  );
  const insertValue = db.prepare(
    `INSERT INTO form_entry_values (value_id, entry_id, field_id, field_value) VALUES (?, ?, ?, ?)`
  );

  db.exec('BEGIN');
  try {
    insertEntry.run(entryId, form.project_id, form.form_id, req.user.username, status);
    for (const field of fields) {
      const raw = values[field.field_id];
      if (raw === undefined || raw === null) continue;
      const storedValue = Array.isArray(raw) ? JSON.stringify(raw) : String(raw);
      insertValue.run(uuidv4(), entryId, field.field_id, storedValue);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const entry = toPlain(db.prepare('SELECT * FROM form_entries WHERE entry_id = ?').get(entryId));
  res.status(201).json(entry);
});

// DELETE /api/entries/:entryId – admin only
router.delete('/entries/:entryId', requireAdmin, (req, res) => {
  const entry = toPlain(db.prepare('SELECT * FROM form_entries WHERE entry_id = ?').get(req.params.entryId));
  if (!entry) return res.status(404).json({ error: 'Entry not found' });
  db.prepare('DELETE FROM form_entries WHERE entry_id = ?').run(req.params.entryId);
  res.status(204).send();
});

module.exports = router;
