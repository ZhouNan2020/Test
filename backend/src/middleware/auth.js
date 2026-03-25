/**
 * Minimal auth middleware.
 * In a real system this would verify JWT or session tokens.
 * Here we read `x-user-id` header and look up the user from DB.
 */
const { db, toPlain } = require('../db/database');

function requireAuth(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Missing x-user-id header' });
  }
  const user = toPlain(db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId));
  if (!user) {
    return res.status(401).json({ error: 'Unknown user' });
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
