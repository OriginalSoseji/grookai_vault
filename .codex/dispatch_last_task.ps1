Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Paths
$queuePath = ".\.codex\queue.md"
$outDir    = ".\.codex"
$outScript = Join-Path $outDir "last_task.ps1"

function Fail([string]$msg, [int]$code = 1) {
  Write-Host $msg -ForegroundColor Red
  exit $code
}

# 0) Ensure queue.md exists
if (-not (Test-Path $queuePath)) { Fail "[dispatch] Error: $queuePath not found." 2 }

# 1) Read queue as Markdown
$text = Get-Content $queuePath -Raw
if ([string]::IsNullOrWhiteSpace($text)) { Fail "[dispatch] Error: queue is empty." 3 }

$lines = $text -split "`r?`n"

# 2) Find last "### TASK:" heading
$taskLineIdxs = @()
for ($i = 0; $i -lt $lines.Length; $i++) {
  $t = $lines[$i].TrimStart()
  if ($t.StartsWith('### TASK:')) { $taskLineIdxs += $i }
}
if ($taskLineIdxs.Count -eq 0) { Fail "[dispatch] Error: No '### TASK:' headings found in queue." 4 }
$startIdx = $taskLineIdxs[-1]

# 3) Extract the last task block (from startIdx to end)
$blockLines = $lines[$startIdx..($lines.Length - 1)]
if (-not $blockLines -or $blockLines.Count -eq 0) { Fail "[dispatch] Error: Last TASK block is empty." 5 }

# 4) Derive the task title from the heading line
$heading = $lines[$startIdx].Trim()
$title = $heading
if ($heading -like '### TASK:*') {
  $title = ($heading -replace '^###\s*TASK:\s*', '')
}

# 5) Parse fenced powershell code blocks ```powershell ... ```
$blocks = New-Object System.Collections.Generic.List[string]
$inPs = $false
$current = New-Object System.Collections.Generic.List[string]
foreach ($ln in $blockLines) {
  $trim = $ln.Trim()
  if (-not $inPs) {
    if ($trim -match '^```\s*powershell\s*$') {
      $inPs = $true
      $current = New-Object System.Collections.Generic.List[string]
    }
    continue
  } else {
    if ($trim -match '^```\s*$') {
      # close block
      $blocks.Add(($current -join "`n"))
      $inPs = $false
      continue
    }
    $current.Add($ln)
  }
}

if ($blocks.Count -eq 0) { Fail "[dispatch] Error: No ```powershell``` blocks found in last TASK." 6 }

# 6) Concatenate blocks into one script
$scriptText = ($blocks -join "`n`n") + "`n"

# 7) Write out and execute
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Set-Content -Path $outScript -Value $scriptText -Encoding UTF8

Write-Host ("[dispatch] Running TASK: {0}" -f $title) -ForegroundColor Cyan

& pwsh -NoProfile -File $outScript
$code = $LASTEXITCODE
Write-Host ("[dispatch] TASK completed with exit code {0}" -f $code) -ForegroundColor Yellow
exit $code

