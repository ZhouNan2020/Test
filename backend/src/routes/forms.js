const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, toPlain, toPlainArray } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const VALID_FIELD_TYPES = ['text', 'number', 'date', 'radio', 'checkbox', 'select', 'textarea'];

// ─── Forms ───────────────────────────────────────────────────────────────────

// GET /api/projects/:projectId/forms
router.get('/projects/:projectId/forms', requireAuth, (req, res) => {
  const project = toPlain(db.prepare('SELECT project_id FROM projects WHERE project_id = ?').get(req.params.projectId));
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const forms = toPlainArray(
    db.prepare('SELECT * FROM forms WHERE project_id = ? ORDER BY created_at DESC').all(req.params.projectId)
  );
  res.json(forms);
});

// GET /api/forms/:formId  – include fields
router.get('/forms/:formId', requireAuth, (req, res) => {
  const form = toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(req.params.formId));
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const fields = toPlainArray(
    db.prepare('SELECT * FROM form_fields WHERE form_id = ? ORDER BY display_order ASC').all(req.params.formId)
  );

  const parsedFields = fields.map(f => ({
    ...f,
    required: Boolean(f.required),
    options: f.options ? JSON.parse(f.options) : [],
  }));

  res.json({ ...form, fields: parsedFields });
});

// POST /api/projects/:projectId/forms – admin only
router.post('/projects/:projectId/forms', requireAdmin, (req, res) => {
  const project = toPlain(db.prepare('SELECT project_id FROM projects WHERE project_id = ?').get(req.params.projectId));
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { form_name, description } = req.body;
  if (!form_name) return res.status(400).json({ error: 'form_name is required' });

  const id = uuidv4();
  db.prepare(
    `INSERT INTO forms (form_id, project_id, form_name, description, created_by)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, req.params.projectId, form_name.trim(), description || '', req.user.username);

  res.status(201).json(toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(id)));
});

// PUT /api/forms/:formId – admin only
router.put('/forms/:formId', requireAdmin, (req, res) => {
  const form = toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(req.params.formId));
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const { form_name, description } = req.body;
  db.prepare('UPDATE forms SET form_name = ?, description = ? WHERE form_id = ?').run(
    form_name || form.form_name,
    description !== undefined ? description : form.description,
    req.params.formId
  );
  res.json(toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(req.params.formId)));
});

// DELETE /api/forms/:formId – admin only
router.delete('/forms/:formId', requireAdmin, (req, res) => {
  const form = toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(req.params.formId));
  if (!form) return res.status(404).json({ error: 'Form not found' });
  db.prepare('DELETE FROM forms WHERE form_id = ?').run(req.params.formId);
  res.status(204).send();
});

// ─── Form Fields ─────────────────────────────────────────────────────────────

// POST /api/forms/:formId/fields – admin only
router.post('/forms/:formId/fields', requireAdmin, (req, res) => {
  const form = toPlain(db.prepare('SELECT * FROM forms WHERE form_id = ?').get(req.params.formId));
  if (!form) return res.status(404).json({ error: 'Form not found' });

  const { field_label, field_type, required, options, display_order } = req.body;
  if (!field_label) return res.status(400).json({ error: 'field_label is required' });
  if (!field_type || !VALID_FIELD_TYPES.includes(field_type)) {
    return res.status(400).json({ error: `field_type must be one of: ${VALID_FIELD_TYPES.join(', ')}` });
  }

  const id = uuidv4();
  const optionsJson = ['radio', 'checkbox', 'select'].includes(field_type) && Array.isArray(options)
    ? JSON.stringify(options)
    : null;

  db.prepare(
    `INSERT INTO form_fields (field_id, form_id, field_label, field_type, required, options, display_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.params.formId, field_label.trim(), field_type, required ? 1 : 0, optionsJson, display_order ?? 0);

  const field = toPlain(db.prepare('SELECT * FROM form_fields WHERE field_id = ?').get(id));
  res.status(201).json({
    ...field,
    required: Boolean(field.required),
    options: field.options ? JSON.parse(field.options) : [],
  });
});

// PUT /api/forms/:formId/fields/:fieldId – admin only
router.put('/forms/:formId/fields/:fieldId', requireAdmin, (req, res) => {
  const field = toPlain(
    db.prepare('SELECT * FROM form_fields WHERE field_id = ? AND form_id = ?')
      .get(req.params.fieldId, req.params.formId)
  );
  if (!field) return res.status(404).json({ error: 'Field not found' });

  const { field_label, field_type, required, options, display_order } = req.body;
  const newType = field_type || field.field_type;
  if (!VALID_FIELD_TYPES.includes(newType)) {
    return res.status(400).json({ error: `field_type must be one of: ${VALID_FIELD_TYPES.join(', ')}` });
  }

  const optionsJson = ['radio', 'checkbox', 'select'].includes(newType) && Array.isArray(options)
    ? JSON.stringify(options)
    : field.options;

  db.prepare(
    `UPDATE form_fields SET field_label=?, field_type=?, required=?, options=?, display_order=? WHERE field_id=?`
  ).run(
    field_label || field.field_label,
    newType,
    required !== undefined ? (required ? 1 : 0) : field.required,
    optionsJson,
    display_order !== undefined ? display_order : field.display_order,
    req.params.fieldId
  );

  const updated = toPlain(db.prepare('SELECT * FROM form_fields WHERE field_id = ?').get(req.params.fieldId));
  res.json({ ...updated, required: Boolean(updated.required), options: updated.options ? JSON.parse(updated.options) : [] });
});

// DELETE /api/forms/:formId/fields/:fieldId – admin only
router.delete('/forms/:formId/fields/:fieldId', requireAdmin, (req, res) => {
  const field = toPlain(
    db.prepare('SELECT * FROM form_fields WHERE field_id = ? AND form_id = ?')
      .get(req.params.fieldId, req.params.formId)
  );
  if (!field) return res.status(404).json({ error: 'Field not found' });
  db.prepare('DELETE FROM form_fields WHERE field_id = ?').run(req.params.fieldId);
  res.status(204).send();
});

module.exports = router;
