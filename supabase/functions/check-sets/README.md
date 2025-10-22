# check-sets

Auth
- Internal/system job. `verify_jwt = false`.

Method
- POST

Request body
- `{ fix?: boolean, throttleMs?: number, only?: string[], fixMode?: 'prices'|'cards'|'both' }`

Response
- `{ ok, total_api, total_db, missing_count, extra_count, missing, extra, fix: { requested, mode, tried, ok } }`

Examples (curl)
```
# Report only
curl -sS -X POST -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" --data '{}' \
  https://<ref>.supabase.co/functions/v1/check-sets

# Auto-fix (cards then prices)
curl -sS -X POST -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" --data '{"fix":true,"fixMode":"both","throttleMs":200}' \
  https://<ref>.supabase.co/functions/v1/check-sets
```
