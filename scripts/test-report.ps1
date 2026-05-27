Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  钢铁行业 Agent 自动化测试报告" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path "$scriptDir\.."

# Backend tests
Write-Host "[1/2] Running backend tests..." -ForegroundColor Yellow
Push-Location "$projectRoot\backend"
$backendOutput = go test ./... -cover -count=1 2>&1
$backendResult = $LASTEXITCODE
Pop-Location

Write-Host $backendOutput
Write-Host ""

# Frontend tests
Write-Host "[2/2] Running frontend tests..." -ForegroundColor Yellow
Push-Location "$projectRoot\steel-agent-web"
$frontendOutput = npx vitest run --reporter=verbose 2>&1
$frontendResult = $LASTEXITCODE
Pop-Location

Write-Host $frontendOutput
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Test Results Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($backendResult -eq 0) {
    Write-Host "Backend:  PASS" -ForegroundColor Green
} else {
    Write-Host "Backend:  FAIL" -ForegroundColor Red
}

if ($frontendResult -eq 0) {
    Write-Host "Frontend: PASS" -ForegroundColor Green
} else {
    Write-Host "Frontend: FAIL" -ForegroundColor Red
}

Write-Host ""

exit ($backendResult -bor $frontendResult)
