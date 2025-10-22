# import-all-prices

Auth
- Internal/system job. `verify_jwt = false`.

Method
- POST

Request body
- `{ throttleMs?: number, debug?: boolean, only?: string[] }`

Response
- `{ ok, tried, failed, fetched, inserted }`

Example (curl)
```
curl -sS -X POST \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  --data '{"throttleMs":150}' \
  https://<ref>.supabase.co/functions/v1/import-all-prices
```
