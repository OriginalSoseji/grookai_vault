Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
cd C:\grookai_vault

# minimal workflow (ubuntu + workflow_dispatch)
$yaml = @"
name: smoke-auto-align
on:
  workflow_dispatch:
  push:
    branches: [ main ]
    paths:
      - .github/workflows/auto-align-import-prices.yml
      - .github/auto_align_import_prices.bump
jobs:
  sanity:
    runs-on: ubuntu-latest
    steps:
      - name: Echo OK
        run: echo SMOKE OK
"@

Set-Content '.github/workflows/auto-align-import-prices.yml' $yaml -Encoding UTF8

# commit ONLY that workflow file
git add .github/workflows/auto-align-import-prices.yml
git commit -m "ci_smoke reset auto-align workflow (ubuntu smoke)" -- .github/workflows/auto-align-import-prices.yml
git push

# manual dispatch + show newest run (ELAPSED must be > 0s)
gh workflow run .github/workflows/auto-align-import-prices.yml
Start-Sleep -Seconds 10
gh run list --workflow .github/workflows/auto-align-import-prices.yml --limit 1
