Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Push-Location "C:\grookai_vault"

function Get-LastHeader {
  param([string]$Text,[string]$Prefix)
  $idx = $Text.LastIndexOf($Prefix)
  if ($idx -lt 0) { return $null }
  $after = $Text.Substring($idx)
  ($after -split "(`r`n|`n)")[0]  # first line only
}

$queue = ".codex\queue.md"
$lastTask = $null
$lastDone = $null
if (Test-Path $queue) {
  $q = Get-Content $queue -Raw
  $lastTask = Get-LastHeader -Text $q -Prefix "### TASK:"
  $lastDone = Get-LastHeader -Text $q -Prefix "### DONE:"
}

# Git info (safe/read-only)
$branch = (git rev-parse --abbrev-ref HEAD) 2>$null
$commit = (git log -1 --pretty="%h %ad — %s" --date=iso) 2>$null
$dirty  = (git status --porcelain) 2>$null

# Pretty print
"===== BRIDGE STATUS ====="
"Queue file: $queue"
"Last TASK: " + ($(if ($lastTask) { $lastTask } else { "(none found)" }))
"Last DONE: " + ($(if ($lastDone) { $lastDone } else { "(none found)" }))
""
"Git:"
"  Branch: " + ($(if ($branch) { $branch } else { "(unknown)" }))
"  Last commit: " + ($(if ($commit) { $commit } else { "(no commits?)" }))
"  Working tree: " + ($(if ($dirty) { "changes present" } else { "clean" }))
if ($dirty) {
  ""
  "Uncommitted changes:"
  $dirty
}
""
"Hints:"
"- Add a new task at the bottom of .codex/queue.md (### TASK: …)."
"- Dispatch with your bridge or mark the last block as ### DONE: when finished."
""
"BRIDGE_STATUS_OK"

Pop-Location
