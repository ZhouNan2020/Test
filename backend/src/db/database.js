const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '../../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'edc.db');
const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─────────────────────────────────────────────
// Schema DDL
// ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    project_id   TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    project_code TEXT NOT NULL UNIQUE,
    description  TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    created_by   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS forms (
    form_id     TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    form_name   TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    created_by  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS form_fields (
    field_id      TEXT PRIMARY KEY,
    form_id       TEXT NOT NULL REFERENCES forms(form_id) ON DELETE CASCADE,
    field_label   TEXT NOT NULL,
    field_type    TEXT NOT NULL CHECK(field_type IN ('text','number','date','radio','checkbox','select','textarea')),
    required      INTEGER NOT NULL DEFAULT 0,
    options       TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS form_entries (
    entry_id     TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(project_id),
    form_id      TEXT NOT NULL REFERENCES forms(form_id),
    submitted_by TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    status       TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted'))
  );

  CREATE TABLE IF NOT EXISTS form_entry_values (
    value_id    TEXT PRIMARY KEY,
    entry_id    TEXT NOT NULL REFERENCES form_entries(entry_id) ON DELETE CASCADE,
    field_id    TEXT NOT NULL REFERENCES form_fields(field_id),
    field_value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    user_id    TEXT PRIMARY KEY,
    username   TEXT NOT NULL UNIQUE,
    role       TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO users (user_id, username, role) VALUES
    ('admin-001', 'admin', 'admin'),
    ('user-001',  'researcher1', 'user'),
    ('user-002',  'crc1', 'user');
`);

/**
 * Helper: convert a null-prototype object from node:sqlite to a plain object.
 * node:sqlite returns rows as [Object: null prototype], which JSON.stringify handles
 * correctly, but spreading with {...row} works too.
 */
function toPlain(row) {
  if (!row) return null;
  return Object.assign({}, row);
}

function toPlainArray(rows) {
  return rows.map(toPlain);
}

module.exports = { db, toPlain, toPlainArray };
