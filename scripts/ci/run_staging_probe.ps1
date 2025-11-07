#Requires -Version 5.1
param(
  [string]$StagingRest = $env:GV_STAGING_REST,
  [string]$StagingAnon = $env:GV_STAGING_ANON
)

$ErrorActionPreference = 'Stop'

function Fail($msg) { Write-Error $msg; exit 1 }
function Read-Secret([string]$prompt) {
  $sec = Read-Host -AsSecureString -Prompt $prompt
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

# 0) Repo root
Set-Location -Path "C:\grookai_vault"

# 1) gh auth check
try {
  $auth = (gh auth status) 2>&1
} catch {
  Fail "GitHub CLI is not authenticated. Run 'gh auth login' and retry."
}
if ($auth -match 'not logged into') { Fail "GitHub CLI not logged in. Run 'gh auth login'." }

# 2) Collect inputs
if ([string]::IsNullOrWhiteSpace($StagingRest)) {
  $StagingRest = Read-Host "Enter STAGING_REST (e.g., https://<staging-ref>.supabase.co/rest/v1)"
}
if ([string]::IsNullOrWhiteSpace($StagingAnon)) {
  $StagingAnon = Read-Secret "Paste STAGING_ANON (publishable anon key from STAGING project)"
}

if ($StagingRest -notmatch '^https://[a-z0-9]{20}\.supabase\.co/rest/v1$') {
  Write-Warning "STAGING_REST looks unusual. Expected 'https://<ref>.supabase.co/rest/v1'."
}

# 3) Set secrets (no echo of anon)
Write-Host "Setting GitHub secrets…"
gh secret set STAGING_REST --body "$StagingRest" | Out-Null
gh secret set STAGING_ANON --body "$StagingAnon" | Out-Null
Write-Host "Secrets set."

# 4) Trigger workflow
Write-Host "Triggering workflow: staging-probe.yml"
gh workflow run staging-probe.yml | Out-Null

# 5) Resolve latest run ID for this workflow
Start-Sleep -Seconds 2
$runJson = gh run list --workflow staging-probe.yml --limit 1 --json databaseId,status,headSha | ConvertFrom-Json
if (-not $runJson -or -not $runJson[0].databaseId) { Fail "Could not find a recent run for staging-probe.yml. Is the workflow on the default branch?" }
$runId = $runJson[0].databaseId

# 6) Wait for completion
gh run watch $runId --exit-status

# 7) Fetch logs
$log = gh run view $runId --log | Out-String
if (-not $log) { Fail "No logs returned for run $runId." }

# 8) Parse HTTP codes
$rpc  = ($log -split "`r?`n" | Where-Object { $_ -match '^RPC:\s*HTTP\s+(\d+)' }) | ForEach-Object {
  if ($_ -match '^RPC:\s*HTTP\s+(\d+)') { $matches[1] }
} | Select-Object -First 1

$view = ($log -split "`r?`n" | Where-Object { $_ -match '^VIEW:\s*HTTP\s+(\d+)' }) | ForEach-Object {
  if ($_ -match '^VIEW:\s*HTTP\s+(\d+)') { $matches[1] }
} | Select-Object -First 1

if (-not $rpc)  { $rpc  = "NA" }
if (-not $view) { $view = "NA" }

# 9) Write report
$ts   = Get-Date -Format 'yyyyMMdd_HHmmss'
$dir  = Join-Path -Path "reports" -ChildPath ("staging_scan_{0}" -f $ts)
New-Item -ItemType Directory -Path $dir -Force | Out-Null

Set-Content -Path (Join-Path $dir 'rpc.status.txt')  -Value $rpc  -Encoding UTF8
Set-Content -Path (Join-Path $dir 'view.status.txt') -Value $view -Encoding UTF8
Set-Content -Path (Join-Path $dir 'full.log')        -Value $log  -Encoding UTF8

Write-Host ("Staging Probe → RPC: {0}, VIEW: {1}. Saved to {2}" -f $rpc, $view, $dir)

# 10) Helpful exit code hint (treat non-200 as warn, but not fatal)
if ($rpc -ne '200' -or $view -ne '200') {
  Write-Warning "Non-200 detected. If 401 → key/ref mismatch. If 403 → RLS/policy. Check $($dir)\full.log."
}

# End of script

