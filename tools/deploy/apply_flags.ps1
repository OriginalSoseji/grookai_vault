param(
  [Parameter(Mandatory=$true)][string]$ProjectRef,
  [Parameter(Mandatory=$true)][string]$ConfigPath,
  [Parameter(Mandatory=$true)][string]$Functions
)

Write-Host "Applying flags from $ConfigPath to functions: $Functions (project: $ProjectRef)"
if (!(Test-Path $ConfigPath)) { Write-Error "Config file not found: $ConfigPath"; exit 1 }

$json = Get-Content $ConfigPath | ConvertFrom-Json
$funcs = $Functions.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }

foreach ($func in $funcs) {
  $envFile = Join-Path $env:TEMP ("gv_flags_{0}.env" -f $func)
  # Write KEY=VALUE lines (values not echoed)
  $lines = @()
  foreach ($p in $json.PSObject.Properties) { $lines += ("{0}={1}" -f $p.Name, $p.Value) }
  Set-Content -Path $envFile -Value $lines -NoNewline:$false

  Write-Host "[DEPLOY] Updating secrets for function '$func' (keys: $($json.PSObject.Properties.Name -join ', '))"
  supabase functions secrets set --project-ref $ProjectRef --env-file $envFile --func $func

  Write-Host "[DEPLOY] Deploying function '$func'"
  supabase functions deploy $func --project-ref $ProjectRef
}

Write-Host "Done."

