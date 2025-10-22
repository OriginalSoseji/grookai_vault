param(
  [string]$Branch = "chore/remove-edge-stubs-and-secure-ai"
)

$ErrorActionPreference = "Stop"
Set-Location "C:\grookai_vault"

# 0) Branch
git rev-parse --abbrev-ref HEAD | Out-Null
git checkout -b $Branch

# 1) Archive folder
$arch = "supabase\functions\_archive\$(Get-Date -Format 'yyyyMMdd_HHmm')"
New-Item -ItemType Directory -Path $arch -Force | Out-Null

# 2) Move the five functions to archive (ignore if already moved)
$moveTargets = @(
  "supabase\functions\import-prices-sep6",
  "supabase\functions\import-set",
  "supabase\functions\import-card",
  "supabase\functions\ai-assist",
  "supabase\functions\price-cron"
)

foreach ($src in $moveTargets) {
  if (Test-Path $src) {
    $dst = Join-Path $arch (Split-Path $src -Leaf)
    git mv $src $dst
  }
}

# 3) Disable schedules/workflows if present
# Comment out schedule lines in any archived config.toml files
Get-ChildItem "$arch" -Recurse -Filter "config.toml" -ErrorAction SilentlyContinue | ForEach-Object {
  (Get-Content $_.FullName) `
    -replace '^(schedule\s*=\s*".*")','; $0 (archived)' |
    Set-Content $_.FullName
}

# Move any dedicated workflows to the archive (suffix .archived)
$wf = ".github\workflows"
if (Test-Path $wf) {
  $wfArch = Join-Path $arch "workflows"
  New-Item -ItemType Directory -Path $wfArch -Force | Out-Null
  Get-ChildItem $wf -Filter "*price-cron*.yml" -ErrorAction SilentlyContinue | ForEach-Object {
    git mv $_.FullName (Join-Path $wfArch ($_.Name + ".archived"))
  }
  Get-ChildItem $wf -Filter "*import-prices-sep6*.yml" -ErrorAction SilentlyContinue | ForEach-Object {
    git mv $_.FullName (Join-Path $wfArch ($_.Name + ".archived"))
  }
}

# 4) Quick parity note (no code changes needed here—importers are internal)

# 5) Repo-wide reference check
$targets = @('import-prices-sep6','import-set','import-card','ai-assist','price-cron')
$paths   = @('lib','tools','.github','supabase')
$hits = Select-String -Path $paths -Pattern ($targets -join '|') -ErrorAction SilentlyContinue

"--- Reference check (should be empty or only in _archive/):"
if ($hits) {
  $hits | Where-Object { $_.Path -notmatch '\\_archive\\' } |
    Format-Table Path,LineNumber,Line -AutoSize
} else {
  "No references found."
}

"`n--- Done. Review the 'Reference check' above. If clean:"
"   git add -A"
"   git commit -m \"chore(edge): remove unused/stub functions (archived); keep 9; secure configs\""
"   git push -u origin $Branch"

