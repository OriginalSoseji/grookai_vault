# AI Identity from Warp — V1 Checkpoint

## What’s in scope
- Warp image → AI identity via OpenAI vision.
- New endpoint: `POST /ai-identify-warp`.
- Auth: header `x-gv-token` validated against env `GV_AI_ENDPOINT_TOKEN`.

## Required env vars (names only)
- `OPENAI_API_KEY`
- `GV_AI_ENDPOINT_TOKEN`
- `GV_AI_MODEL` (default: `gpt-4o-mini`)
- `GV_AI_LONG_EDGE` (default: `1024`)

## Routing / TLS
- Public domain: `ai.grookaivault.com`.
- Nginx terminates TLS and reverse-proxies to `127.0.0.1:7788`.
- Health: `https://ai.grookaivault.com/healthz`.

## Systemd / service
- Service env file (names only, no values): `/opt/grookai-ai/.env.service`.

## Verification
```bash
curl -I https://ai.grookaivault.com/healthz
```

PowerShell (token must be set locally):
```powershell
$env:GV_AI_ENDPOINT_TOKEN = "<set token>"
$h = @{ "Content-Type"="application/json"; "x-gv-token"=$env:GV_AI_ENDPOINT_TOKEN }
$img = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\grookai_vault\_tmp_front_pass.jpg"))
$body = @{ image_b64=$img; force_refresh=$true; trace_id="manual-test-1" } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "https://ai.grookaivault.com/ai-identify-warp" -Headers $h -Body $body
```
