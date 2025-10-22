param(
  [string]$ProjectRoot = "C:\grookai_vault"
)

$ErrorActionPreference = 'Continue'

Set-Location $ProjectRoot
$ReportsDir = Join-Path $ProjectRoot ".reports"
if (-not (Test-Path $ReportsDir)) { New-Item -ItemType Directory -Path $ReportsDir | Out-Null }

$out1 = Join-Path $ReportsDir "lazy_app_init_scan.txt"
$out2 = Join-Path $ReportsDir "lazy_env_refs.txt"
$out3 = Join-Path $ReportsDir "lazy_main_context.txt"
$out4 = Join-Path $ReportsDir "lazy_hardcoded_urls.txt"

"# Step 1: Dart init sites" | Set-Content -Path $out1
try {
  Get-ChildItem -Path (Join-Path $ProjectRoot 'lib') -Recurse -Include *.dart -File |
    Select-String -Pattern '(Supabase\.initialize|SupabaseFlutter\.initialize|Supabase\.instance|createClient|supabase_url|SUPABASE_URL|anon_key|SUPABASE_ANON_KEY)' -Context 0,2 |
    ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, ($_.Line.Trim()) } |
    Select-Object -First 80 | Add-Content -Path $out1
} catch { "(error during step 1) $_" | Add-Content -Path $out1 }

"# Step 2: .env references" | Set-Content -Path $out2
try {
  Get-ChildItem -Path $ProjectRoot -Recurse -File -Include ".env","*.env","*.env.*" -ErrorAction SilentlyContinue |
    ForEach-Object { $_.FullName } | Add-Content -Path $out2
} catch { "(error during step 2) $_" | Add-Content -Path $out2 }

"# Step 3: main.dart init context" | Set-Content -Path $out3
try {
  $main = Join-Path $ProjectRoot 'lib\main.dart'
  if (Test-Path $main) {
    $hit = Select-String -Path $main -Pattern '(Supabase\.initialize|SupabaseFlutter\.initialize|createClient)' -SimpleMatch -Context 20,20 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($hit) {
      "----- lib/main.dart (context) -----" | Add-Content -Path $out3
      $hit.Context.PreContext | Add-Content -Path $out3
      $hit.Line | Add-Content -Path $out3
      $hit.Context.PostContext | Add-Content -Path $out3
    } else {
      "No Supabase init call found in lib/main.dart" | Add-Content -Path $out3
    }
  } else {
    "lib/main.dart not found" | Add-Content -Path $out3
  }
} catch { "(error during step 3) $_" | Add-Content -Path $out3 }

"# Step 4: Hardcoded supabase.co URLs in Dart" | Set-Content -Path $out4
try {
  Get-ChildItem -Path (Join-Path $ProjectRoot 'lib') -Recurse -Include *.dart -File |
    Select-String -Pattern 'https?://[^\"\']*supabase\.co' |
    Select-Object -First 20 |
    ForEach-Object { "{0}:{1}: {2}" -f $_.Path, $_.LineNumber, ($_.Line.Trim()) } |
    Add-Content -Path $out4
} catch { "(error during step 4) $_" | Add-Content -Path $out4 }

Write-Host "Outputs:"
Write-Host " - $out1"
Write-Host " - $out2"
Write-Host " - $out3"
Write-Host " - $out4"
