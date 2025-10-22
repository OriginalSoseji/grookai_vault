param(
  [string]$ProjectRoot = "C:\grookai_vault"
)

$ErrorActionPreference = 'Continue'

function New-DirIfMissing($p) { if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p | Out-Null } }

$ReportsDir = Join-Path $ProjectRoot ".reports"
$ToolsDir   = Join-Path $ProjectRoot "tools"
New-DirIfMissing $ReportsDir
New-DirIfMissing $ToolsDir

Set-Location $ProjectRoot

# 1) Repo scan (code/config)
$paths = [ordered]@{
  configToml   = (Join-Path $ProjectRoot "supabase\config.toml")
  migrations   = (Join-Path $ProjectRoot "supabase\migrations")
  seedSql      = (Join-Path $ProjectRoot "supabase\seed.sql")
  seedDir      = (Join-Path $ProjectRoot "supabase\seed")
  lazyScript   = (Join-Path $ProjectRoot "tools\Check-LazyDatabase.ps1")
  tasksJson    = (Join-Path $ProjectRoot ".vscode\tasks.json")
}

$exist = @{}
foreach ($k in $paths.Keys) { $exist[$k] = (Test-Path $paths[$k]) }

$MigrationFileCount = 0
$RecentMigrations = @()
if ($exist.migrations) {
  $migFiles = Get-ChildItem -Path $paths.migrations -Filter *.sql -File -ErrorAction SilentlyContinue | Sort-Object Name
  $MigrationFileCount = $migFiles.Count
  $RecentMigrations   = $migFiles | Select-Object -Last 3 | ForEach-Object { $_.Name }
}

$Tasks = @()
if ($exist.tasksJson) {
  try {
    $json = Get-Content $paths.tasksJson -Raw | ConvertFrom-Json
    if ($json.tasks) {
      $Tasks = $json.tasks | ForEach-Object {
        [ordered]@{
          label   = $_.label
          command = $_.command
        }
      }
    }
  } catch {}
}

# Code search for “lazy/supabase”
$CodeMentions = @()
try {
  # prefer rg if available
  $rg = Get-Command rg -ErrorAction SilentlyContinue
  if ($rg) {
    $rgOut = rg -n --hidden -S -g "!**/.git/**" "(?i)\b(lazy|supabase|migrations|supabase_url|anon_key)\b" $ProjectRoot 2>&1
    $CodeMentions = ($rgOut -split "`r?`n") | Select-Object -First 40
  } else {
    # Fallback: recursive search across common text files
    try {
      $patterns = @("*.dart","*.ps1","*.psm1","*.json","*.toml","*.sql","*.md",".env",".env.*")
      $files = @()
      foreach ($pat in $patterns) {
        $files += Get-ChildItem -Path $ProjectRoot -Recurse -File -Filter $pat -ErrorAction SilentlyContinue
      }
      $files = $files | Where-Object { $_.FullName -notmatch "\\.git(\\|$)" }

      $results = @()
      foreach ($file in $files) {
        $matches = Select-String -Path $file.FullName -Pattern '(?i)\b(lazy|supabase|migrations|supabase_url|anon_key)\b' -ErrorAction SilentlyContinue | Select-Object -First 2
        foreach ($m in $matches) {
          $results += "$($m.Path):$($m.LineNumber): $($m.Line.Trim())"
        }
        if ($results.Count -ge 40) { break }
      }
      $CodeMentions = $results | Select-Object -First 40
    } catch {}
  }
} catch {}

# 2) Supabase CLI
$SupabaseInstalled = $false
$SupabaseVersion   = $null
try {
  $cmd = Get-Command supabase -ErrorAction SilentlyContinue
  if ($cmd) {
    $SupabaseInstalled = $true
    $SupabaseVersion = (supabase --version 2>&1 | Out-String).Trim()
  }
} catch {}

# 3) Link status
$LinkStatus = ""
try { $LinkStatus = supabase link status 2>&1 | Out-String } catch { $LinkStatus = $_ | Out-String }

# 4) Service status
$StatusOut = ""
try { $StatusOut = supabase status 2>&1 | Out-String } catch { $StatusOut = $_ | Out-String }
$PostgresRunning = $false
if ($StatusOut -match "(?im)Postgres:\s+running") { $PostgresRunning = $true }

# 5) Migration list
$MigListOut   = ""
$AppliedCount = $null
$PendingCount = $null
try {
  $MigListOut = supabase migration list 2>&1 | Out-String
  if ($MigListOut -match "(?im)Applied:\s*(\d+)") { $AppliedCount = [int]$Matches[1] }
  if ($MigListOut -match "(?im)Pending:\s*(\d+)") { $PendingCount = [int]$Matches[1] }
} catch { $MigListOut = $_ | Out-String }

# 6) Schema diff (safe)
$IsSynced = $false
$DiffOut  = ""
$DiffFile = Join-Path $ReportsDir "lazydb.diff.sql"
# Link check guard
$IsLinked = $true
try { if ($LinkStatus -match "(?i)not linked|run\s+supabase\s+link|No project linked") { $IsLinked = $false } } catch { $IsLinked = $false }

if (-not $IsLinked) {
  $IsSynced = $false
  $DiffOut  = "(Skipped schema diff: no linked remote project detected. Run `supabase link` to enable.)"
} else {
  try {
  $DiffOut = supabase db diff --linked --use-migra --schema public 2>&1 | Out-String
  if ($DiffOut -match "(?i)No differences found|No changes") {
    $IsSynced = $true
  } else {
    $IsSynced = $false
    if ($DiffOut.Trim().Length -gt 0) {
      $DiffOut | Set-Content -Path $DiffFile -Encoding UTF8
    }
  }
} catch { $DiffOut = $_ | Out-String }
}

# Compose report
$ReportPath = Join-Path $ReportsDir "lazy_audit.md"
$JsonPath   = Join-Path $ReportsDir "lazy_audit.json"

$md = @()
$md += "# Grookai Vault - Lazy DB Audit"
$md += ""
$md += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$md += ""
$md += "## Files & Folders"
$md += "- supabase\\config.toml: " + ($(if ($exist.configToml) {"✅"} else {"❌"}))
$md += "- supabase\\migrations: " + ($(if ($exist.migrations) {"✅"} else {"❌"})) + " (files: $MigrationFileCount)"
$md += "- supabase\\seed.sql: " + ($(if ($exist.seedSql) {"✅"} else {"❌"}))
$md += "- supabase\\seed\\: " + ($(if ($exist.seedDir) {"✅"} else {"❌"}))
$md += "- tools\\Check-LazyDatabase.ps1: " + ($(if ($exist.lazyScript) {"✅"} else {"❌"}))
$md += "- .vscode\\tasks.json: " + ($(if ($exist.tasksJson) {"✅"} else {"❌"}))
$md += ""
if ($RecentMigrations.Count -gt 0) {
  $md += "Recent migrations:"
  foreach ($m in $RecentMigrations) { $md += "  - $m" }
  $md += ""
}
if ($Tasks.Count -gt 0) {
  $md += "Tasks referencing Supabase/Grookai:"
  foreach ($t in $Tasks) { $md += "  - **$($t.label)** - $($t.command)" }
  $md += ""
}

$md += "## Code mentions (sample)"
if ($CodeMentions.Count -gt 0) {
  $CodeMentions | Select-Object -First 20 | ForEach-Object { $md += "- $_" }
} else {
  $md += "- (no matches sampled)"
}
$md += ""

$md += "## Supabase CLI"
$md += "- Installed: " + ($(if ($SupabaseInstalled) {"✅"} else {"❌"}))
if ($SupabaseVersion) { $md += "- Version: $SupabaseVersion" }
$md += ""

$md += "## Link Status"
$md += "~~~"
$md += ($LinkStatus.Trim())
$md += "~~~"
$md += ""

$md += "## Local Service Status"
$md += "- Postgres running: " + ($(if ($PostgresRunning) {"✅"} else {"❌"}))
$md += "~~~"
$md += ($StatusOut.Trim())
$md += "~~~"
$md += ""

$md += "## Migration Status"
if ($AppliedCount -ne $null -and $PendingCount -ne $null) {
  $md += "- Applied: **$AppliedCount**"
  $md += "- Pending: **$PendingCount**"
} else {
  $md += "- (Could not parse counts; raw output below)"
}
$md += "~~~"
$md += ($MigListOut.Trim())
$md += "~~~"
$md += ""

$md += "## Schema Diff vs Linked Remote"
$md += "- In sync: " + ($(if ($IsSynced) {"✅ Yes"} else {"❌ No"}))
if (-not $IsSynced -and (Test-Path $DiffFile)) {
  $md += "- Full diff saved to: $DiffFile" 
}
$md += "~~~"
$md += ($DiffOut.Trim())
$md += "~~~"
$md += ""

$md += "## Bottom Line"
if ($SupabaseInstalled -and $PostgresRunning -and ($PendingCount -eq 0) -and $IsSynced) {
  $md += "✅ **Your Lazy DB looks complete and in sync.**"
} else {
  $md += "⚠️ **Lazy DB may be incomplete or out of sync.** See details above."
}
$md += ""
$md -join "`r`n" | Set-Content -Path $ReportPath -Encoding UTF8

# JSON summary
$summary = [ordered]@{
  timestamp          = (Get-Date).ToString("s")
  projectRoot        = $ProjectRoot
  files = $exist
  migrationFileCount = $MigrationFileCount
  recentMigrations   = $RecentMigrations
  tasks              = $Tasks
  supabaseInstalled  = $SupabaseInstalled
  supabaseVersion    = $SupabaseVersion
  linkStatusRaw      = $LinkStatus
  statusRaw          = $StatusOut
  postgresRunning    = $PostgresRunning
  migListRaw         = $MigListOut
  appliedCount       = $AppliedCount
  pendingCount       = $PendingCount
  isSyncedWithRemote = $IsSynced
  diffSaved          = (Test-Path $DiffFile)
  diffFile           = (if (Test-Path $DiffFile) { $DiffFile } else { $null })
  codeMentions       = $CodeMentions
}
$summary | ConvertTo-Json -Depth 5 | Set-Content -Path $JsonPath -Encoding UTF8

Write-Host "Audit complete:"
Write-Host " - $ReportPath"
Write-Host " - $JsonPath"
exit 0
