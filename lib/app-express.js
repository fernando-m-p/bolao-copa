const express = require('express');
const fs = require('fs/promises');
const fssync = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..');
const MATCHES_PATH = path.join(DATA_DIR, 'matches.csv');
const PREDICTIONS_PATH = path.join(DATA_DIR, 'predictions.csv');

const DEFAULT_MATCHES = [
    { id: '1', stage: 'Grupo A', date: '2026-06-11 15:00', team_a: 'Estados Unidos', team_b: 'Marrocos', team_a_flag: '🇺🇸', team_b_flag: '🇲🇦', score_a: '', score_b: '', status: 'scheduled' },
    { id: '2', stage: 'Grupo A', date: '2026-06-11 18:00', team_a: 'México', team_b: 'África do Sul', team_a_flag: '🇲🇽', team_b_flag: '🇿🇦', score_a: '', score_b: '', status: 'scheduled' },
    { id: '3', stage: 'Grupo B', date: '2026-06-12 13:00', team_a: 'Canadá', team_b: 'Suécia', team_a_flag: '🇨🇦', team_b_flag: '🇸🇪', score_a: '', score_b: '', status: 'scheduled' }
];

function escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (/[,"\n\r]/.test(text)) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
}

function jsonToCsv(items) {
    if (!Array.isArray(items)) return '';
    if (items.length === 0) return '';
    const headers = Object.keys(items[0]);
    const rows = [headers.join(',')];
    for (const item of items) {
        rows.push(headers.map(h => escapeCsvValue(item[h] ?? '')).join(','));
    }
    return rows.join('\r\n');
}

function csvToJson(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const parseLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
    const json = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length < headers.length) continue;
        const row = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j] || '';
        }
        json.push(row);
    }
    return json;
}

async function fileExists(p) {
    try { await fs.access(p); return true; } catch { return false; }
}

function parseScore(value) {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
}

function calculatePredictionPoints(predA, predB, realA, realB) {
    if (predA === undefined || predB === undefined || realA === undefined || realB === undefined) return 0;
    const pA = parseScore(predA);
    const pB = parseScore(predB);
    const rA = parseScore(realA);
    const rB = parseScore(realB);
    if (pA === null || pB === null || rA === null || rB === null) return 0;
    if (pA === rA && pB === rB) return 25;
    const pDiff = pA - pB;
    const rDiff = rA - rB;
    const correctWinner = (pDiff > 0 && rDiff > 0) || (pDiff < 0 && rDiff < 0) || (pDiff === 0 && rDiff === 0);
    if (!correctWinner) return 0;
    if (pDiff === 0) return 15;
    if (pDiff === rDiff) return 15;
    return 10;
}

async function loadCsv(p, defaultData = []) {
    if (!(await fileExists(p))) return defaultData;
    const text = await fs.readFile(p, { encoding: 'utf8' });
    return csvToJson(text);
}

async function writeCsv(p, items) {
    await fs.writeFile(p, jsonToCsv(items), { encoding: 'utf8' });
}

function createApp() {
    const app = express();
    app.use(express.json());

    // Simple request logger to help debug static file serving
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });

    // CORS + preflight
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.sendStatus(200);
        next();
    });

    app.get('/api/matches', async (req, res) => {
        try {
            const matches = await loadCsv(MATCHES_PATH, DEFAULT_MATCHES);
            res.json(matches);
        } catch (err) {
            res.status(500).json({ error: 'Erro ao ler matches' });
        }
    });

    app.get('/api/predictions', async (req, res) => {
        try {
            const preds = await loadCsv(PREDICTIONS_PATH, []);
            res.json(preds);
        } catch (err) {
            res.status(500).json({ error: 'Erro ao ler predictions' });
        }
    });

    app.post('/api/predictions', async (req, res) => {
        try {
            const payload = req.body;
            if (!payload || !payload.username || !payload.match_id) {
                return res.status(400).json({ error: 'username e match_id obrigatorios' });
            }

            const matches = await loadCsv(MATCHES_PATH, DEFAULT_MATCHES);
            const predictions = await loadCsv(PREDICTIONS_PATH, []);
            const match = matches.find(m => String(m.id) === String(payload.match_id));
            if (!match) return res.status(404).json({ error: 'Partida nao encontrada' });
            if (String(match.status) === 'finished') return res.status(400).json({ error: 'Nao e possivel alterar palpites de jogos finalizados' });

            const points = (match.status === 'finished') ? calculatePredictionPoints(payload.score_a, payload.score_b, match.score_a, match.score_b) : 0;
            const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

            const idx = predictions.findIndex(p => String(p.username).toLowerCase() === String(payload.username).toLowerCase() && String(p.match_id) === String(payload.match_id));
            const entry = {
                username: String(payload.username),
                match_id: String(payload.match_id),
                score_a: payload.score_a == null ? '' : String(payload.score_a),
                score_b: payload.score_b == null ? '' : String(payload.score_b),
                points_earned: String(points),
                updated_at: now
            };

            if (idx >= 0) predictions[idx] = entry; else predictions.push(entry);
            await writeCsv(PREDICTIONS_PATH, predictions);
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao salvar palpite' });
        }
    });

    app.post('/api/matches/score', async (req, res) => {
        try {
            const payload = req.body;
            if (!payload || !payload.match_id || payload.score_a == null || payload.score_b == null) {
                return res.status(400).json({ error: 'match_id, score_a e score_b obrigatorios' });
            }

            const validStatus = ['finished', 'active', 'scheduled'];
            const status = String(payload.status || 'finished').toLowerCase();
            if (!validStatus.includes(status)) return res.status(400).json({ error: 'status invalido' });

            const matches = await loadCsv(MATCHES_PATH, DEFAULT_MATCHES);
            const match = matches.find(m => String(m.id) === String(payload.match_id));
            if (!match) return res.status(404).json({ error: 'Partida nao encontrada' });

            match.score_a = String(payload.score_a);
            match.score_b = String(payload.score_b);
            match.status = status;
            await writeCsv(MATCHES_PATH, matches);

            // Atualiza pontos dos palpites referentes a essa partida
            const predictions = await loadCsv(PREDICTIONS_PATH, []);
            const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
            for (const p of predictions) {
                if (String(p.match_id) === String(payload.match_id)) {
                    const pts = calculatePredictionPoints(p.score_a, p.score_b, match.score_a, match.score_b);
                    p.points_earned = String(pts);
                    p.updated_at = now;
                }
            }
            await writeCsv(PREDICTIONS_PATH, predictions);

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao atualizar placar' });
        }
    });

    // Serve client files (index.html, CSS, images, and browser JS)
    // If there is an `app.browser.js` (backup of original browser script), expose it at /app.js
    app.get('/app.js', (req, res) => {
        const browserScript = path.join(DATA_DIR, 'app.browser.js');
        if (fssync.existsSync(browserScript)) {
            return res.sendFile(browserScript);
        }
        return res.sendFile(path.join(DATA_DIR, 'app.js'));
    });

    app.get('/', (req, res) => {
        res.sendFile(path.join(DATA_DIR, 'index.html'));
    });


    // Serve static files from project root (index.html, style.css, arquivos/ etc.)
    app.use(express.static(DATA_DIR));

    return app;
}

module.exports = { createApp };
