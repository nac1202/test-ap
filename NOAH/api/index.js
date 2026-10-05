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

const LOG_USER = process.env.LOG_USER || 'logadmin';
const LOG_PASS = process.env.LOG_PASS || 'noalog2026';

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
    mamaMessage: '',
    mamaTitle: ''
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
                    mamaMessage: data.mamaMessage || memoryData.mamaMessage,
                    mamaTitle: data.mamaTitle || memoryData.mamaTitle
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

function logAuthMiddleware(req, res, next) {
    const cred = parseBasicAuth(req.headers.authorization);
    if (cred && cred.user === LOG_USER && cred.pass === LOG_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="NOA Logs"');
    return res.status(401).send('Authentication required for Logs');
}

app.use(express.json());

// Main Public API
app.get('/api/status-v2', async (req, res) => {
    const data = await readData();
    const nowJST = getJSTNow();

    // 翌日の早朝7時までは、前日の「営業日」として扱う
    let logicalNow = new Date(nowJST.getTime());
    let currentHour = logicalNow.getUTCHours();
    let currentMin = logicalNow.getUTCMinutes();

    if (currentHour < 7) {
        logicalNow.setUTCDate(logicalNow.getUTCDate() - 1);
        currentHour += 24; // 24時台、25時台として扱い、閉店時間の比較を簡単にする
    }

    let targetDateStr = logicalNow.toISOString().split('T')[0];
    let displayState = 'PRE_OPEN';

    const schedule = data.schedules[targetDateStr] || {
        openTime: '18:00', closeTime: '23:30', type: 'normal', cast: []
    };
    const [openH, openM] = schedule.openTime.split(':').map(Number);
    const [closeH, closeM] = schedule.closeTime.split(':').map(Number);

    // 閉店時間が早朝（7時未満）の場合は翌日扱いなので +24 する
    // または、閉店時間が開店時間を下回る場合（例: 18:00〜01:00）も +24 する
    let adjustedCloseH = closeH;
    if (closeH < 7 || closeH < openH) {
        adjustedCloseH += 24;
    }

    const nowMinutes = currentHour * 60 + currentMin;
    const openMinutes = openH * 60 + openM;
    const closeMinutes = adjustedCloseH * 60 + closeM;

    if (nowMinutes < openMinutes) {
        displayState = 'PRE_OPEN';
    } else if (nowMinutes >= openMinutes && nowMinutes < closeMinutes) {
        displayState = 'OPEN';
    } else {
        displayState = 'ENDED';
    }
    if (schedule.type === 'holiday') displayState = 'HOLIDAY';

    const todaySchedule = data.schedules[targetDateStr] || {
        openTime: '18:00', closeTime: '23:30', type: 'normal', cast: []
    };

    // 訪問者ログを記録
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';
        if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
        const ua = req.headers['user-agent'] || 'Unknown';
        const visitorId = req.headers['x-visitor-id'] || 'unknown';
        const timestamp = new Date().toISOString(); // UTC で保存（フロントが Asia/Tokyo に変換）
        if (!data.adminLogs) data.adminLogs = [];
        data.adminLogs.unshift({ timestamp, ip, userAgent: ua, visitorId });
        if (data.adminLogs.length > 500) data.adminLogs.length = 500;
        await writeData(data);
    } catch (e) {
        console.error('Failed to log visitor access:', e);
    }

    res.json({
        displayState,
        serverTime: nowJST.toISOString(),
        logicalDate: targetDateStr, // フロントエンドでも今日の日付として使えるように返す
        schedule: todaySchedule, // For public page convenience
        schedules: data.schedules, // For admin calendar
        seats: data.seats,
        theme: data.theme,
        castMaster: data.castMaster,
        mamaMessage: data.mamaMessage,
        mamaTitle: data.mamaTitle // Return title
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

                // Preserve existing reservations if not provided in update
                if (data.schedules[date] && data.schedules[date].reservations) {
                    if (!schedule.reservations) {
                        schedule.reservations = data.schedules[date].reservations;
                    }
                }

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

        // Mama Title Update (NEW)
        if (body.updateMamaTitle !== undefined) {
            data.mamaTitle = body.updateMamaTitle;
        }

        await writeData(data);
        res.json({ success: true, data });
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Reservation API (Public/LIFF)
app.post('/api/reserve', async (req, res) => {
    try {
        const { date, name, type, count, time, contact, lineUserId, introCast } = req.body;

        // Basic Validation
        if (!date || !name || !type || !count) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 営業終了チェック (10月31日で営業終了)
        if (date > '2026-10-31') {
            return res.status(400).json({ error: '銀座NOAは10月31日をもって営業終了のため、11月以降のご予約は受け付けておりません。' });
        }

        // Logic Constraints
        const seatCount = parseInt(count, 10);
        const isSpecialEvent = (date === '2026-10-31') || ['part1', 'part2', 'part3'].includes(type);

        if (!isSpecialEvent && type === 'box' && seatCount < 2) {
            return res.status(400).json({ error: 'Box seats require at least 2 people.' });
        }

        // Capacity Limits
        const MAX_COUNTER = 5;
        const MAX_BOX = 6;
        const MAX_EVENT_PART = 20; // 立ち飲みスタイル対応のイベント定員枠 (各部20名)
        const maxCapacity = isSpecialEvent ? MAX_EVENT_PART : (type === 'counter' ? MAX_COUNTER : MAX_BOX);

        const data = await readData();
        if (!data.schedules) data.schedules = {};
        if (!data.schedules[date]) {
            data.schedules[date] = {
                type: 'normal',
                openTime: isSpecialEvent ? '13:00' : '18:00',
                closeTime: isSpecialEvent ? '22:00' : '23:30',
                cast: [],
                reservations: []
            };
        }
        const schedule = data.schedules[date];
        if (!schedule.reservations) schedule.reservations = [];

        // Check availability
        const currentUsage = schedule.reservations
            .filter(r => r.type === type)
            .reduce((sum, r) => sum + (r.count || 0), 0);

        if (currentUsage + seatCount > maxCapacity) {
            return res.status(400).json({ error: isSpecialEvent ? 'この部は定員に達しました。' : 'Not enough seats available.' });
        }

        // Add Reservation
        let defaultTime = '18:00';
        if (type === 'part1') defaultTime = '13:00';
        else if (type === 'part2') defaultTime = '16:00';
        else if (type === 'part3') defaultTime = '19:00';

        const newReservation = {
            id: 'res_' + Date.now(),
            name,
            type,
            count: seatCount,
            time: time || defaultTime,
            contact: contact || '',
            lineUserId: lineUserId || '',
            introCast: introCast || '',
            createdAt: new Date().toISOString()
        };

        schedule.reservations.push(newReservation);

        // Auto-update seat status if full? (Optional, skipping for now to keep logic simple)

        await writeData(data);
        res.json({ success: true, reservation: newReservation });

    } catch (e) {
        console.error('Reservation Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Admin Route
app.get('/admin', authMiddleware, async (req, res) => {
    // Log access
    try {
        const data = await readData();
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || 'Unknown';
        // x-forwarded-for can be a comma-separated list, take the first one
        if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
        
        const ua = req.headers['user-agent'] || 'Unknown';
        const timestamp = new Date().toISOString(); // UTC で保存（フロントが Asia/Tokyo に変換）
        
        if (!data.adminLogs) data.adminLogs = [];
        data.adminLogs.unshift({ timestamp, ip, userAgent: ua });
        if (data.adminLogs.length > 500) {
            data.adminLogs.length = 500;
        }
        await writeData(data);
    } catch (e) {
        console.error('Failed to log admin access:', e);
    }

    const adminPath = path.join(__dirname, '../public', 'admin.html');
    res.sendFile(adminPath);
});

// Admin Logs UI Route
app.get('/admin-logs', logAuthMiddleware, (req, res) => {
    const logsPath = path.join(__dirname, '../public', 'admin_logs.html');
    res.sendFile(logsPath);
});

// Admin Logs API
app.get('/api/admin-logs', logAuthMiddleware, async (req, res) => {
    try {
        const data = await readData();
        const logs = data.adminLogs || [];

        // タイムスタンプの自動補正:
        // 修正デプロイ前 (2026-08-01T07:21:00Z 以前) は getJSTNow().toISOString() を使っており、
        // JST時刻をUTCとして保存してしまっていた（9時間ズレ）。
        // 補正後の時刻が修正デプロイ前なら旧バグ形式と判定し、9時間引いて正しいUTCに戻す。
        const FIX_DEPLOY = new Date('2026-08-01T07:21:00Z');
        const correctedLogs = logs.map(log => {
            const ts = new Date(log.timestamp);
            const corrected = new Date(ts.getTime() - 9 * 60 * 60 * 1000);
            if (corrected < FIX_DEPLOY) {
                return { ...log, timestamp: corrected.toISOString() };
            }
            return log;
        });

        res.json(correctedLogs);
    } catch (e) {
        console.error('API Error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = app;
