# STABILIZATION CONTRACT V1

Status: ACTIVE
Type: System Governance Contract
Scope: Defines canonical truth vs compatibility layers during transition phase

---

# PURPOSE

This contract freezes architectural drift and defines:

- canonical system truth
- compatibility layers
- deprecated surfaces
- rules for all new development

No system may introduce new ambiguity after this contract.

---

# CANONICAL TRUTH

## Vault Truth (CURRENT PRODUCT)

Canonical ownership truth:

- `vault_item_instances`

Current app-facing vault behavior may still consume compatibility projections where needed.

Rules:

- All new ownership logic must treat `vault_item_instances` as canonical truth
- `vault_items` is not canonical ownership truth
- `vault_items` may remain present for compatibility during transition
- Compatibility projections may remain app-facing during stabilization, but they must not become the origin of new ownership logic
- No new feature may define ownership semantics from `vault_items`

### Vault Surface Status

Vault surface status is:

- `vault_item_instances` → ACTIVE CANONICAL OWNERSHIP TRUTH
- `getCanonicalVaultCollectorRows` → ACTIVE WEB CANONICAL READ MODEL ENTRY
- `v_vault_items_web` → ACTIVE COMPATIBILITY PROJECTION
- `v_vault_items`, `v_vault_items_ext`, `v_recently_added` → PRESENT / COMPATIBILITY OR DERIVED SURFACES
- `vault_items` → LEGACY STORAGE / NON-CANONICAL OWNERSHIP AUTHORITY

Retention of compatibility vault surfaces does NOT make them equal-authority ownership truth.
Presence in repo is not the same as canonical system authority.

---

## Pricing Truth (CURRENT PRODUCT)

Canonical active pricing engine:

- `v_grookai_value_v1_1`

Canonical app-facing pricing read surface:

- `v_best_prices_all_gv_v1`

Rules:

- All app reads must go through `v_best_prices_all_gv_v1`
- `v_best_prices_all_gv_v1` is the compatibility projection exposed to product surfaces
- `v_grookai_value_v1_1` is the active canonical pricing computation behind the current product
- No app-facing code may bypass `v_best_prices_all_gv_v1` to read lower-level pricing tables directly
- `v_grookai_value_v1` and `v_grookai_value_v2` may remain in the repo, but they are NOT the active pricing authority unless an explicit cutover contract says otherwise

### Pricing Version Status

Pricing surface status is:

- `v_grookai_value_v1_1` → ACTIVE CANONICAL ENGINE
- `v_best_prices_all_gv_v1` → ACTIVE APP-FACING COMPATIBILITY SURFACE
- `v_grookai_value_v1` → PRESENT / NON-ACTIVE
- `v_grookai_value_v2` → PRESENT / NON-ACTIVE
- legacy pricing workers, tables, and deprecated edge import lanes → DEPRECATED / NON-AUTHORITATIVE

Retention of non-active pricing versions does NOT make them equal-authority surfaces.
Presence in repo is not the same as active system truth.

---

## Env / Secrets Truth (CURRENT PRODUCT)

Canonical secret names:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `BRIDGE_IMPORT_TOKEN`

Rules:

- All new code must use canonical secret names only
- Legacy env names may remain only where required for compatibility with existing runtime surfaces
- Compatibility aliases do not define system authority
- No new code may introduce additional env-name variants for the same secret
- Mapping from canonical names into framework-specific aliases must occur only at explicit boundary layers

### Env Surface Status

Env surface status is:

- `SUPABASE_URL` → ACTIVE CANONICAL
- `SUPABASE_PUBLISHABLE_KEY` → ACTIVE CANONICAL
- `SUPABASE_SECRET_KEY` → ACTIVE CANONICAL
- `BRIDGE_IMPORT_TOKEN` → ACTIVE CANONICAL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → WEB COMPATIBILITY / FRAMEWORK ALIAS
- `SUPABASE_ANON_KEY` → LEGACY / COMPATIBILITY
- `SUPABASE_SERVICE_ROLE_KEY` → LEGACY / COMPATIBILITY

Retention of compatibility env names does NOT make them equal-authority names.
Presence in runtime code is not the same as canonical contract authority.

---

# COMPATIBILITY LAYERS

These exist to preserve current behavior:

- `vault_items`
- `v_vault_items_web`
- `v_best_prices_all_gv_v1`

Rules:

- May be READ from
- Must NOT be extended
- Must NOT be treated as source of truth

---

# DEPRECATED SURFACES

The following are NON-AUTHORITATIVE:

- import-prices edge functions (all variants)
- pricing_queue_worker.mjs
- any worker reading `card_prices`

Rules:

- Must not be used for new work
- Must be visually marked as deprecated

---

# DEVELOPMENT RULES

From this point forward:

1. No new feature may depend on:
   - `vault_items`
   - legacy pricing tables
   - non-canonical env names

2. All reads must go through:
   - vault projections (instance-backed)
   - pricing compatibility view

3. All mutations must target:
   - canonical tables only

---

# GOAL

Stabilize system behavior while enabling safe migration toward:

- full instance-based vault
- unified pricing engine
- clean env contract

---

# RESULT

- No breaking changes
- No new drift
- Clear system authority
