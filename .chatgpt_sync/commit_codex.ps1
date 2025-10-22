param(
  [Parameter(Mandatory=$false)][string]$Message = "chore(codex): apply edits"
)

# Safety checks
$inside = (& git rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -ne 0) { Write-Error "Not a Git repo. Run 'git init' first."; exit 1 }

# 1) Stage all changes
& git add -A

# 2) Update CHANGELOG and create snapshot
& ".chatgpt_sync\update_log.ps1" -VerboseLog
& ".chatgpt_sync\snapshot.ps1"

# 3) Capture latest snapshot info for traceability
$latest = Get-ChildItem snapshots\lib_*.zip -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Desc | Select-Object -First 1
$append = ""
if ($latest) {
  $sha = (Get-FileHash $latest.FullName -Algorithm SHA256).Hash.Substring(0,12)
  $append = " [snap: $($latest.Name), sha256:$sha]"
}

# 4) Commit
& git commit -m ($Message + $append)

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Committed: $Message$append"
} else {
  Write-Warning "Nothing to commit (working tree clean)."
}
