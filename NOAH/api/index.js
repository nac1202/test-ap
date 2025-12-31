const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@vercel/kv');

const app = express();
// Serverless environments typically read-only, but /tmp is writable.
// We fallback to memoryStatus anyway if fs fails.
const STATUS_FILE = path.join('/tmp', 'status.json');

const ADMIN_USER = process.env.ADMIN_USER || 'miryu';
const ADMIN_PASS = process.env.ADMIN_PASS || '0418';

let memoryStatus = {
    counter: 'green',
    box: 'green',
    shopStatus: 'open',
    theme: 'normal',
    cast: {
        miryu: { name: 'MIRYU (みりゅう)', isPresent: false, id: 'miryu' },
        micchan: { name: 'MICCHAN (みっちゃん)', isPresent: false, id: 'micchan' },
        eri: { name: 'ERI (えり)', isPresent: false, id: 'eri' },
        uru: { name: 'URU (うる)', isPresent: false, id: 'uru' },
        ikuko: { name: 'IKUKO (いくこ)', isPresent: false, id: 'ikuko' }
    }
};

// Support both Vercel KV (KV_...) and Marketplace Upstash (UPSTASH_...)
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
let kv = null;

if (KV_URL && KV_TOKEN) {
    try {
        kv = createClient({
            url: KV_URL,
            token: KV_TOKEN,
        });
        console.log('KV Client Initialized');
    } catch (e) {
        console.error('Failed to initialize KV client:', e);
    }
}

async function readStatus() {
    if (kv) {
        try {
            const s = await kv.get('status');
            // Migration helper: if old format (boolean values), convert to object
            if (s && s.cast) {
                let needsFix = false;
                for (const key of Object.keys(s.cast)) {
                    if (typeof s.cast[key] === 'boolean') {
                        // Fallback names for existing keys if migration happens live
                        const fallbackNames = {
                            miryu: 'MIRYU (みりゅう)',
                            micchan: 'MICCHAN (みっちゃん)',
                            eri: 'ERI (えり)',
                            uru: 'URU (うる)',
                            ikuko: 'IKUKO (いくこ)'
                        };
                        s.cast[key] = {
                            name: fallbackNames[key] || key.toUpperCase(),
                            isPresent: s.cast[key],
                            id: key
                        };
                        needsFix = true;
                    }
                }
                if (needsFix) await writeStatus(s); // Save converted
            }
            if (s) return s;
        } catch (e) {
            console.error('KV Read Error:', e);
        }
    }
    return memoryStatus;
}

async function writeStatus(s) {
    memoryStatus = s;
    if (kv) {
        try {
            await kv.set('status', s);
        } catch (e) {
            console.error('KV Write Error:', e);
        }
    }
}

function parseBasicAuth(header) {
    if (!header) return null;
    const m = header.match(/^Basic\s+(.+)$/);
    if (!m) return null;
    const buf = Buffer.from(m[1], 'base64');
    const parts = buf.toString().split(':');
    return { user: parts[0], pass: parts.slice(1).join(':') };
}

function authMiddleware(req, res, next) {
    const cred = parseBasicAuth(req.headers.authorization);
    if (cred && cred.user === ADMIN_USER && cred.pass === ADMIN_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="NOA Admin"');
    return res.status(401).send('Authentication required');
}

app.use(express.json());
// Static files are handled by Vercel automatically from public/ folder

app.get('/api/status-v2', async (req, res) => {
    res.json(await readStatus());
});

app.post('/api/status-v2', authMiddleware, async (req, res) => {
    try {
        const body = req.body || {};
        const s = await readStatus();
        if (!s.cast) s.cast = {};

        // Update Seat Status
        if (body.area && body.status) {
            if (['counter', 'box'].includes(body.area) && ['green', 'yellow', 'red'].includes(body.status)) {
                s[body.area] = body.status;
            }
        }

        // Update Shop Status
        if (body.shopStatus) {
            if (['open', 'holiday', 'reserved', 'closed'].includes(body.shopStatus)) {
                s.shopStatus = body.shopStatus;
            }
        }

        // Update Theme
        if (body.theme) {
            // Validate theme if strict, but flexible for now
            s.theme = body.theme;
        }

        // Toggle Cast Status
        if (body.castUpdate) {
            const { id, isPresent } = body.castUpdate;
            if (s.cast[id]) {
                s.cast[id].isPresent = isPresent;
            }
        }

        // Add New Cast
        if (body.addCast) {
            const { id, name } = body.addCast;
            if (id && name) {
                s.cast[id] = { id, name, isPresent: false };
            }
        }

        // Remove Cast
        if (body.removeCast) {
            const { id } = body.removeCast;
            if (s.cast[id]) {
                delete s.cast[id];
            }
        }

        await writeStatus(s);
        res.json(s);
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Admin Route - Handled by static file serving usually?
// But we want Auth protection.
// In Vercel serverless, app.get('/admin') will be hit if rewriting /admin -> /api/index
app.get('/admin', authMiddleware, (req, res) => {
    // We need to serve the file content manually if we want to protect it via middleware here.
    // path join from __dirname (which is api/) up one level to public/
    const adminPath = path.join(__dirname, '../public', 'admin.html');
    res.sendFile(adminPath);
});

module.exports = app;
