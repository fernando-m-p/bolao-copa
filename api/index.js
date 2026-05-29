/**
 * api/index.js - Serverless Handler para Vercel
 * Executa toda a lógica do servidor como uma serverless function
 */

const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync');
const stringify = require('csv-stringify/sync');

// Caminhos dos arquivos CSV (para Vercel, relativo à raiz do projeto)
const CSV_PATHS = {
  matches: path.join(process.cwd(), 'matches.csv'),
  predictions: path.join(process.cwd(), 'predictions.csv')
};

/**
 * Função para ler CSV
 */
function readCsv(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Arquivo não encontrado: ${filePath}`);
      return [];
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    if (!fileContent.trim()) {
      return [];
    }
    const records = parse.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      encoding: 'utf-8'
    });
    return records || [];
  } catch (err) {
    console.error(`Erro ao ler CSV ${filePath}:`, err);
    return [];
  }
}

/**
 * Função para escrever CSV
 */
function writeCsv(filePath, data) {
  try {
    if (!data || data.length === 0) {
      fs.writeFileSync(filePath, '', 'utf-8');
      return true;
    }
    const columns = Object.keys(data[0]);
    const output = stringify.stringify(data, { header: true, columns });
    fs.writeFileSync(filePath, output, 'utf-8');
    return true;
  } catch (err) {
    console.error(`Erro ao escrever CSV ${filePath}:`, err);
    return false;
  }
}

/**
 * Calcula pontos do palpite
 */
function calculatePredictionPoints(predScoreA, predScoreB, realScoreA, realScoreB) {
  if (predScoreA === undefined || predScoreA === null || predScoreA === '' ||
      predScoreB === undefined || predScoreB === null || predScoreB === '' ||
      realScoreA === undefined || realScoreA === null || realScoreA === '' ||
      realScoreB === undefined || realScoreB === null || realScoreB === '') {
    return 0;
  }

  const pA = parseInt(predScoreA, 10);
  const pB = parseInt(predScoreB, 10);
  const rA = parseInt(realScoreA, 10);
  const rB = parseInt(realScoreB, 10);

  if (isNaN(pA) || isNaN(pB) || isNaN(rA) || isNaN(rB)) {
    return 0;
  }

  if (pA === rA && pB === rB) {
    return 25;
  }

  const pDiff = pA - pB;
  const rDiff = rA - rB;
  const correctWinner = (pDiff > 0 && rDiff > 0) || (pDiff < 0 && rDiff < 0) || (pDiff === 0 && rDiff === 0);

  if (correctWinner) {
    if (pDiff === 0) return 15;
    if (pDiff === rDiff) return 15;
    return 10;
  }

  return 0;
}

/**
 * Vercel Serverless Handler
 */
module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Helper para responder JSON
  const sendJson = (statusCode, data) => {
    res.status(statusCode);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Parse body manualmente
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', () => {
    try {
      if (body) {
        try {
          req.body = JSON.parse(body);
        } catch {
          req.body = {};
        }
      } else {
        req.body = {};
      }

      // NOTA: req.url NÃO inclui /api/ porque Vercel já roteia /api/* para este handler
      // Portanto, /api/matches chega aqui como /matches
      const url = req.url.split('?')[0]; // Remove query strings

      // Rotas da API
      if (url === '/matches' && req.method === 'GET') {
        const matches = readCsv(CSV_PATHS.matches);
        sendJson(200, matches);
      }
      else if (url === '/predictions' && req.method === 'GET') {
        const predictions = readCsv(CSV_PATHS.predictions);
        sendJson(200, predictions);
      }
      else if (url === '/predictions' && req.method === 'POST') {
        const { username, match_id, score_a, score_b } = req.body;

        if (!username || !match_id) {
          return sendJson(400, { error: 'Dados insuficientes' });
        }

        const matches = readCsv(CSV_PATHS.matches);
        const match = matches.find(m => m.id === String(match_id));

        if (!match) {
          return sendJson(404, { error: 'Partida não encontrada' });
        }

        if (match.status === 'finished') {
          return sendJson(400, { error: 'Não é possível alterar palpites para jogos finalizados' });
        }

        let predictions = readCsv(CSV_PATHS.predictions);
        let points = 0;

        if (match.status === 'finished' && match.score_a !== '' && match.score_b !== '') {
          points = calculatePredictionPoints(score_a, score_b, match.score_a, match.score_b);
        }

        const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const existingIndex = predictions.findIndex(p => p.username === username && p.match_id === String(match_id));

        if (existingIndex !== -1) {
          predictions[existingIndex] = {
            ...predictions[existingIndex],
            username,
            match_id: String(match_id),
            score_a: String(score_a),
            score_b: String(score_b),
            points_earned: String(points),
            updated_at: now
          };
        } else {
          predictions.push({
            username,
            match_id: String(match_id),
            score_a: String(score_a),
            score_b: String(score_b),
            points_earned: String(points),
            updated_at: now
          });
        }

        if (writeCsv(CSV_PATHS.predictions, predictions)) {
          sendJson(200, { success: true });
        } else {
          sendJson(500, { error: 'Erro ao salvar' });
        }
      }
      else if (url === '/matches/score' && req.method === 'POST') {
        const { match_id, score_a, score_b, status } = req.body;

        if (!match_id || score_a === undefined || score_b === undefined) {
          return sendJson(400, { error: 'Dados inválidos' });
        }

        let matches = readCsv(CSV_PATHS.matches);
        const matchIndex = matches.findIndex(m => m.id === String(match_id));

        if (matchIndex === -1) {
          return sendJson(404, { error: 'Partida não encontrada' });
        }

        matches[matchIndex] = {
          ...matches[matchIndex],
          score_a: String(score_a),
          score_b: String(score_b),
          status: status || matches[matchIndex].status
        };

        if (!writeCsv(CSV_PATHS.matches, matches)) {
          return sendJson(500, { error: 'Erro ao atualizar partida' });
        }

        let predictions = readCsv(CSV_PATHS.predictions);
        const targetMatch = matches[matchIndex];

        predictions = predictions.map(pred => {
          if (pred.match_id === String(match_id)) {
            let points = 0;
            if (targetMatch.status === 'finished' && targetMatch.score_a !== '' && targetMatch.score_b !== '') {
              points = calculatePredictionPoints(pred.score_a, pred.score_b, targetMatch.score_a, targetMatch.score_b);
            }
            return {
              ...pred,
              points_earned: String(points),
              updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
          }
          return pred;
        });

        if (!writeCsv(CSV_PATHS.predictions, predictions)) {
          return sendJson(500, { error: 'Erro ao atualizar palpites' });
        }

        sendJson(200, { success: true });
      }
      else {
        sendJson(404, { error: 'Rota não encontrada' });
      }
    } catch (err) {
      console.error('Erro:', err);
      sendJson(500, { error: 'Erro interno do servidor' });
    }
  });
};

