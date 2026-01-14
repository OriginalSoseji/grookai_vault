# JWT Playbook V1 (Local + Edge Functions)

## Purpose
When Edge Functions require a user JWT (`auth.getUser()`), this playbook guarantees a deterministic way to:
- mint a valid local JWT
- validate it
- use it in PowerShell requests
- avoid mixing up API keys vs signing keys vs access tokens

## Core truths (LOCKED)

### 1) These are NOT the same thing
- **Publishable key** (`sb_publishable_...`)
  - ✅ project key for anon client role
  - ❌ not a user session
- **JWT signing key ID** (UUID shown in “JWT Signing Keys”)
  - ✅ identifies the signing key
  - ❌ not a token
- **User access token** (`eyJ...` with 3 dot segments)
  - ✅ real JWT session token
  - ✅ required for `Authorization: Bearer <token>`

### 2) Where JWT comes from
A user JWT is minted only by **Supabase Auth**:
- `/auth/v1/signup` → returns `access_token`
- `/auth/v1/token?grant_type=password` → returns `access_token`

Dashboard “keys” pages will never show you this.

## Local endpoints (from `supabase status`)
- API base: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`

## Playbook steps (Single-step friendly)

### Step A — Set local anon/publishable key once
```powershell
$anon = "<PASTE_LOCAL_sb_publishable_KEY>"
````

### Step B — Mint a dev user JWT (idempotent pattern)

#### B1) Signup (creates user if missing)

```powershell
$signup = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:54321/auth/v1/signup" `
  -Headers @{ apikey = $anon; Authorization = "Bearer $anon" } `
  -ContentType "application/json" `
  -Body (@{ email="dev@grookai.local"; password="password123" } | ConvertTo-Json)

$jwt = $signup.access_token
$jwt
```

If signup returns “user already registered”, use login:

#### B2) Login (mint fresh JWT)

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:54321/auth/v1/token?grant_type=password" `
  -Headers @{ apikey=$anon; Authorization="Bearer $anon" } `
  -ContentType "application/json" `
  -Body (@{ email="dev@grookai.local"; password="password123" } | ConvertTo-Json)

$jwt = $login.access_token
$jwt
```

### Step C — Verify JWT is structurally valid (fast)

A valid JWT must have **3 dot-separated segments**:

```powershell
($jwt -split '\.').Count
```

Pass condition: `3`

### Step D — Verify JWT is accepted by Auth (authoritative)

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:54321/auth/v1/user" `
  -Headers @{ apikey=$anon; Authorization="Bearer $jwt" }
```

### Step E — Use JWT with Edge Function (pattern)

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:54321/functions/v1/scan-upload-plan" `
  -Headers @{ Authorization="Bearer $jwt" } `
  -ContentType "application/json" `
  -Body (@{ vault_item_id="..."; slots=@("front","back") } | ConvertTo-Json)
```

## Common failure codes (map → fix)

* `401 missing_bearer_token`

  * Missing `Authorization: Bearer $jwt`
* `{\"error\":\"unauthorized\"}`

  * Wrong bearer token (anon key, signing key ID UUID, random UUID)
  * Fix: re-run Step B to mint `$jwt`
* `invalid_credentials`

  * Wrong password after reset
  * Fix: run signup again (local reset may wipe auth users)

## Tooling note (Windows)

* Prefer PowerShell `Invoke-RestMethod`
* If you must use curl.exe, add `--globoff` to avoid bracket/range parsing issues.

## Post-reset rule (LOCKED)

After any `supabase db reset --local`:

* assume local auth users may be wiped
* re-run Step B1 signup to mint a fresh `$jwt`

## Optional: automate

Create a local script `scripts/dev_auth.ps1` (future) to:

* set `$anon`
* mint `$jwt`
* verify `$jwt`
