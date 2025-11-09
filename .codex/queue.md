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
>       SUPABASE_ANON_KEY: ${{ secrets.PROD_ANON_KEY }}
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
>           $h = @{ apikey=$env:SUPABASE_ANON_KEY; Authorization="Bearer $($env:SUPABASE_ANON_KEY)" }
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
> Goal: Update `supabase/functions/import-prices/index.ts` to use the new `SECRET_KEY` convention instead of `SERVICE_ROLE_KEY`, redeploy, and verify the function returns `200 OK` in the Bridge probe.
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
>      const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || "";
>      if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
>        throw new Error("Missing env: SERVICE_ROLE_KEY and/or PROJECT_URL.");
>      }
>      function srHeaders() {
>        return {
>          apikey: SERVICE_ROLE_KEY,
>          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
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
