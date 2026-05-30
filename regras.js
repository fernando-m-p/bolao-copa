/* app.js - Lógica do Bolão da Copa do Mundo 2026 */

// Estado Global da Aplicação
let state = {
    isOnline: false,
    currentUser: 'Neymar',
    users: ['Neymar', 'Messi', 'Cristiano'],
    matches: [],
    predictions: [],
    currentTab: 'jogos', // 'jogos' | 'ranking' | 'admin'
    currentPhase: 'grupos' // 'grupos' | '32' | 'oitavas' | 'quartas' | 'semi' | 'finais'
};

// Partidas padrão da Copa caso iniciadas offline
const DEFAULT_MATCHES = [
    { id: "1", stage: "Grupo A", date: "2026-06-11 15:00", team_a: "Estados Unidos", team_b: "Marrocos", team_a_flag: "🇺🇸", team_b_flag: "🇲🇦", score_a: "", score_b: "", status: "scheduled" },
    { id: "2", stage: "Grupo A", date: "2026-06-11 18:00", team_a: "México", team_b: "África do Sul", team_a_flag: "🇲🇽", team_b_flag: "🇿🇦", score_a: "", score_b: "", status: "scheduled" },
    { id: "3", stage: "Grupo B", date: "2026-06-12 13:00", team_a: "Canadá", team_b: "Suécia", team_a_flag: "🇨🇦", team_b_flag: "🇸🇪", score_a: "", score_b: "", status: "scheduled" },
    { id: "4", stage: "Grupo B", date: "2026-06-12 16:00", team_a: "Brasil", team_b: "Croácia", team_a_flag: "🇧🇷", team_b_flag: "🇭🇷", score_a: "", score_b: "", status: "scheduled" },
    { id: "5", stage: "Grupo A", date: "2026-06-15 14:00", team_a: "Estados Unidos", team_b: "México", team_a_flag: "🇺🇸", team_b_flag: "🇲🇽", score_a: "", score_b: "", status: "scheduled" },
    { id: "6", stage: "Grupo A", date: "2026-06-15 17:00", team_a: "Marrocos", team_b: "África do Sul", team_a_flag: "🇲🇦", team_b_flag: "🇿🇦", score_a: "", score_b: "", status: "scheduled" },
    { id: "7", stage: "Grupo B", date: "2026-06-16 14:00", team_a: "Canadá", team_b: "Brasil", team_a_flag: "🇨🇦", team_b_flag: "🇧🇷", score_a: "", score_b: "", status: "scheduled" },
    { id: "8", stage: "Grupo B", date: "2026-06-16 17:00", team_a: "Suécia", team_b: "Croácia", team_a_flag: "🇸🇪", team_b_flag: "🇭🇷", score_a: "", score_b: "", status: "scheduled" },
    { id: "9", stage: "Grupo A", date: "2026-06-19 16:00", team_a: "África do Sul", team_b: "Estados Unidos", team_a_flag: "🇿🇦", team_b_flag: "🇺🇸", score_a: "", score_b: "", status: "scheduled" },
    { id: "10", stage: "Grupo A", date: "2026-06-19 16:00", team_a: "México", team_b: "Marrocos", team_a_flag: "🇲🇽", team_b_flag: "🇲🇦", score_a: "", score_b: "", status: "scheduled" },
    { id: "11", stage: "Grupo B", date: "2026-06-20 16:00", team_a: "Croácia", team_b: "Canadá", team_a_flag: "🇭🇷", team_b_flag: "🇨🇦", score_a: "", score_b: "", status: "scheduled" },
    { id: "12", stage: "Grupo B", date: "2026-06-20 16:00", team_a: "Brasil", team_b: "Suécia", team_a_flag: "🇧🇷", team_b_flag: "🇸🇪", score_a: "", score_b: "", status: "scheduled" },
    { id: "13", stage: "Semifinal", date: "2026-06-24 16:00", team_a: "1º Grupo A", team_b: "2º Grupo B", team_a_flag: "🏳️", team_b_flag: "🏳️", score_a: "", score_b: "", status: "scheduled" },
    { id: "14", stage: "Semifinal", date: "2026-06-25 16:00", team_a: "1º Grupo B", team_b: "2º Grupo A", team_a_flag: "🏳️", team_b_flag: "🏳️", score_a: "", score_b: "", status: "scheduled" },
    { id: "15", stage: "Final", date: "2026-06-28 15:00", team_a: "Vencedor Semi 1", team_b: "Vencedor Semi 2", team_a_flag: "🏳️", team_b_flag: "🏳️", score_a: "", score_b: "", status: "scheduled" }
];

// Inicialização da aplicação ao carregar a página
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await initData();
});

// Detecta conexão com o backend local e carrega os dados
async function initData() {
    showToast('Carregando informações...', 'info');
    
    // Testa se o servidor está rodando localmente
    try {
        const response = await fetch('/api/matches');
        if (response.ok) {
            state.isOnline = true;
            console.log("Conectado ao servidor PowerShell (Modo Online).");
            document.getElementById('connection-status-text').innerText = 'Modo Servidor: CSV Local conectado';
            document.getElementById('connection-status-icon').innerText = '🟢';
        }
    } catch (e) {
        state.isOnline = false;
        console.log("Servidor offline ou aberto via arquivo. Usando LocalStorage (Modo Offline).");
        document.getElementById('connection-status-text').innerText = 'Modo LocalStorage (Para salvar no CSV, inicie server.ps1)';
        document.getElementById('connection-status-icon').innerText = '🟡';
    }

    if (state.isOnline) {
        await loadOnlineData();
    } else {
        loadOfflineData();
    }

    // Configura os usuários dinamicamente baseados nos palpites salvos + padrão
    updateUsersList();
    
    // Atualiza interface
    renderUserSelects();
    updateActiveUserDisplay();
    renderMatches();
    renderLeaderboard();
    renderAdminPanel();
}

// Carrega dados da API REST (PowerShell)
async function loadOnlineData() {
    try {
        const resMatches = await fetch('/api/matches');
        state.matches = await resMatches.json();

        const resPreds = await fetch('/api/predictions');
        state.predictions = await resPreds.json();
    } catch (err) {
        console.error("Erro ao carregar dados do servidor:", err);
        showToast("Erro de comunicação com o servidor", "error");
        state.isOnline = false; // Fallback instantâneo
        loadOfflineData();
    }
}

// Carrega dados do LocalStorage
function loadOfflineData() {
    const cachedMatches = localStorage.getItem('matches');
    if (cachedMatches) {
        state.matches = JSON.parse(cachedMatches);
    } else {
        state.matches = DEFAULT_MATCHES;
        localStorage.setItem('matches', JSON.stringify(DEFAULT_MATCHES));
    }

    const cachedPreds = localStorage.getItem('predictions');
    state.predictions = cachedPreds ? JSON.parse(cachedPreds) : [];

    const cachedUsers = localStorage.getItem('users');
    if (cachedUsers) {
        state.users = JSON.parse(cachedUsers);
    } else {
        localStorage.setItem('users', JSON.stringify(state.users));
    }
}

// Atualiza a lista única de usuários disponíveis
function updateUsersList() {
    const usersWithPredictions = state.predictions.map(p => p.username);
    const allUsers = new Set([...state.users, ...usersWithPredictions]);
    state.users = Array.from(allUsers).filter(u => u && u.trim() !== '');
    if (!state.isOnline) {
        localStorage.setItem('users', JSON.stringify(state.users));
    }
}

// Renderiza a lista de usuários no dropdown
function renderUserSelects() {
    const userSelect = document.getElementById('user-select');
    userSelect.innerHTML = '';
    state.users.forEach(username => {
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username;
        if (username === state.currentUser) {
            option.selected = true;
        }
        userSelect.appendChild(option);
    });
}

// Atualiza o display do usuário ativo (Nome + Pontos)
function updateActiveUserDisplay() {
    document.getElementById('current-username-display').innerText = state.currentUser;
    const points = calculateUserPoints(state.currentUser);
    document.getElementById('current-user-score').innerText = `${points} pts`;
}

// Calcula os pontos totais de um usuário específico
function calculateUserPoints(username) {
    let total = 0;
    const userPreds = state.predictions.filter(p => p.username === username);
    
    userPreds.forEach(p => {
        // Encontra a partida real
        const match = state.matches.find(m => m.id === p.match_id);
        if (match && match.status === 'finished') {
            total += parseInt(p.points_earned || 0);
        }
    });
    return total;
}

// Calcula os pontos de um único palpite de forma local
function calculatePredictionPointsLocal(scoreA, scoreB, realA, realB) {
    if (scoreA === undefined || scoreB === undefined || realA === undefined || realB === undefined ||
        scoreA === '' || scoreB === '' || realA === '' || realB === '') {
        return 0;
    }

    const pA = parseInt(scoreA);
    const pB = parseInt(scoreB);
    const rA = parseInt(realA);
    const rB = parseInt(realB);

    // 1. Placar exato
    if (pA === rA && pB === rB) {
        return 25;
    }

    const pDiff = pA - pB;
    const rDiff = rA - rB;

    // Se acertou o resultado (Vencedor A, Vencedor B ou Empate)
    const correctWinner = (pDiff > 0 && rDiff > 0) || (pDiff < 0 && rDiff < 0) || (pDiff === 0 && rDiff === 0);

    if (correctWinner) {
        if (pDiff === 0) {
            return 15; // Empate não exato
        }
        if (pDiff === rDiff) {
            return 15; // Acertou vencedor e saldo de gols
        }
        return 10; // Acertou vencedor mas errou o saldo de gols
    }

    return 0;
}

// Salva o palpite do usuário (Local ou API)
async function savePrediction(matchId, scoreA, scoreB) {
    const saveIndicator = document.getElementById(`save-status-${matchId}`);
    if (saveIndicator) {
        saveIndicator.className = 'save-status saving';
        saveIndicator.innerHTML = '⚡ Salvando...';
    }

    const payload = {
        username: state.currentUser,
        match_id: matchId,
        score_a: scoreA,
        score_b: scoreB
    };

    if (state.isOnline) {
        try {
            const response = await fetch('/api/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                // Atualiza o estado carregando novamente do servidor
                await loadOnlineData();
                updateActiveUserDisplay();
                
                if (saveIndicator) {
                    saveIndicator.className = 'save-status saved';
                    saveIndicator.innerHTML = '✅ Salvo';
                }
            } else {
                const err = await response.json();
                throw new Error(err.error || "Erro ao salvar palpite");
            }
        } catch (e) {
            console.error(e);
            showToast(e.message || "Erro de conexão com o servidor", "error");
            if (saveIndicator) {
                saveIndicator.className = 'save-status error';
                saveIndicator.innerHTML = '❌ Erro ao salvar';
            }
        }
    } else {
        // Lógica de salvamento em LocalStorage
        setTimeout(() => {
            // Verifica se jogo acabou
            const match = state.matches.find(m => m.id === matchId);
            if (match && match.status === 'finished') {
                showToast("Esta partida já foi encerrada. Não é possível alterar o palpite.", "error");
                if (saveIndicator) {
                    saveIndicator.className = 'save-status error';
                    saveIndicator.innerHTML = '❌ Encerrado';
                }
                return;
            }

            let points = 0;
            if (match && match.status === 'finished') {
                points = calculatePredictionPointsLocal(scoreA, scoreB, match.score_a, match.score_b);
            }

            let found = false;
            state.predictions = state.predictions.map(pred => {
                if (pred.username === state.currentUser && pred.match_id === matchId) {
                    found = true;
                    return {
                        ...pred,
                        score_a: scoreA,
                        score_b: scoreB,
                        points_earned: points,
                        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                    };
                }
                return pred;
            });

            if (!found) {
                state.predictions.push({
                    username: state.currentUser,
                    match_id: matchId,
                    score_a: scoreA,
                    score_b: scoreB,
                    points_earned: points,
                    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                });
            }

            localStorage.setItem('predictions', JSON.stringify(state.predictions));
            updateActiveUserDisplay();

            if (saveIndicator) {
                saveIndicator.className = 'save-status saved';
                saveIndicator.innerHTML = '✅ Salvo';
            }
        }, 300);
    }
}

// Renderiza a lista de partidas
function renderMatches() {
    const grid = document.getElementById('matches-grid');
    grid.innerHTML = '';

    if (state.matches.length === 0) {
        grid.innerHTML = '<div class="alert-info"><div class="alert-info-text">Nenhuma partida carregada.</div></div>';
        return;
    }

    // Filtra partidas pela fase atual selecionada
    const filteredMatches = state.matches.filter(match => {
        const stage = match.stage || '';
        switch(state.currentPhase) {
            case 'grupos':
                return stage.startsWith('Grupo');
            case '32':
                return stage === 'Fase de 32';
            case 'oitavas':
                return stage === 'Oitavas de Final';
            case 'quartas':
                return stage === 'Quartas de Final';
            case 'semi':
                return stage === 'Semifinal';
            case 'finais':
                return stage === 'Final' || stage === '3º Lugar';
            default:
                return true;
        }
    });

    if (filteredMatches.length === 0) {
        grid.innerHTML = '<div class="alert-info" style="grid-column: 1 / -1;"><div class="alert-info-text">Nenhuma partida agendada para esta fase.</div></div>';
        return;
    }

    filteredMatches.forEach(match => {
        // Encontra palpite do usuário ativo
        const userPrediction = state.predictions.find(p => p.username === state.currentUser && p.match_id === match.id);
        const predScoreA = userPrediction ? userPrediction.score_a : '';
        const predScoreB = userPrediction ? userPrediction.score_b : '';

        const card = document.createElement('div');
        card.className = 'match-card';
        card.id = `match-card-${match.id}`;

        let statusLabel = 'Agendado';
        if (match.status === 'active') statusLabel = 'Em Andamento';
        if (match.status === 'finished') statusLabel = 'Encerrado';

        const isFinished = match.status === 'finished';

        // Renderiza o corpo do card
        card.innerHTML = `
            <div>
                <div class="match-header">
                    <span class="match-stage">${match.stage}</span>
                    <span class="match-status-badge ${match.status}">${statusLabel}</span>
                </div>
                
                <div class="match-teams">
                    <div class="team-row">
                        <div class="team-info">
                            <span class="team-flag">${match.team_a_flag}</span>
                            <span class="team-name" title="${match.team_a}">${match.team_a}</span>
                        </div>
                    </div>
                    
                    <div class="prediction-inputs">
                        <div class="team-input-wrapper">
                            <input type="number" min="0" max="99" 
                                class="score-input" 
                                id="pred-a-${match.id}" 
                                value="${predScoreA}" 
                                placeholder="-"
                                ${isFinished ? 'disabled' : ''}
                                onchange="handleScoreChange('${match.id}')">
                        </div>
                        <span class="score-separator">x</span>
                        <div class="team-input-wrapper">
                            <input type="number" min="0" max="99" 
                                class="score-input" 
                                id="pred-b-${match.id}" 
                                value="${predScoreB}" 
                                placeholder="-"
                                ${isFinished ? 'disabled' : ''}
                                onchange="handleScoreChange('${match.id}')">
                        </div>
                    </div>
                    
                    <div class="team-row">
                        <div class="team-info">
                            <span class="team-flag">${match.team_b_flag}</span>
                            <span class="team-name" title="${match.team_b}">${match.team_b}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div>
                ${isFinished ? renderPointsEarnedBadge(userPrediction, match) : ''}
                
                <div class="match-footer">
                    <span>📅 ${match.date}</span>
                    <span class="save-status" id="save-status-${match.id}">
                        ${userPrediction ? '✅ Salvo' : '✍️ Sem palpite'}
                    </span>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Cria a badge visual dos pontos ganhos em uma partida
function renderPointsEarnedBadge(prediction, match) {
    if (!prediction) {
        return `
            <div class="match-points-earned none">
                <span>Resultado Real: <span class="real-score-badge">${match.score_a} - ${match.score_b}</span></span>
                <span>0 pts (Sem palpite)</span>
            </div>
        `;
    }

    const pts = parseInt(prediction.points_earned || 0);
    let medalClass = 'none';
    let label = 'Errou';

    if (pts === 25) {
        medalClass = 'gold';
        label = 'Placar Exato!';
    } else if (pts > 0) {
        medalClass = 'silver';
        label = 'Acertou o Resultado';
    }

    return `
        <div class="match-points-earned ${medalClass}">
            <span>Resultado: <span class="real-score-badge">${match.score_a} - ${match.score_b}</span></span>
            <span>+${pts} pts (${label})</span>
        </div>
    `;
}

// Event handler de mudança nos inputs de palpite
function handleScoreChange(matchId) {
    const inputA = document.getElementById(`pred-a-${matchId}`);
    const inputB = document.getElementById(`pred-b-${matchId}`);
    
    if (inputA && inputB) {
        const scoreA = inputA.value.trim();
        const scoreB = inputB.value.trim();
        
        // Só salva se ambos estiverem preenchidos
        if (scoreA !== '' && scoreB !== '') {
            savePrediction(matchId, scoreA, scoreB);
        }
    }
}

// Renderiza a tabela de classificação (Leaderboard)
function renderLeaderboard() {
    const tbody = document.getElementById('ranking-tbody');
    tbody.innerHTML = '';

    // Calcula dados acumulados para cada usuário
    const rankingData = state.users.map(username => {
        const userPreds = state.predictions.filter(p => p.username === username);
        let totalPoints = 0;
        let exactMatches = 0;
        let correctOutcomes = 0;
        let totalPredictions = 0;

        userPreds.forEach(p => {
            const match = state.matches.find(m => m.id === p.match_id);
            if (match && match.status === 'finished') {
                totalPredictions++;
                const pts = parseInt(p.points_earned || 0);
                totalPoints += pts;
                if (pts === 25) {
                    exactMatches++;
                } else if (pts > 0) {
                    correctOutcomes++;
                }
            }
        });

        return {
            username,
            totalPoints,
            exactMatches,
            correctOutcomes,
            totalPredictions
        };
    });

    // Ordena por pontos totais (desc), placar exato (desc) e nome (asc)
    rankingData.sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
        }
        if (b.exactMatches !== a.exactMatches) {
            return b.exactMatches - a.exactMatches;
        }
        return a.username.localeCompare(b.username);
    });

    if (rankingData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum palpite computado ainda.</td></tr>';
        return;
    }

    rankingData.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.className = 'ranking-row';
        if (row.username === state.currentUser) {
            tr.classList.add('current-user');
        }

        const rank = index + 1;
        let rankBadge = rank;
        if (rank <= 3) {
            rankBadge = `<span class="rank-badge rank-${rank}">${rank}</span>`;
        } else {
            rankBadge = `<span class="rank-badge">${rank}</span>`;
        }

        tr.innerHTML = `
            <td><div class="rank-col">${rankBadge}</div></td>
            <td><span class="username-col">${row.username}</span> ${row.username === state.currentUser ? '<small>(Você)</small>' : ''}</td>
            <td><span class="stats-badge">${row.totalPredictions} palpites</span></td>
            <td><span class="stats-badge" style="color:var(--primary-gold)">🎯 ${row.exactMatches}</span></td>
            <td class="points-col">${row.totalPoints} pts</td>
        `;

        tbody.appendChild(tr);
    });
}

// Renderiza a lista de partidas no Painel de Admin para lançar placares reais
function renderAdminPanel() {
    const list = document.getElementById('admin-matches-list');
    list.innerHTML = '';

    if (state.matches.length === 0) {
        list.innerHTML = '<div>Nenhuma partida carregada.</div>';
        return;
    }

    state.matches.forEach(match => {
        const row = document.createElement('div');
        row.className = 'admin-match-row';
        row.innerHTML = `
            <div class="admin-match-teams">
                <span>${match.team_a_flag}</span>
                <span>${match.team_a}</span>
                <span class="score-separator">vs</span>
                <span>${match.team_b}</span>
                <span>${match.team_b_flag}</span>
            </div>
            
            <div class="admin-score-inputs">
                <input type="number" min="0" max="99" 
                    class="admin-score-input" 
                    id="admin-score-a-${match.id}" 
                    value="${match.score_a !== null ? match.score_a : ''}"
                    placeholder="-">
                <span class="score-separator">x</span>
                <input type="number" min="0" max="99" 
                    class="admin-score-input" 
                    id="admin-score-b-${match.id}" 
                    value="${match.score_b !== null ? match.score_b : ''}"
                    placeholder="-">
                
                <select class="admin-match-status-select" id="admin-status-${match.id}">
                    <option value="scheduled" ${match.status === 'scheduled' ? 'selected' : ''}>Agendado</option>
                    <option value="active" ${match.status === 'active' ? 'selected' : ''}>Em Andamento</option>
                    <option value="finished" ${match.status === 'finished' ? 'selected' : ''}>Encerrado</option>
                </select>
                
                <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem;" onclick="saveMatchResult('${match.id}')">
                    Salvar
                </button>
            </div>
        `;
        list.appendChild(row);
    });
}

// Salva o resultado real do jogo (Admin)
async function saveMatchResult(matchId) {
    const scoreAInput = document.getElementById(`admin-score-a-${matchId}`);
    const scoreBInput = document.getElementById(`admin-score-b-${matchId}`);
    const statusSelect = document.getElementById(`admin-status-${matchId}`);

    if (!scoreAInput || !scoreBInput || !statusSelect) return;

    const scoreA = scoreAInput.value.trim();
    const scoreB = scoreBInput.value.trim();
    const status = statusSelect.value;

    if (scoreA === '' || scoreB === '') {
        showToast("Digite o placar completo antes de salvar.", "error");
        return;
    }

    const payload = {
        match_id: matchId,
        score_a: scoreA,
        score_b: scoreB,
        status: status
    };

    if (state.isOnline) {
        try {
            const response = await fetch('/api/matches/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await loadOnlineData();
                renderMatches();
                renderLeaderboard();
                renderAdminPanel();
                updateActiveUserDisplay();
                showToast("Resultado da partida atualizado no servidor!", "success");
            } else {
                const err = await response.json();
                throw new Error(err.error || "Falha ao salvar resultado");
            }
        } catch (e) {
            console.error(e);
            showToast(e.message || "Erro ao comunicar com servidor", "error");
        }
    } else {
        // Lógica LocalStorage Offline
        state.matches = state.matches.map(m => {
            if (m.id === matchId) {
                return {
                    ...m,
                    score_a: scoreA,
                    score_b: scoreB,
                    status: status
                };
            }
            return m;
        });

        localStorage.setItem('matches', JSON.stringify(state.matches));

        // Recalcula palpites vinculados a esse jogo no modo offline
        state.predictions = state.predictions.map(pred => {
            if (pred.match_id === matchId) {
                const points = status === 'finished' ? calculatePredictionPointsLocal(pred.score_a, pred.score_b, scoreA, scoreB) : 0;
                return {
                    ...pred,
                    points_earned: points,
                    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
                };
            }
            return pred;
        });

        localStorage.setItem('predictions', JSON.stringify(state.predictions));
        
        renderMatches();
        renderLeaderboard();
        renderAdminPanel();
        updateActiveUserDisplay();
        showToast("Resultado da partida atualizado localmente!", "success");
    }
}

// Configura eventos gerais do HTML
function setupEventListeners() {
    // Dropdown de Usuário
    document.getElementById('user-select').addEventListener('change', (e) => {
        state.currentUser = e.target.value;
        updateActiveUserDisplay();
        renderMatches();
        renderLeaderboard();
        showToast(`Logado como ${state.currentUser}`, 'success');
    });

    // Botão Adicionar Usuário
    document.getElementById('btn-add-user').addEventListener('click', () => {
        document.getElementById('add-user-modal').classList.add('active');
    });

    // Fechar Modal
    document.getElementById('btn-modal-cancel').addEventListener('click', () => {
        document.getElementById('add-user-modal').classList.remove('active');
        document.getElementById('new-username').value = '';
    });

    // Salvar Novo Usuário
    document.getElementById('btn-modal-save').addEventListener('click', () => {
        const usernameInput = document.getElementById('new-username');
        const username = usernameInput.value.trim();
        if (username) {
            if (state.users.includes(username)) {
                showToast("Este usuário já existe!", "error");
                return;
            }
            state.users.push(username);
            state.currentUser = username;
            
            if (!state.isOnline) {
                localStorage.setItem('users', JSON.stringify(state.users));
            }

            renderUserSelects();
            updateActiveUserDisplay();
            renderMatches();
            renderLeaderboard();
            
            document.getElementById('add-user-modal').classList.remove('active');
            usernameInput.value = '';
            showToast(`Usuário ${username} criado com sucesso!`, 'success');
        } else {
            showToast("Digite um nome de usuário válido.", "error");
        }
    });

    // Navegação de Abas
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const target = tab.dataset.tab;
            state.currentTab = target;

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${target}-tab`).classList.add('active');

            // Recarrega informações específicas
            if (target === 'ranking') {
                renderLeaderboard();
            } else if (target === 'admin') {
                renderAdminPanel();
            }
        });
    });

    // Navegação de Fases de Jogos
    const phaseBtns = document.querySelectorAll('.phase-btn');
    phaseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            changePhase(btn.dataset.phase);
        });
    });

    // Exportar CSV
    document.getElementById('btn-export-csv').addEventListener('click', () => {
        try {
            const csvContent = jsonToCsv(state.predictions);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `predictions.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("Arquivo predictions.csv exportado!", "success");
        } catch (e) {
            console.error(e);
            showToast("Erro ao exportar CSV", "error");
        }
    });

    // Upload Drag and Drop de CSV
    const dropzone = document.getElementById('csv-dropzone');
    const csvFileInput = document.getElementById('csv-file-input');

    dropzone.addEventListener('click', () => {
        csvFileInput.click();
    });

    csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleCsvFile(file);
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary-gold)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-color)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        const file = e.dataTransfer.files[0];
        if (file) handleCsvFile(file);
    });
}

// Processa arquivo CSV importado
function handleCsvFile(file) {
    if (!file.name.endsWith('.csv')) {
        showToast("Por favor, envie um arquivo .csv", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        try {
            const importedData = csvToJson(text);
            if (importedData.length === 0) {
                showToast("CSV vazio ou inválido.", "error");
                return;
            }

            // Valida estrutura básica do CSV importado
            const requiredColumns = ['username', 'match_id', 'score_a', 'score_b'];
            const firstRowKeys = Object.keys(importedData[0]);
            const hasColumns = requiredColumns.every(col => firstRowKeys.includes(col));

            if (!hasColumns) {
                showToast("CSV inválido. Colunas obrigatórias: username, match_id, score_a, score_b", "error");
                return;
            }

            // Sanitiza os campos numéricos e recalcula pontos
            const parsedPreds = importedData.map(pred => {
                const match = state.matches.find(m => m.id === pred.match_id);
                let points = 0;
                if (match && match.status === 'finished') {
                    points = calculatePredictionPointsLocal(pred.score_a, pred.score_b, match.score_a, match.score_b);
                } else {
                    points = parseInt(pred.points_earned || 0);
                }

                return {
                    username: pred.username,
                    match_id: pred.match_id,
                    score_a: pred.score_a,
                    score_b: pred.score_b,
                    points_earned: points,
                    updated_at: pred.updated_at || new Date().toISOString().replace('T', ' ').substring(0, 19)
                };
            });

            // Se estiver online, precisamos sincronizar com o servidor POST a POST ou recriando
            // Para simplicidade do usuário, mesclamos e salvamos
            if (state.isOnline) {
                // Modo online: Envia um por um
                showToast("Importando palpites para o servidor...", "info");
                let successCount = 0;
                for (const pred of parsedPreds) {
                    try {
                        const response = await fetch('/api/predictions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(pred)
                        });
                        if (response.ok) successCount++;
                    } catch (err) {
                        console.error("Falha ao salvar palpite importado", pred, err);
                    }
                }
                await loadOnlineData();
                showToast(`${successCount} palpites importados com sucesso!`, "success");
            } else {
                // Modo offline: Mescla localmente
                const mergedPredictions = [...state.predictions];
                
                parsedPreds.forEach(newPred => {
                    const idx = mergedPredictions.findIndex(p => p.username === newPred.username && p.match_id === newPred.match_id);
                    if (idx !== -1) {
                        mergedPredictions[idx] = newPred;
                    } else {
                        mergedPredictions.push(newPred);
                    }
                });

                state.predictions = mergedPredictions;
                localStorage.setItem('predictions', JSON.stringify(state.predictions));
                showToast(`${parsedPreds.length} palpites mesclados localmente!`, "success");
            }

            // Atualiza tudo
            updateUsersList();
            renderUserSelects();
            updateActiveUserDisplay();
            renderMatches();
            renderLeaderboard();
            renderAdminPanel();

        } catch (err) {
            console.error(err);
            showToast("Falha ao processar arquivo CSV.", "error");
        }
    };
    reader.readAsText(file, "UTF-8");
}

/* Utilitários CSV (Standard RFC 4180) */

// Converte JSON para String CSV
function jsonToCsv(jsonArray) {
    if (!jsonArray || jsonArray.length === 0) {
        return 'username,match_id,score_a,score_b,points_earned,updated_at';
    }
    const headers = ['username', 'match_id', 'score_a', 'score_b', 'points_earned', 'updated_at'];
    const csvRows = [headers.join(',')];
    
    for (const row of jsonArray) {
        const values = headers.map(header => {
            const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}

// Converte String CSV para Array JSON
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

    const headers = parseLine(lines[0]);
    const jsonArray = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length < headers.length) continue;
        const obj = {};
        headers.forEach((header, index) => {
            const h = header.trim().replace(/^"|"$/g, ''); // Limpa aspas extras se existirem
            const v = values[index] ? values[index].trim() : '';
            obj[h] = v;
        });
        jsonArray.push(obj);
    }
    return jsonArray;
}

/* Toast Notifications */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '🏆';
    if (type === 'error') icon = '⚠️';
    if (type === 'info') icon = '⚽';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // Remove após 3.5 segundos
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

/* Transição de Fase de Jogos */
function changePhase(newPhase) {
    if (state.currentPhase === newPhase) return;
    
    const grid = document.getElementById('matches-grid');
    if (!grid) return;
    
    // Inicia transição suave (fade-out)
    grid.classList.add('fade-out');
    
    // Altera classe active nos botões de fase
    document.querySelectorAll('.phase-btn').forEach(btn => {
        if (btn.dataset.phase === newPhase) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    state.currentPhase = newPhase;
    
    // Aguarda o término do fade-out para atualizar a renderização dos novos jogos
    setTimeout(() => {
        renderMatches();
        grid.classList.remove('fade-out');
    }, 200);
}
