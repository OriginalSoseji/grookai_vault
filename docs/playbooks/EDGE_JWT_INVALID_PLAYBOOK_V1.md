# EDGE_JWT_INVALID_PLAYBOOK_V1

Status: ACTIVE  
Owner: Grookai Vault (Custodian)  
Date: 2026-01-24  
Purpose: Permanently eliminate Supabase Edge auth failures that manifest as **gateway** `{"code":401,"message":"Invalid JWT"}` or **function-side** `{"error":"missing_bearer_token"}` in **legacy keys disabled** projects using **publishable keys**.

---

## Context (proven in this incident)

Remote project:
- `SUPABASE_URL = https://ycdxbpibncqcchqiihfz.supabase.co`
- Publishable key required (`sb_publishable_...`)
- Legacy anon keys disabled (“Legacy API keys are disabled.”)

Observed failures:
- Edge gateway: `{"code":401,"message":"Invalid JWT"}`
- Function runtime: `{"error":"missing_bearer_token"}`

Key facts proven during resolution:
- User access token works against GoTrue: `GET /auth/v1/user` succeeded.
- Token header algorithm: `ES256`.
- Token `kid` exists in JWKS: `/auth/v1/.well-known/jwks.json` contains the `kid`.
- A control function (`diag-echo`) accepted calls while the new functions failed at gateway (proves per-function behavior).

---

## Symptom Matrix (do not skip)

| Where the 401 comes from | Response body | Meaning | Next action |
|---|---|---|---|
| **Edge gateway** | `{"code":401,"message":"Invalid JWT"}` | JWT rejected **before** function runs | Use the **gateway-bypass deploy contract** (`--no-verify-jwt --use-api`) |
| **Function code** | `{"error":"missing_bearer_token"}` | Function ran, but token extraction returned null | Prove token env var is non-empty; then validate bearer parsing |
| **Function code** | `{"error":"invalid_jwt"}` | Token extracted, but `auth.getUser(token)` failed | Token is wrong/expired or not an access token |
| **GoTrue** `/auth/v1/user` | `{"code":401,"error_code":"no_authorization",...}` | Empty/invalid Bearer header | Fix local token minting / env propagation |
| **403** | anything | Not an Edge JWT issue (RLS / ownership / policies) | Stop and switch to DB/RLS debug |

---

## Golden Rules

1) **Never trust the current shell to still have a token.** Prove length every time.  
2) **Never paste tokens into chat.** Use local-only env vars and length checks.  
3) If gateway says `Invalid JWT`, treat it as **gateway verification unreliability** for that function and bypass using deploy flags below.  
4) Always capture the **response body** for 401s. PowerShell often hides it.  
5) Avoid env var names that poison Supabase CLI auth. Prefer `SUPABASE_USER_JWT`.

---

## Required Headers (publishable key era)

For function calls:
- `apikey: $env:SUPABASE_PUBLISHABLE_KEY`
- `Authorization: Bearer <USER_ACCESS_TOKEN>`

Notes:
- Publishable key is required for “legacy keys disabled” projects.
- Do not send legacy anon key when legacy keys are disabled.

---

## Token Handling Contract (PowerShell)

### Canonical env var
Use:
- `SUPABASE_USER_JWT` = user access token (JWT)

Avoid:
- `SUPABASE_ACCESS_TOKEN` (ambiguous; also commonly used/overloaded)
- Any env var name that might be interpreted by Supabase CLI as its PAT

### Proof check (must pass before calling Edge)
```powershell
$env:SUPABASE_USER_JWT.Length
````

Expected: ~800–1200
If it prints `0`, you are sending:

```
Authorization: Bearer 
```

and the function will correctly return `missing_bearer_token`.

---

## Mint a Fresh Token (PowerShell)

Local-only. Do not paste credentials into chat.

```powershell
$Email = "YOUR_REAL_EMAIL_HERE"
$Password = "YOUR_REAL_PASSWORD_HERE"

$resp = Invoke-RestMethod -Method Post `
  -Uri "$env:SUPABASE_URL/auth/v1/token?grant_type=password" `
  -Headers @{ apikey = $env:SUPABASE_PUBLISHABLE_KEY; "Content-Type" = "application/json" } `
  -Body (@{ email = $Email; password = $Password } | ConvertTo-Json)

$env:SUPABASE_USER_JWT = $resp.access_token
$env:SUPABASE_USER_JWT.Length
```

---

## Baseline Auth Verification (proves token is valid)

```powershell
$h = @{
  apikey        = $env:SUPABASE_PUBLISHABLE_KEY
  Authorization = "Bearer $env:SUPABASE_USER_JWT"
}

Invoke-RestMethod -Method Get -Uri "$env:SUPABASE_URL/auth/v1/user" -Headers $h |
  Select-Object id, email, role
```

If this fails, stop. Edge functions are not the root problem yet.

---

## Canonical Edge Call Template (PowerShell)

Always capture body on failures:

```powershell
$uri = "$env:SUPABASE_URL/functions/v1/<FUNCTION_NAME>"
$h = @{
  apikey        = $env:SUPABASE_PUBLISHABLE_KEY
  Authorization = "Bearer $env:SUPABASE_USER_JWT"
}

try {
  $r = Invoke-RestMethod -Method Get -Uri $uri -Headers $h -ErrorAction Stop
  "HTTP 200"
  $r
} catch {
  $resp = $_.Exception.Response
  $code = [int]$resp.StatusCode
  $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
  $body = $sr.ReadToEnd()
  "HTTP $code"
  $body
}
```

---

## Deterministic Diagnostic Sequence (root cause isolation)

1. **Prove token exists in shell**

```powershell
$env:SUPABASE_USER_JWT.Length
```

2. **Prove token valid at GoTrue**

* Call `GET $SUPABASE_URL/auth/v1/user` with apikey + Bearer.

3. **Prove gateway vs function**

* Call function and read body:

  * If body is `{"code":401,"message":"Invalid JWT"}` → gateway rejection.
  * If body is `{"error":"missing_bearer_token"}` → function ran, token extraction failed.

4. **(Optional) Prove JWKS contains kid**
   Decode JWT header locally to extract `kid`, then:

```powershell
((Invoke-RestMethod -Uri "$env:SUPABASE_URL/auth/v1/.well-known/jwks.json").keys.kid -contains $kid)
```

Expected: `True`.

5. **If gateway rejects**, apply deploy contract below.

---

## Permanent Deploy Contract (fixes gateway Invalid JWT)

In Supabase CLI v2.72.8, the reliable control surface for gateway JWT verification is the deploy flags.

Deploy any function that returns gateway `Invalid JWT` using:

```powershell
npx supabase functions deploy <FUNCTION_NAME> `
  --project-ref ycdxbpibncqcchqiihfz `
  --no-verify-jwt `
  --use-api
```

For identity scanner functions:

```powershell
npx supabase functions deploy identity_scan_get_v1 identity_scan_enqueue_v1 `
  --project-ref ycdxbpibncqcchqiihfz `
  --no-verify-jwt `
  --use-api
```

Why this is allowed:

* Gateway verify-jwt was proven unreliable for these functions in this project.
* Auth enforcement remains deterministic inside function code via `sb.auth.getUser(token)`.

---

## Function-Side Token Extraction Requirements (mandatory hardening)

Observed in real traffic:

* Header name `authorization` arrives.
* Bearer parsing can fail due to quoting/whitespace/format differences.

Required extractor behavior:

* Accept `Authorization: Bearer <token>` (case-insensitive).
* Trim whitespace.
* Strip wrapping quotes if present.
* Accept raw JWT as fallback (`a.b.c`).

---

## Supabase CLI Auth Poisoning (critical gotcha)

Supabase CLI authentication uses a personal access token format:

* `sbp_...`

If your shell has an env var that the CLI treats as its access token (and it’s not `sbp_...`), CLI commands fail with:

* `Invalid access token format. Must be like sbp_...`

Fix (session-only):

```powershell
Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
```

Policy:

* Store user JWT only in `SUPABASE_USER_JWT`.
* Do not overload ambiguous env var names.

---

## Verification Checklist (DONE criteria)

For each function:

1. Token exists:

* `$env:SUPABASE_USER_JWT.Length` is ~800–1200

2. GoTrue accepts token:

* `GET $SUPABASE_URL/auth/v1/user` returns your user

3. Deploy is correct:

* Deployed using `--no-verify-jwt --use-api` if gateway `Invalid JWT` was observed

4. Function call succeeds:

* `GET $SUPABASE_URL/functions/v1/<fn>` with apikey + Authorization returns HTTP 200
* No gateway `Invalid JWT`
* No `missing_bearer_token`

---

## Incident Close Notes (what actually fixed it)

* Gateway `Invalid JWT` was eliminated by deploying affected functions with:

  * `--no-verify-jwt --use-api`

* Function-side `missing_bearer_token` was eliminated by:

  * Ensuring user JWT env var was non-empty in the current shell.
  * Hardening bearer extraction to tolerate quoting/whitespace/raw JWT fallback.

Final proof:

* `identity_scan_get_v1` returned HTTP 200 from PowerShell using apikey + Bearer token.
