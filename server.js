/**
 * server.js - Servidor Node.js para Bolão da Copa do Mundo 2026
 * Funcionalidade equivalente ao server.ps1 (PowerShell)
 * Compatível com Vercel e rodagem local
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/sync');
const stringify = require('csv-stringify/sync');

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('./'));

// Caminhos dos arquivos CSV
const CSV_PATHS = {
  matches: 'matches.csv',
  predictions: 'predictions.csv'
};

/**
 * Função para ler CSV e retornar como array de objetos
 */
function readCsv(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
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
    
    // Detecta as colunas a partir do primeiro objeto
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
 * Calcula pontos de um palpite baseado no placar real
 */
function calculatePredictionPoints(predScoreA, predScoreB, realScoreA, realScoreB) {
  // Validação
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

  // Verifica se conversão foi bem-sucedida
  if (isNaN(pA) || isNaN(pB) || isNaN(rA) || isNaN(rB)) {
    return 0;
  }

  // 1. Acerto exato do placar: 25 pontos
  if (pA === rA && pB === rB) {
    return 25;
  }

  const pDiff = pA - pB;
  const rDiff = rA - rB;

  // Verifica se acertou o resultado (Vitória A, Vitória B ou Empate)
  const correctWinner = (pDiff > 0 && rDiff > 0) || (pDiff < 0 && rDiff < 0) || (pDiff === 0 && rDiff === 0);

  if (correctWinner) {
    // Se foi empate (mas não o placar exato): 15 pontos
    if (pDiff === 0) {
      return 15;
    }
    // Se acertou o saldo de gols exato do vencedor: 15 pontos
    if (pDiff === rDiff) {
      return 15;
    }
    // Acertou apenas o vencedor com saldo diferente: 10 pontos
    return 10;
  }

  return 0;
}

/**
 * GET /api/matches - Retorna todas as partidas
 */
app.get('/api/matches', (req, res) => {
  try {
    const matches = readCsv(CSV_PATHS.matches);
    res.json(matches);
  } catch (err) {
    console.error('Erro ao buscar partidas:', err);
    res.status(500).json({ error: 'Erro ao buscar partidas' });
  }
});

/**
 * GET /api/predictions - Retorna todos os palpites
 */
app.get('/api/predictions', (req, res) => {
  try {
    const predictions = readCsv(CSV_PATHS.predictions);
    res.json(predictions);
  } catch (err) {
    console.error('Erro ao buscar palpites:', err);
    res.status(500).json({ error: 'Erro ao buscar palpites' });
  }
});

/**
 * POST /api/predictions - Adiciona ou atualiza um palpite
 */
app.post('/api/predictions', (req, res) => {
  try {
    const { username, match_id, score_a, score_b } = req.body;

    // Validação
    if (!username || !match_id) {
      return res.status(400).json({ error: 'Dados insuficientes (username, match_id necessários)' });
    }

    // Carrega partidas para validação
    const matches = readCsv(CSV_PATHS.matches);
    const match = matches.find(m => m.id === String(match_id));

    if (!match) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }

    // Verifica se o jogo já foi finalizado
    if (match.status === 'finished') {
      return res.status(400).json({ error: 'Não é possível enviar ou alterar palpites para jogos finalizados.' });
    }

    // Carrega palpites existentes
    let predictions = readCsv(CSV_PATHS.predictions);

    // Calcula pontos caso a partida já tenha resultado
    let points = 0;
    if (match.status === 'finished' && match.score_a !== '' && match.score_b !== '') {
      points = calculatePredictionPoints(score_a, score_b, match.score_a, match.score_b);
    }

    // Adiciona ou atualiza o palpite
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

    // Salva no arquivo
    if (writeCsv(CSV_PATHS.predictions, predictions)) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Erro ao salvar palpite' });
    }
  } catch (err) {
    console.error('Erro ao processar palpite:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /api/matches/score - Atualiza placar real (Administrador)
 */
app.post('/api/matches/score', (req, res) => {
  try {
    const { match_id, score_a, score_b, status } = req.body;

    // Validação
    if (!match_id || score_a === undefined || score_b === undefined) {
      return res.status(400).json({ error: 'Dados inválidos (match_id, score_a, score_b necessários)' });
    }

    // Carrega partidas
    let matches = readCsv(CSV_PATHS.matches);
    const matchIndex = matches.findIndex(m => m.id === String(match_id));

    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Partida não encontrada' });
    }

    // Atualiza a partida
    matches[matchIndex] = {
      ...matches[matchIndex],
      score_a: String(score_a),
      score_b: String(score_b),
      status: status || matches[matchIndex].status
    };

    // Salva partidas
    if (!writeCsv(CSV_PATHS.matches, matches)) {
      return res.status(500).json({ error: 'Erro ao atualizar partida' });
    }

    // Recalcula pontos de todos os palpites para esta partida
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
      return res.status(500).json({ error: 'Erro ao atualizar palpites' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar placar:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Tratamento de rotas não encontradas
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

/**
 * Inicia o servidor
 */
app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`  Servidor do Bolão da Copa rodando em http://localhost:${PORT}/`);
  console.log('='.repeat(60));
  console.log('Pressione Ctrl+C para parar o servidor.\n');
});
