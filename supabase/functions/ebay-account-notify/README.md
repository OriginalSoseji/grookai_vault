# ebay-account-notify
eBay Marketplace Account Deletion/Closure notification webhook for Grookai Vault.

## Local serve
supabase functions serve ebay-account-notify --no-verify-jwt

## Sample POST
curl -X POST "http://localhost:54321/functions/v1/ebay-account-notify" ^
  -H "Content-Type: application/json" ^
  -d "{ \"eventType\": \"ACCOUNT_DELETION\", \"userId\": \"test-user-123\" }"

## Deploy
supabase functions deploy ebay-account-notify --no-verify-jwt
