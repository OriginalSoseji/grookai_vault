param(
  [string]$RemoteHost = "165.227.51.242",
  [string]$User = "grookai",
  [string]$RemoteDir = "/opt/grookai-ai",
  [int]$Port = 7788,
  [string]$ServiceName = "grookai-ai-border.service"
)

$ErrorActionPreference = "Stop"

function Exec($cmd) {
  Write-Host ">> $cmd"
  & powershell -NoProfile -Command $cmd
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $cmd"
  }
}

Write-Host "=== Grookai AI Border Deploy (PowerShell) ==="
Write-Host "Target: $User@$RemoteHost"
Write-Host "RemoteDir: $RemoteDir"
Write-Host "Port: $Port"
Write-Host "Service: $ServiceName"

# 1) Upload service files
Write-Host "== Uploading app.py + requirements.txt + systemd unit template =="
Exec "scp backend/ai_border_service/app.py $User@${RemoteHost}:$RemoteDir/app.py"
Exec "scp backend/ai_border_service/requirements.txt $User@${RemoteHost}:$RemoteDir/requirements.txt"
Exec "scp backend/ai_border_service/systemd/grookai-ai-border.service $User@${RemoteHost}:/tmp/grookai-ai-border.service"

# 2) Remote install + restart (PowerShell-driven; no embedded bash heredoc)
Write-Host "== Remote install + restart =="
Exec "ssh $User@$RemoteHost `"bash -lc 'set -e; cd $RemoteDir; test -d venv; source venv/bin/activate; pip install -r requirements.txt'`""
Exec "ssh $User@$RemoteHost `"bash -lc 'set -e; sudo mv /tmp/grookai-ai-border.service /etc/systemd/system/$ServiceName; sudo systemctl daemon-reload; sudo systemctl enable $ServiceName >/dev/null 2>&1 || true; sudo systemctl restart $ServiceName'`""

Write-Host "== wait for port =="

$ok = $false
for ($i = 0; $i -lt 20; $i++) {
  & ssh "$User@$RemoteHost" "ss -lntp | grep -q :$Port"
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Port is listening: $Port"
    $ok = $true
    break
  }
  Start-Sleep -Milliseconds 500
}

if (-not $ok) {
  Write-Host "ERROR: port $Port is not listening"
  & ssh "$User@$RemoteHost" "sudo systemctl status $ServiceName" | Out-Host
  & ssh "$User@$RemoteHost" "sudo journalctl -u $ServiceName" | Out-Host
  exit 1
}

Write-Host "== HTTP check /docs =="
try {
  $resp = Invoke-WebRequest -Uri "http://$RemoteHost`:$Port/docs" -Method GET -TimeoutSec 10 -MaximumRedirection 2
  Write-Host "HTTP OK /docs => $($resp.StatusCode)"
} catch {
  Write-Host "ERROR: /docs check failed"
  & ssh "$User@$RemoteHost" "sudo systemctl status $ServiceName" | Out-Host
  & ssh "$User@$RemoteHost" "sudo journalctl -u $ServiceName" | Out-Host
  throw
}

Write-Host "DEPLOY_OK"
Write-Host "=== DEPLOY COMPLETE ==="
