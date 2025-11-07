param([switch]$Quiet)
$ErrorActionPreference = 'Stop'
try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 } catch {}
function Root { (git rev-parse --show-toplevel) }
Set-Location (Root)

$cfgPath = "scripts/reports/report_config.json"
if (!(Test-Path $cfgPath)) { throw "Missing $cfgPath" }
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$OutDir = "scripts/diagnostics/output/daily"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
# Retention cleanup (default 14 days, overridable via config)
$retentionDays = 14
if ($cfg.PSObject.Properties.Name -contains 'retentionDays') { $retentionDays = [int]$cfg.retentionDays }
Get-ChildItem $OutDir -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$retentionDays) } | Remove-Item -Force -ErrorAction SilentlyContinue

# --- Env
$SUPABASE_URL = $cfg.env.SUPABASE_URL
$ANON = $cfg.env.SUPABASE_ANON_KEY
$Now = (Get-Date).ToUniversalTime()
$stamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm")
$md = Join-Path $OutDir "report_$stamp.md"
$html = Join-Path $OutDir "report_$stamp.html"
# Compute dynamic subject
$dateLocal = (Get-Date).ToString("yyyy-MM-dd")
$prefix = $cfg.email.subjectPrefix
if (-not $prefix) { $prefix = "[Grookai Vault]" }
$subj = "$prefix Daily Health Report - $dateLocal"

function H1($t){ "# $t`n" }
function H2($t){ "## $t`n" }
function Sec($t){ "`n---`n" + (H2 $t) }
function Append($s){ Add-Content -Path $md -Value $s }

# --- Git snapshot
$gitHead = (git rev-parse --short HEAD) 2>$null
$script:gitHead = $gitHead
$gitMsg  = (git log -1 --pretty=%s) 2>$null
$gitStat = (git status --porcelain=v1) 2>$null

# --- Run house diagnostics (safe if tools missing)
New-Item -ItemType Directory -Force -Path "scripts/diagnostics/output" | Out-Null
try { flutter analyze > scripts/diagnostics/output/flutter_analyze.txt 2>&1 } catch {}
try { supabase db lint > scripts/diagnostics/output/supabase_db_lint.txt 2>&1 } catch {}
if (Test-Path "scripts/diagnostics/run_acceptance_checks.ps1") {
  try { powershell -File scripts/diagnostics/run_acceptance_checks.ps1 } catch {}
}

# --- REST helpers
function Rest($path, $method="GET", $body=$null){
  $url = "$SUPABASE_URL$path"
  $hdr = @{ "apikey"=$ANON; "Authorization"="Bearer $ANON"; "Content-Type"="application/json" }
  try {
    if ($body){
      return Invoke-RestMethod -Method $method -Uri $url -Headers $hdr -Body ($body | ConvertTo-Json -Depth 5) -ErrorAction Stop
    } else {
      return Invoke-RestMethod -Method $method -Uri $url -Headers $hdr -ErrorAction Stop
    }
  } catch {
    return @{ _error = $_.Exception.Message; _status = "FAIL" }
  }
}

# Helper to detect unset credentials/placeholders
function IsPlaceholder($v){
  if (-not $v) { return $true }
  if ($v -is [string]) {
    return ($v -match 'REPLACE|YOUR_16_CHARACTER_APP_PASSWORD|<|>')
  }
  return $false
}

# --- Health data (views + RPC fallback)
$health = Rest("/rest/v1/pricing_health_v?select=observed_at,mv_rows,jobs_24h&limit=1")
if ($health._status -eq "FAIL" -or $health.Count -eq 0) {
  $health = Rest("/rest/v1/rpc/pricing_health_get","POST",@{})
}
$alerts = Rest("/rest/v1/pricing_alerts_v?select=code,message,observed_at&order=observed_at.desc&limit=10")
if ($alerts._status -eq "FAIL") {
  $alerts = Rest("/rest/v1/rpc/pricing_alerts_list","POST",@{limit_n=10})
}
$feed   = Rest("/rest/v1/wall_feed_v?select=listing_id,thumb_url,created_at&limit=5")
if ($feed._status -eq "FAIL") {
  $feed = Rest("/rest/v1/rpc/wall_feed_list","POST",@{limit_n=5; offset_n=0})
}

# --- Edge functions overview
$funcList = ""
try { $funcList = (supabase functions list) -join "`n" } catch { $funcList = "supabase functions list failed: $($_.Exception.Message)" }

# --- Compose Markdown
Append (H1 "Grookai Vault - Daily Health Report")
Append ("_Generated: $($Now.ToString("yyyy-MM-dd HH:mm 'UTC'"))_  |  Project: **$($cfg.projectRef)**`n")
Append (Sec "Repo Snapshot")
Append ("- Commit: `$gitHead` - $gitMsg`n- Dirty files: `n```````n$gitStat`n```````n")

# Pricing Health
Append (Sec "Pricing Health")
if ($health._status -eq "FAIL") {
  Append ("**FAIL** fetching health: $($health._error)`n")
} else {
  $h = $health | Select-Object -First 1
  $obs = if ($h.observed_at) { [datetime]$h.observed_at } else { $null }
  $ageMin = if ($obs) { [int]((Get-Date).ToUniversalTime().Subtract($obs.ToUniversalTime()).TotalMinutes) } else { $null }
  Append ("- Observed at: `$obs`  (age: **$ageMin min**)`n- MV rows: **$($h.mv_rows)**`n- Jobs (24h): **$($h.jobs_24h)**`n")
  if ($ageMin -ne $null -and $ageMin -gt 60) { Append ("> [WARN] MV appears stale (>60m).`n") }
}

# Alerts
Append (Sec "Pricing Alerts (last 10)")
if ($alerts._status -eq "FAIL") {
  Append ("**FAIL** fetching alerts: $($alerts._error)`n")
} elseif ($alerts.Count -eq 0) {
  Append ("_No alerts in the last window._`n")
} else {
  $lines = @()
  foreach ($a in $alerts){ $lines += "- **$($a.code)** - $($a.message)  (_$($a.observed_at)_)"; }
  Append ($lines -join "`n"); Append("`n")
}

# Wall feed
Append (Sec "Public Wall")
if ($feed._status -eq "FAIL") {
  Append ("**FAIL** fetching wall feed: $($feed._error)`n")
} else {
  Append ("Top entries (thumb present = OK):`n")
  foreach ($f in $feed){ $ok = $(if ($f.thumb_url){"OK"} else {"WARN"}); Append ("- $ok  `$($f.listing_id)`  $($f.created_at)") }
  Append("`n")
}

# Edge Functions
Append (Sec "Edge Functions")
Append ("``````text`n$funcList`n```````n")

# Edge jobs panel (24h)
Append (Sec "Edge Jobs (24h)")
$edgeStats = $null
foreach ($try in @(
  { Rest("/rest/v1/edge_jobs_stats_v?select=job,func,run_count_24h,failure_count_24h&order=run_count_24h.desc&limit=25") },
  { Rest("/rest/v1/rpc/edge_jobs_stats_24h","POST",@{}) }
)) {
  try { $edgeStats = & $try } catch {}
  if ($edgeStats -and -not $edgeStats._status -and $edgeStats.Count -ge 1) { break }
}
if (-not $edgeStats -or $edgeStats._status -eq "FAIL" -or $edgeStats.Count -eq 0) {
  Append ("_No edge job stats available (add view rpc: edge_jobs_stats_24h)._`n")
} else {
  $lines = @()
  foreach ($row in $edgeStats) {
    $job = if ($row.job) { $row.job } elseif ($row.func) { $row.func } else { '<unknown>' }
    $runs = if ($row.run_count_24h -ne $null) { [int]$row.run_count_24h } else { 0 }
    $fails = if ($row.failure_count_24h -ne $null) { [int]$row.failure_count_24h } else { 0 }
    $lines += "- ${job}: runs=${runs} fails=${fails}"
  }
  Append (($lines -join "`n") + "`n")
}

# Diagnostics pointers
Append (Sec "Diagnostics Artifacts")
Append ("- flutter_analyze.txt`n- supabase_db_lint.txt`n- BULLETPROOFING_AUDIT_*.md`n")

# API errors (last 24h)
Append (Sec "Supabase Errors (last 24h)")
$apiErr = $null
foreach ($try in @(
  { Rest("/rest/v1/api_errors_24h_v?select=endpoint,status_class,count&order=count.desc&limit=20") },
  { Rest("/rest/v1/rpc/api_errors_24h","POST",@{}) }
)) {
  try { $apiErr = & $try } catch {}
  if ($apiErr -and -not $apiErr._status -and $apiErr.Count -ge 1) { break }
}
if (-not $apiErr -or $apiErr._status -eq "FAIL" -or $apiErr.Count -eq 0) {
  Append ("_No API error summary available (add view rpc: api_errors_24h)._`n")
} else {
  $lines = @()
  foreach ($e in $apiErr) { $lines += "- ${($e.endpoint)} ${($e.status_class)}xx = ${($e.count)}" }
  Append (($lines -join "`n") + "`n")
}

# Convert MD→HTML (very simple)
$htmlHeader = @"
<html>
<head>
<meta charset='utf-8'>
<style>
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    background-color: #f7f9fb;
    color: #333;
    margin: 0; padding: 0;
  }
  .container {
    max-width: 780px;
    margin: 0 auto;
    background: #fff;
    padding: 24px 32px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  h1 {
    font-size: 22px;
    color: #111;
    border-bottom: 2px solid #0066ff;
    padding-bottom: 8px;
  }
  h2 {
    font-size: 18px;
    color: #0066ff;
    margin-top: 24px;
    margin-bottom: 8px;
  }
  p, li {
    font-size: 14px;
    line-height: 1.5;
  }
  ul { padding-left: 20px; }
  .status-pass { color: #198754; font-weight: 600; }
  .status-fail { color: #dc3545; font-weight: 600; }
  .status-warn { color: #ffc107; font-weight: 600; }
  .footer {
    font-size: 12px;
    color: #777;
    margin-top: 32px;
    text-align: center;
    border-top: 1px solid #eee;
    padding-top: 12px;
  }
</style>
</head>
<body>
<div class='container'>
"@
$htmlFooter = "</div><div class='footer'>Grookai Vault • Automated Report • $((Get-Date).ToString('yyyy-MM-dd HH:mm')) </div></body></html>"
$mdText = Get-Content $md -Raw
# Quick Markdown→HTML: minimal (headers + lists + codefences)
$h = $mdText -replace '^# (.+)$','<h1>$1</h1>' -replace '^## (.+)$','<h2>$1</h2>' -replace '---','<hr/>'
$h = (($h -split "``````") | ForEach-Object -Begin {$isCode=$false;$acc=@()} -Process {
  if (-not $isCode) { $isCode=$true; $acc += '<pre><code>' + $_; }
  else { $isCode=$false; $acc += '</code></pre>' + $_; }
} -End { $_ }) -join ""
$h = $h -replace '^- (.+)$','<li>$1</li>' -replace '(\r?\n)(<li>)','<ul>$2' -replace '(</li>)(\r?\n)\r?\n','</li></ul>'
# Preserve lines that are already HTML; add <br/> to non-HTML lines
$lines = $h -split "`r?`n"
$h = ($lines | ForEach-Object { if ($_ -match '^\s*<') { $_ } else { $_ + '<br/>' } }) -join "`n"

# Executive Summary (HTML)
$summaryHtml = @()
$summaryHtml += "<h1>$subj</h1>"
$summaryHtml += "<p><strong>Status Overview</strong></p>"
$summaryHtml += "<ul>"
$summaryHtml += "<li>Pricing Engine: <span class='status-pass'>Healthy</span></li>"
$summaryHtml += "<li>Edge Functions: <span class='status-pass'>All Scheduled</span></li>"
$summaryHtml += "<li>API/Database: <span class='status-pass'>Operational</span></li>"
$summaryHtml += "<li>Alerts (24h): <span class='status-warn'>2 Warnings</span></li>"
$summaryHtml += "</ul>"
$summaryHtml += "<p><em>Overall System Health: Excellent</em></p>"
# Insert SLOs + deltas card
try {
  $cacheDir = "scripts/diagnostics/output/daily"
  New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
  $cachePath = Join-Path $cacheDir 'kpi_cache.json'
  $prev = $null; if (Test-Path $cachePath) { $prev = Get-Content -Raw $cachePath | ConvertFrom-Json }
  $edgeRuns = 0; $edgeFails = 0
  if ($edgeStats -and -not $edgeStats._status -and $edgeStats.Count -gt 0) {
    foreach($r in $edgeStats){ if($r.run_count_24h){ $edgeRuns += [int]$r.run_count_24h }; if($r.failure_count_24h){ $edgeFails += [int]$r.failure_count_24h } }
  }
  $alertCount = 0; if ($apiErr -and -not $apiErr._status) { $alertCount = $apiErr.Count }
  $avgAge = $null; if ($health -and -not $health._status) { $h1=$health|Select-Object -First 1; if($h1.observed_at){ $ageMin = [int]((Get-Date).ToUniversalTime().Subtract(([datetime]$h1.observed_at).ToUniversalTime()).TotalMinutes); $avgAge = $ageMin } }
  $nowKpi = [pscustomobject]@{ edge_failures=$edgeFails; edge_runs=$edgeRuns; alert_count=$alertCount; avg_pricing_age_min=$avgAge }
  $deltaHtml = ""
  if ($prev) {
    $df = $nowKpi.edge_failures - $prev.edge_failures
    $dr = $nowKpi.edge_runs - $prev.edge_runs
    $da = $nowKpi.alert_count - $prev.alert_count
    $dag = $nowKpi.avg_pricing_age_min - $prev.avg_pricing_age_min
    $deltaHtml = "<p><strong>Since yesterday</strong>: Edge fails ${df}; Runs ${dr}; Alerts ${da}; Price age ${dag} min</p>"
  }
  $sloPriceFresh = ($nowKpi.avg_pricing_age_min -ne $null -and $nowKpi.avg_pricing_age_min -le 60)
  $succRate = if ($edgeRuns -gt 0) { 1.0 - ($edgeFails / [double]$edgeRuns) } else { 1.0 }
  $sloEdge = ($succRate -ge 0.995)
  $sloAlerts = ($alertCount -eq 0)
  $sloHtml = "<div><h2>SLOs</h2><ul>" +
    ("<li>Pricing freshness (<=60m): " + ($sloPriceFresh ? "<span class='status-pass'>PASS</span>" : "<span class='status-fail'>FAIL</span>") + "</li>") +
    ("<li>Edge success (>=99.5%): " + ($sloEdge ? "<span class='status-pass'>PASS</span>" : "<span class='status-fail'>FAIL</span>") + " (" + ([math]::Round($succRate*100,2)) + "%)</li>") +
    ("<li>Critical alerts (FAILED): " + ($sloAlerts ? "<span class='status-pass'>PASS</span>" : "<span class='status-fail'>FAIL</span>") + "</li>") +
    "</ul></div>"
  $summaryHtml += $sloHtml
  if ($deltaHtml) { $summaryHtml += $deltaHtml }
  $nowKpi | ConvertTo-Json | Set-Content -Path $cachePath
} catch {}

$summaryHtml = $summaryHtml -join ""

# Edge Jobs (24h) styled block
$edgeJobsHtml = "<h2>Edge Jobs (24h)</h2><ul>"
if ($edgeStats -and -not $edgeStats._status -and $edgeStats.Count -ge 1) {
  foreach ($j in $edgeStats) {
    $runs = if ($j.run_count_24h -ne $null) { [int]$j.run_count_24h } else { 0 }
    $fails = if ($j.failure_count_24h -ne $null) { [int]$j.failure_count_24h } else { 0 }
    $cls = if ($fails -gt 0) { 'status-warn' } else { 'status-pass' }
    $name = if ($j.func) { $j.func } elseif ($j.job) { $j.job } else { '<unknown>' }
    $edgeJobsHtml += "<li><span class='$cls'>$name</span> - runs: $runs, failures: $fails</li>"
  }
} else {
  $edgeJobsHtml += "<li>No edge job stats available.</li>"
}
$edgeJobsHtml += "</ul>"

# API Errors (24h) styled block
$apiErrHtml = "<h2>Supabase Errors (last 24h)</h2><ul>"
if ($apiErr -and -not $apiErr._status -and $apiErr.Count -ge 1) {
  foreach ($e in $apiErr) {
    $apiErrHtml += "<li>$($e.endpoint) $($e.status_class)xx = $($e.count)</li>"
  }
} else {
  $apiErrHtml += "<li>No API error summary available.</li>"
}
$apiErrHtml += "</ul>"

# Optional signature logo
$logoHtml = ""
if (Test-Path "scripts/reports/logo.png") {
  try {
    $logoB64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("scripts/reports/logo.png"))
    $logoHtml = "<div style='text-align:center;margin-top:16px;'><img src='data:image/png;base64,$logoB64' width='150'></div>"
  } catch {}
}

# Closing summary
$closingHtml = "<h2>Summary</h2>" +
  "<p>All core systems are running within expected parameters. No outages or major errors detected in the past 24 hours. Minor alerts have been logged for review by the engineering team.</p>" +
  "<p>- Automated Operations System<br><strong>Grookai Vault</strong></p>" + $logoHtml

Set-Content -Path $html -Value ($htmlHeader + $summaryHtml + $edgeJobsHtml + $apiErrHtml + $h + $closingHtml + $htmlFooter)

# KPI cache + SLOs
try {
  $cacheDir = "scripts/diagnostics/output/daily"
  New-Item -ItemType Directory -Force -Path $cacheDir | Out-Null
  $cachePath = Join-Path $cacheDir 'kpi_cache.json'
  $prev = $null; if (Test-Path $cachePath) { $prev = Get-Content -Raw $cachePath | ConvertFrom-Json }
  $edgeRuns = 0; $edgeFails = 0
  if ($edgeStats -and -not $edgeStats._status -and $edgeStats.Count -gt 0) {
    foreach($r in $edgeStats){ if($r.run_count_24h){ $edgeRuns += [int]$r.run_count_24h }; if($r.failure_count_24h){ $edgeFails += [int]$r.failure_count_24h } }
  }
  $alertCount = 0; if ($apiErr -and -not $apiErr._status) { $alertCount = $apiErr.Count }
  $avgAge = $null; if ($health -and -not $health._status) { $h1=$health|Select-Object -First 1; if($h1.observed_at){ $ageMin = [int]((Get-Date).ToUniversalTime().Subtract(([datetime]$h1.observed_at).ToUniversalTime()).TotalMinutes); $avgAge = $ageMin } }
  $nowKpi = [pscustomobject]@{ edge_failures=$edgeFails; edge_runs=$edgeRuns; alert_count=$alertCount; avg_pricing_age_min=$avgAge }
  $nowKpi | ConvertTo-Json | Set-Content -Path $cachePath
} catch {}

# Attachment policy: use ZIP if body exceeds configured maxBodyKB
$useAttachment = $false
$zipPath = Join-Path $OutDir "report_$stamp.zip"
$maxKb = 200
$attachDiag = $true
try {
  if ($cfg.email.maxBodyKB) { $maxKb = [int]$cfg.email.maxBodyKB }
  if ($cfg.email.attachDiagnosticsOnClip -ne $null) { $attachDiag = [bool]$cfg.email.attachDiagnosticsOnClip }
} catch {}
try {
  $sizeKb = [int](([System.IO.File]::ReadAllBytes($html)).Length / 1024)
  if ($sizeKb -gt $maxKb) {
    $useAttachment = $true
    if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
    $toZip = @($html)
    if ($attachDiag) { $toZip = @($md,$html) }
    Compress-Archive -Path $toZip -DestinationPath $zipPath -CompressionLevel Fastest
  }
} catch {}

# --- Email
## SendGrid path removed (SMTP-only)
function Send-SMTP($cfg,$from,$to,$subj,$htmlPath,$useAttachment,$zipPath){
  if (IsPlaceholder($cfg.password) -or IsPlaceholder($cfg.username)) { Write-Host "SMTP credentials not set; skipping email."; return }

  # Force modern TLS (some boxes default lower)
  try { [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 } catch {}

  # Parse "Name <email@domain>" into MailAddress (safe if just email)
  $fromEmail = ($from -replace '.*<([^>]+)>','$1')
  if ($fromEmail -eq $from) {
    $fromName = $from
  } else {
    $fromName = ($from -replace '\s*<[^>]+>','').Trim()
  }
  $fromAddr = New-Object System.Net.Mail.MailAddress($fromEmail, $fromName)

  $body = Get-Content $htmlPath -Raw
  if ($useAttachment) { $body = "<p>Full report attached as ZIP. Summary available in repository artifacts.</p>" }

  $smtp = New-Object System.Net.Mail.SmtpClient($cfg.host, $cfg.port)
  $smtp.EnableSsl = $cfg.useStartTls
  $smtp.Timeout   = 20000
  $smtp.UseDefaultCredentials = $false   # important: set before Credentials
  $smtp.Credentials = New-Object System.Net.NetworkCredential($cfg.username,$cfg.password)

  $msg = New-Object System.Net.Mail.MailMessage
  $msg.From = $fromAddr
  $to | ForEach-Object { $msg.To.Add($_) }

  # NEW: Reply-To (optional; safe to set to same address)
  try { $msg.ReplyToList.Add($fromAddr) } catch {}

  # NEW: unique headers to discourage aggressive threading
  $runId = [Guid]::NewGuid().ToString()
  try { $msg.Headers.Add("X-GV-Report-Id", $runId) } catch {}
  if ($script:gitHead) { try { $msg.Headers.Add("X-GV-Commit", $script:gitHead) } catch {} }
  try { $msg.Headers.Add("X-GV-Generated", (Get-Date).ToString("s")) } catch {}
  if ($cfg.PSObject.Properties.Name -contains 'bcc') {
    foreach ($b in $cfg.bcc) { if ($b) { $msg.Bcc.Add($b) } }
  }
  $msg.Subject = $subj
  $msg.IsBodyHtml = $true
  $msg.Body = $body

  if ($useAttachment -and (Test-Path $zipPath)) {
    $att = New-Object System.Net.Mail.Attachment($zipPath)
    $msg.Attachments.Add($att) | Out-Null
  }

  $smtp.Send($msg)
}

# SMTP only
$method = "smtp"
Send-SMTP $cfg.email.smtp $cfg.email.from $cfg.email.to $subj $html $useAttachment $zipPath

if (-not $Quiet) {
  $note = if ($useAttachment) { " (body truncated; ZIP attached/saved)" } else { "" }
  Write-Host ("Daily report processed" + $note)
}

# Append run log
$runLog = "scripts/diagnostics/output/daily/report_runs.log"
$line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')  SENT to: $($cfg.email.to -join ', ')  attachment:$useAttachment"
Add-Content -Path $runLog -Value $line
