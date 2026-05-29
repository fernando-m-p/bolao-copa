# server.ps1
# Servidor HTTP leve para o Bolão da Copa do Mundo
# Executa na porta 8080 e gerencia o armazenamento em arquivos CSV

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  Servidor do Bolao da Copa rodando em http://localhost:$port/  " -ForegroundColor Green -NoNewline
    Write-Host "  "
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Pressione Ctrl+C nesta janela para parar o servidor.`n" -ForegroundColor Yellow
} catch {
    Write-Error "Falha ao iniciar o servidor na porta $port. Verifique se a porta esta em uso."
    Write-Error $_
    exit 1
}

# Função auxiliar para ler CSV como JSON UTF-8
function Get-CsvAsJson($path) {
    if (Test-Path $path) {
        # Lê o CSV decodificando UTF-8
        $data = Import-Csv -Path $path -Delimiter ',' -Encoding utf8
        if ($data) {
            # Converte para array de objetos e serializa
            return ConvertTo-Json @($data) -Depth 5
        }
        return "[]"
    }
    return "[]"
}

# Função auxiliar para ler o corpo da requisição POST (JSON)
function Get-RequestBody($request) {
    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
    $body = $reader.ReadToEnd()
    $reader.Close()
    return $body
}

# Função auxiliar para enviar resposta JSON com cabeçalhos CORS
function Send-JsonResponse($response, $statusCode, $jsonString) {
    try {
        $response.StatusCode = $statusCode
        $response.ContentType = "application/json; charset=utf-8"
        
        # Cabeçalhos CORS
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
        
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonString)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
        $response.OutputStream.Close()
    } catch {
        Write-Host "Erro ao enviar resposta JSON: $_" -ForegroundColor Red
    }
}

# Função auxiliar para servir arquivos estáticos (HTML, CSS, JS)
function Send-FileResponse($response, $filePath, $contentType) {
    if (Test-Path $filePath) {
        try {
            $response.StatusCode = 200
            $response.ContentType = "$contentType; charset=utf-8"
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.OutputStream.Close()
        } catch {
            Write-Host "Erro ao enviar arquivo $($filePath): $_" -ForegroundColor Red
            Send-JsonResponse $response 500 '{"error": "Falha ao ler arquivo estatico"}'
        }
    } else {
        Send-JsonResponse $response 404 '{"error": "Arquivo nao encontrado"}'
    }
}

# Regra de cálculo de pontuação do palpite
function Calculate-PredictionPoints($predScoreA, $predScoreB, $realScoreA, $realScoreB) {
    if ($predScoreA -eq $null -or $predScoreB -eq $null -or $realScoreA -eq $null -or $realScoreB -eq $null -or 
        $predScoreA -eq "" -or $predScoreB -eq "" -or $realScoreA -eq "" -or $realScoreB -eq "") {
        return 0
    }
    
    $pA = [int]$predScoreA
    $pB = [int]$predScoreB
    $rA = [int]$realScoreA
    $rB = [int]$realScoreB
    
    # 1. Acerto exato do placar: 25 pontos
    if ($pA -eq $rA -and $pB -eq $rB) {
        return 25
    }
    
    # Saldos e resultados (Vitória A, Vitória B ou Empate)
    $pDiff = $pA - $pB
    $rDiff = $rA - $rB
    
    # Verifica se acertou o vencedor ou empate
    $correctWinner = ($pDiff -gt 0 -and $rDiff -gt 0) -or ($pDiff -lt 0 -and $rDiff -lt 0) -or ($pDiff -eq 0 -and $rDiff -eq 0)
    
    if ($correctWinner) {
        # Se foi empate (mas não o placar exato): 15 pontos
        if ($pDiff -eq 0) {
            return 15
        }
        # Se acertou o saldo de gols exato do vencedor: 15 pontos (ex: palpite 2-1, real 3-2)
        if ($pDiff -eq $rDiff) {
            return 15
        }
        # Acertou apenas o vencedor com saldo diferente: 10 pontos
        return 10
    }
    
    return 0 # Errou o resultado completo
}

# Loop principal de escuta do servidor
while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $rawUrl = $request.RawUrl
        $method = $request.HttpMethod
        
        # Log da requisição no terminal
        $timeStr = Get-Date -Format "HH:mm:ss"
        Write-Host "[$timeStr] $method $rawUrl" -ForegroundColor Cyan
        
        # Trata OPTIONS (preflight CORS do navegador)
        if ($method -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")
            $response.OutputStream.Close()
            continue
        }
        
        # Roteamento simples
        if ($rawUrl -eq "/" -or $rawUrl -eq "/index.html" -or $rawUrl.StartsWith("/?")) {
            Send-FileResponse $response "index.html" "text/html"
        }
        elseif ($rawUrl -eq "/style.css") {
            Send-FileResponse $response "style.css" "text/css"
        }
        elseif ($rawUrl -eq "/app.js") {
            Send-FileResponse $response "app.js" "text/javascript"
        }
        elseif ($rawUrl -eq "/api/matches" -and $method -eq "GET") {
            $json = Get-CsvAsJson "matches.csv"
            Send-JsonResponse $response 200 $json
        }
        elseif ($rawUrl -eq "/api/predictions" -and $method -eq "GET") {
            $json = Get-CsvAsJson "predictions.csv"
            Send-JsonResponse $response 200 $json
        }
        elseif ($rawUrl -eq "/api/predictions" -and $method -eq "POST") {
            $body = Get-RequestBody $request
            $payload = ConvertFrom-Json $body
            
            # Validação simples
            if (-not $payload.username -or -not $payload.match_id) {
                Send-JsonResponse $response 400 '{"error": "Dados insuficientes (username, match_id necessarios)"}'
                continue
            }
            
            # Carrega palpites existentes
            $predictions = @()
            if (Test-Path "predictions.csv") {
                $predictions = @(Import-Csv -Path "predictions.csv" -Delimiter ',' -Encoding utf8)
            }
            
            # Carrega partidas para validações e cálculos
            $matches = @(Import-Csv -Path "matches.csv" -Delimiter ',' -Encoding utf8)
            $match = $matches | Where-Object { $_.id -eq $payload.match_id }
            
            if (-not $match) {
                Send-JsonResponse $response 404 '{"error": "Partida nao encontrada"}'
                continue
            }
            
            # Verifica se o jogo já foi finalizado
            if ($match.status -eq "finished") {
                Send-JsonResponse $response 400 '{"error": "Nao e possivel enviar ou alterar palpites para jogos finalizados."}'
                continue
            }
            
            # Calcula pontos caso a partida já tenha resultado (caso em andamento etc., embora geralmente pontue só ao finalizar)
            $points = 0
            if ($match.status -eq "finished") {
                $points = Calculate-PredictionPoints $payload.score_a $payload.score_b $match.score_a $match.score_b
            }
            
            # Adiciona ou atualiza o palpite do usuário
            $updatedPredictions = @()
            $found = $false
            
            foreach ($pred in $predictions) {
                if ($pred.username -eq $payload.username -and $pred.match_id -eq $payload.match_id) {
                    $pred.score_a = $payload.score_a
                    $pred.score_b = $payload.score_b
                    $pred.points_earned = $points
                    $pred.updated_at = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                    $found = $true
                }
                $updatedPredictions += $pred
            }
            
            if (-not $found) {
                $newPred = [PSCustomObject]@{
                    username = $payload.username
                    match_id = $payload.match_id
                    score_a = $payload.score_a
                    score_b = $payload.score_b
                    points_earned = $points
                    updated_at = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                }
                $updatedPredictions += $newPred
            }
            
            # Salva no arquivo CSV
            $updatedPredictions | Export-Csv -Path "predictions.csv" -Delimiter ',' -NoTypeInformation -Encoding utf8
            
            Send-JsonResponse $response 200 '{"success": true}'
        }
        elseif ($rawUrl -eq "/api/matches/score" -and $method -eq "POST") {
            # Atualização de placar real (Somente Administrador)
            $body = Get-RequestBody $request
            $payload = ConvertFrom-Json $body
            
            if (-not $payload.match_id -or $payload.score_a -eq $null -or $payload.score_b -eq $null) {
                Send-JsonResponse $response 400 '{"error": "Dados invalidos (match_id, score_a, score_b necessarios)"}'
                continue
            }
            
            # 1. Atualizar o placar na partida em matches.csv
            $matches = @(Import-Csv -Path "matches.csv" -Delimiter ',' -Encoding utf8)
            $updatedMatches = @()
            $targetMatch = $null
            
            foreach ($match in $matches) {
                if ($match.id -eq $payload.match_id) {
                    $match.score_a = $payload.score_a
                    $match.score_b = $payload.score_b
                    $match.status = $payload.status # 'finished', 'active', 'scheduled'
                    $targetMatch = $match
                }
                $updatedMatches += $match
            }
            
            if (-not $targetMatch) {
                Send-JsonResponse $response 404 '{"error": "Partida nao encontrada"}'
                continue
            }
            
            $updatedMatches | Export-Csv -Path "matches.csv" -Delimiter ',' -NoTypeInformation -Encoding utf8
            
            # 2. Se a partida foi finalizada, recalcular pontos de todos os palpites para esta partida
            if (Test-Path "predictions.csv") {
                $predictions = @(Import-Csv -Path "predictions.csv" -Delimiter ',' -Encoding utf8)
                $updatedPredictions = @()
                
                foreach ($pred in $predictions) {
                    if ($pred.match_id -eq $payload.match_id) {
                        if ($targetMatch.status -eq "finished") {
                            $pred.points_earned = Calculate-PredictionPoints $pred.score_a $pred.score_b $targetMatch.score_a $targetMatch.score_b
                        } else {
                            $pred.points_earned = 0
                        }
                        $pred.updated_at = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
                    }
                    $updatedPredictions += $pred
                }
                $updatedPredictions | Export-Csv -Path "predictions.csv" -Delimiter ',' -NoTypeInformation -Encoding utf8
            }
            
            Send-JsonResponse $response 200 '{"success": true}'
        }
        else {
            Send-JsonResponse $response 404 '{"error": "Rota nao encontrada"}'
        }
    }
    catch {
        Write-Host "Erro crítico no loop do servidor: $_" -ForegroundColor Red
        if ($response) {
            try { Send-JsonResponse $response 500 '{"error": "Erro interno do servidor"}' } catch {}
        }
    }
}
