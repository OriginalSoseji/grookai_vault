# TCGTracking condition-price expansion — November 17, 2026

## Current state

The owner explicitly authorized setting `GROOKAI_PREFLIGHT_ACK=1` and importing
the prepared private batch on November 17. The hash-bound apply completed:
559 private `raw_imports` receipts contain 487,067 condition-price candidates.
Independent count, payload-hash, source-value and privacy verification passed.
This is completed private source intake, not a deployed condition-switching UI.

Source worktree: `C:/grookai_condition_pricing_20261117`, branch
`codex/tcgtracking-condition-pricing-v1`, base `8b70faff21` from `origin/main`.
The owner's original dirty checkout remains preserved.
Contract: [private condition intake V1](../../contracts/TCGTRACKING_CONDITION_REFERENCE_INTAKE_V1.md).

## Prepared dataset

All 559 selected provider sets fetched successfully. The scope comprises
163,763 existing exact mapped printings and 487,067 positive condition-price
candidates. It is a mapped scope, not a claim that every canonical card has an
external mapping. No mappings or printings were manufactured to raise coverage.

| Category | Sets | Exact mapped printings | Condition-price candidates |
|---|---:|---:|---:|
| Magic English paper | 397 | 148,484 | 434,278 |
| Pokemon English physical | 107 | 12,231 | 48,751 |
| One Piece English | 1 | 14 | 30 |
| Pokemon Japanese | 54 | 3,034 | 4,008 |
| Total | 559 | 163,763 | 487,067 |

| Condition | Positive prices |
|---|---:|
| Near Mint | 156,305 |
| Lightly Played | 152,376 |
| Moderately Played | 99,861 |
| Heavily Played | 42,051 |
| Damaged | 36,474 |

299 unsupported-finish mapping rows were held during scope resolution. Provider
responses additionally contained 330,268 unavailable market-price slots,
4,480,904 SKU rows outside the exact target language/finish mapping, and 80
targeted rows from two stale groups. These did not become candidate prices.
Unrelated-language/provider data is excluded from the DB projection; full
response bytes remain in the hashed local acquisition artifacts (411,441,763 bytes).

The small One Piece count and absent unmapped cards are explicit limits of the
existing exact mapping scope. Further expansion requires verified mapping work,
not looser matching or name-based inference.

## Source and verification artifacts

Artifact root:
`artifacts/tcgtracking_condition_reference_v1/full_database_v3_20261117/`

- `plan.json`, `plan_hash.json`: exact canonical target snapshot and holds
- `provider_sets_*.json`: provider category/set snapshots
- `groups/*.raw.json`: original API bytes, preserved locally
- `groups/*.receipt.json`: HTTP receipt, source time and hashes
- `groups/*.normalized.json`: exact supplied positive prices and holds
- `receipts.json`, `summary.json`: all 559 source results, zero failures
- `replay.json`: independent source-hash and normalization replay
- `prewrite_readback.json`: private ingress and publication boundary before writes
- `owner_apply_authorization.json`: explicit owner acknowledgement for this batch
- `apply.json`: all 559 successful inserts and their durable raw-import IDs
- `verification.json`: independent complete count/status/acquisition-key verification
- `payload_readback.json`: all stored normalized and scoped upstream hashes match
- `private_reader_readback.json`: live private exact-condition lookup matches source
- `anonymous_boundary_readback.json`: anonymous database role denied (`42501`)

Frozen plan SHA-256:
`20632ec5e1f99025860e1579701ef90dfc8d62291ad204ce8e2ef5ec1aeab1c9`.
Source receipts SHA-256:
`73cc1c042d3590efd617193e745f94fa04a70f3a2a280c41dc252b43d878d16f`.
Use `replay.json.worker_hash` for the current executing source bundle; it binds
both the worker and its scoped raw projection. The numerical policy hash is
separately pinned in the scope plan. Do not use an older replay's worker hash
after a source change.

15 policy/reader/projection tests passed. They cover exact finish/language,
condition separation, null/zero/string rejection, source timestamps, conflicting
mappings, MTG's split-parent finish case, duplicate SKUs, no fallback, private
reader failure behavior, unchanged amounts and scoped raw retention. Offline
full-source replay checks every saved normalization against the original bytes.

The final replay passed all 559 groups and 487,067 prices. Its executing worker
bundle hash is `6dc37c6c8194bc83608b466c74975242862253b4704fcb57b799c8b81705704d`.
The source changes are staged in the isolated worktree. A checkpoint commit was
attempted but the mandatory pre-commit shipcheck stopped at its runtime preflight
because the clean worktree has no local `SUPABASE_DB_URL`. No hook was bypassed,
and the complete repository shipcheck has not passed. Credentials remain in the
existing owner environment rather than being copied into the worktree.

The canonical environment passed minimum counts: 173,837 card prints, 3,420
sets, 47,409 traits. Prewrite readback found zero rows for the new staged source,
no custom raw-import triggers and service-role-only raw-import RLS policy.
The existing price publication remained `127fd8be-53c0-4090-ac48-1969a99a41fa`.

## Completed production readback

The apply inserted exactly 559 source receipts, with no duplicate IDs. Full
verification at `2026-11-17T22:26:27.384Z` reconciled all 487,067 stored candidate
prices. Every stored normalized payload and scoped upstream SKU projection
hash-matched its acquisition artifact: zero normalized mismatches and zero
upstream mismatches. Source row count is exactly 559, and all remain private
reference evidence with `app_visible=false`.

The existing current publication ID and run ID match the prewrite snapshot.
The anonymous database role was denied access to raw intake with SQLSTATE
`42501`. The private backend reader returned the source LP amount in a live
sample and correctly kept absent NM/MP/HP/DMG values unavailable. No percentage
or cross-condition substitute was introduced. The process acknowledgement flag
was removed after the approved command completed; the environment file was not
changed and no recurring job was installed.

The independent full-payload audit is repeatable with:

```powershell
node --use-system-ca scripts/audits/tcgtracking_condition_reference_payload_readback_v1.mjs artifacts/tcgtracking_condition_reference_v1/full_database_v3_20261117
```

Do not routinely reapply the consumed batch. Preserve its artifacts. A fresh
provider acquisition or client release is a new operation with its own scope.

## Apply and independent verification

From the isolated worktree, use the existing environment through
`DOTENV_CONFIG_PATH` without copying or committing credentials. Read the
repository preflight acknowledgement rule before a production backfill.

```powershell
$conditionOut = 'artifacts/tcgtracking_condition_reference_v1/full_database_v3_20261117'
$conditionProof = Get-Content "$conditionOut/replay.json" -Raw | ConvertFrom-Json
# Only after the owner explicitly sets/authorizes GROOKAI_PREFLIGHT_ACK=1:
node --use-system-ca backend/pricing/tcgtracking_condition_reference_worker_v1.mjs --apply "--out=$conditionOut" "--expected-plan-hash=$($conditionProof.plan_hash)" "--expected-receipts-hash=$($conditionProof.receipts_hash)" "--expected-worker-hash=$($conditionProof.worker_hash)"
node --use-system-ca backend/pricing/tcgtracking_condition_reference_worker_v1.mjs --verify "--out=$conditionOut"
```

Apply is append-only and source-isolated in existing `raw_imports`. It holds a
source-specific advisory lock and rechecks active mapping and child-printing
identity inside each group transaction. Same-key retries reuse the staged row.
Shared-client readback follows each commit. Full independent verification checks
every ID, acquisition key, status, count and app-visible flag. Preserve partial
receipts on failure; do not retry via ad-hoc SQL.

## Publication boundary and remaining work

Current TCGCSV headline prices, publication state, Vault totals, ownership,
vendor asking prices, Square/eBay state, UI and runtime schedules are unchanged.
Private source storage is not app activation. Source currency is only a USD hint;
the payload lacks an explicit currency field. Commercial display permission and
independent official TCGPlayer SKU accuracy remain unverified.

The current-main ledger matches all 496 remote migrations. Generic fresh replay
fails the existing `20261012010000_card_print_identity_aliases_v1` prerequisite
with `pairs 0`, after the local reserved-port issue was resolved temporarily.
No migration was added, applied or repaired; no historical migration was edited.
Do not use this schema-free intake to bypass that gate for later schema work.

The approved private batch is complete. Next work is source/currency/display
qualification and a versioned client condition-pricing integration. Client
switching and a recurring refresh were not activated by this approval.
