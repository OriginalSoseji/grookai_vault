param([string]$ProjectRoot="C:\grookai_vault")
$ErrorActionPreference='SilentlyContinue'
Set-Location $ProjectRoot
$reports = Join-Path $ProjectRoot ".reports"
if (-not (Test-Path $reports)) { New-Item -ItemType Directory -Path $reports | Out-Null }

# Step 1: Dart init sites
Get-ChildItem -Path "$ProjectRoot\lib" -Recurse -Include *.dart -File |
  Select-String -Pattern '(Supabase\.initialize|SupabaseFlutter\.initialize|Supabase\.instance|createClient|supabase_url|SUPABASE_URL|anon_key|SUPABASE_ANON_KEY)' -Context 0,2 |
  ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" } |
  Set-Content "$reports\lazy_app_init_scan.txt"

# Step 2: .env references
Get-ChildItem -Path $ProjectRoot -Recurse -File -Include ".env","*.env","*.env.*" |
  ForEach-Object { $_.FullName } |
  Set-Content "$reports\lazy_env_refs.txt"

# Step 3: main.dart init +/- 20 lines
$main = "$ProjectRoot\lib\main.dart"
if (Test-Path $main) {
  $hit = Select-String -Path $main -Pattern '(Supabase\.initialize|SupabaseFlutter\.initialize|createClient)' -SimpleMatch -Context 20,20 | Select-Object -First 1
  if ($hit) {
    @(
      "----- lib/main.dart (context) -----"
      $hit.Context.PreContext
      $hit.Line
      $hit.Context.PostContext
    ) | Set-Content "$reports\lazy_main_context.txt"
  } else {
    "No Supabase init call found in lib/main.dart" | Set-Content "$reports\lazy_main_context.txt"
  }
} else {
  "lib/main.dart not found" | Set-Content "$reports\lazy_main_context.txt"
}

# Step 4: Hardcoded supabase.co URLs
Get-ChildItem -Path "$ProjectRoot\lib" -Recurse -Include *.dart -File |
  Select-String -Pattern 'https?://[^"]*supabase\.co' |
  ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" } |
  Set-Content "$reports\lazy_hardcoded_urls.txt"

Write-Host "Scan complete. Open:"
Write-Host " - $reports\lazy_app_init_scan.txt"
Write-Host " - $reports\lazy_env_refs.txt"
Write-Host " - $reports\lazy_main_context.txt"
Write-Host " - $reports\lazy_hardcoded_urls.txt"
