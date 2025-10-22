# search_cards

Auth
- Public (requires client JWT). Do not set `verify_jwt = false`.

Method
- POST

Request body
- `{ "query": string, "limit"?: number, "lang"?: "en"|"ja"|"zh" }`

Response
- `{ results: Array<{ id?: string, set_code?: string, number?: string, name?: string, image_url?: string, source: 'db'|'tcgdex' }> }`

Example (curl)
```
curl -sS -X POST \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  --data '{"query":"charizard","limit":20}' \
  https://<ref>.supabase.co/functions/v1/search_cards
```
