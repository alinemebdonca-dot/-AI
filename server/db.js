import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.db');

// Ensure db file exists
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, '');
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Projects Table (Added user_id column)
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        data TEXT,
        updated_at INTEGER
    )`);

    // 2. Characters Table (Added user_id column)
    db.run(`CREATE TABLE IF NOT EXISTS characters (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        data TEXT
    )`);

    // 3. Settings Table (Added user_id column)
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        user_id TEXT PRIMARY KEY,
        data TEXT
    )`);

    // 4. Access Keys (Kami) Table - NEW
    // key_code: The card key string (e.g., BJ-USER-XXXX)
    // type: 'day', 'month', 'permanent', 'admin'
    // status: 'unused', 'active', 'expired', 'banned'
    // activated_at: When the user first used it
    // expires_at: When it expires
    // hardware_id: Bind to browser/device fingerprint (optional simple implementation)
    db.run(`CREATE TABLE IF NOT EXISTS access_keys (
        key_code TEXT PRIMARY KEY,
        type TEXT DEFAULT 'month', 
        status TEXT DEFAULT 'unused',
        duration_days INTEGER DEFAULT 30,
        created_at INTEGER,
        activated_at INTEGER,
        expires_at INTEGER,
        hardware_id TEXT
    )`);
    
    // Create default Admin Key if not exists
    const adminKey = 'ADMIN888';
    db.get("SELECT key_code FROM access_keys WHERE key_code = ?", [adminKey], (err, row) => {
        if (!row) {
            const now = Date.now();
            db.run(`INSERT INTO access_keys (key_code, type, status, duration_days, created_at, activated_at, expires_at) 
                    VALUES (?, 'admin', 'active', 99999, ?, ?, ?)`, 
                    [adminKey, now, now, now + 3153600000000]); // 100 years
            console.log("Default Admin Key created: ADMIN888");
        }
    });
});

export default db;