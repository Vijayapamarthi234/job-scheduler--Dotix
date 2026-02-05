
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./jobs.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      taskName TEXT,
      payload TEXT,
      priority TEXT,
      status TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);
});

module.exports = db;
