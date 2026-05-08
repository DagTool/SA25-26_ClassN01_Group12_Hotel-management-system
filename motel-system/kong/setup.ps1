# kong\setup.ps1
$BASE = "http://localhost:8001"

Write-Host "Waiting for Kong..." -ForegroundColor Yellow
$ready = $false
while (-not $ready) {
    try {
        Invoke-WebRequest "$BASE/status" -UseBasicParsing -ErrorAction Stop | Out-Null
        $ready = $true
    } catch {
        Start-Sleep -Seconds 2
    }
}
Write-Host "Kong ready!" -ForegroundColor Green

# ── TẠO 4 SERVICES ───────────────────────────────────────
$services = @(
    @{ name="auth-service";    url="http://auth-service:3001" },
    @{ name="room-service";    url="http://room-service:3002" },
    @{ name="booking-service"; url="http://booking-service:3003" },
    @{ name="payment-service"; url="http://payment-service:3004" }
)
foreach ($svc in $services) {
    $body = "name=$($svc.name)&url=$($svc.url)"
    try {
        Invoke-RestMethod -Method POST "$BASE/services" -Body $body -ContentType "application/x-www-form-urlencoded" | Out-Null
        Write-Host "  + Service: $($svc.name)" -ForegroundColor Cyan
    } catch {
        Write-Host "  ~ Service $($svc.name) da ton tai, bo qua" -ForegroundColor Yellow
    }
}

# ── TẠO ROUTES ───────────────────────────────────────────
$routes = @(
    @{ service="auth-service";    path="/api/auth" },
    @{ service="room-service";    path="/api/rooms" },
    @{ service="booking-service"; path="/api/bookings" },
    @{ service="payment-service"; path="/api/payments" }
)
foreach ($r in $routes) {
    $body = "paths[]=$($r.path)&strip_path=false"
    try {
        Invoke-RestMethod -Method POST "$BASE/services/$($r.service)/routes" -Body $body -ContentType "application/x-www-form-urlencoded" | Out-Null
        Write-Host "  + Route: $($r.path) -> $($r.service)" -ForegroundColor Cyan
    } catch {
        Write-Host "  ~ Route $($r.path) da ton tai, bo qua" -ForegroundColor Yellow
    }
}

# ── PLUGIN: CORS (global) ─────────────────────────────────
try {
    $body = "name=cors&config.origins[]=http://localhost:3000&config.methods[]=GET&config.methods[]=POST&config.methods[]=PUT&config.methods[]=DELETE&config.methods[]=OPTIONS&config.headers[]=Authorization&config.headers[]=Content-Type&config.credentials=true"
    Invoke-RestMethod -Method POST "$BASE/plugins" -Body $body -ContentType "application/x-www-form-urlencoded" | Out-Null
    Write-Host "  + Plugin: CORS (global)" -ForegroundColor Cyan
} catch {
    Write-Host "  ~ CORS da ton tai" -ForegroundColor Yellow
}

# ── PLUGIN: RATE LIMITING (global - Chương 8) ────────────
try {
    $body = "name=rate-limiting&config.minute=100&config.hour=1000&config.policy=local"
    Invoke-RestMethod -Method POST "$BASE/plugins" -Body $body -ContentType "application/x-www-form-urlencoded" | Out-Null
    Write-Host "  + Plugin: Rate-Limiting (100/min)" -ForegroundColor Cyan
} catch {
    Write-Host "  ~ Rate-Limiting da ton tai" -ForegroundColor Yellow
}

# ── PLUGIN: JWT chỉ cho room, booking, payment (Chương 5) ─
foreach ($svc in @("room-service","booking-service","payment-service")) {
    try {
        Invoke-RestMethod -Method POST "$BASE/services/$svc/plugins" -Body "name=jwt" -ContentType "application/x-www-form-urlencoded" | Out-Null
        Write-Host "  + Plugin: JWT -> $svc" -ForegroundColor Cyan
    } catch {
        Write-Host "  ~ JWT $svc da ton tai" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Kong setup hoan tat!" -ForegroundColor Green
Write-Host "  Proxy : http://localhost:8000"
Write-Host "  Admin : http://localhost:8001"