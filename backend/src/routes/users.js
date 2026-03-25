const express = require('express');
const router = express.Router();
const { db, toPlain, toPlainArray } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

// GET /api/users – list all users (for user switching in demo)
router.get('/', requireAuth, (req, res) => {
  const users = toPlainArray(
    db.prepare('SELECT user_id, username, role, created_at FROM users ORDER BY role DESC').all()
  );
  res.json(users);
});

// GET /api/users/me – current user info
router.get('/me', requireAuth, (req, res) => {
  const { user_id, username, role, created_at } = req.user;
  res.json({ user_id, username, role, created_at });
});

module.exports = router;
