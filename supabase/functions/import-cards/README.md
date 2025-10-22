# import-cards

Auth
- Internal/system job. `verify_jwt = false`.

Method
- GET health; POST with modes

POST modes
- `?op=ping` → `{ ok: true }`
- `?op=probe` → upstream fetch only, no DB writes
- default (no op) → Edge fetch + DB upsert
- `?op=ingest` → client-provided cards array → DB upsert

Request body (normal import)
- `{ setCode: string, page?: number, pageSize?: number }`

Response
- `{ imported, setCode, page, pageSize, nextPageHint }`

Example (curl)
```
curl -sS -X POST \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  --data '{"setCode":"sv6","page":1,"pageSize":200}' \
  https://<ref>.supabase.co/functions/v1/import-cards
```
