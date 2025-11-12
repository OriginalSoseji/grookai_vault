param(
  [ValidateSet('dispatch','bump')]
  [string]$TriggerMode = 'dispatch'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Set-Location C:\grookai_vault

$script:__align_stashed = $false

# Paths
$WF_PATH = '.github/workflows/kick-auto-align-bridge.yml'
$PROOF_SIX = 'reports/ci_logs/latest/sixline.txt'
$PROOF_ATT = 'reports/ci_logs/latest/attempts.txt'

function Assert-Preflight {
  # gh exists and authenticated
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'GitHub CLI (gh) not found in PATH.' }
  try { gh --version | Out-Null } catch { throw 'Failed to execute gh --version.' }
  try { gh auth status | Out-Null } catch { throw 'gh not authenticated for this repo (gh auth login).' }

  # git repo and status
  if (-not (git rev-parse --is-inside-work-tree 2>$null)) { throw 'Not inside a git repository.' }
  $gstat = (git status --porcelain)
  $dirty = if ($null -ne $gstat) { ("" + ($gstat -join "")).Trim().Length -gt 0 } else { $false }
  if ($dirty) { Write-Host 'Note: working tree dirty; will autostash during pulls.' -ForegroundColor Yellow }

  # workflow exists
  if (-not (Test-Path $WF_PATH)) { throw "Workflow file missing: $WF_PATH" }

  # ensure proofs are not ignored by git
  $ignored = (git check-ignore -v -- $PROOF_SIX, $PROOF_ATT 2>$null)
  if ($ignored) {
    Write-Host 'reports/** appears ignored by .gitignore. Adding unignore rules.' -ForegroundColor Yellow
    $gi = '.gitignore'
    $txt = if (Test-Path $gi) { Get-Content $gi -Raw } else { '' }
    if ($txt -notmatch '(?m)^!reports/\*\*\s*$') {
      "`n# allow CI proofs`n!reports/`n!reports/**`n" | Add-Content $gi -Encoding UTF8
      git add $gi | Out-Null
      git commit -m 'ci(auto): unignore reports/** for CI proofs' 2>$null | Out-Null
      try { git push | Out-Null } catch {}
    }
  }
}

function Invoke-GitPullSafe {
  param([string]$stashNote = 'auto: align_until_proofs')
  try { git pull --rebase --autostash | Out-Null }
  catch {
    git stash push -u -m ("{0} {1}" -f $stashNote, (Get-Date -Format o)) | Out-Null
    $script:__align_stashed = $true
    git pull --rebase | Out-Null
  }
}

function Get-LatestRunId {
  return (gh run list --workflow $WF_PATH --limit 1 --json databaseId --jq '.[0].databaseId' 2>$null).Trim()
}

function Trigger-Dispatch {
  # Run and treat any non-zero exit or 422 message as failure
  $out = & gh workflow run $WF_PATH 2>&1
  $rc = $LASTEXITCODE
  if ($rc -ne 0 -or ($out -match 'HTTP 422' -or $out -match "does not have 'workflow_dispatch'")) {
    throw "dispatch_failed(rc=$rc): $out"
  }
}

function Trigger-Bump {
  & scripts/ci/bump_auto_align.ps1 | Out-Null
}

function Have-Proofs { return (Test-Path $PROOF_SIX) -and (Test-Path $PROOF_ATT) }

function Print-Proofs {
  Write-Host (Get-Content $PROOF_SIX -Raw)
  Write-Host (Get-Content $PROOF_ATT -Raw)
}

Assert-Preflight

# Fast exit if proofs already exist
if (Have-Proofs) {
  Write-Host 'Proofs already exist locally. Showing and exiting.' -ForegroundColor Green
  Print-Proofs
  exit 0
}

function Invoke-AlignCycle {
  param([int]$RunCount = 1, [string]$Mode)

  Write-Host ("`n=== Cycle {0} starting (mode={1}) ===" -f $RunCount, $Mode) -ForegroundColor Cyan

  try {
    $usedMode = $Mode
    try {
      if ($Mode -eq 'dispatch') { Trigger-Dispatch }
      else { Trigger-Bump }
    } catch {
      $msg = $_.Exception.Message
      if ($Mode -eq 'dispatch' -and (
            $msg -match '404' -or $msg -match 'Unauthorized' -or $msg -match 'Not Found' -or $msg -match '422' -or $msg -match 'dispatch_failed')) {
        Write-Host 'Dispatch failed; falling back to bump trigger.' -ForegroundColor Yellow
        $usedMode = 'bump'
        Trigger-Bump
      } else { throw }
    }

    # Wait for a new/latest run id
    $rid = $null
    for ($i = 0; $i -lt 30; $i++) {
      $rid = Get-LatestRunId
      if ($rid) { break }
      Start-Sleep -Seconds 10
    }
    if (-not $rid) {
      if ($usedMode -eq 'dispatch') {
        Write-Host 'No run found after dispatch; switching to bump.' -ForegroundColor Yellow
        return Invoke-AlignCycle -RunCount $RunCount -Mode 'bump'
      }
      throw 'No run found for workflow.'
    }

    # Poll run until completion, emitting single-line status
    while ($true) {
      $o = gh api repos/:owner/:repo/actions/runs/$rid --jq '{status:.status, conclusion:.conclusion}' | ConvertFrom-Json
      $haveSix = Test-Path $PROOF_SIX
      $haveAtt = Test-Path $PROOF_ATT
      $ts = Get-Date -Format s
      Write-Host ("[{0}] Run={1} Status={2} Proofs=({3}/{4})" -f $ts, $rid, $o.status, $haveSix, $haveAtt)
      if ($o.status -eq 'completed') { break }
      Start-Sleep -Seconds 10
    }

    # Pull and check proofs
    Invoke-GitPullSafe -stashNote "auto: align_until_proofs cycle=$RunCount"
    if (Have-Proofs) {
      Write-Host "`n=== Proofs found successfully ===" -ForegroundColor Green
      Print-Proofs
      return $true
    }

    # Fallback: download artifact from this run if proofs not committed
    try {
      Write-Host 'Proofs not in git; attempting artifact download...' -ForegroundColor Yellow
      $proofDir = (Split-Path $PROOF_SIX)
      New-Item -ItemType Directory -Force -Path $proofDir | Out-Null
      gh run download $rid -n import-prices-auto-validate -D $proofDir 2>$null | Out-Null
      $sixAlt = Get-ChildItem -Path $proofDir -Recurse -Filter 'sixline.txt' -File -ErrorAction SilentlyContinue | Select-Object -First 1
      $attAlt = Get-ChildItem -Path $proofDir -Recurse -Filter 'attempts.txt' -File -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($sixAlt -and -not (Test-Path $PROOF_SIX)) { Copy-Item $sixAlt.FullName $PROOF_SIX -Force }
      if ($attAlt -and -not (Test-Path $PROOF_ATT)) { Copy-Item $attAlt.FullName $PROOF_ATT -Force }
    } catch { Write-Host 'Artifact download attempt failed.' -ForegroundColor Yellow }

    if (Have-Proofs) {
      Write-Host "`n=== Proofs found via artifact ===" -ForegroundColor Green
      Print-Proofs
      return $true
    }

    Write-Host "`nProofs missing — retrying in 60 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
    return $false
  }
  catch {
    Write-Host ("Error during cycle {0}: {1}" -f $RunCount, $_.Exception.Message) -ForegroundColor Red
    Start-Sleep -Seconds 60
    return $false
  }
}

$cycle = 1
while ($true) {
  $ok = Invoke-AlignCycle -RunCount $cycle -Mode $TriggerMode
  if ($ok) { Write-Host "`nAll proofs exist — stopping loop." -ForegroundColor Green; break }
  $cycle++
}

if ($script:__align_stashed) {
  try { git stash pop | Out-Null } catch { Write-Host 'Note: kept stash due to conflicts.' -ForegroundColor Yellow }
}



