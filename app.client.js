document.addEventListener('DOMContentLoaded', async () => {
    const container = document.querySelector('.container') || document.body;
    const h = document.createElement('div');
    h.style.padding = '16px';
    h.innerHTML = '<h2>Jogos (versão leve)</h2><div id="matches-simple">Carregando partidas...</div>';
    container.insertBefore(h, container.firstChild);

    try {
        const res = await fetch('/api/matches');
        const matches = await res.json();
        const list = document.getElementById('matches-simple');
        if (!matches || matches.length === 0) {
            list.innerText = 'Nenhuma partida encontrada.';
            return;
        }
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = '<thead><tr><th style="text-align:left">ID</th><th>Data</th><th>Times</th><th>Status</th></tr></thead>';
        const tbody = document.createElement('tbody');
        for (const m of matches.slice(0, 200)) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="padding:6px;border-bottom:1px solid #eee">${m.id}</td><td style="padding:6px;border-bottom:1px solid #eee">${m.date}</td><td style="padding:6px;border-bottom:1px solid #eee">${m.team_a} x ${m.team_b}</td><td style="padding:6px;border-bottom:1px solid #eee">${m.status}</td>`;
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        list.innerHTML = '';
        list.appendChild(table);
    } catch (err) {
        const list = document.getElementById('matches-simple');
        list.innerText = 'Erro ao carregar partidas.';
        console.error(err);
    }
});
