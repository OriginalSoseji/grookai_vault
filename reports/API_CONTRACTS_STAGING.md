Canonical Contracts (to verify on staging)

- RPC: `public.search_cards(q text, "limit" int, "offset" int)`
  - Security: `SECURITY DEFINER`, `SET search_path = public`
  - Grants: `GRANT EXECUTE TO anon, authenticated`
  - Returns: setof `public.v_card_search`

Observed Status (attempted; unreachable)

- `.env.staging` placeholder blocked connectivity; REST probes returned `HTTP:000`.
- After fixing `.env.staging`, expect:
  - 200 OK with JSON body for RPC.
  - 200 OK for `GET /rest/v1/wall_feed_view?select=...&limit=1`.
  - 404 indicates missing object or exposure; 401/403 indicates auth/grants.

HTTP Examples (staging)

- POST `/rest/v1/rpc/search_cards`
  - Headers: `apikey: <publishable>`; `Content-Type: application/json`
  - Body: `{ "q": "pi", "limit": 10, "offset": 0 }`

Pitfalls Avoided

- No overloads for `search_cards`; single signature.
- Pin `search_path` to `public`.
- Explicit GRANTs for views/MVs/RPCs.

