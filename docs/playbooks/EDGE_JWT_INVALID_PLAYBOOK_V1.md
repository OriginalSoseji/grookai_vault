# EDGE_JWT_INVALID_PLAYBOOK_V1

## Symptoms
- Gateway responds `{"code":401,"message":"Invalid JWT"}` when verify_jwt is enabled.
- Function responds `{"error":"missing_bearer_token"}` even when Authorization header is present.
- Function responds `{"error":"invalid_jwt"}` from `auth.getUser` (token rejected).
- 403 from RLS when token is valid but data not owned.

## Token mint (safe for testing)
- Do **not** set `SUPABASE_ACCESS_TOKEN` (CLI PAT); keep CLI auth separate.
- Store user JWT in PowerShell:
  ```
  $env:SUPABASE_USER_JWT = "<your user JWT>"
  $env:SUPABASE_PUBLISHABLE_KEY = "<your supabase anon/publishable key>"
  ```
- Required headers when calling Edge:
  - `apikey: $env:SUPABASE_PUBLISHABLE_KEY`
  - `Authorization: Bearer $env:SUPABASE_USER_JWT`

## Deploy contract for affected functions
- Deploy with gateway JWT verification disabled (function handles auth):
  ```
  npx supabase functions deploy identity_scan_get_v1 --project-ref ycdxbpibncqcchqiihfz --no-verify-jwt --use-api
  npx supabase functions deploy identity_scan_enqueue_v1 --project-ref ycdxbpibncqcchqiihfz --no-verify-jwt --use-api
  ```

## Bearer extraction (fixed)
- Accepts `Authorization` or `authorization`.
- Strips wrapping quotes.
- Accepts `Bearer <token>` (case-insensitive) or raw 3-segment JWT.
- Diagnostic (`diag_token=1` on get_v1) returns:
  - `has_header`
  - `length`
  - `starts_with_bearer`
  - `has_three_segments`
  - `trimmed_length`

## Verification checklist
- `GET .../identity_scan_get_v1?diag_token=1` with Authorization header → `has_header=true` and (`starts_with_bearer=true` or `has_three_segments=true`); no `missing_bearer_token`.
- `GET .../identity_scan_get_v1?limit=1&offset=0` with Authorization → returns data or `invalid_jwt`, but not `missing_bearer_token`.
- Edge deploy flags above used; no gateway `Invalid JWT` observed under those flags.
