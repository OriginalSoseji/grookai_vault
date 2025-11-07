Current Workflows (summary)

- Present: CI, Flutter build/test, DB smoke, edge functions audit, release flows.
- Gaps: Ensure local DB smoke seeds and asserts RPC response; migrations apply check on PRs touching `supabase/**`.

Recommended (no staging writes)

- DB Smoke (local containers): reset DB, seed minimal rows, call `/rpc/search_cards`, assert JSON.
- Migrations Apply (local): lint + reset apply to confirm order/idempotency.
- Staging probe job (read-only) guarded by secrets and `workflow_dispatch` only.
  - We now ship `.github/workflows/staging-probe.yml`.
  - Required repository secrets:
    - `STAGING_REST` (e.g., `https://<ref>.supabase.co/rest/v1`)
    - `STAGING_ANON` (publishable anon key)
  - The workflow prints lines our audit parses:
    - `RPC: HTTP <code>`
    - `VIEW: HTTP <code>`
  - Probes include PostgREST schema headers:
    - RPC: `Content-Profile: public`
    - VIEW: `Accept-Profile: public`

Verdict Rules (Production-first)

- GREEN when PROD RPC=200 and VIEW=200 (staging may be skipped).
- YELLOW when PROD RPC=200 and VIEW in {401,403,404} → apply guarded view expose.
- RED otherwise.

Re-run locally (read-only):

```
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ops\prod_first_audit.ps1
```
