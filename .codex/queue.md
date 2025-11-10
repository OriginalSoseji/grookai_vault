# Codex Queue

Paste tasks below using this exact format. The dispatcher will grab the **last** block:

### TASK: Probe workflow sanity (demo)
You are in Windows PowerShell at C:\grookai_vault.
- Open `.github/workflows/prod-edge-probe.yml`
- Confirm steps: Install Supabase CLI, List functions (runner view), Diagnose wall_feed (anon).
- Ensure the List step uses SUPABASE_ACCESS_TOKEN from repo secrets.
- Keep the GET headers for anon: `apikey: <anon>`, `Authorization: Bearer <anon>`.
- Do not modify unrelated steps.
---

### TASK: Clean baseline for the probe workflow (drop-in)

> You are in Windows PowerShell at `C:\grookai_vault`. Replace `.github/workflows/prod-edge-probe.yml` with this minimal, valid baseline; commit and push.
>
> ```yaml
> name: Prod Edge Probe (read-only)
>
> on:
>   workflow_dispatch:
>   schedule:
>     - cron: '0 * * * *'
>   push:
>     branches: [ main ]
>     paths:
>       - 'supabase/functions/**'
>       - '.codex/test_edges_prod.ps1'
>       - '.github/workflows/prod-edge-probe.yml'
>
> permissions:
>   contents: read
>
> jobs:
>   probe:
>     runs-on: windows-latest
>     defaults:
>       run:
>         shell: pwsh
>     env:
>       SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
>       SUPABASE_PUBLISHABLE_KEY: ${{ secrets.PROD_PUBLISHABLE_KEY }}
>       GV_ENV: prod
>     steps:
>       - name: Checkout
>         uses: actions/checkout@v4
>         with:
>           fetch-depth: 0
>
>       - name: Preflight — check SUPABASE_ACCESS_TOKEN
>         run: echo "SUPABASE_ACCESS_TOKEN present? ${{ secrets.SUPABASE_ACCESS_TOKEN != '' }}"
>         continue-on-error: true
>
>       - name: Install Supabase CLI
>         if: ${{ secrets.SUPABASE_ACCESS_TOKEN != '' }}
>         uses: supabase/setup-cli@v1
>
>       - name: List functions (runner view)
>         if: ${{ secrets.SUPABASE_ACCESS_TOKEN != '' }}
>         env:
>           SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
>         run: |
>           supabase functions list --project-ref ycdxbpibncqcchqiihfz
>
>       - name: Diagnose wall_feed (anon)
>         continue-on-error: true
>         run: |
>           $url = "$env:SUPABASE_URL/functions/v1/wall_feed"
>           $h = @{ apikey=$env:SUPABASE_PUBLISHABLE_KEY; Authorization="Bearer $($env:SUPABASE_PUBLISHABLE_KEY)" }
>           try {
>             $r = Invoke-WebRequest -Uri $url -Headers $h -Method GET -UseBasicParsing -TimeoutSec 30
>             $status = $r.StatusCode; $body = $r.Content
>           } catch {
>             if ($_.Exception.Response) {
>               $status = [int]$_.Exception.Response.StatusCode.Value__
>               $sr = New-Object IO.StreamReader ($_.Exception.Response.GetResponseStream())
>               $body = $sr.ReadToEnd()
>             } else { $status = "ERR"; $body = $_.Exception.Message }
>           }
>           $snippet = if ($body) { $body.Substring(0,[Math]::Min(300,$body.Length)) } else { "" }
>           "URL: $url"              | Out-File -Encoding UTF8 SUMMARY.md
>           "STATUS: $status"        | Out-File -Append -Encoding UTF8 SUMMARY.md
>           "BODY[0..300]: $snippet" | Out-File -Append -Encoding UTF8 SUMMARY.md
>
>       - name: Upload probe summary
>         if: ${{ always() }}
>         uses: actions/upload-artifact@v4
>         with:
>           name: prod-edge-probe
>           path: SUMMARY.md
>           if-no-files-found: warn
> ```
>
> ```powershell
> git add .github/workflows/prod-edge-probe.yml
> git commit -m "CI: reset probe to clean baseline"
> git push
> ```
---

---

### TASK: Make import-prices SRK-free via SECURITY DEFINER RPC + publishable key CONFIRM: YES

Context: Windows PowerShell at `C:\grookai_vault`; project is linked (`ycdxbpibncqcchqiihfz`). Goal: remove SRK usage, call a definer RPC from Edge using only publishable key + shared token, redeploy, probe, and log.

1) Add SQL RPC (security definer)

Create `supabase/migrations/now_import_prices_definer.sql` with:

```
create schema if not exists admin;
create or replace function admin.import_prices_do(_payload jsonb, _bridge_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if _bridge_token is distinct from current_setting('app.bridge_token', true) then
    raise exception 'unauthorized';
  end if;
  -- TODO: perform the real inserts/updates using _payload
  return jsonb_build_object('ok', true, 'received', _payload);
end;
$$;
revoke all on function admin.import_prices_do(jsonb, text) from public;
grant execute on function admin.import_prices_do(jsonb, text) to anon;
```

Apply migration (psql or your normal migration runner).

2) Set function secrets (no SRK)

Ensure (or set):

```
supabase secrets set "SUPABASE_URL=https://ycdxbpibncqcchqiihfz.supabase.co"
supabase secrets set "SUPABASE_PUBLISHABLE_KEY=$env:SUPABASE_PUBLISHABLE_KEY"
```

Generate a private bridge token once (GUID) and set:

```
if (-not $env:BRIDGE_IMPORT_TOKEN) { $env:BRIDGE_IMPORT_TOKEN=[guid]::NewGuid().ToString() }
supabase secrets set "BRIDGE_IMPORT_TOKEN=$env:BRIDGE_IMPORT_TOKEN"
```

3) Patch Edge Function (`supabase/functions/import-prices/index.ts`) to SRK-free

Replace auth + write logic with:

```ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const url   = Deno.env.get("SUPABASE_URL")!;
const pub   = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const token = Deno.env.get("BRIDGE_IMPORT_TOKEN")!;

export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const body = await req.json().catch(() => ({}));
  if (req.headers.get("x-bridge-token") !== token) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(url, pub);
  // Optionally set GUC so the RPC can read it via current_setting
  await supabase.rpc('set_config', { parameter: 'app.bridge_token', value: token, is_local: true });

  const { data, error } = await supabase.rpc('admin.import_prices_do', {
    _payload: body,
    _bridge_token: token, // or null if you rely solely on set_config above
  });

  if (error) return new Response(JSON.stringify({ ok:false, error }), { status: 500 });
  return new Response(JSON.stringify({ ok:true, data }), { status: 200, headers: { "content-type": "application/json" }});
};
```

Stage/commit if changed:

```
git add supabase/functions/import-prices/index.ts supabase/migrations/*.sql
git commit -m "feat(import-prices): SRK-free via SECURITY DEFINER RPC + publishable key"
git push
```

4) Update Bridge probe to use publishable key + token

Edit `scripts/bridge_task_import_prices.ps1` headers to:

```
$headers = @{
  "Authorization" = "Bearer $($env:SUPABASE_PUBLISHABLE_KEY)"
  "apikey"        = $env:SUPABASE_PUBLISHABLE_KEY
  "x-bridge-token"= $env:BRIDGE_IMPORT_TOKEN
}
```

5) Redeploy + probe + log
```
supabase functions deploy import-prices
./scripts/bridge_task_import_prices.ps1
```

Write `reports/import_prices_srk_free_<timestamp>.txt` with the single probe result line.

✅ Acceptance

- No SRK or SUPABASE_SECRET_KEY used anywhere in the function.
- Secrets set: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, BRIDGE_IMPORT_TOKEN.
- Probe prints: [Bridge] import-prices → Code=200 Ok=True.
- SQL function exists and is SECURITY DEFINER with anon execute.

Notes

Keep BRIDGE_IMPORT_TOKEN private; it’s not a user-facing secret.

If you later expand, you can reuse this pattern for other write flows (one RPC per capability).

---

> ### TASK: Modernize `import-prices` Edge Function auth and redeploy (Supabase → SECRET_KEY) CONFIRM: YES
>
> **Context:** Windows PowerShell @ `C:\\grookai_vault`
> Goal: Update `supabase/functions/import-prices/index.ts` to use the new `SECRET_KEY` convention instead of `SECRET_KEY`, redeploy, and verify the function returns `200 OK` in the Bridge probe.
>
> ---
>
> #### **Steps to perform**
>
> 1. **Locate file:**
>    `C:\\grookai_vault\\supabase\\functions\\import-prices\\index.ts`
>
> 2. **Replace the legacy key block**
>
>    * **Find**:
>
>      ```ts
>      const SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SECRET_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || "";
>      if (!SUPABASE_URL || !SECRET_KEY) {
>        throw new Error("Missing env: SECRET_KEY and/or PROJECT_URL.");
>      }
>      function srHeaders() {
>        return {
>          apikey: SECRET_KEY,
>          Authorization: `Bearer ${SECRET_KEY}`,
>          "Content-Type": "application/json",
>          Prefer: "count=exact"
>        };
>      }
>      ```
>
>    * **Replace with:**
>
>      ```ts
>      const SECRET_KEY =
>        Deno.env.get("SUPABASE_SECRET_KEY") ||
>        Deno.env.get("SECRET_KEY") ||
>        Deno.env.get("SB_SECRET_KEY") ||
>        "";
>
>      if (!SUPABASE_URL || !SECRET_KEY) {
>        throw new Error("Missing env: SECRET_KEY and/or PROJECT_URL.");
>      }
>
>      function srHeaders() {
>        return {
>          apikey: SECRET_KEY,
>          Authorization: `Bearer ${SECRET_KEY}`,
>          "Content-Type": "application/json",
>          Prefer: "count=exact"
>        };
>      }
>      ```
>
> 3. **Save and redeploy**
>
>    ```powershell
>    supabase functions deploy import-prices
>    ```
>
> 4. **Run Bridge probe to verify**
>
>    ```powershell
>    ./scripts/bridge_task_import_prices.ps1
>    ```
>
> 5. **If output shows**
>
>    ```
>    [Bridge] import-prices → Code=200 Ok=True
>    ```
>
>    then commit and push:
>
>    ```powershell
>    git add supabase/functions/import-prices/index.ts
>    git commit -m "fix(import-prices): align auth with SUPABASE_SECRET_KEY"
>    git push
>    ```
>
> ---
>
> #### ✅ **Validation**
>
> * `import-prices` redeploys successfully to project `ycdxbpibncqcchqiihfz`.
> * Bridge probe output returns `Code=200 Ok=True`.
> * Nightly CI comment shows `import-prices ✅` in summary.
>
> ---
>
> **Goal:** Fully modernize the `import-prices` function to match new environment variable standards and confirm successful operation through Bridge automation.

---

### TASK: CI probe for `import-prices` (publishable only) + one-click token mint (Windows/PowerShell) CONFIRM: YES

**Repo:** `C:\grookai_vault` — **Shell:** `pwsh` — **Project ref:** `ycdxbpibncqcchqiihfz`
**Keys rule:** never use legacy names. Only `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server), `BRIDGE_IMPORT_TOKEN` (function-scoped).

---

#### 1) Add GitHub Actions workflow: `.github/workflows/prod-import-prices-validate.yml`

Create the file with:

```yaml
name: Prod Import-Prices Validate
on:
  workflow_dispatch:
  schedule:
    - cron: "*/30 * * * *"   # every 30 min
  push:
    branches: [ main ]
    paths:
      - "supabase/functions/import-prices/**"

permissions:
  contents: read

env:
  SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
  SUPABASE_PUBLISHABLE_KEY: ${{ secrets.PROD_PUBLISHABLE_KEY }}
  BRIDGE_IMPORT_TOKEN: ${{ secrets.PROD_BRIDGE_IMPORT_TOKEN_IMPORT_PRICES }}

jobs:
  validate:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: pwsh version
        shell: pwsh
        run: '$PSVersionTable.PSVersion.ToString()'

      - name: Direct A→B→curl validator (no legacy)
        shell: pwsh
        run: |
          Set-StrictMode -Version Latest
          $ErrorActionPreference = "Stop"
          $ProgressPreference = "SilentlyContinue"
          $url  = "$(($env:SUPABASE_URL.TrimEnd('/')))/functions/v1/import-prices"
          $body = '{"ping":"ok"}'
          function Try-Post($headers, $variant) {
            try {
              $resp = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 10
              Write-Host "$variant -> CODE=$($resp.StatusCode)"
              return [int]$resp.StatusCode
            } catch {
              $c = try { $_.Exception.Response.StatusCode.value__ } catch { -1 }
              Write-Host "$variant -> ERROR: $($_.Exception.Message)"
              if ($c -ne -1) { Write-Host "$variant -> CODE=$c" }
              return $c
            }
          }
          $hA = @{ apikey = $env:SUPABASE_PUBLISHABLE_KEY; 'x-bridge-token' = $env:BRIDGE_IMPORT_TOKEN; 'Content-Type'='application/json' }
          $codeA = Try-Post $hA 'A'
          if ($codeA -ge 200 -and $codeA -lt 300) { exit 0 }
          $hB = $hA.Clone(); $hB['Authorization'] = "Bearer $($env:SUPABASE_PUBLISHABLE_KEY)"
          $codeB = Try-Post $hB 'B'
          if ($codeB -ge 200 -and $codeB -lt 300) { exit 0 }
          if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
            $out = & curl -sS -i -X POST `
              -H "apikey: $env:SUPABASE_PUBLISHABLE_KEY" `
              -H "x-bridge-token: $env:BRIDGE_IMPORT_TOKEN" `
              -H "Content-Type: application/json" `
              --max-time 10 `
              --data $body `
              $url
            $first = ($out -split "`n")[0]
            if ($first -match 'HTTP/\S+\s+(\d{3})') {
              $codeC = [int]$Matches[1]
              Write-Host "C (curl) -> CODE=$codeC"
              if ($codeC -ge 200 -and $codeC -lt 300) { exit 0 }
            } else {
              Write-Host "C (curl) -> no status parsed"
            }
          }
          Write-Error "Import-prices validation failed (A=$codeA, B=$codeB). Check dashboard toggle and headers."
```

**Repo secrets required (set in GitHub → Settings → Secrets and variables → Actions):**

* `PROD_SUPABASE_URL` = `https://ycdxbpibncqcchqiihfz.supabase.co`
* `PROD_PUBLISHABLE_KEY` = your `sb_publishable_…`
* `PROD_BRIDGE_IMPORT_TOKEN_IMPORT_PRICES` = function-scoped token you minted for `import-prices`

---

#### 2) Add one-click token mint script (local): `scripts/mint_import_token.ps1`

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location (Split-Path $PSCommandPath -Parent | Split-Path -Parent)  # repo root

$proj = "ycdxbpibncqcchqiihfz"
try { supabase link --project-ref $proj | Out-Null } catch {}

# Generate secure 64-hex token (no openssl required)
$token = [Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")
$envFile = "supabase/functions/import-prices/.env"
if (-not (Test-Path (Split-Path $envFile -Parent))) { New-Item -ItemType Directory -Path (Split-Path $envFile -Parent) | Out-Null }
Set-Content -Path $envFile -Value ("BRIDGE_IMPORT_TOKEN="+$token) -Encoding UTF8

supabase secrets set BRIDGE_IMPORT_TOKEN=$token --project-ref $proj --env-file $envFile
supabase functions deploy import-prices --project-ref $proj

Write-Host "`nNew BRIDGE_IMPORT_TOKEN (store securely):`n$token" -ForegroundColor Cyan
```

Add a VS Code task:

```json
{
  "label": "Bridge: Mint Import Token",
  "type": "shell",
  "command": "pwsh",
  "args": ["-NoProfile","-Command","Set-Location C:\\grookai_vault; ./scripts/mint_import_token.ps1"],
  "options": { "cwd": "C:\\grookai_vault" },
  "problemMatcher": []
}
```

---

#### 3) Docs: add a short runbook `docs/IMPORT_PRICES_PROBE.md`

```markdown
# import-prices — probe & tokens (publishable only)
- Dashboard → Edge Functions → **import-prices** → **Verify JWT (legacy) = OFF**, then **Deploy** (from dashboard).
- Headers when JWT off:
  - A: `apikey: $SUPABASE_PUBLISHABLE_KEY`, `x-bridge-token: $BRIDGE_IMPORT_TOKEN`
  - B: same + `Authorization: Bearer $SUPABASE_PUBLISHABLE_KEY`
- Mint token locally: **Tasks → Bridge: Mint Import Token** (prints the token once).
- Local validate: **Tasks → Validate: import-prices (publishable, A→B→curl)**.
- CI validate: **Actions → Prod Import-Prices Validate** (uses repo secrets).
```

---

#### 4) Commit

```
git add .github/workflows/prod-import-prices-validate.yml scripts/mint_import_token.ps1 docs/IMPORT_PRICES_PROBE.md .vscode/tasks.json
git commit -m "ci(import-prices): add prod validator (publishable only) + one-click token mint (pwsh)"
```

**Done when:**

* Local validator: `PASS ✅` (A or B or curl C).
* GitHub Action run: **green** on main and on manual dispatch.
* Runbook present; no legacy key names anywhere.
---


---

### TASK: Fix CI validator — try **B→A→curl**, verify publishable belongs to this project, add safe debug + step summary CONFIRM: YES

**Repo:** `C:\grookai_vault` **Shell:** `pwsh` **Project:** `ycdxbpibncqcchqiihfz`
**Secrets used in CI:** `PROD_SUPABASE_URL`, `PROD_PUBLISHABLE_KEY`, `PROD_BRIDGE_IMPORT_TOKEN_IMPORT_PRICES`
**Never print secrets.** Only print masked/hashes.

---

#### 1) Patch `.github/workflows/prod-import-prices-validate.yml`

* In the only job’s “Direct A→B→curl validator (no legacy)” step, replace the whole script block with:

  ```powershell
  Set-StrictMode -Version Latest
  $ErrorActionPreference = "Stop"
  $ProgressPreference = "SilentlyContinue"

  function Mask($s) { if (-not $s) { return "(empty)" } if ($s.Length -le 6) { return "***" } return ($s.Substring(0,3) + "…" + $s.Substring($s.Length-3)) }
  function Hash8($s) { if (-not $s) { return "NA" } try { ($s | ConvertTo-SecureString -AsPlainText -Force | ConvertFrom-SecureString) | Out-Null } catch {}; $sha = [System.Security.Cryptography.SHA256]::Create(); $b=[Text.Encoding]::UTF8.GetBytes($s); $h=$sha.ComputeHash($b); ([BitConverter]::ToString($h)).Replace('-','').Substring(0,8) }

  # Guard secrets early
  if (-not $env:SUPABASE_URL) { Write-Error "Missing SUPABASE_URL"; }
  if (-not $env:SUPABASE_PUBLISHABLE_KEY) { Write-Error "Missing publishable key (PROD_PUBLISHABLE_KEY)"; }
  if (-not $env:BRIDGE_IMPORT_TOKEN) { Write-Error "Missing bridge token (PROD_BRIDGE_IMPORT_TOKEN_IMPORT_PRICES)"; }

  # Print safe diagnostics (no secrets)
  Write-Host "SUPABASE_URL host  : " ([uri]$env:SUPABASE_URL).Host
  Write-Host "Project ref expect : ycdxbpibncqcchqiihfz"
  Write-Host "PUB masked/hash8   : " (Mask $env:SUPABASE_PUBLISHABLE_KEY) " / " (Hash8 $env:SUPABASE_PUBLISHABLE_KEY)
  Write-Host "BRIDGE masked/hash8: " (Mask $env:BRIDGE_IMPORT_TOKEN) " / " (Hash8 $env:BRIDGE_IMPORT_TOKEN)

  $url  = "$(($env:SUPABASE_URL.TrimEnd('/')))/functions/v1/import-prices"
  $body = '{"ping":"ok"}'

  function Try-Post($headers, $variant) {
    try {
      $resp = Invoke-WebRequest -Method POST -Uri $url -Headers $headers -Body $body -UseBasicParsing -TimeoutSec 20
      Write-Host "$variant -> CODE=$($resp.StatusCode)"
      return [int]$resp.StatusCode
    } catch {
      $c = try { $_.Exception.Response.StatusCode.value__ } catch { -1 }
      $msg = $_.Exception.Message
      Write-Host "$variant -> ERROR: $msg"
      if ($c -ne -1) { Write-Host "$variant -> CODE=$c" }
      return $c
    }
  }

  # Variant B FIRST: apikey + Authorization mirroring publishable
  $hB = @{ apikey = $env:SUPABASE_PUBLISHABLE_KEY; 'x-bridge-token' = $env:BRIDGE_IMPORT_TOKEN; 'Content-Type'='application/json'; Authorization = "Bearer $($env:SUPABASE_PUBLISHABLE_KEY)" }
  $codeB = Try-Post $hB 'B'
  if ($codeB -ge 200 -and $codeB -lt 300) { $final='B'; $finalCode=$codeB; goto :done }

  # Variant A: apikey only
  $hA = @{ apikey = $env:SUPABASE_PUBLISHABLE_KEY; 'x-bridge-token' = $env:BRIDGE_IMPORT_TOKEN; 'Content-Type'='application/json' }
  $codeA = Try-Post $hA 'A'
  if ($codeA -ge 200 -and $codeA -lt 300) { $final='A'; $finalCode=$codeA; goto :done }

  # Variant C: curl fallback
  $final='C'; $finalCode=-1
  if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
    $out = & curl -sS -i -X POST `
      -H "apikey: $env:SUPABASE_PUBLISHABLE_KEY" `
      -H "x-bridge-token: $env:BRIDGE_IMPORT_TOKEN" `
      -H "Content-Type: application/json" `
      --max-time 20 `
      --data $body `
      $url
    $first = ($out -split "`n")[0]
   if ($first -match 'HTTP/\S+\s+(\d{3})') { $finalCode = [int]$Matches[1]; Write-Host "C (curl) -> CODE=$finalCode" } else { Write-Host "C (curl) -> no status parsed" }
  } else {
    Write-Host "C (curl) -> curl.exe not available"
  }

  :done
  # Step summary
  $sum = @()
  $sum += "| Field | Value |"
  $sum += "|---|---|"
  $sum += "| URL host | $(([uri]$env:SUPABASE_URL).Host) |"
  $sum += "| Project ref (expected) | ycdxbpibncqcchqiihfz |"
  $sum += "| Publishable hash8 | $(Hash8 $env:SUPABASE_PUBLISHABLE_KEY) |"
  $sum += "| Bridge hash8 | $(Hash8 $env:BRIDGE_IMPORT_TOKEN) |"
  $sum += "| Variant used | $final |"
  $sum += "| Final code | $finalCode |"
  $sumText = $sum -join "`n"
  $sumText | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8

  if ($finalCode -ge 200 -and $finalCode -lt 300) { exit 0 }

  if ($finalCode -eq 401) {
    Write-Error "401 from gateway. Ensure dashboard: Verify JWT (legacy)=OFF and you deployed from dashboard; confirm bridge token belongs to function and publishable key belongs to this project."
  } else {
    Write-Error "Validation failed (Variant=$final Code=$finalCode). Check network/timeouts, secrets, and headers."
  }
  ```

* Remove any prior guards that error on missing BRIDGE token if you added them elsewhere (the new script already does).

---

#### 2) Add a local **publishable key hash check** (to compare with CI)

* File: `scripts/hash_publishable.ps1`

  ```powershell
  Set-StrictMode -Version Latest
  $ErrorActionPreference = "Stop"
  if (-not $env:SUPABASE_PUBLISHABLE_KEY) { throw "Set SUPABASE_PUBLISHABLE_KEY in this session first." }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  $h = $sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($env:SUPABASE_PUBLISHABLE_KEY))
  $hex = ([BitConverter]::ToString($h)).Replace('-','')
  Write-Host ("Local publishable hash8: {0}" -f $hex.Substring(0,8))
  ```
* VS Code task (append to `.vscode/tasks.json`):

  ```json
  {
    "label": "Debug: Hash publishable (local)",
    "type": "shell",
    "command": "pwsh",
    "args": ["-NoProfile","-Command","Set-Location C:\\grookai_vault; ./scripts/hash_publishable.ps1"],
    "options": { "cwd": "C:\\grookai_vault" },
    "problemMatcher": []
  }
  ```

---

#### 3) Commit

```
git add .github/workflows/prod-import-prices-validate.yml scripts/hash_publishable.ps1 .vscode/tasks.json
git commit -m "ci(import-prices): B→A→curl; safe debug; hash8 comparers; timeouts 20s"
```

---

#### 4) Run

* Locally, set env and print your hash:

  ```powershell
  $env:SUPABASE_PUBLISHABLE_KEY = "<your sb_publishable_…>"
  task: Debug: Hash publishable (local)
  ```

  Compare the **hash8** printed locally with the one in the Action’s **Step Summary** after next run — they should match.
* Dispatch CI again:

  ```powershell
  $wf = ".github/workflows/prod-import-prices-validate.yml"
  gh workflow run $wf
  gh run list --workflow $wf --limit 1
  gh run watch <runId>
  ```

**Done when:** CI **Step Summary** shows your expected host, project ref, matching publishable **hash8**, and **Final code 200** with Variant **B** or **A**. If still failing, use the printed Variant/Code + hashes to pinpoint secret mismatch vs gateway rules.
---


---

### TASK: Update CI secrets with correct values (publishable + bridge), then re-run validator CONFIRM: YES

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location C:\grookai_vault
$repo = git config --get remote.origin.url

function ReadPlain($label){
  $s = Read-Host -AsSecureString $label
  $p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
  try { [Runtime.InteropServices.Marshal]::PtrToStringUni($p) } finally { if($p -ne [IntPtr]::Zero){ [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) } }
}

$pub = ReadPlain "Paste CORRECT SUPABASE_PUBLISHABLE_KEY (sb_publishable_…)"
$brg = ReadPlain "Paste CORRECT BRIDGE_IMPORT_TOKEN (function-scoped for import-prices)"

$pub | gh secret set PROD_PUBLISHABLE_KEY --repo $repo
$brg | gh secret set PROD_BRIDGE_IMPORT_TOKEN_IMPORT_PRICES --repo $repo
Write-Host "Secrets updated." -ForegroundColor Green

$wf = ".github/workflows/prod-import-prices-validate.yml"
gh workflow run $wf
Start-Sleep 4
$run = gh run list --workflow $wf --limit 1 --json databaseId,status,conclusion,url | ConvertFrom-Json
$runId = $run[0].databaseId
gh run watch $runId
---


---

### TASK: Surface CI validator debug (print summary to console), re-run, parse, and compare with local hash8 CONFIRM: YES

**Repo:** `C:\grookai_vault` **Shell:** `pwsh` **Project:** `ycdxbpibncqcchqiihfz`

1. Patch `.github/workflows/prod-import-prices-validate.yml` so the validator step prints its summary to the console as well (not just `$GITHUB_STEP_SUMMARY`):

```powershell
$wf = ".github/workflows/prod-import-prices-validate.yml"
$text = Get-Content $wf -Raw
# Duplicate the summary block to also Write-Host each line.
$text = $text -replace '(?s)\$sumText \| Out-File -FilePath \$env:GITHUB_STEP_SUMMARY -Append -Encoding utf8\s*',
'
  $sumText | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Append -Encoding utf8
  $sum | ForEach-Object { Write-Host $_ }
'
Set-Content $wf $text -Encoding UTF8

git add $wf
git commit -m "ci(import-prices): echo validator summary to console for log scraping"
```

2. Re-run the workflow and watch:

```powershell
$wf = ".github/workflows/prod-import-prices-validate.yml"
gh workflow run $wf
Start-Sleep 5
$r = gh run list --workflow $wf --limit 1 --json databaseId,status,conclusion,url | ConvertFrom-Json
$runId = $r[0].databaseId
gh run watch $runId
$logs = gh run view $runId --log
$logs | Out-File -FilePath reports\ci_import_prices_latest.log -Encoding utf8
Write-Host "Saved full logs to reports\ci_import_prices_latest.log"
```

3. Parse Variant/Code + hash8 from the logs:

```powershell
$lines = Get-Content reports\ci_import_prices_latest.log
$urlHost   = ($lines | Select-String -Pattern "URL host").Line
$projRef   = ($lines | Select-String -Pattern "Project ref").Line
$pubHash   = ($lines | Select-String -Pattern "Publishable hash8").Line
$brgHash   = ($lines | Select-String -Pattern "Bridge hash8").Line
$variantLn = ($lines | Select-String -Pattern "Variant used").Line
$codeLn    = ($lines | Select-String -Pattern "Final code").Line

Write-Host $urlHost
Write-Host $projRef
Write-Host $pubHash
Write-Host $brgHash
Write-Host $variantLn
Write-Host $codeLn
```

4. Compare with your local hash8s (prompt & compute now):

```powershell
function Hash8([string]$s){$sha=[Security.Cryptography.SHA256]::Create();$h=$sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($s));([BitConverter]::ToString($h)).Replace("-","").Substring(0,8)}
$pubSec = Read-Host -AsSecureString "Paste LOCAL SUPABASE_PUBLISHABLE_KEY (sb_publishable_…)"
$brgSec = Read-Host -AsSecureString "Paste LOCAL BRIDGE_IMPORT_TOKEN (import-prices)"
$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($pubSec); $PUB=[Runtime.InteropServices.Marshal]::PtrToStringUni($p); [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)
$q=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($brgSec); $BRG=[Runtime.InteropServices.Marshal]::PtrToStringUni($q); [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($q)
"Local publishable hash8: $(Hash8 $PUB)"
"Local bridge hash8     : $(Hash8 $BRG)"
```

5. Decision logic (print exact fix):

```powershell
$ciPub = ($pubHash -split '\|')[-1].Trim()
$ciBrg = ($brgHash -split '\|')[-1].Trim()
$ciVar = ($variantLn -split '\|')[-1].Trim()
$ciCode= ($codeLn -split '\|')[-1].Trim()

$locPub = (Hash8 $PUB)
$locBrg = (Hash8 $BRG)

Write-Host "`n=== Comparison ==="
Write-Host "CI publishable hash8: $ciPub"
Write-Host "Local publishable   : $locPub"
Write-Host "CI bridge hash8     : $ciBrg"
Write-Host "Local bridge        : $locBrg"
Write-Host "Variant/Code        : $ciVar / $ciCode"

if ($ciPub -ne $locPub) {
  Write-Warning "Mismatch: CI publishable key is not the same as your local. Update PROD_PUBLISHABLE_KEY secret to the CORRECT sb_publishable_… and re-run."
} elseif ($ciBrg -ne $locBrg) {
  Write-Warning "Mismatch: CI bridge token differs. Update PROD_BRIDGE_IMPORT_TOKEN_IMPORT_PRICES to the NEW token minted for import-prices and re-run."
} elseif ([int]$ciCode -eq 401) {
  Write-Warning "401 from gateway with B→A→curl. Double-check dashboard toggle is OFF (already) and redeploy from dashboard; then re-run. If still 401, the project may require mirrored Authorization — which we already do in Variant B — or the token header name differs."
} elseif ([int]$ciCode -eq -1 -or [int]$ciCode -eq 408) {
  Write-Warning "Timeout/connection closed on runner. Re-run; if it persists, bump timeouts to 30s and keep curl fallback."
} elseif ([int]$ciCode -ge 200 -and [int]$ciCode -lt 300) {
  Write-Host "PASS: Runner is green (unexpected branch)."
} else {
  Write-Warning "Non-200 ($ciCode). Inspect logs in reports\\ci_import_prices_latest.log."
}
```
---


---

### TASK: Run Import-Prices Validation Workflow (PowerShell, full cycle) CONFIRM: YES

You’re at `C:\grookai_vault` using **Windows PowerShell**.
Objective: trigger the `prod-import-prices-validate-pub.yml` workflow **by file path**, watch until completion, save the logs, and print the 6-line diagnostic summary.

---

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location C:\grookai_vault

$Owner   = "OriginalSoseji"
$Repo    = "grookai_vault"
$WfPath  = ".github/workflows/prod-import-prices-validate-pub.yml"
$Ref     = "main"
$ReportDir = "reports"
$LogPath = Join-Path $ReportDir "ci_import_prices_latest.log"
mkdir -Force $ReportDir | Out-Null

# 1️⃣ Verify workflow exists and has workflow_dispatch
gh api repos/$Owner/$Repo/contents/$WfPath -f ref=$Ref | Out-Null
$wfText = gh api repos/$Owner/$Repo/contents/$WfPath -f ref=$Ref --jq ".content" |
    Out-String | %{ [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_.Trim())) }
if ($wfText -notmatch "(?ms)^\s*on\s*:\s*(?:.*\n)*\s*workflow_dispatch\s*:") {
    throw "workflow_dispatch is missing in $WfPath on $Ref"
}

# 2️⃣ Trigger by file path (avoids 404 delay)
gh workflow run $WfPath --ref $Ref
Start-Sleep -Seconds 3

# 3️⃣ Locate latest run
$json = gh run list --workflow $WfPath --json databaseId,headBranch,createdAt --limit 5 | ConvertFrom-Json
$run = $json | Where-Object { $_.headBranch -eq $Ref } | Sort-Object createdAt -Descending | Select-Object -First 1
if (-not $run) { throw "No run found for $WfPath on $Ref." }
$runId = $run.databaseId

# 4️⃣ Watch until finished
gh run watch $runId

# 5️⃣ Download logs
gh run view $runId --log > $LogPath
Write-Host "Logs saved to $LogPath" -ForegroundColor Green

# 6️⃣ Parse six-line summary
$log = Get-Content $LogPath -Raw
function Grab($patterns) {
  foreach ($p in $patterns) {
    $m = [regex]::Match($log, $p, 'IgnoreCase,Multiline')
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
  }; return "<not found>"
}
$diagB = Grab @("(?m)Diag\s+echo\s+B\s+code\s*[:=]\s*(\d{3})")
$diagA = Grab @("(?m)Diag\s+echo\s+A\s+code\s*[:=]\s*(\d{3})")
$variant = Grab @("(?m)import-prices\s+Variant\s*[:=]\s*([^\r\n]+)")
$final = Grab @("(?m)import-prices\s+Final\s+code\s*[:=]\s*(\d{3})")
$pubHash = Grab @("(?m)Publishable\s+hash8\s*[:=]\s*([a-f0-9]{8})")
$bridgeHash = Grab @("(?m)Bridge\s+hash8\s*[:=]\s*([a-f0-9]{8})")

"`n--- Six-Line Summary ---"
"Diag echo B code: $diagB"
"Diag echo A code: $diagA"
"import-prices Variant: $variant"
"import-prices Final code: $final"
"Publishable hash8: $pubHash"
"Bridge hash8: $bridgeHash"
"--------------------------`n"
```

---

🧠 **Outcome:**

* Triggers workflow even if REST dispatch returns 404.
* Waits for run completion and saves logs to `reports\ci_import_prices_latest.log`.
* Prints the 6 required diagnostic lines for import-prices validation.
---


---

### TASK: Run Import-Prices Validation Workflow (Codex handles everything) CONFIRM: YES

You’re at `C:\grookai_vault` on Windows.
Goal: Codex triggers the `prod-import-prices-validate-pub.yml` GitHub workflow by file path, waits until completion, downloads the logs, saves them to `reports\ci_import_prices_latest.log`, and prints the six-line diagnostic summary.

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-Location C:\grookai_vault

$Owner   = "OriginalSoseji"
$Repo    = "grookai_vault"
$WfPath  = ".github/workflows/prod-import-prices-validate-pub.yml"
$Ref     = "main"
$ReportDir = "reports"
$LogPath = Join-Path $ReportDir "ci_import_prices_latest.log"
mkdir -Force $ReportDir | Out-Null

# 1️⃣ Verify workflow exists and includes workflow_dispatch
gh api repos/$Owner/$Repo/contents/$WfPath -f ref=$Ref | Out-Null
$wfText = gh api repos/$Owner/$Repo/contents/$WfPath -f ref=$Ref --jq ".content" |
    Out-String | %{ [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($_.Trim())) }
if ($wfText -notmatch "(?ms)^\s*on\s*:\s*(?:.*\n)*\s*workflow_dispatch\s*:") {
    throw "workflow_dispatch missing in $WfPath on $Ref"
}

# 2️⃣ Trigger by file path (avoids 404)
gh workflow run $WfPath --ref $Ref
Start-Sleep -Seconds 3

# 3️⃣ Locate latest run
$json = gh run list --workflow $WfPath --json databaseId,headBranch,createdAt --limit 5 | ConvertFrom-Json
$run = $json | Where-Object { $_.headBranch -eq $Ref } | Sort-Object createdAt -Descending | Select-Object -First 1
if (-not $run) { throw "No run found for $WfPath on $Ref" }
$runId = $run.databaseId

# 4️⃣ Watch until finished
gh run watch $runId

# 5️⃣ Download logs
gh run view $runId --log > $LogPath
Write-Host "Logs saved to $LogPath" -ForegroundColor Green

# 6️⃣ Parse six-line summary
$log = Get-Content $LogPath -Raw
function Grab($patterns) {
  foreach ($p in $patterns) {
    $m = [regex]::Match($log, $p, 'IgnoreCase,Multiline')
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
  }; return "<not found>"
}
$diagB = Grab @("(?m)Diag\s+echo\s+B\s+code\s*[:=]\s*(\d{3})")
$diagA = Grab @("(?m)Diag\s+echo\s+A\s+code\s*[:=]\s*(\d{3})")
$variant = Grab @("(?m)import-prices\s+Variant\s*[:=]\s*([^\r\n]+)")
$final = Grab @("(?m)import-prices\s+Final\s+code\s*[:=]\s*(\d{3})")
$pubHash = Grab @("(?m)Publishable\s+hash8\s*[:=]\s*([a-f0-9]{8})")
$bridgeHash = Grab @("(?m)Bridge\s+hash8\s*[:=]\s*([a-f0-9]{8})")

"`n--- Six-Line Summary ---"
"Diag echo B code: $diagB"
"Diag echo A code: $diagA"
"import-prices Variant: $variant"
"import-prices Final code: $final"
"Publishable hash8: $pubHash"
"Bridge hash8: $bridgeHash"
"--------------------------`n"
```
---

### TASK: Purge legacy queue items + enforce **apikey-only + bridge** validator (single-pass)

You are in Windows PowerShell at `C:\grookai_vault`. **Replace the entire contents** of `.codex/queue.md` with this task and execute it. The task will:

* Remove/disable any tasks and workflow files that still reference **legacy** keys or `Authorization: Bearer ...` for Supabase **Functions**
* Keep only the **apikey-only + x-bridge-token** model
* Add/normalize a single validator workflow and a one-click local validator script
* Leave a short success note in the commit message

---

**Edits to perform (exact):**

1. **Delete these legacy/conflicting tasks from `.codex/queue.md` (if present):**

* “TASK: Probe workflow sanity (demo)”
* “TASK: Clean baseline for the probe workflow (drop-in)”
* “TASK: Modernize import-prices … (Supabase → SECRET_KEY)”
* Any task that uses `Authorization: Bearer` to call `functions/v1/*`
  Keep none of them. Replace the queue with this task only.

2. **Remove/disable legacy probe workflows** if they still exist:

* Delete `.github/workflows/prod-edge-probe.yml`
* Delete `.github/workflows/prod-import-prices-validate-pub.yml`
* If you prefer not to delete, replace their content with:

  ```
  name: DISABLED (legacy)
  on: workflow_dispatch
  jobs: { disabled: { runs-on: ubuntu-latest, steps: [ { run: 'echo "disabled"' } ] } }
  ```

3. **Create/replace** `.github/workflows/prod-import-prices-validate-edge.yml` with an **apikey-only** validator:

```yaml
name: Prod Import-Prices Validate (apikey-only)
on:
  workflow_dispatch:
  push:
    branches: [ main ]
    paths:
      - "supabase/functions/import-prices/**"
  schedule:
    - cron: "*/30 * * * *"

permissions:
  contents: read

env:
  SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}

jobs:
  validate:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Emit six-line probe (apikey-only + bridge)
        shell: pwsh
        env:
          SUPABASE_PUBLISHABLE_KEY: ${{ secrets.PROD_PUBLISHABLE_KEY }}
          BRIDGE_IMPORT_TOKEN: ${{ secrets.BRIDGE_IMPORT_TOKEN }}
        run: |
          Set-StrictMode -Version Latest
          $ErrorActionPreference = "Stop"
          $u = "$(($env:SUPABASE_URL.TrimEnd('/')))/functions/v1/import-prices"
          $H = @{
            apikey           = $env:SUPABASE_PUBLISHABLE_KEY
            'x-bridge-token' = $env:BRIDGE_IMPORT_TOKEN
            'Content-Type'   = 'application/json'
          }
          $B = '{"ping":"ci-emit"}'
          try {
            $r = Invoke-WebRequest -Method POST -Uri $u -Headers $H -Body $B -UseBasicParsing -TimeoutSec 20
            $status = [string]$r.StatusCode
            $content = [string]$r.Content
          } catch {
            $status = try { [string]$_.Exception.Response.StatusCode.value__ } catch { '<unknown>' }
            $content = ''
          }
          function Hash8([string]$s){ if(-not $s){return '<none>'}; $sha=[Security.Cryptography.SHA256]::Create(); $h=$sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($s)); ([BitConverter]::ToString($h)).Replace('-','').Substring(0,8) }
          $body300 = if ($content.Length -gt 300) { $content.Substring(0,300) } else { $content }
          Write-Output "URL: $u"
          Write-Output "Method: POST"
          Write-Output "Status: $status"
          Write-Output "GatewayAuth: apikey_only"
          Write-Output ("BridgeTokenHash8: " + (Hash8 $env:BRIDGE_IMPORT_TOKEN))
          Write-Output "Body[0..300]: $body300"
```

4. **Ensure function config is set**:

* File: `supabase/functions/import-prices/config.toml`

```
verify_jwt = false
```

5. **Create/replace** `scripts/session_sync_bridge_and_validate.ps1` with **apikey-only** headers and short log retries:

```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function ReadSecret($label){ $s=Read-Host $label -AsSecureString; (New-Object System.Net.NetworkCredential('', $s)).Password }
if (-not $env:SUPABASE_PUBLISHABLE_KEY) { $env:SUPABASE_PUBLISHABLE_KEY = ReadSecret 'SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)' }
if (-not $env:BRIDGE_IMPORT_TOKEN)      { $env:BRIDGE_IMPORT_TOKEN      = ReadSecret 'BRIDGE_IMPORT_TOKEN' }

$u = 'https://ycdxbpibncqcchqiihfz.functions.supabase.co/import-prices'
$H = @{ apikey = $env:SUPABASE_PUBLISHABLE_KEY; 'x-bridge-token' = $env:BRIDGE_IMPORT_TOKEN; 'Content-Type'='application/json' }
$B = @{ ping='diag' } | ConvertTo-Json

# Direct POST (for status & body)
try {
  $resp = Invoke-WebRequest -Method POST -Uri $u -Headers $H -Body $B -UseBasicParsing
  $status = [string]$resp.StatusCode
  $body   = [string]$resp.Content
} catch {
  $status = try { [string]$_.Exception.Response.StatusCode.value__ } catch { '<unknown>' }
  $body   = ''
}

function H8([string]$s){ if(-not $s){return '<none>'}; $sha=[Security.Cryptography.SHA256]::Create(); $h=$sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($s)); ([BitConverter]::ToString($h)).Replace('-','').Substring(0,8) }

Write-Output "URL: $u"
Write-Output "Method: POST"
Write-Output "Status: $status"
Write-Output "GatewayAuth: apikey_only"
Write-Output ("BridgeTokenHash8: " + (H8 $env:BRIDGE_IMPORT_TOKEN))
Write-Output ("Body[0..300]: " + ($body.Substring(0,[Math]::Min(300,$body.Length))))

# Gate snapshot (best-effort: fetch logs a few times)
$gate = '<none>'
for ($i=0; $i -lt 5; $i++) {
  try {
    $log = supabase functions logs -f import-prices --project-ref ycdxbpibncqcchqiihfz 2>$null
    $line = ($log -split "`n") | Where-Object { $_ -match '\[IMPORT-PRICES\]\s+token\.check' } | Select-Object -First 1
    if ($line) { $gate = $line; break }
  } catch {}
  Start-Sleep -Seconds 2
}
Write-Output "`n--- Function Gate Snapshot ---"
Write-Output ($gate)
```

6. **Repo guard** (if not already present): `scripts/guard_no_legacy_keys.ps1`

* Fail on any of these **anywhere**: `SUPABASE_ANON_KEY`, `PROD_ANON_KEY`, `STAGING_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SERVICE_ROLE_KEY`, `PROD_SERVICE_ROLE_KEY`, `STAGING_SERVICE_ROLE_KEY`, or `Authorization:\s*Bearer` when targeting Supabase **functions**.

7. **Commit message:**

```
chore(ci/auth): purge legacy queue + enforce apikey-only validator and session probe
```

**End of task.**
