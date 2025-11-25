### TASK: Create and bootstrap `grookai-ci` with a single import-prices workflow (artifacts-only)

**Guardrails**

* Create a **new** repo `grookai-ci` (private). Do **not** touch `grookai_vault`.
* Secrets added to **grookai-ci** only.
* Workflow uses `workflow_dispatch` + schedule; uploads proofs as **artifact**; no pushes to app repo.

**Steps (PowerShell + gh)**

1. **Scaffold local repo**

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = "C:\grookai_ci"
New-Item -ItemType Directory -Force -Path "$root\.github\workflows" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\reports" | Out-Null
Set-Content "$root\.gitignore" "reports/" -Encoding UTF8
```

2. **Write the workflow**

```powershell
$projRef = "ycdxbpibncqcchqiihfz"
$wf = @'
name: Align & Validate import-prices (artifacts-only)

on:
  workflow_dispatch:
  schedule:
    - cron: "*/30 * * * *"

permissions:
  contents: read
  actions: read

env:
  PROJECT_REF: ycdxbpibncqcchqiihfz
  SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
  SUPABASE_PUBLISHABLE_KEY: ${{ secrets.PROD_PUBLISHABLE_KEY }}

jobs:
  align-validate:
    runs-on: windows-latest
    env:
      SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
    steps:
      - name: Checkout (empty repo OK)
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Guard required secrets
        shell: pwsh
        run: |
          if (-not "${{ secrets.SUPABASE_ACCESS_TOKEN }}") { throw "Missing SUPABASE_ACCESS_TOKEN" }
          if (-not "${{ secrets.PROD_PUBLISHABLE_KEY }}") { throw "Missing PROD_PUBLISHABLE_KEY" }
          if (-not "${{ secrets.BRIDGE_IMPORT_TOKEN }}") { throw "Missing BRIDGE_IMPORT_TOKEN" }

      - name: Install Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Initialize proofs
        shell: pwsh
        run: |
          $dir = "reports/ci_logs/latest"
          New-Item -ItemType Directory -Force -Path $dir | Out-Null
          @'
ProjectRef: ycdxbpibncqcchqiihfz
Function: import-prices
GatewayAuth: (pending)
FinalCode: (pending)
FinalURL: (pending)
Timestamp: (pending)
'@ | Set-Content "$dir/sixline.txt" -Encoding UTF8
          'Attempts:' | Set-Content "$dir/attempts.txt" -Encoding UTF8

      - name: Deploy + 4-variant validate (5 tries)
        shell: pwsh
        env:
          PUB: ${{ env.SUPABASE_PUBLISHABLE_KEY }}
          PRJ: ${{ env.SUPABASE_URL }}
          BRIDGE: ${{ secrets.BRIDGE_IMPORT_TOKEN }}
        run: |
          Set-StrictMode -Version Latest
          $ErrorActionPreference = "Stop"
          $dir = "reports/ci_logs/latest"
          $six = Join-Path $dir "sixline.txt"
          $att = Join-Path $dir "attempts.txt"

          # 1) Function env + deploy
          New-Item -ItemType Directory -Force -Path "supabase/functions/import-prices" | Out-Null
          Set-Content -Path "supabase/functions/import-prices/.env" -Value @"
BRIDGE_IMPORT_TOKEN=$env:BRIDGE
"@ -Encoding UTF8

          supabase secrets set --project-ref $env:PROJECT_REF BRIDGE_IMPORT_TOKEN=$env:BRIDGE
          supabase functions deploy import-prices --project-ref $env:PROJECT_REF --env-file "supabase/functions/import-prices/.env"

          # 2) Probe matrix: FN/PRJ x (apikey_only | apikey+auth), up to 5 attempts
          $fnUrl  = "https://$($env:PROJECT_REF).functions.supabase.co/import-prices"
          $prjUrl = "$env:PRJ/functions/v1/import-prices"
          $pub    = "$env:PUB"

          function Try-Call {
            param([string]$Name,[string]$Url,[bool]$WithAuth)
            $h = @{ "apikey" = $pub; "x-bridge-token" = $env:BRIDGE }
            if ($WithAuth) { $h["Authorization"] = "Bearer $pub" }
            try {
              $resp = Invoke-WebRequest -Method POST -Uri $Url -Headers $h -Body (@{health=1} | ConvertTo-Json) -ContentType 'application/json' -UseBasicParsing -TimeoutSec 20
              return [pscustomobject]@{ name=$Name; code=$resp.StatusCode; url=$Url }
            } catch {
              $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
              return [pscustomobject]@{ name=$Name; code=$code; url=$Url }
            }
          }

          $final = $null
          $lastTries = $null
          for ($i=1; $i -le 5; $i++) {
            $tries = @(
              Try-Call "FN/apikey_only"  $fnUrl  $false
              Try-Call "FN/apikey+auth"  $fnUrl  $true
              Try-Call "PRJ/apikey_only" $prjUrl $false
              Try-Call "PRJ/apikey+auth" $prjUrl $true
            )
            $lastTries = $tries

            $line = Get-Content $att -Raw
            $suffix = ($tries | ForEach-Object { "$($_.name):$($_.code)" }) -join ", "
            if ($line.TrimEnd() -eq "Attempts:") {
              Set-Content $att "Attempts: $suffix" -Encoding UTF8
            } else {
              Set-Content $att ($line.TrimEnd() + ", " + $suffix) -Encoding UTF8
            }

            $hit = $tries | Where-Object { $_.code -eq 200 } | Select-Object -First 1
            if ($hit) { $final = $hit; break }
          }

          # 3) Finalize sixline
          function Replace-Line($c,[string]$k,[string]$v) {
            return ($c -split "`n" | ForEach-Object { if ($_ -like "$k:*") { "$k: $v" } else { $_ } }) -join "`n"
          }
          $sixC = Get-Content $six -Raw
          $gw   = if ($final) { $final.name } else { "(none)" }
          $code = if ($final) { "$($final.code)" } else { ($lastTries[-1].code) }
          $url  = if ($final) { $final.url } else { $lastTries[-1].url }
          $stamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
          $sixC = Replace-Line $sixC "GatewayAuth" $gw
          $sixC = Replace-Line $sixC "FinalCode"   $code
          $sixC = Replace-Line $sixC "FinalURL"    $url
          $sixC = Replace-Line $sixC "Timestamp"   $stamp
          $sixC | Set-Content $six -Encoding UTF8

      - name: Upload proofs (always)
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: import-prices-auto-validate
          path: |
            reports/ci_logs/latest/sixline.txt
            reports/ci_logs/latest/attempts.txt
'@
Set-Content "$root\.github\workflows\align-import-prices.yml" $wf -Encoding UTF8
```

3. **README**

```powershell
Set-Content "$root\README.md" @"
# grookai-ci

Runs alignment/validation for Grookai Vault functions from a clean CI environment.

## Secrets (repo → Settings → Actions → Secrets)
- SUPABASE_ACCESS_TOKEN
- PROD_SUPABASE_URL
- PROD_PUBLISHABLE_KEY
- BRIDGE_IMPORT_TOKEN  (actual value, not digest)

## Run
- Manual: Actions → Align & Validate import-prices → Run workflow
- Scheduled: every 30 minutes
- Proofs: download artifact "import-prices-auto-validate" (sixline.txt, attempts.txt)
"@ -Encoding UTF8
```

4. **Init Git + create GitHub repo (private) and push**

```powershell
Push-Location $root
if (-not (Test-Path ".git")) {
  git init
  git add .
  git commit -m "ci: bootstrap grookai-ci (import-prices artifacts-only)"
}
# Create remote repo (private) and push (requires gh auth)
gh repo create grookai-ci --private --source . --remote origin --push
Pop-Location
```

5. **Set Actions → Read & write permissions (via API)**

```powershell
# Default workflow permissions to write (needed for some future status updates)
gh api -X PUT repos/OriginalSoseji/grookai-ci/actions/permissions/workflow \
  -f default_workflow_permissions=write -f can_approve_pull_request_reviews=false
```

6. **Add secrets to grookai-ci (prompt once, never echo to console)**

```powershell
$secrets = @(
  "SUPABASE_ACCESS_TOKEN",
  "PROD_SUPABASE_URL",
  "PROD_PUBLISHABLE_KEY",
  "BRIDGE_IMPORT_TOKEN"
)
foreach ($s in $secrets) {
  Write-Host "Enter value for $s (input hidden):"
  $val = Read-Host -AsSecureString
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($val))
  if ([string]::IsNullOrWhiteSpace($plain)) { throw "Empty value for $s" }
  # gh secret set reads from stdin with -b omitted:
  $plain | gh secret set $s -R OriginalSoseji/grookai-ci -a actions
}
```

7. **Manual test run + artifact check (prints the two files if present)**

```powershell
# Dispatch the workflow
gh workflow run "Align & Validate import-prices (artifacts-only)" -R OriginalSoseji/grookai-ci

Start-Sleep -Seconds 8
$run = (gh run list -R OriginalSoseji/grookai-ci --workflow "Align & Validate import-prices (artifacts-only)" --limit 1 --json databaseId | ConvertFrom-Json)[0].databaseId

do {
  $info = gh run view $run -R OriginalSoseji/grookai-ci --json status,conclusion | ConvertFrom-Json
  Write-Host "$(Get-Date -Format s) $($info.status):$($info.conclusion)"
  Start-Sleep -Seconds 6
} while ($info.status -ne 'completed')

New-Item -ItemType Directory -Force -Path "$root\_last_artifact" | Out-Null
gh run download $run -R OriginalSoseji/grookai-ci -n import-prices-auto-validate -D "$root\_last_artifact" 2>$null

Write-Host "`n--- sixline.txt ---`n"
Get-Content "$root\_last_artifact\sixline.txt" -ErrorAction SilentlyContinue
Write-Host "`n--- attempts.txt ---`n"
Get-Content "$root\_last_artifact\attempts.txt" -ErrorAction SilentlyContinue
```

**Done.**
This builds the CI repo, sets permissions, adds secrets, wires the import-prices validator, runs it once, and prints the proofs from the artifact — with **zero** changes to your app repo.

