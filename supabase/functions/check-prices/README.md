# check-prices

Auth
- Internal/system job. `verify_jwt = false`.

Method
- POST

Request body
- `{ maxAgeDays?: number, only?: string[], dry_run?: boolean, throttleMs?: number }`

Response
- `{ ok, cutoff, total_sets, considered_sets, to_import, triggered?, sets: [...] }`

Example (curl)
```
curl -sS -X POST \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  --data '{"maxAgeDays":7,"dry_run":false,"throttleMs":200}' \
  https://<ref>.supabase.co/functions/v1/check-prices
```
