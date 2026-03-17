# SLAB ENTRY + VERIFICATION V1

## Status

READY

## Schema Reality

The repo already contains a slab-capable ownership lane.

- `public.vault_items`
  - Legacy ownership episode / compatibility bucket table.
  - Relevant fields are present in the active view/migration lane, including `id`, `user_id`, `card_id`, `gv_id`, `qty`, `condition_label`, `is_graded`, `grade_company`, `grade_value`, `grade_label`, `created_at`, `archived_at`.
  - Evidence:
    - [20260313153000_vault_items_archival_ownership_episodes_v1.sql](/c:/grookai_vault/supabase/migrations/20260313153000_vault_items_archival_ownership_episodes_v1.sql)
    - [20260312052346_vault_items_add_gv_id_compat.sql](/c:/grookai_vault/supabase/migrations/20260312052346_vault_items_add_gv_id_compat.sql)

- `public.slab_certs`
  - Purpose: slab certificate identity and slab metadata.
  - Columns proven from schema:
    - `id uuid primary key`
    - `gv_slab_id text generated`
    - `grader text not null`
    - `cert_number text not null`
    - `normalized_grader text generated`
    - `normalized_cert_number text generated`
    - `card_print_id uuid not null references public.card_prints(id)`
    - `grade numeric not null`
    - `qualifiers text[] null`
    - `subgrades jsonb null`
    - `label_variant text null`
    - `label_metadata jsonb null`
    - timestamps
  - Constraints:
    - unique `gv_slab_id`
    - unique `(normalized_grader, normalized_cert_number)`
  - Evidence:
    - [20260316090000_create_slab_certs_v1.sql](/c:/grookai_vault/supabase/migrations/20260316090000_create_slab_certs_v1.sql)

- `public.vault_item_instances`
  - Purpose: canonical owned-object truth, one row per owned object.
  - Columns proven from schema:
    - `id uuid primary key`
    - `user_id uuid not null`
    - `gv_vi_id text unique`
    - `card_print_id uuid null references public.card_prints(id)`
    - `slab_cert_id uuid null references public.slab_certs(id)`
    - `legacy_vault_item_id uuid null references public.vault_items(id)`
    - `is_graded boolean not null default false`
    - `grade_company text null`
    - `grade_value text null`
    - `grade_label text null`
    - condition / pricing / image metadata
    - `created_at`, `archived_at`, `updated_at`
  - Constraints:
    - exactly one of `card_print_id` or `slab_cert_id`
    - slab rows must be graded
  - Evidence:
    - [20260316104500_create_vault_item_instances_v1.sql](/c:/grookai_vault/supabase/migrations/20260316104500_create_vault_item_instances_v1.sql)

- `public.slab_provenance_events`
  - Purpose: append-only slab provenance ledger.
  - Important because slab entry must not conflict with provenance anchoring.
  - Columns include `slab_cert_id`, optional `card_print_id`, optional `vault_item_id`, event metadata.
  - Evidence:
    - [20260316093000_create_slab_provenance_events_v1.sql](/c:/grookai_vault/supabase/migrations/20260316093000_create_slab_provenance_events_v1.sql)
    - [20260316094500_create_admin_slab_event_insert_v1.sql](/c:/grookai_vault/supabase/migrations/20260316094500_create_admin_slab_event_insert_v1.sql)

## Relationship Map

Actual repo-truth relationship graph:

```text
vault_items.id
  -> vault_item_instances.legacy_vault_item_id   (optional compatibility/history link)

vault_item_instances.slab_cert_id
  -> slab_certs.id                               (optional slab identity link)

vault_item_instances.card_print_id
  -> card_prints.id                              (raw object lane)

slab_certs.card_print_id
  -> card_prints.id                              (slab cert card identity)
```

Relationship facts proven from schema:

- Multiple instances per `vault_item_id` are allowed because `legacy_vault_item_id` is indexed but not unique in [20260316104500_create_vault_item_instances_v1.sql](/c:/grookai_vault/supabase/migrations/20260316104500_create_vault_item_instances_v1.sql).
- Slab linkage is optional, not enforced globally.
- A slab-backed owned object is represented by:
  - `vault_item_instances.slab_cert_id IS NOT NULL`
  - `vault_item_instances.card_print_id IS NULL`
  - `vault_item_instances.is_graded = true`
- A raw owned object is represented by:
  - `vault_item_instances.card_print_id IS NOT NULL`
  - `vault_item_instances.slab_cert_id IS NULL`

## Write Path Findings

Current write-path reality:

- Canonical owned-object creation exists and is service-role gated through [20260316110000_create_admin_vault_instance_create_v1.sql](/c:/grookai_vault/supabase/migrations/20260316110000_create_admin_vault_instance_create_v1.sql).
  - It accepts either `p_card_print_id` or `p_slab_cert_id`.
  - It automatically allocates `gv_vi_id`.
  - It inserts into `public.vault_item_instances`.

- Current live user-facing ownership writes use the raw-card lane only:
  - [addCardToVault.ts](/c:/grookai_vault/apps/web/src/lib/vault/addCardToVault.ts)
  - [updateVaultItemQuantity.ts](/c:/grookai_vault/apps/web/src/lib/vault/updateVaultItemQuantity.ts)
  - [importVaultItems.ts](/c:/grookai_vault/apps/web/src/lib/import/importVaultItems.ts)
  - mobile wrappers in [20260316113000_create_mobile_vault_instance_wrappers_v1.sql](/c:/grookai_vault/supabase/migrations/20260316113000_create_mobile_vault_instance_wrappers_v1.sql)

- No proven user-facing slab entry flow exists today.
  - No live web or mobile path inserts `slab_certs`.
  - No live web or mobile path creates `vault_item_instances` with `p_slab_cert_id`.

- Existing slab-related writes are admin/internal only:
  - `admin_slab_event_insert_v1(...)` writes provenance events
  - founder/admin reads inspect slab data
  - backfill worker creates raw-card instances from bucket rows and does not prove slab-backed creation

Conclusion:

- Schema supports slab-backed owned-object creation.
- Runtime does not yet expose slab entry.
- GVVI creation is automatic inside the existing admin RPC, not manual.

## Read Path Findings

Current slab-aware read paths:

- Web vault
  - UI: [page.tsx](/c:/grookai_vault/apps/web/src/app/vault/page.tsx) -> [VaultCollectionView.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCollectionView.tsx) -> [VaultCardTile.tsx](/c:/grookai_vault/apps/web/src/components/vault/VaultCardTile.tsx)
  - Query/helper: [getCanonicalVaultCollectorRows.ts](/c:/grookai_vault/apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts)
  - DB source:
    - `vault_item_instances`
    - `slab_certs`
    - compatibility metadata from `vault_items` and `v_vault_items_web`
  - Slab signals currently surfaced:
    - `is_slab`
    - `grader`
    - `grade`
    - `cert_number`

- Public shared-card surfaces
  - UI:
    - [apps/web/src/app/u/[slug]/page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/page.tsx)
    - [apps/web/src/app/u/[slug]/collection/page.tsx](/c:/grookai_vault/apps/web/src/app/u/[slug]/collection/page.tsx)
    - [PublicCollectionGrid.tsx](/c:/grookai_vault/apps/web/src/components/public/PublicCollectionGrid.tsx)
  - Query/helper: [getSharedCardsBySlug.ts](/c:/grookai_vault/apps/web/src/lib/getSharedCardsBySlug.ts)
  - DB source:
    - `shared_cards`
    - `vault_item_instances`
    - `slab_certs`
    - `card_prints`
  - Important limitation:
    - public slab labeling only appears when a shared card resolves to exactly one active slab-backed instance for that user/card
    - this is conservative because `shared_cards` is still card-level, not object-level

- Card detail
  - UI: [apps/web/src/app/card/[gv_id]/page.tsx](/c:/grookai_vault/apps/web/src/app/card/[gv_id]/page.tsx)
  - Query/helper:
    - `getOwnedCountsByCardPrintIds(...)`
    - `getConditionSnapshotsForCard(...)`
  - DB source:
    - `vault_item_instances`
    - `condition_snapshots`
    - `vault_items`
  - Object-level slab identity is not surfaced here today.
  - Ownership is shown as count only, so slab-specific object information is lost on card detail.

## External Verification Surfaces

### PSA

- Official cert verification entry point is proven:
  - `https://www.psacard.com/cert/`
  - official page title: `PSA Cert Verification`
- Repo evidence does not currently include a PSA client/parser.
- V1 feasibility:
  - HTTP fetch is feasible.
  - Deterministic lookup URL pattern is feasible:
    - `https://www.psacard.com/cert/<CERT_NUMBER>`
  - Expected verification payload fields are reasonably supportable for V1:
    - grader
    - cert number
    - grade
    - title/description
    - image presence

### CGC

- Official cert verification entry point is proven:
  - `https://www.cgccards.com/certlookup/`
  - official page title: `CGC Cards Cert Lookup`
- Repo evidence does not currently include a CGC client/parser.
- V1 feasibility:
  - HTTP fetch is likely feasible.
  - Likely verification URL family exists under the official cert lookup surface.
  - Exact result-page parsing contract is `UNVERIFIED` from current repo/offline evidence.

Verification conclusion:

- External verification is feasible in V1 through provider-specific HTTP fetch + parse adapters.
- PSA is the stronger proven surface.
- CGC is feasible but parser determinism is still `UNVERIFIED` until a real implementation spike proves the response contract.

## Data Shape Requirements

Requested V1 slab-verification shape:

```ts
{
  grader: "PSA" | "CGC"
  grade: string
  cert_number: string
  verified: boolean
  verification_source?: string
  verified_at?: timestamp
}
```

Mapping against existing schema:

- Already present
  - `slab_certs.grader`
  - `slab_certs.grade`
  - `slab_certs.cert_number`
  - `vault_item_instances.slab_cert_id`
  - `vault_item_instances.is_graded`
  - `vault_item_instances.grade_company`
  - `vault_item_instances.grade_value`
  - `vault_item_instances.grade_label`

- Missing from current schema
  - explicit `verified boolean`
  - explicit `verification_source`
  - explicit `verified_at`
  - explicit stored verification result title
  - explicit stored verification result image URL

Schema implication:

- V1 entry is supportable with current ownership/slab identity model.
- Full verification state persistence is not yet modeled in schema.
- That is not a blocker for the contract definition, but it is a real implementation gap.

## Risks

- Identity mismatch risk
  - A cert may resolve to a different card than the user-selected `card_print_id`.
  - Best-effort card-title matching is helpful, but card-print matching is the true safety boundary.

- Duplicate cert risk
  - `slab_certs` already prevents duplicate normalized `(grader, cert_number)` rows.
  - Ownership policy for reuse across users/time is still undefined and must be handled explicitly.

- Multi-instance ambiguity
  - Public sharing is still card-level, not GVVI-level.
  - Slab public exposure must remain deterministic single-instance only.

- Partial verification risk
  - External title strings may not match local card naming exactly.
  - Title similarity should remain advisory in V1, not the sole hard gate.

- Public exposure risk
  - Unverified slabs or non-deterministic card-level public shares can leak misleading slab claims.

- Ownership episode compatibility risk
  - Current system still preserves `vault_items` as ownership episode archive + compatibility bridge.
  - Slab entry must not skip the compatibility lane if downstream runtime still expects it.

## Final Contract

### SLAB ENTRY V1 CONTRACT

#### Flow

```text
User selects card
-> chooses "Add Slab"
-> selects grader
-> selects grade (grader-specific)
-> enters cert_number
-> re-enters cert_number
-> verification request sent
-> verification result displayed
-> user confirms
-> slab-backed owned object created
```

#### Validation Rules

1. Cert confirmation must match exactly.
2. Verification must run before creation.
3. External result overrides user input for grader/grade when verification succeeds.
4. Identity must match the selected canonical card on a best-effort basis.
5. If verification returns a card mismatch:
   - block by default, or
   - allow only an explicit flagged confirmation path
   - flagged path is `UNVERIFIED` as a UX decision and should not be assumed safe by default

#### Verification Contract

Input:

```text
- grader
- cert_number
```

Output:

```ts
{
  grader: string
  grade: string
  title: string
  image?: string
  verified: boolean
}
```

#### Matching Rules

- grader must match
- cert must resolve
- grade from external verification overrides manual input
- title similarity check is non-blocking in V1
- hard fail if cert is not found

#### Ownership Creation Rule

Based on current repo truth, the minimum-safe creation rule is:

```text
1. create or resolve slab_certs row for (grader, cert_number, card_print_id, grade)
2. create new compatibility vault_items ownership episode row
3. create canonical vault_item_instances row with:
   - p_slab_cert_id
   - p_legacy_vault_item_id
4. preserve raw rows; do not mutate or overwrite them
```

Reason:

- Current ownership system still expects `vault_items` as an episode/archive/compatibility bridge.
- `vault_item_instances` is the canonical owned-object truth.
- Slab entry should create a new owned object, not mutate an existing raw object in V1.

#### Public Rule

```text
Show slab publicly only when:
- the slab is verified
- and the public card resolves to a deterministic single active instance
Otherwise:
- do not show slab metadata publicly
```

## Minimum Safe Implementation Plan

1. Add a server-side slab verification adapter lane.
   - PSA first.
   - CGC behind the same contract, but do not claim parser stability until real implementation proves it.
2. Add a server-side slab entry action.
   - verify cert first
   - create/resolve `slab_certs`
   - create compatibility `vault_items` episode
   - call `admin_vault_instance_create_v1` with `p_slab_cert_id`
3. Keep all raw-to-slab lifecycle transitions out of V1.
4. Keep public slab exposure conservative and deterministic.
5. Defer persistent verification-state schema hardening to the later slab data-model phase.
