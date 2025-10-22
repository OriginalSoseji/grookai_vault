param(
  [string]$ProjectRoot = "C:\grookai_vault",
  [string]$SetCode = "sv4",
  [string]$Number = "12",
  [string]$Lang = "en",
  [switch]$AutoStart,          # if set, will start supabase locally when stopped
  [switch]$NoPrompt            # if set, skips confirmation prompts
)

$ErrorActionPreference = "Continue"
Set-Location $ProjectRoot

function New-DirIfMissing($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

$Reports = Join-Path $ProjectRoot ".reports"
New-DirIfMissing $Reports

$SummaryMd = Join-Path $Reports "lazy_e2e.md"
$FuncResp1 = Join-Path $Reports "lazy_func_test_first.json"
$FuncResp2 = Join-Path $Reports "lazy_func_test_second.json"
$AuditMd   = Join-Path $Reports "lazy_audit.md"

function Note($s) { Write-Host $s; $script:Log += "$s`r`n" }

$Log = ""
$Pass = $true

# 0) Guards
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Note "❌ Supabase CLI not found in PATH."
  $Pass = $false
}

# 1) Run audit (read-only)
$AuditScript = Join-Path $ProjectRoot "tools\Audit-LazyState.ps1"
if (Test-Path $AuditScript) {
  Note "▶ Running audit..."
  powershell -NoProfile -ExecutionPolicy Bypass -File $AuditScript | Out-Null
  if (Test-Path $AuditMd) {
    Note "✅ Audit report written: $AuditMd"
  } else {
    Note "⚠️ Audit did not produce $AuditMd"
  }
} else {
  Note "⚠️ Audit script not found at $AuditScript"
}

# 2) Parse audit for quick signals
$PostgresRunning = $false
$IsLinked = $true
try {
  if (Test-Path $AuditMd) {
    $auditText = Get-Content $AuditMd -Raw
    if ($auditText -notmatch "(?im)Postgres running:\s+✅") { $PostgresRunning = $false } else { $PostgresRunning = $true }
    if ($auditText -match "(?im)Skipped schema diff: no linked remote project") { $IsLinked = $false }
  }
} catch {}

# 3) Offer to start local stack if Postgres is stopped
if (-not $PostgresRunning) {
  if ($AutoStart -or $NoPrompt) {
    Note "▶ Starting supabase services (AutoStart or NoPrompt)..."
    supabase start | Out-Null
  } else {
    $ans = Read-Host "Local Postgres is not running. Start supabase now? [y/N]"
    if ($ans -in @("y","Y","yes","YES")) {
      supabase start | Out-Null
    } else {
      Note "⚠️ Skipping start. Function test may fail without Postgres."
    }
  }
}

# 4) Verify function env
$FuncEnv = Join-Path $ProjectRoot "supabase\functions\import-card\.env"
$EnvOk = $false
if (Test-Path $FuncEnv) {
  $envTxt = Get-Content $FuncEnv -Raw
  if ($envTxt -match "(?im)^SUPABASE_URL\s*=\s*.+" -and $envTxt -match "(?im)^SUPABASE_SERVICE_ROLE_KEY\s*=\s*.+") {
    $EnvOk = $true
  }
}
if (-not $EnvOk) {
  Note "⚠️ Function env missing or incomplete at $FuncEnv (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for local serve)."
}

# 5) Serve function in background
$ServePid = $null
try {
  Note "▶ Starting local function server for import-card..."
  $serveArgs = "functions serve --env-file supabase\functions\import-card\.env --no-verify-jwt"
  $proc = Start-Process -FilePath "supabase" -ArgumentList $serveArgs -PassThru -WindowStyle Minimized -WorkingDirectory $ProjectRoot
  $ServePid = $proc.Id
  Start-Sleep -Seconds 5
} catch {
  Note "❌ Could not start functions serve: $_"
  $Pass = $false
}

# 6) Call the function twice
$BaseUrl = "http://localhost:54321/functions/v1/import-card"
$Headers = @{ "Content-Type" = "application/json" }

function TryCallImport([string]$outPath) {
  try {
    $body = @{ set_code = $SetCode; number = $Number; lang = $Lang } | ConvertTo-Json -Compress
    $resp = Invoke-WebRequest -Method POST -Uri $BaseUrl -Headers $Headers -Body $body -TimeoutSec 30
    $resp.Content | Set-Content -Path $outPath -Encoding UTF8
    return $true
  } catch {
    $_ | Out-String | Set-Content -Path $outPath -Encoding UTF8
    return $false
  }
}

$ok1 = TryCallImport $FuncResp1
Start-Sleep -Seconds 2
$ok2 = TryCallImport $FuncResp2

# 7) Stop function server
if ($ServePid) {
  try { Stop-Process -Id $ServePid -Force } catch {}
  Note "⏹ Stopped functions serve (PID $ServePid)."
}

# 8) Interpret results
$Status1 = "(no call)"
$Status2 = "(no call)"
try {
  if (Test-Path $FuncResp1) {
    $j1 = Get-Content $FuncResp1 -Raw
    if ($j1 -match '"status"\s*:\s*"inserted"') { $Status1 = "inserted" }
    elseif ($j1 -match '"status"\s*:\s*"exists"') { $Status1 = "exists" }
    else { $Status1 = "unknown" }
  }
  if (Test-Path $FuncResp2) {
    $j2 = Get-Content $FuncResp2 -Raw
    if ($j2 -match '"status"\s*:\s*"exists"') { $Status2 = "exists" }
    elseif ($j2 -match '"status"\s*:\s*"inserted"') { $Status2 = "inserted" }  # rare timing
    else { $Status2 = "unknown" }
  }
} catch {}

# 9) Compose summary markdown (use tildes to avoid backtick issues)
$md = @()
$md += "# Grookai Vault - Lazy E2E Test"
$md += ""
$md += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$md += ""
$md += "## Inputs"
$md += "- Set: $SetCode"
$md += "- Number: $Number"
$md += "- Lang: $Lang"
$md += ""
$md += "## Steps Run"
$md += "- Audit script executed"
$md += "- Local stack start prompt: $($AutoStart.IsPresent -or $NoPrompt.IsPresent)"
$md += "- Functions serve attempted"
$md += "- import-card called twice"
$md += ""
$md += "## Results"
$md += "- Audit report: $AuditMd"
$md += "- First call response: $FuncResp1"
$md += "- Second call response: $FuncResp2"
$md += "- First call status: $Status1"
$md += "- Second call status: $Status2"
$md += ""
$md += "## Expected"
$md += "- First call: inserted (if not in DB yet) OR exists (if already present)"
$md += "- Second call: exists"
$md += ""
$md += "## Overall"
if (($Status1 -in @("inserted","exists")) -and ($Status2 -eq "exists")) {
  $md += "✅ PASS - Pipeline working end-to-end."
} else {
  $md += "❌ FAIL - Check responses and logs."
  $Pass = $false
}
$md += ""
$md += "## Notes"
$md += "- If responses show provider errors, verify set_code/number, internet access, and provider URL."
$md += "- If local serve failed, ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
$md += "- If audit shows 'not linked', run: supabase link"
$md += "- If Postgres is stopped, run: supabase start"
$md += ""
$md -join "`r`n" | Set-Content -Path $SummaryMd -Encoding UTF8

# Final console output
Write-Host ""
Write-Host "Summary: $SummaryMd"
Write-Host "First:   $FuncResp1"
Write-Host "Second:  $FuncResp2"
Write-Host ""
if ($Pass) { exit 0 } else { exit 1 }
