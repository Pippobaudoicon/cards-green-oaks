# Italian Card Game - PowerShell Startup Script
Write-Host "🃏 Starting Italian Card Game Server..." -ForegroundColor Green
Write-Host ""

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
        $listener.Start()
        $listener.Stop()
        return $false
    } catch {
        return $true
    }
}

# Try ports starting from 3000
$port = 3000
$maxPort = 3010

while ($port -le $maxPort) {
    Write-Host "Trying port $port..." -ForegroundColor Yellow
    
    if (-not (Test-Port -Port $port)) {
        Write-Host "Port $port is available!" -ForegroundColor Green
        break
    } else {
        Write-Host "Port $port is in use, trying next port..." -ForegroundColor Red
        $port++
    }
}

if ($port -gt $maxPort) {
    Write-Host "No available ports found between 3000-$maxPort" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting server on port $port..." -ForegroundColor Green
Write-Host "Open your browser to: http://localhost:$port" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Set environment variable and start
$env:PORT = $port
npm start
