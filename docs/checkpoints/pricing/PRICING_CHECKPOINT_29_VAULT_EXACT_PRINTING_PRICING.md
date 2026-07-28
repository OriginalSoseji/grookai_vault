# Pricing Checkpoint 29: Vault Exact-Printing Pricing

## Context

TCGPlayer Market Product V1 already published exact-printing market closes and
exposed them through one governed pricing read model. The remaining Vault
surfaces still grouped holdings by canonical parent card and could multiply a
parent `From` amount by quantity.

That behavior violated the Product V1 rule that a Vault holding is priced only
when the owned raw copy has one exact eligible printing identity.

## Problem

A grouped Vault row can contain:

- multiple raw copies of the same parent card
- copies from different exact printings
- copies whose exact printing remains unresolved
- slabs, which are outside Product V1

Multiplying one parent minimum by grouped quantity can overstate or understate
the collection and can present an inferred finish as exact market truth.

The web and Flutter ownership surfaces also used different combinations of
grouped rows, exact-copy rows, and parent pricing helpers. A correct amount on
one surface did not prove that all Vault values followed the same exact
printing rule.

## Risk

- A parent minimum could be presented as the value of a different finish.
- Mixed-printing holdings could receive one repeated price.
- Unresolved copies could be silently priced.
- Slab values could enter a raw-single total.
- Private, public, web, and Flutter totals could disagree.
- A direct ownership-table grant could widen private Vault exposure.

## Decision

Vault pricing is computed from raw ownership instances.

For every active raw copy:

1. Resolve its `card_printing_id`.
2. Read only the matching `pricing_scope = card_printing` row.
3. Include the exact current TCGPlayer Market amount once.
4. Leave the copy unpriced when exact printing identity or eligible pricing is
   unavailable.

Vault total is the sum of those exact copy values.

The following never contribute:

- parent `From` prices
- sibling finish prices
- unresolved printing identities
- slabs
- stale or ineligible prices
- eBay asks
- supporting low, mid, high, or direct-low metrics

## Private Ownership Boundary

Flutter reads exact raw pricing targets from:

`public.v_vault_mobile_pricing_targets_v1`

The view:

- is `security_barrier = true`
- is explicitly `security_invoker = false`
- filters ownership with `auth.uid()`
- excludes archived rows
- excludes slabs
- exposes only `instance_id`, `card_print_id`, and `card_printing_id`
- denies anonymous access
- grants authenticated and service roles `SELECT` only

The initial set-returning RPC form was rejected after PostgreSQL 17.6
reproducibly terminated a backend with `SIGSEGV` during the clean-SHA smoke.
The owner-filtered view preserves the same data boundary without the unstable
RPC execution path.

## Alternatives Rejected

- Multiplying a parent `From` amount by quantity was rejected because a parent
  minimum is not an exact holding price.
- Selecting one representative printing for a grouped row was rejected because
  mixed holdings must retain per-copy identity.
- Pricing unresolved copies from a sibling was rejected because uncertainty
  must remain visible.
- Pricing slabs with raw-single evidence was rejected because graded cards are
  outside Product V1.
- Granting clients direct access to `vault_item_instances` was rejected because
  the ownership table remains service-role protected.
- Keeping the crashing RPC after a successful `psql` call was rejected because
  the application uses the extended-query/API path that reproduced the crash.

## Implementation

Producing commits:

- `7f59bc00870f348b470c8c77d16478e1311fa96c`
  - exact-copy pricing helpers and all Vault consumers
- `e19e54b2`
  - stable owner-filtered view, strict ACL, and final database smoke

Immutable migration:

`supabase/migrations/20260728133000_vault_exact_market_pricing_targets_v1.sql`

Primary implementation paths:

- `apps/web/src/lib/pricing/marketPricingReadModelV1.ts`
- `apps/web/src/lib/vault/getCanonicalVaultCollectorRows.ts`
- `apps/web/src/lib/vault/getOwnerVaultItems.ts`
- `apps/web/src/lib/vault/getVaultInstanceByGvvi.ts`
- `apps/web/src/lib/vault/getPublicVaultInstanceByGvvi.ts`
- `lib/services/public/card_surface_pricing_service.dart`
- `lib/services/vault/vault_exact_pricing.dart`
- `lib/main_vault.dart`
- `lib/services/public/public_collector_service.dart`
- `lib/services/vault/vault_card_service.dart`
- `lib/services/vault/vault_gvvi_service.dart`
- `lib/services/network/network_stream_service.dart`

## Migration And Security Proof

The complete local migration history rebuilt from zero after the final commit:

`supabase db reset --local --yes`

Result: passed, including
`20260728133000_vault_exact_market_pricing_targets_v1.sql`.

Schema and ACL readback proved:

- view type: ordinary view
- owner: `postgres`
- `security_barrier = true`
- `security_invoker = false`
- `vault_item_instances` RLS: enabled
- anonymous `SELECT`: false
- authenticated `SELECT`: true
- authenticated write/DDL privileges: false
- service-role `SELECT`: true
- service-role write/DDL privileges: false
- abandoned `vault_mobile_pricing_targets_v1()` RPC: absent

## Local Publication And Vault Proof

Command:

`node scripts/audits/tcgplayer_market_publication_local_smoke_v1.mjs`

Producing commit:

`e19e54b2`

Result:

- status: `passed`
- source run: `d37b0033-1f04-4fce-880d-8c42a56ba2cf`
- card print: `572e0dae-0aa0-49e1-b909-a51b2054bb2a`
- exact printing: `d367d1e7-c7e9-4123-904c-f571ff9e8bdb`
- first publication set: `1f3845e5-e7d1-4a06-ace6-ddb247f59eaa`
- replacement publication set: `c8938544-d6a2-4eda-8b12-45cddc36f944`
- restored publication set: `1f3845e5-e7d1-4a06-ace6-ddb247f59eaa`
- exact market close: `$12.34`
- exact priced raw copies: `2`
- unresolved raw copies: `1`
- exact Vault total: `$24.68`
- parent identity, publication time, and provenance match exact: true
- anonymous private target read denied: true
- public shared target rows: `3`
- authenticated provenance trace denied: true
- service-role provenance trace allowed: true
- append-only qualification update denied: true
- publication replacement and rollback: passed

Artifact root:

`artifacts/market_pricing_product_v1/local_smoke/2026-07-28T13-52-05-121Z`

Key SHA-256 hashes:

- `local_smoke_summary.json`:
  `98eb2356ebbb73b8e8147161611a317c17dc5a901bbbd81c9e419849312090f4`
- first `qualification_decisions.jsonl`:
  `7d5d2bf638ba44dc724418afff0e479af7b8576f0c4fee409f7e9af4637355d4`
- first `reconciliation.json`:
  `ef3f959e0e915236a451a37d07e230fa1bcbd598a51df68cc69029f1dac6e690`
- first `run_plan.json`:
  `1345f0a878bf7435be6c5dccd3bb5dcad5cba8d76f9b57444c42518bd9ec25ea`
- first `summary.json`:
  `404dd570a9b993f1cc0bacde40bfa0c5b86f1dc86e7dbbcc06d1d49253928d45`
- replacement `qualification_decisions.jsonl`:
  `dc5f18096e68cce3e7bcf8e05d074c08fad9571efcf41b72ba1f643afed550b3`
- replacement `reconciliation.json`:
  `ef3f959e0e915236a451a37d07e230fa1bcbd598a51df68cc69029f1dac6e690`
- replacement `run_plan.json`:
  `8624c04825d56b84f4e34b5cc70fa047f16c461de42d44fb62087f2b32134b86`
- replacement `summary.json`:
  `0cea945bd490a3a97010cb5960c82fb4f6a29c56968cb49c820c02510fa74dfd`

## Tests

- Vault exact-pricing contracts: `9/9` passed
- Executable exact-pricing tests: `5/5` passed
- Complete contract suite: `844/844` passed
- Flutter tests: `307/307` passed
- web typecheck: passed
- web lint: passed
- web strict production build: passed
- Flutter analysis: passed
- release secret guard: passed
- runtime preflight: passed with known deferred debt and zero critical failures
- `git diff --check`: passed
- full pre-commit shipcheck for `e19e54b2`: passed

## Current Truths

- Exact-printing Vault pricing is committed on
  `pricing/mee-productization-v1`.
- The dirty `pricing/full-tcgcsv-warehouse` worktree remains unchanged.
- The migration and client changes have not been applied to production.
- Production pricing and the frozen authenticated canary were not modified.
- The canary still uses producing commit
  `c0cdce5500c96cdc5b1d689e5178d9fa4e117e1d`.
- The canary window ends no earlier than
  `2026-07-31T08:40:15.793Z`.
- Public rollout remains separately blocked by licensing and attribution
  authority.

## Invariants

1. Vault value is the sum of eligible exact raw-copy prices.
2. Parent `From` is never multiplied by ownership quantity.
3. One copy contributes at most one exact printing price.
4. An unresolved copy remains unpriced.
5. A slab never inherits raw-single pricing.
6. Private ownership targets remain owner-filtered.
7. Anonymous users cannot read private ownership targets.
8. Client roles cannot mutate the ownership-target projection.
9. Public Vault pricing remains subject to public-profile and sharing gates.
10. Every included price remains traceable through the shared pricing read
    model to one immutable publication snapshot and qualification decision.

## Exact Next Gate

Continue read-only observation of the frozen authenticated 100-printing canary
until the full 72-hour window has elapsed.

Do not deploy this migration or the updated clients during the frozen canary.
After the canary passes, perform the governed corrected deployment and fresh
full-scope shadow gate before signed-in full-eligible activation.
