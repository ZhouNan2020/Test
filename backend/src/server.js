const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,                  // max 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/projects', require('./routes/projects'));
app.use('/api', require('./routes/forms'));
app.use('/api', require('./routes/entries'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Serve built frontend static files ────────────────────────────────────────
const FRONTEND_DIST = path.join(__dirname, '../..', 'frontend', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback: return index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  console.warn(`WARNING: Frontend build not found at ${FRONTEND_DIST}. Run "npm run build" in the frontend directory first.`);
}

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`EDC system ready → http://localhost:${PORT}`);
});

module.exports = app;
