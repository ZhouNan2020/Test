const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db, toPlain, toPlainArray } = require('../db/database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/projects – list all projects (all authenticated users)
router.get('/', requireAuth, (req, res) => {
  const rows = toPlainArray(db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all());
  res.json(rows);
});

// GET /api/projects/:id
router.get('/:id', requireAuth, (req, res) => {
  const project = toPlain(db.prepare('SELECT * FROM projects WHERE project_id = ?').get(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// POST /api/projects – admin only
router.post('/', requireAdmin, (req, res) => {
  const { project_name, project_code, description } = req.body;
  if (!project_name || !project_code) {
    return res.status(400).json({ error: 'project_name and project_code are required' });
  }
  const id = uuidv4();
  try {
    db.prepare(
      `INSERT INTO projects (project_id, project_name, project_code, description, created_by)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, project_name.trim(), project_code.trim().toUpperCase(), description || '', req.user.username);
    const project = toPlain(db.prepare('SELECT * FROM projects WHERE project_id = ?').get(id));
    res.status(201).json(project);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'project_code already exists' });
    }
    throw err;
  }
});

// PUT /api/projects/:id – admin only
router.put('/:id', requireAdmin, (req, res) => {
  const { project_name, project_code, description } = req.body;
  const project = toPlain(db.prepare('SELECT * FROM projects WHERE project_id = ?').get(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });

  try {
    db.prepare(
      `UPDATE projects SET project_name = ?, project_code = ?, description = ? WHERE project_id = ?`
    ).run(
      project_name || project.project_name,
      project_code ? project_code.trim().toUpperCase() : project.project_code,
      description !== undefined ? description : project.description,
      req.params.id
    );
    res.json(toPlain(db.prepare('SELECT * FROM projects WHERE project_id = ?').get(req.params.id)));
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'project_code already exists' });
    }
    throw err;
  }
});

// DELETE /api/projects/:id – admin only
router.delete('/:id', requireAdmin, (req, res) => {
  const project = toPlain(db.prepare('SELECT * FROM projects WHERE project_id = ?').get(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE project_id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
