param(
  [string]$ProjectRoot = "C:\grookai_vault",
  [string]$SetCode = "sv4",
  [string]$Number = "12",
  [string]$Lang = "en",
  [string]$Url = "http://127.0.0.1:54321/functions/v1/import-card"
)

$ErrorActionPreference = 'Continue'
Set-Location $ProjectRoot
$reports = Join-Path $ProjectRoot ".reports"
if (-not (Test-Path $reports)) { New-Item -ItemType Directory -Path $reports | Out-Null }

$req = @{ set_code = $SetCode; number = $Number; lang = $Lang }
$reqPath = Join-Path $reports "import_card_request.json"
($req | ConvertTo-Json -Depth 5) | Set-Content -Path $reqPath -Encoding UTF8

Write-Host "POST $Url"
Write-Host "Body: $reqPath"

try {
  $resp = Invoke-RestMethod -Method Post -Uri $Url -ContentType 'application/json' -Body (Get-Content $reqPath -Raw)
  $respRaw = ($resp | ConvertTo-Json -Depth 10)
} catch {
  $respRaw = "(request failed) " + ($_ | Out-String)
}

$outPath = Join-Path $reports "import_card_response.json"
$respRaw | Set-Content -Path $outPath -Encoding UTF8
Write-Host "Response saved: $outPath"
