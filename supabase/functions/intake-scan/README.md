# intake-scan

Auth
- Public (requires client JWT). Enforces Authorization header and validates the token server-side.

Method
- POST

Request body
- `{ "set_code": string, "number": string, "image_url"?: string }` OR full scan flow with storage-signed URL.

Response
- `{ vault_item_id, qty, card: { id,name,set_code,number,image_url }, condition_label, market_price }`

Example (curl)
```
curl -sS -X POST \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  --data '{"set_code":"sv6","number":"001"}' \
  https://<ref>.supabase.co/functions/v1/intake-scan
```
