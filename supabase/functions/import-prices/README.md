# import-prices

Auth
- Internal/system job. `verify_jwt = false` (server-only; guarded by service role when calling PostgREST).

Method
- POST

Request body
- `{ set_code | set | setCode | code: string, cardLimit?: number, cardOffset?: number, debug?: boolean }`

Response
- `{ ok, tried?: string[], fetched, processed, staged, inserted, next_offset?: number|null, ptcg_diag?: any }`

Example (curl)
```
curl -sS -X POST \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  --data '{"set_code":"sv6","debug":true}' \
  https://<ref>.supabase.co/functions/v1/import-prices
```
