TASK: Upgrade `backend/pokemon/pokemonapi_normalize_worker.mjs` so it loops over all pending pokemonapi rows (in batches) until none remain.

Scope guard:
- Only modify: `backend/pokemon/pokemonapi_normalize_worker.mjs`.
- Do NOT touch any other files.
- Keep the logic for processing a single batch (sets + cards) exactly the same.

Goals:
1) Instead of processing a single batch of up to 50 pending rows and exiting, the worker should:
   - Fetch up to 50 pending rows (source='pokemonapi').
   - Normalize them (using the existing logic).
   - Commit status updates.
   - Then fetch the next batch of pending rows.
   - Repeat until there are no pending rows left OR no progress is made.

2) The worker should still:
   - Maintain per-run summary counts:
     sets: { normalized, conflicts, errors, processed }
     cards: { normalized, conflicts, errors, processed }
   - But now those totals should be **across all batches**, not just the first 50 rows.

Implementation details (high level):
- Introduce an outer `while (true)` loop around the existing “fetch pending rows + process batch” logic.
- At the top of each loop:
  - Query `raw_imports` for up to 50 rows where:
    - source = 'pokemonapi'
    - status = 'pending'
  - If the result set is empty, `break` the loop (no more pending rows).
- Keep using the existing per-batch processing functions for sets/cards; do not change how individual rows are handled.
- Track cumulative totals across batches:
  - e.g. `totalSetsNormalized += batchSetsNormalized`, etc.
- If in any iteration the worker finds pending rows but, after running the batch logic, **no rows are normalized/conflicted/errored** (i.e., processed = 0), log a warning and `break` the loop to avoid an infinite loop.
- At the end, log a **single summary** using the cumulative totals.

Do NOT:
- Change how conflicts vs errors are classified.
- Change how notes/status are written per row.
- Change how many rows are fetched per batch (keep LIMIT 50).
- Change any behavior for non-pokemonapi sources.

Return:
- A short summary of the edits you made.
- Confirmation that a single `npm run pokemonapi:normalize` call will now keep looping batches until no pending pokemonapi rows remain (or no progress is possible).

---

TASK: Seller eBay Sync v1 foundations

You are connected to the Grookai Vault repo at C:\grookai_vault.

GOAL
Implement the backend foundations for **Seller eBay Sync v1**:

- A table to store each seller’s eBay OAuth tokens and marketplace metadata.
- A Supabase Edge Function to handle the OAuth callback and persist tokens.
- A backend worker to iterate over all connected sellers and ingest their sold orders into `price_observations` (mapping-aware, dry-run first).
- Documentation so we know how the flow works end-to-end.

We will NOT build Flutter UI in this task.
We will NOT expose this via public APIs yet; this is backend + Edge function only.

Follow all existing contracts:
- Migration Maintenance Contract (no destructive changes, IF NOT EXISTS, safe replay).
- card_prints is canonical identity.
- price_observations is the canonical raw pricing table.
- price_index_v1 is the canonical index (already implemented).
- Existing eBay client + ebay_self worker patterns should be reused where possible.

------------------------------------------------------------
0) QUICK AUDIT (READ-ONLY)
------------------------------------------------------------
Before making changes, quickly scan for existing seller/account structures to avoid duplication:

- Search for:
  - "seller", "sellers", "accounts", "marketplace_accounts"
  - "ebay_accounts"
  - "oauth"
  - "refresh_token"
- Scan:
  - supabase/migrations/**
  - supabase/functions/**
  - backend/**

If you find an existing table or pattern for external marketplace accounts, reuse it instead of creating a new one.
Otherwise, proceed with the design below.

Do NOT modify or remove any existing tables in this step. This is read-only.

------------------------------------------------------------
1) SCHEMA: ebay_accounts (per-seller token storage)
------------------------------------------------------------
If no suitable existing table exists, create a new table for storing per-seller eBay tokens and metadata.

Create a guarded migration:

  supabase/migrations/20251123090000_ebay_accounts_v1.sql

In this migration, create:

  public.ebay_accounts

Columns (use IF NOT EXISTS pattern where applicable):

- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
- user_id uuid NOT NULL
  - FK to the appropriate auth/users table used by this project
  - Use the same pattern as any existing tables that reference the authenticated user (check other migrations for how user_id FKs are defined).
- ebay_username text NULL
  - seller’s eBay account username, if known
- marketplace_id text NOT NULL DEFAULT 'EBAY_US'
  - e.g., 'EBAY_US', 'EBAY_GB', etc.
- access_token text NOT NULL
- refresh_token text NULL
- access_token_expires_at timestamptz NULL
- scopes text[] NULL
  - store granted scopes as an array of strings (optional but useful)
- is_active boolean NOT NULL DEFAULT true
- last_sync_at timestamptz NULL
- created_at timestamptz NOT NULL DEFAULT now()
- updated_at timestamptz NOT NULL DEFAULT now()

Add:

- An index on (user_id):
  ```sql
  CREATE INDEX IF NOT EXISTS ebay_accounts_user_id_idx
  ON public.ebay_accounts (user_id);
```

* An index on (is_active, last_sync_at):

  ```sql
  CREATE INDEX IF NOT EXISTS ebay_accounts_active_last_sync_idx
  ON public.ebay_accounts (is_active, last_sync_at);
  ```

Add inline comments:

* Table-level: this stores per-user eBay OAuth tokens for seller sync.
* Column-level commentary for user_id, marketplace_id, tokens, last_sync_at.

Ensure:

* No destructive ops.
* FK to user_id reuses your existing user identity pattern (auth.users or your own users table).

---

2. EDGE FUNCTION: eBay OAuth callback handler

---

Add a Supabase Edge Function to handle the OAuth redirect from eBay.

Create:

supabase/functions/ebay_oauth_callback/index.ts

Responsibilities:

* Accept GET/POST callback from eBay with:

  * code
  * state

* Validate the `state` parameter against a CSRF token or a signed Supabase auth token if you already have a pattern for that. If no pattern exists, include TODO comments and at minimum log a warning when state is missing or invalid.

* Exchange the `code` for access_token + refresh_token by calling eBay’s OAuth token endpoint using:

  * EBAY_CLIENT_ID
  * EBAY_CLIENT_SECRET
  * EBAY_REDIRECT_URI

  (Use the existing env vars already set up in `.env.example`; do NOT hard-code these values.)

* Identify the authenticated Supabase user:

  * Use whatever existing pattern you have in other Edge functions for reading the Supabase auth JWT (e.g. from Authorization header or cookies).
  * If no pattern exists yet, add TODO comments and assume a simple Bearer token for now, but do NOT leave this unauthenticated.

* Once user_id is known and tokens are obtained:

  * Upsert into `public.ebay_accounts`:

    * user_id
    * ebay_username (if available in the token response or via a follow-up identity call; otherwise leave null with TODO)
    * marketplace_id (default from env or from token; start with 'EBAY_US' if nothing else is available)
    * access_token
    * refresh_token
    * access_token_expires_at (if expiry is given in the token response)
    * scopes (if provided)
    * is_active = true
    * updated_at = now()

  Use Supabase client with service role / appropriate RLS bypass (if this table is protected) following your existing Edge function patterns.

* Respond with a simple HTML or JSON page indicating success, with a TODO noting that the frontend will eventually handle redirect back into the app cleanly.

Add comments at the top:

// ebay_oauth_callback:
// Handles eBay OAuth redirect, exchanges code for tokens, and stores them in public.ebay_accounts.
// This function assumes the caller is an authenticated Grookai Vault user and will be invoked after eBay login.

Update any function manifest/config (e.g., supabase/functions/ebay_oauth_callback/deno.json or function.json) as required by your repo to make the Edge Function deployable.

---

3. BACKEND: shared token helper for eBay sellers

---

Create a helper for retrieving and refreshing seller tokens.

New file:

backend/ebay/ebay_tokens.mjs

Responsibilities:

* Export a function:

  * `async getSellerEbayAuth(supabase, { ebayAccountId })`
  * Arguments:

    * supabase: backend client (createBackendClient)
    * ebayAccountId: uuid of the row in public.ebay_accounts (or later, user_id)

Behavior:

* Query `public.ebay_accounts` by id.
* If not found or not active, throw a descriptive error.
* Check if `access_token_expires_at` is in the past or about to expire.

  * If **no refresh_token** exists:

    * Log a warning that manual re-auth is required.
    * Return the existing access_token (for now) or throw if policy requires valid tokens.
  * If refresh_token exists and token is near expiry:

    * Call eBay OAuth token endpoint to refresh using refresh_token, EBAY_CLIENT_ID/SECRET, EBAY_REDIRECT_URI as needed.
    * Update `ebay_accounts.access_token`, `access_token_expires_at`, `updated_at`.
* Return:

  * accessToken
  * marketplaceId
  * ebayUsername (if set)

Include detailed TODO comments where:

* CSRF/state validation should be hardened.
* Per-seller error handling should be improved.
* Rate limit handling may be required.

This module must NOT log secrets; log only high-level status.

---

4. BACKEND: multi-seller ingestion worker (ebay_sellers_sync_worker)

---

Create a new worker to ingest sold orders for all connected sellers.

File:

backend/ebay/ebay_sellers_sync_worker.mjs

Pattern: follow existing worker style (parseArgs, main, createBackendClient) like:

* backend/pokemon/pokemonapi_import_cards_worker.mjs
* backend/ebay/ebay_self_orders_worker.mjs

Behavior:

1. parseArgs():

   * `--limit` (max orders per seller to ingest, optional)
   * `--seller-limit` (max sellers to process in one run, optional)
   * `--since` (ISO date string; if provided, only pull orders from this date forward)
   * `--dry-run` (flag; true = log would-be inserts only)

2. main():

   * Create Supabase backend client via existing helper (e.g., createBackendClient).
   * Query `public.ebay_accounts` for active sellers, ordered by `last_sync_at NULLS FIRST`, limited by `--seller-limit` (or a sensible default like 10).
   * For each seller:

     * Get tokens via `getSellerEbayAuth` from `ebay_tokens.mjs`.
     * Create an `EbayClient` instance using backend/clients/ebay_client.mjs:

       * baseUrl from EBAY_ENV / marketplace
       * accessToken from helper
       * marketplaceId from ebay_accounts row.
     * Call the same Fulfillment Orders endpoint as ebay_self worker:

       * `/sell/fulfillment/v1/order`
       * Use `--limit` and `--since` to narrow results.
     * For each lineItem:

       * (Phase 1) Build a normalized object for `price_observations`:

         * card_print_id: null (for now – we will wire mapping in a separate task)
         * source: 'ebay_self' or a new source if you prefer more specific naming (e.g., 'ebay_seller')
         * marketplace_id: from ebay_accounts.marketplace_id
         * order_id, order_line_item_id
         * observed_at: use order creation or paid date (document your choice with comments)
         * price_amount, currency
         * listing_type
         * raw_payload: full line-item JSON
       * If `--dry-run`:

         * Log a line showing seller, order_id, external ids, and whether card_print_id is currently null.
       * Else:

         * Insert into `price_observations` via Supabase.
         * For now, allow null card_print_id but log a warning. (We’ll tighten this in a future mapping task.)
     * After processing, update `ebay_accounts.last_sync_at = now()` for that seller.

3. Add an npm script in package.json:

   * `"pricing:ebay:sellers:sync": "node backend/ebay/ebay_sellers_sync_worker.mjs"`

Ensure robust logging:

* At start: log seller count, options.
* Per seller: log ID, username, how many orders processed.
* On errors: log error summaries but not secrets.

---

5. DOCS: Seller Sync flow

---

Create or update documentation to describe the seller sync architecture.

File:

docs/EBAY_SELLER_SYNC_V1.md

Include:

1. Overview:

   * Sellers connect their eBay account via OAuth.
   * Tokens are stored in `public.ebay_accounts`.
   * `ebay_sellers_sync_worker` periodically pulls sold orders and writes to `price_observations`.
   * Grookai Pricing Index v1 (price_aggregates_v1 + price_index_v1) eventually picks these up.

2. Tables:

   * ebay_accounts: structure and purpose.
   * price_observations: how a seller’s sale is represented (source, marketplace_id, observed_at, card_print_id, etc.).

3. Flow:

   * User taps "Connect eBay" in the app (future).
   * App opens eBay OAuth authorize URL with state.
   * eBay redirects to `supabase/functions/ebay_oauth_callback`.
   * Edge Function exchanges code → tokens and writes to ebay_accounts.
   * Sync worker runs:

     * loops over active ebay_accounts
     * pulls orders
     * inserts into price_observations
     * later, mapping layer will resolve card_print_id.

4. Future work notes (with TODO bullet list):

   * Harden state/CSRF checking in the callback.
   * Enforce non-null card_print_id before Index inclusion.
   * Integrate mapping helpers so line items resolve to prints using external_mappings.
   * Add a scheduled job (GitHub Actions or other) to run `pricing:ebay:sellers:sync` on a cadence.
   * Connect Pricing Index v1 to the frontend (Edge function + Flutter).

Keep this doc focused and high-level, with pointers to:

* docs/PRICING_INDEX_V1_CONTRACT.md
* docs/AUDIT_EBAY_MAPPING_L2.md
* docs/AUDIT_PRICING_ENGINE_L2.md

---

Task: Pricing Engine V3.1 + V3.2 - Persist full V3 condition curve into DB + expose a Get Live Price API/worker

Context:
- Root: C:\grookai_vault
- Engine V3 now produces a complete pricing summary (NM/LP/MP/HP/DMG medians + floors + sample counts + confidence).
- Currently, these results are only printed in dry-run and not saved anywhere.
- Goal: 
  (2) Add database schema support to store these V3 condition curves.  
  (3) Add a new API/worker for "Get Live Price" that returns the last snapshot OR triggers a fresh pricing run.

Constraints:
- MUST follow the Grookai Vault Migration Maintenance Contract.
- MUST follow the Audit Rule (schema + workers + API).
- Pricing logic stays in the pricing worker.
- No breaking changes to existing NM/LP snapshot system until fully replaced.
- V3 snapshot writes MUST be additive and safe.

────────────────────────────────────
(2) Add DB Persistence (Pricing Engine V3.1)
────────────────────────────────────

Add a new migration under:
  supabase/migrations/<timestamp>_pricing_v3_snapshots.sql

Migration requirements:

1. Create a new table: `public.card_print_price_curves`

Columns:
- id: uuid (PK, default uuid_generate_v4())
- card_print_id: uuid (FK to public.card_prints.id, required)
- created_at: timestamptz default now()
- nm_median numeric
- nm_floor numeric
- nm_samples integer
- lp_median numeric
- lp_floor numeric
- lp_samples integer
- mp_median numeric
- mp_floor numeric   -- OPTIONAL: compute floor the same way as LP if desired
- mp_samples integer
- hp_median numeric
- hp_floor numeric    -- OPTIONAL
- hp_samples integer
- dmg_median numeric
- dmg_floor numeric   -- OPTIONAL
- dmg_samples integer
- confidence numeric   -- V3 confidence score
- listing_count integer
- raw_json jsonb       -- full raw V3 output blob for debugging

Constraints:
- card_print_id NOT NULL
- FOREIGN KEY (card_print_id) REFERENCES public.card_prints(id) ON DELETE CASCADE
- Index on (card_print_id, created_at)

2. Create a view to get the latest snapshot per card:
  `public.card_print_latest_price_curve`

SELECT DISTINCT ON (card_print_id)
  *
FROM public.card_print_price_curves
ORDER BY card_print_id, created_at DESC;

3. Follow Migration Maintenance Contract:
- Wrap ALTERs & CREATEs with IF NOT EXISTS / IF EXISTS
- Safe to replay on a fresh DB

────────────────────────────────────
Worker writes (V3 snapshot write)
────────────────────────────────────

In:
  backend/pricing/ebay_browse_prices_worker.mjs

After computing the final V3 JSON summary, add a write step:

```js
// new function at bottom of file or near other write helpers
async function writeV3SnapshotToDB(summary) {
  const { 
    card_print_id, nm_median, nm_floor, raw_sample_count_nm,
    lp_median, lp_floor, raw_sample_count_lp,
    mp_median, raw_sample_count_mp,
    hp_median, raw_sample_count_hp,
    dmg_median, raw_sample_count_dmg,
    confidence, listing_count
  } = summary;

  const payload = {
    card_print_id,
    nm_median, nm_floor, nm_samples: raw_sample_count_nm,
    lp_median, lp_floor, lp_samples: raw_sample_count_lp,
    mp_median, mp_samples: raw_sample_count_mp,
    hp_median, hp_samples: raw_sample_count_hp,
    dmg_median, dmg_samples: raw_sample_count_dmg,
    confidence,
    listing_count,
    raw_json: summary,
  };

  const { data, error } = await supabase
    .from('card_print_price_curves')
    .insert(payload)
    .select();

  if (error) {
    console.error('[pricing][v3_snapshot_write] ERROR:', error);
    throw error;
  }

  console.log('[pricing][v3_snapshot_write] OK:', data[0].id);
}
```

Call it at the end of the worker (outside dry-run):

```js
if (!options.dryRun) {
  await writeV3SnapshotToDB(summary);
}
```

────────────────────────────────────
(3) Add "Get Live Price" API/Worker (Pricing Engine V3.2)
────────────────────────────────────

Add a new API/worker at:

backend/pricing/get_live_price_worker.mjs

Behavior:

1. Accepts args:

* card_print_id (uuid)
* force_refresh (boolean; default false)

2. If force_refresh = true:

   * Call the existing V3 pricing computation (shared helper)
   * Write a fresh snapshot using writeV3SnapshotToDB
   * Return the computed summary

3. If force_refresh = false:

   * Query `public.card_print_latest_price_curve` for card_print_id
   * If exists, return it
   * Else: compute fresh V3 pricing and write snapshot

Example:

```js
export async function getLivePrice(card_print_id, { force_refresh = false } = {}) {
  if (force_refresh) {
    return await computeAndStoreV3Price(card_print_id);
  }

  const { data, error } = await supabase
    .from('card_print_latest_price_curve')
    .select('*')
    .eq('card_print_id', card_print_id)
    .maybeSingle();

  if (error) {
    console.error('[getLivePrice] ERROR reading snapshot:', error);
  }

  if (data) {
    return data;
  }

  // fallback: compute new
  return await computeAndStoreV3Price(card_print_id);
}
```

4. Add a tiny CLI entry in the worker folder:

backend/pricing/get_live_price_cli.mjs

```js
import { getLivePrice } from './get_live_price_worker.mjs';

const card_print_id = process.argv[2];
const force = process.argv.includes('--force');

const result = await getLivePrice(card_print_id, { force_refresh: force });
console.log(JSON.stringify(result, null, 2));
```

────────────────────────────────────
Testing
────────────────────────────────────

After migration + worker edits:

```powershell
cd C:\grookai_vault

# Run a force refresh
node backend/pricing/get_live_price_cli.mjs daaa53ec-35d7-414b-a27c-f55748936699 --force

# Then run cached result
node backend/pricing/get_live_price_cli.mjs daaa53ec-35d7-414b-a27c-f55748936699
```

Expected:

* First call → computes V3 summary + writes snapshot
* Second call → instantly returns latest snapshot from DB

End of task.

---

6. FINAL CHECKS

---

Before finishing:

* Ensure migrations:

  * Are syntactically valid.
  * Use IF NOT EXISTS where appropriate.
  * Do not break existing schema.

* Ensure:

  * supabase/functions/ebay_oauth_callback/index.ts compiles (no TS/JS syntax errors).
  * backend/ebay/ebay_tokens.mjs and backend/ebay/ebay_sellers_sync_worker.mjs pass `node --check` or equivalent syntax check used in this repo.
  * package.json scripts are valid.

* Do NOT:

  * Attempt to hit real eBay endpoints in automated tests.
  * Log any real tokens or secrets.

In your summary, list:

* New tables or columns created (ebay_accounts).
* New Edge Function(s) created.
* New backend helpers/workers created.
* npm script(s) added.
* Any TODOs left open (mapping integration, non-null card_print_id enforcement, scheduling).

---

# CODEX TASK — Add Migration Drift Guardrail to Repo

Goal:
Codify our “no migration drift” rule in the repo so future work can’t ignore it. This should extend the existing Migration Maintenance Contract (if present) and add a clear, practical checklist.

Context (DO NOT CHANGE THE RULE, JUST ENCODE IT):
- Schema changes must ONLY occur through versioned migrations in git under supabase/migrations/.
- Before running `supabase db push` (to any remote), we MUST run `supabase migration list`.
- We must confirm there are NO remote-only migrations (rows where Remote has a value and Local is blank).
- If any remote-only migrations exist, we STOP and repair or pull before pushing.
- Local-only migrations are OK — they are exactly what `db push` is supposed to apply to remote.
- No direct schema edits in Supabase Studio or via ad-hoc SQL for structural changes.

Files:
- Prefer to update (or create) a contract doc:
  - If it exists: `docs/MIGRATION_MAINTENANCE_CONTRACT.md`
  - Otherwise: create `docs/MIGRATION_DRIFT_GUARDRAIL.md`

Tasks:

1. If `docs/MIGRATION_MAINTENANCE_CONTRACT.md` exists:
   - Open it and add a new section near the top called:
     `## Migration Drift Guardrail (No-Drift Rule)`
   - If it does NOT exist, create a new file `docs/MIGRATION_DRIFT_GUARDRAIL.md` with a short intro and the content below.

2. In that section, add a concise description of the rule in my own voice (founder/contract style), something like:

   - “The only source of truth for schema is `supabase/migrations` in git.”
   - “Schema changes never happen directly in Studio or via ad-hoc SQL; they only happen via migrations.”
   - “Before any `supabase db push`, we must run `supabase migration list` and confirm there are no remote-only migrations.”

3. Add a short, copy-pasteable checklist like:

   ### No-Drift Checklist (Run Before Any `supabase db push`)

   1. `supabase migration list`
   2. Confirm:
      - No rows where **Remote has a version and Local is blank** (remote-only drift).
      - Local-only rows are exactly the new migrations you intend to push.
   3. If remote-only drift exists:
      - STOP.
      - Use `supabase migration repair` or `supabase db pull` deliberately before proceeding.
   4. Only then run: `supabase db push`.

4. Add a short “Forbidden moves” bullet list:

   - ❌ No schema edits directly in Supabase Studio.
   - ❌ No `ALTER TABLE` / `CREATE TABLE` in random SQL tabs without a migration file.
   - ❌ No `db push` without first checking `migration list`.

5. Keep formatting clean (Markdown), and preserve any existing content / sections in the contract. Do not remove or rewrite other rules; just append/extend.

6. When done, show me the final contents of the modified/created doc so I can review it.

Do not run commands yourself; only edit files.
