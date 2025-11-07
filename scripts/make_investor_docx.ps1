$ErrorActionPreference = 'Stop'

$outDocx = Join-Path (Resolve-Path "$PSScriptRoot/..") 'docs/Grookai_Vault_Investor_Brief.docx'
$buildRoot = Join-Path (Resolve-Path "$PSScriptRoot/..") 'build/investor_docx'

New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $buildRoot '_rels') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $buildRoot 'docProps') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $buildRoot 'word') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $buildRoot 'word/_rels') | Out-Null

# [Content_Types].xml
$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'@
Set-Content -LiteralPath (Join-Path $buildRoot '[Content_Types].xml') -Value $contentTypes -Encoding UTF8

# _rels/.rels
$rels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="/docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="/docProps/app.xml"/>
</Relationships>
'@
Set-Content -LiteralPath (Join-Path $buildRoot '_rels/.rels') -Value $rels -Encoding UTF8

# docProps/core.xml
$core = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Grookai Vault — Investor Brief</dc:title>
  <dc:creator>Grookai</dc:creator>
  <cp:lastModifiedBy>Grookai</cp:lastModifiedBy>
</cp:coreProperties>
'@
Set-Content -LiteralPath (Join-Path $buildRoot 'docProps/core.xml') -Value $core -Encoding UTF8

# docProps/app.xml
$app = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Grookai</Application>
</Properties>
'@
Set-Content -LiteralPath (Join-Path $buildRoot 'docProps/app.xml') -Value $app -Encoding UTF8

# word/_rels/document.xml.rels
$docRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
'@
Set-Content -LiteralPath (Join-Path $buildRoot 'word/_rels/document.xml.rels') -Value $docRels -Encoding UTF8

function New-Para([string]$text, [bool]$bold=$false) {
  $escaped = [System.Security.SecurityElement]::Escape($text)
  if ($bold) {
    return "<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>$escaped</w:t></w:r></w:p>"
  } else {
    return "<w:p><w:r><w:t xml:space='preserve'>$escaped</w:t></w:r></w:p>"
  }
}

$paras = @()
$paras += New-Para 'Grookai Vault — Investor Brief' $true

$paras += New-Para 'Executive Summary' $true
$paras += New-Para 'Grookai Vault is wired end-to-end across Supabase (database schema + Edge functions), Flutter UI (ThunderShell app), and DevOps scripts.'
$paras += New-Para 'Core flows exist (Search, Vault tracking, public Wall groundwork, Scanner dev tools). The system is ~70% production-ready.'
$paras += New-Para 'Fastest path to beta: align naming/schema mismatches, standardize types, add run/dev tasks.'

$paras += New-Para 'What’s Completed' $true
$paras += New-Para '- Backend: vault_items + RLS; vault_add_item RPC; staged listings/listing_images + RLS; feed MV+view; refresh RPC; unified search view + trigram/unaccent.'
$paras += New-Para '- Edge: wall_feed (rename needed), search_cards, importers/cron, health probes.'
$paras += New-Para '- Flutter: App shell/login/tabs; Wall grid; Search; Card Detail; Vault; Profile; dotenv + fallback.'
$paras += New-Para '- DevOps: repair/pull/push scripts; diagnostics; run checklist.'

$paras += New-Para 'What’s Next (High-Impact Fixes)' $true
$paras += New-Para '- Unify Wall feed name -> public.wall_feed_view across DB/Edge/Flutter.'
$paras += New-Para '- Apply Wall base tables from _hold; validate RLS + refresh RPC order.'
$paras += New-Para '- Fix Search image by adding image_best alias (or update selects).'
$paras += New-Para '- Align vault_items schema with app (qty, condition_label, grade_label) or reduce payload.'
$paras += New-Para '- Consolidate on listings; retire legacy wall_posts functions.'
$paras += New-Para '- Ensure grants; add TS typegen and Flutter DTO/codegen.'
$paras += New-Para '- Add SnackBars for errors; maintain layout hygiene.'

$paras += New-Para 'Current Readiness (Self-Assessment)' $true
$paras += New-Para 'Database 70% | RLS 75% | Edge 65% | Flutter 75% | DevOps 70% | E2E 70%'

$paras += New-Para 'Comparison To A High-End Dev Team' $true
$paras += New-Para 'Architecture on par; naming/contract drift is the main gap.'
$paras += New-Para 'Type safety below top-tier; add generated types/DTOs.'
$paras += New-Para 'Dev ergonomics good; add run/stop tasks.'
$paras += New-Para 'Add RLS/integration tests to reach premium bar.'

$paras += New-Para 'Cost To Reach Production-Ready Beta' $true
$paras += New-Para '- Lean contractors ($80-$120/hr): 2-3 eng x 2-3 weeks -> $25k-$55k.'
$paras += New-Para '- High-end shop ($150-$220/hr): 2-3 eng + PM x 2-3 weeks -> $60k-$120k.'

$paras += New-Para '30/60/90 Plan' $true
$paras += New-Para '- 7-10 days: unify wall_feed_view; promote base tables; add image_best; align Vault.'
$paras += New-Para '- 11-30 days: consolidate listings; TS typegen + Flutter DTOs; VS Code tasks; SnackBars.'
$paras += New-Para '- 31-90 days: integration tests; monitoring; storefront read views.'

$paras += New-Para 'Key Risks & Mitigations' $true
$paras += New-Para '- Naming drift -> standardize; Vault inserts -> align schema; Search nulls -> image_best; RLS/grants -> smoke tests.'

$paras += New-Para 'KPIs For Beta' $true
$paras += New-Para 'TTI to first listing < 5m; 0% search column errors; feed refresh < 2s; vault adds > 99%.'

$paras += New-Para 'Tech Highlights' $true
$paras += New-Para 'Supabase+RPCs+MVs; Flutter ThunderShell; RLS-first; useful scripts.'

$paras += New-Para 'Run Checklist (Device)' $true
$paras += New-Para 'supabase start; flutter clean && flutter pub get; flutter run -d <device-id>; verify search/wall/vault flows.'

$docXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${($paras -join "`n")}
    <w:sectPr/>
  </w:body>
</w:document>
"@

Set-Content -LiteralPath (Join-Path $buildRoot 'word/document.xml') -Value $docXml -Encoding UTF8

$tmpZip = [System.IO.Path]::ChangeExtension($outDocx, '.zip')
if (Test-Path $tmpZip) { Remove-Item $tmpZip -Force }
if (Test-Path $outDocx) { Remove-Item $outDocx -Force }
Compress-Archive -Path (Join-Path $buildRoot '*') -DestinationPath $tmpZip -Force
Rename-Item -Path $tmpZip -NewName ([System.IO.Path]::GetFileName($outDocx))
Write-Host "Wrote $outDocx"
