Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$q = Join-Path (Get-Location) ".codex\queue.md"
if (-not (Test-Path $q)) { throw "Queue file not found: $q" }
$text = Get-Content $q -Raw

$taskIdx = $text.LastIndexOf("### TASK:")
if ($taskIdx -lt 0) { throw "No TASK block found in queue.md" }
$after = $text.Substring($taskIdx)

$termIdx = $after.IndexOf("`n---")
if ($termIdx -ge 0) {
  $block = $after.Substring(0, $termIdx).TrimEnd()
} else {
  $block = $after.TrimEnd()
}

if ([string]::IsNullOrWhiteSpace($block)) { throw "Parsed TASK block is empty." }

\#\#\ BRIDGE-GUARD\ ::\ require\ CONFIRM:\ YES\ for\ risky\ commands\n\$risky\ =\ @\(\n\ \ "gh\ workflow\ run",\n\ \ "supabase\ functions\ deploy",\n\ \ "git\ push",\n\ \ "az\ ",\n\ \ "aws\ ",\n\ \ "gcloud\ ",\n\ \ "kubectl\ "\n\)\n\$headerLine\ =\ \(\$block\ -split\ "`r\?`n"\)\[0]\n\$needsConfirm\ =\ \$false\nforeach\ \(\$p\ in\ \$risky\)\ \{\ if\ \(\$block\ -match\ \[regex]::Escape\(\$p\)\)\ \{\ \$needsConfirm\ =\ \$true;\ break\ }\ }\n\$hasConfirm\ =\ \(\$headerLine\ -match\ "CONFIRM:\\s\*YES"\)\n\nif\ \(\$needsConfirm\ -and\ -not\ \$hasConfirm\)\ \{\n\ \ Write-Host\ "GUARD:\ Task\ contains\ risky\ commands\ but\ lacks\ 'CONFIRM:\ YES'\ in\ the\ title\.\ Aborting\ dispatch\."\n\ \ Write-Host\ "Title\ line:\ \$headerLine"\n\ \ exit\ 2\n}\n\n\$block\ \|\ Set-Clipboard

"===== DISPATCHED TASK BLOCK (copied to clipboard) ====="
$block
"======================================================="

"Next: open the ChatGPT (Codex) panel in VS Code, paste (Ctrl+V), and press Enter."

