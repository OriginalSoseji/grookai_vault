Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$patterns = @(
  'SUPABASE_ANON_KEY','PROD_ANON_KEY','STAGING_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY','SERVICE_ROLE_KEY','PROD_SERVICE_ROLE_KEY','STAGING_SERVICE_ROLE_KEY',
  'Authorization:\s*Bearer'
)
$bad = @()
Get-ChildItem -Recurse -File | Where-Object {
  $_.Extension -in '.ts','.tsx','.js','.jsx','.ps1','.psm1','.psd1','.sh','.bash','.zsh','.yml','.yaml','.json','.toml'
} | ForEach-Object {
  $t = try { Get-Content $_.FullName -Raw } catch { '' }
  foreach ($p in $patterns) { if ($t -match $p) { $bad += "$( $_.FullName ): $p" } }
}
if ($bad.Count) {
  Write-Host 'Found legacy key usage:' -ForegroundColor Red
  $bad | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Red }
  exit 1
} else {
  Write-Host 'OK: No legacy key usage found (apikey-only enforced).'
}
