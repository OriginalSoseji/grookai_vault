$SUPABASE_URL = "https://ycdxbpibncqcchqiihfz.supabase.co"
$ANON = $env:SUPABASE_PUBLISHABLE_KEY; if (-not $ANON) { $ANON = $env:SUPABASE_ANON_KEY }
Invoke-RestMethod -Method POST -Uri "$SUPABASE_URL/functions/v1/price-cron" `
  -Headers @{ apikey = $ANON } | Out-Null
