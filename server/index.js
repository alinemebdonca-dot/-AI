import express from 'express';
import cors from 'cors';
import db from './db.js';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;
const JWT_SECRET = 'baojian-ai-secret-key-change-this-in-prod';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Middleware: Authenticate Token ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token expired or invalid' });
    req.user = user; // user contains { key_code, type, exp }
    next();
  });
};

// --- Middleware: Admin Only ---
const requireAdmin = (req, res, next) => {
    if (req.user.type !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// --- API: Auth / Login ---
app.post('/api/auth/login', (req, res) => {
    const { keyCode, hardwareId } = req.body;
    
    if (!keyCode) return res.status(400).json({ error: '请输入卡密' });

    db.get("SELECT * FROM access_keys WHERE key_code = ?", [keyCode], (err, key) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!key) return res.status(401).json({ error: '卡密不存在' });
        
        const now = Date.now();

        // 1. Check if banned
        if (key.status === 'banned') return res.status(403).json({ error: '此卡密已被封禁' });

        // 2. Logic for Unused Keys (Activate them)
        if (key.status === 'unused') {
            const expiresAt = now + (key.duration_days * 24 * 60 * 60 * 1000);
            
            db.run("UPDATE access_keys SET status = 'active', activated_at = ?, expires_at = ?, hardware_id = ? WHERE key_code = ?", 
                [now, expiresAt, hardwareId, keyCode], 
                (err) => {
                    if (err) return res.status(500).json({ error: 'Activation failed' });
                    
                    // Issue Token
                    const token = jwt.sign({ key_code: key.key_code, type: key.type }, JWT_SECRET, { expiresIn: '24h' });
                    return res.json({ 
                        token, 
                        user: { type: key.type, expiresAt },
                        message: `激活成功！有效期至 ${new Date(expiresAt).toLocaleString()}` 
                    });
                }
            );
            return;
        }

        // 3. Logic for Active Keys (Check Expiry)
        if (key.status === 'active') {
            if (key.expires_at < now) {
                db.run("UPDATE access_keys SET status = 'expired' WHERE key_code = ?", [keyCode]);
                return res.status(403).json({ error: '卡密已过期，请购买新卡密' });
            }
            
            // Optional: Hardware binding check
            // if (key.hardware_id && key.hardware_id !== hardwareId) { ... }

            const token = jwt.sign({ key_code: key.key_code, type: key.type }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ 
                token, 
                user: { type: key.type, expiresAt: key.expires_at },
                message: '登录成功'
            });
        }

        if (key.status === 'expired') {
            return res.status(403).json({ error: '卡密已过期' });
        }
    });
});

// --- API: Admin Management ---

// List all keys
app.get('/api/admin/keys', authenticateToken, requireAdmin, (req, res) => {
    db.all("SELECT * FROM access_keys ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Generate keys
app.post('/api/admin/generate', authenticateToken, requireAdmin, (req, res) => {
    const { prefix, count, days, type } = req.body;
    const numCount = parseInt(count) || 1;
    const duration = parseInt(days) || 30;
    const keyType = type || 'user';
    const cleanPrefix = prefix ? prefix.toUpperCase() : 'BJ';
    
    const now = Date.now();
    const newKeys = [];

    const stmt = db.prepare("INSERT INTO access_keys (key_code, type, status, duration_days, created_at) VALUES (?, ?, 'unused', ?, ?)");

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        for (let i = 0; i < numCount; i++) {
            const randomStr = uuidv4().split('-')[0].toUpperCase();
            const keyCode = `${cleanPrefix}-${randomStr}-${Date.now().toString().slice(-4)}`;
            stmt.run(keyCode, keyType, duration, now);
            newKeys.push(keyCode);
        }
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: 'Generation failed' });
            res.json({ message: `成功生成 ${numCount} 个卡密`, keys: newKeys });
        });
    });
});

// Delete Key
app.delete('/api/admin/keys/:code', authenticateToken, requireAdmin, (req, res) => {
    db.run("DELETE FROM access_keys WHERE key_code = ?", [req.params.code], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Deleted' });
    });
});

// --- API: User Data (Protected by JWT, Isolated by User ID) ---

// Projects
app.get('/api/projects', authenticateToken, (req, res) => {
    // Only return projects belonging to this key_code
    db.all("SELECT data FROM projects WHERE user_id = ?", [req.user.key_code], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const projects = rows.map(row => JSON.parse(row.data));
        res.json(projects);
    });
});

app.post('/api/projects', authenticateToken, (req, res) => {
    const project = req.body;
    const dataStr = JSON.stringify(project);
    db.run(`INSERT INTO projects (id, user_id, data, updated_at) VALUES (?, ?, ?, ?) 
            ON CONFLICT(id) DO UPDATE SET data = ?, updated_at = ?`,
        [project.id, req.user.key_code, dataStr, Date.now(), dataStr, Date.now()],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM projects WHERE id = ? AND user_id = ?", [req.params.id, req.user.key_code], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Characters
app.get('/api/characters', authenticateToken, (req, res) => {
    db.all("SELECT data FROM characters WHERE user_id = ?", [req.user.key_code], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const chars = rows.map(row => JSON.parse(row.data));
        res.json(chars);
    });
});

app.post('/api/characters', authenticateToken, (req, res) => {
    const chars = req.body; // Array
    // This assumes full replace for simplicity, or we loop upsert. 
    // For syncing a library, usually we upsert one by one or delete all for user and re-insert.
    // Let's do simple upsert loop for this array.
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        // Clear old ones? Maybe not, safety first. Just Upsert.
        // Actually, frontend sends full list usually. Let's delete all for user and insert new list to keep sync clean.
        db.run("DELETE FROM characters WHERE user_id = ?", [req.user.key_code]);
        
        const stmt = db.prepare("INSERT INTO characters (id, user_id, data) VALUES (?, ?, ?)");
        chars.forEach(char => {
            stmt.run(char.id, req.user.key_code, JSON.stringify(char));
        });
        
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Settings
app.get('/api/settings', authenticateToken, (req, res) => {
    db.get("SELECT data FROM settings WHERE user_id = ?", [req.user.key_code], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row ? JSON.parse(row.data) : {});
    });
});

app.post('/api/settings', authenticateToken, (req, res) => {
    const dataStr = JSON.stringify(req.body);
    db.run(`INSERT INTO settings (user_id, data) VALUES (?, ?) 
            ON CONFLICT(user_id) DO UPDATE SET data = ?`,
        [req.user.key_code, dataStr, dataStr],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});