Canonical RPCs

- search_cards
  - Name: `public.search_cards`
  - Args: `q text`, `"limit" int`, `"offset" int`
  - Security: `SECURITY DEFINER`, `SET search_path = public`
  - Grants: `GRANT EXECUTE TO anon, authenticated`
  - Returns: setof `public.v_card_search` (id, name, set_code, collector_number, image_url, ...)

HTTP Examples (PostgREST)

- POST `/rest/v1/rpc/search_cards`
  - Headers: `apikey: <publishable>`, `Authorization: Bearer <publishable>`, `Content-Type: application/json`
  - Body: `{ "q": "pikachu", "limit": 10, "offset": 0 }`
  - 200 OK: `[{"id":"...","name":"...","set_code":"..."}]`

Error Shape

- 400/422: invalid args → `{ "message": "...", "hint": "..." }`
- 401: missing/invalid api key.

PostgREST Pitfalls Avoided

- Avoid overloaded function names; use a single stable signature.
- `search_path` pinned to `public` to avoid schema drift.
- Explicit `GRANT EXECUTE` to roles used by clients.

