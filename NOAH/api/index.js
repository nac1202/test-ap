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

// Default Memory State
let memoryData = {
    // Current Seat Status (Manual)
    seats: {
        counter: 'green',
        box: 'green'
    },
    // Calendar Schedules: "YYYY-MM-DD": { openTime, closeTime, type, cast: [] }
    schedules: {},
    // Master Cast List (Dynamic)
    // Key = ID, Value = Display Name
    castMaster: {
        'MIRYU': 'MIRYU (みりゅう)',
        'URU': 'URU (うる)',
        'MICCHAN': 'MICCHAN (みっちゃん)',
        'ERI': 'ERI (えり)',
        'IKUKO': 'IKUKO (いくこ)'
    },
    theme: 'normal',
    mamaMessage: ''
};

// Helper: Get JST Date
function getJSTNow() {
    // Vercel might be UTC, so we manually shift
    const now = new Date();
    // UTC time + 9 hours
    return new Date(now.getTime() + (9 * 60 * 60 * 1000));
}

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

async function readData() {
    if (kv) {
        try {
            const data = await kv.get('noa_data_v2');
            if (data) {
                return {
                    ...memoryData,
                    ...data,
                    seats: { ...memoryData.seats, ...(data.seats || {}) },
                    schedules: { ...memoryData.schedules, ...(data.schedules || {}) },
                    schedules: { ...memoryData.schedules, ...(data.schedules || {}) },
                    castMaster: { ...memoryData.castMaster, ...(data.castMaster || {}) },
                    mamaMessage: data.mamaMessage || memoryData.mamaMessage
                };
            }
        } catch (e) {
            console.error('KV Read Error:', e);
        }
    }
    return memoryData;
}

async function writeData(data) {
    memoryData = data;
    if (kv) {
        try {
            await kv.set('noa_data_v2', data);
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

// Main Public API
app.get('/api/status-v2', async (req, res) => {
    const data = await readData();
    const nowJST = getJSTNow();

    const currentHour = nowJST.getUTCHours();
    const currentMin = nowJST.getUTCMinutes();

    let targetDateStr = nowJST.toISOString().split('T')[0];
    let displayState = 'PRE_OPEN';

    if (currentHour < 7) {
        displayState = 'ENDED';
    } else {
        const schedule = data.schedules[targetDateStr] || {
            openTime: '18:00', closeTime: '23:30', type: 'normal', cast: []
        };
        const [openH, openM] = schedule.openTime.split(':').map(Number);
        const [closeH, closeM] = schedule.closeTime.split(':').map(Number);
        const nowMinutes = currentHour * 60 + currentMin;
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        if (nowMinutes < openMinutes) {
            displayState = 'PRE_OPEN';
        } else if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
            displayState = 'OPEN';
        } else {
            displayState = 'ENDED';
        }
        if (schedule.type === 'holiday') displayState = 'HOLIDAY';
    }

    const todaySchedule = data.schedules[targetDateStr] || {
        openTime: '18:00', closeTime: '23:30', type: 'normal', cast: []
    };

    res.json({
        displayState,
        serverTime: nowJST.toISOString(),
        schedule: todaySchedule, // For public page convenience
        schedules: data.schedules, // For admin calendar
        seats: data.seats,
        theme: data.theme,
        theme: data.theme,
        castMaster: data.castMaster,
        mamaMessage: data.mamaMessage
    });
});

// Admin API
app.post('/api/status-v2', authMiddleware, async (req, res) => {
    try {
        const body = req.body || {};
        const data = await readData();

        // Update Seat Status
        if (body.updateSeats) {
            const { area, status } = body.updateSeats;
            if (data.seats && data.seats[area]) {
                data.seats[area] = status;
            }
        }

        // Update Schedule (Calendar)
        if (body.updateSchedule) {
            const { date, schedule } = body.updateSchedule;
            if (date && schedule) {
                if (!data.schedules) data.schedules = {};
                data.schedules[date] = schedule;
            }
        }

        // Add Cast
        if (body.addCast) {
            const { id, name } = body.addCast;
            if (id && name) {
                if (!data.castMaster) data.castMaster = {};
                data.castMaster[id] = name;
            }
        }

        // Remove Cast
        if (body.removeCast) {
            const { id } = body.removeCast;
            if (data.castMaster && data.castMaster[id]) {
                delete data.castMaster[id];
            }
        }

        // Theme Update (Global)
        if (body.theme) {
            data.theme = body.theme;
        }

        // Mama Message Update
        if (body.updateMamaMessage !== undefined) {
            data.mamaMessage = body.updateMamaMessage;
        }

        await writeData(data);
        res.json({ success: true, data });
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Admin Route
app.get('/admin', authMiddleware, (req, res) => {
    const adminPath = path.join(__dirname, '../public', 'admin.html');
    res.sendFile(adminPath);
});

module.exports = app;
