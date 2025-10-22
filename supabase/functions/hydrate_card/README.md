# hydrate_card

Auth
- Public (requires client JWT). Do not set `verify_jwt = false`.

Method
- POST

Request body
- `{ "print_id"?: string, "set_code"?: string, "number"?: string, "name"?: string, "query"?: string, "ping"?: boolean, "lang"?: "en"|"ja"|"zh" }`

Responses
- `card_prints` row JSON on success
- `{ ok:true, warm:true }` when `ping=true`

Examples
```
# Warmup
curl -sS -X POST -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" \
  --data '{"ping":true}' https://<ref>.supabase.co/functions/v1/hydrate_card

# By set/number
curl -sS -X POST -H "Authorization: Bearer <USER_JWT>" -H "Content-Type: application/json" \
  --data '{"set_code":"sv6","number":"001"}' https://<ref>.supabase.co/functions/v1/hydrate_card
```
