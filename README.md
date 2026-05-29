# Bolão da Copa do Mundo 2026

Aplicação web para gerenciar um bolão da Copa do Mundo 2026 com palpites e classificação.

## 🚀 Início Rápido

### Opção 1: Servidor PowerShell (Windows)

```bash
powershell -ExecutionPolicy Bypass -File server.ps1
```

O servidor será iniciado em `http://localhost:8080`

### Opção 2: Servidor Node.js (Windows, macOS, Linux)

**Requisitos:**
- Node.js 14+ instalado

**Instalação:**
```bash
npm install
```

**Execução Local:**
```bash
npm start
```

O servidor será iniciado em `http://localhost:8080`

## 📦 Deploy na Vercel

### Pré-requisitos
- Conta no GitHub
- Conta na Vercel (https://vercel.com)
- Este repositório enviado para GitHub

### Passos para Deploy

1. **Envie o código para GitHub:**
```bash
git add .
git commit -m "Deploy inicial"
git push origin main
```

2. **Acesse Vercel e faça login com sua conta GitHub**

3. **Clique em "New Project"**

4. **Selecione este repositório**

5. **Vercel detectará automaticamente:**
   - Build command: `npm install` (node_modules)
   - Output directory: root (diretório raiz)
   - Environment: Node.js

6. **Clique em "Deploy"**

Após alguns minutos, sua aplicação estará disponível em um URL público da Vercel!

## 🗂️ Estrutura de Arquivos

```
antigravity/
├── server.js              # Servidor Node.js (equivalente ao server.ps1)
├── server.ps1             # Servidor PowerShell (Windows)
├── index.html             # Interface principal
├── app.js                 # Lógica do cliente
├── style.css              # Estilos
├── package.json           # Dependências Node.js
├── vercel.json            # Configuração Vercel
├── matches.csv            # Base de dados de partidas
├── predictions.csv        # Base de dados de palpites
└── arquivos/              # Dados auxiliares (times, grupos, etc.)
```

## 🔧 API Endpoints

### GET /api/matches
Retorna todas as partidas

**Resposta:**
```json
[
  {
    "id": "1",
    "stage": "Grupo A",
    "date": "2026-06-11 15:00",
    "team_a": "Estados Unidos",
    "team_b": "Marrocos",
    "score_a": "2",
    "score_b": "1",
    "status": "finished"
  }
]
```

### GET /api/predictions
Retorna todos os palpites

### POST /api/predictions
Adiciona ou atualiza um palpite

**Body:**
```json
{
  "username": "João",
  "match_id": "1",
  "score_a": "2",
  "score_b": "0"
}
```

### POST /api/matches/score
Atualiza o placar real de uma partida (Administrador)

**Body:**
```json
{
  "match_id": "1",
  "score_a": "2",
  "score_b": "1",
  "status": "finished"
}
```

## 📊 Regras de Pontuação

- **25 pontos:** Acerto exato do placar
- **15 pontos:** Acerto do vencedor + saldo de gols (ou empate não exato)
- **10 pontos:** Acerto apenas do vencedor
- **0 pontos:** Erro total do resultado

## 💾 Dados

### Partidas (matches.csv)
- `id`: Identificador único
- `stage`: Fase (Grupo A, B, Oitavas, etc.)
- `date`: Data e hora do jogo
- `team_a`, `team_b`: Nomes dos times
- `score_a`, `score_b`: Placares
- `status`: 'scheduled', 'active', ou 'finished'

### Palpites (predictions.csv)
- `username`: Nome do usuário
- `match_id`: ID da partida
- `score_a`, `score_b`: Placar palpitado
- `points_earned`: Pontos calculados
- `updated_at`: Timestamp da última atualização

## 🔐 Considerações de Segurança

⚠️ **Em produção:**
- Implemente autenticação de usuários
- Adicione validação mais rigorosa de dados
- Use banco de dados em vez de CSV
- Implemente rate limiting
- Use variáveis de ambiente para configurações sensíveis

## 📝 Licença

Este projeto é de uso pessoal/interno.

## 🆘 Suporte

Para dúvidas ou problemas, verifique:
- Que Node.js 14+ está instalado (`node --version`)
- Que a porta 8080 está disponível
- Logs do servidor para mensagens de erro
