const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bot_data.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('[DB] Connection Error:', err.message);
    else console.log('🟢 Connected to SQLite Database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS bans (id TEXT PRIMARY KEY)`);
    db.run(`CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY,
        userId TEXT,
        message TEXT,
        fireAt INTEGER
    )`);
});

module.exports = {
    isBanned: (userId) => new Promise((resolve) => {
        db.get("SELECT 1 FROM bans WHERE id = ?", [userId], (err, row) => resolve(!!row));
    }),
    addBan: (userId) => db.run("INSERT OR REPLACE INTO bans (id) VALUES (?)", [userId]),
    removeBan: (userId) => db.run("DELETE FROM bans WHERE id = ?", [userId]),
    loadBansIntoMemory: (callback) => {
        db.all("SELECT id FROM bans", [], (err, rows) => {
            if (!err && rows) callback(new Set(rows.map(r => r.id)));
        });
    },
    addReminder: (r) => db.run("INSERT INTO reminders VALUES (?,?,?,?)", [r.id, r.userId, r.message, r.fireAt]),
    getActiveReminders: (callback) => {
        db.all("SELECT * FROM reminders WHERE fireAt > ?", [Date.now()], (err, rows) => {
            if (!err && rows) callback(rows);
        });
    },
    deleteReminder: (id) => db.run("DELETE FROM reminders WHERE id = ?", [id])
};
