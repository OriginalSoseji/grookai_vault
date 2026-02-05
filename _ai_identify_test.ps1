# Windows test (set token locally first)
$env:GV_AI_ENDPOINT_TOKEN = "<set token>"
$headers = @{ "Content-Type"="application/json"; "x-gv-token"=$env:GV_AI_ENDPOINT_TOKEN }
$img = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\grookai_vault\_tmp_front_pass.jpg"))
$body = @{ image_b64=$img; force_refresh=$true; trace_id="manual-test-1" } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri "https://ai.grookaivault.com/ai-identify-warp" -Headers $headers -Body $body
