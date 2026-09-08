# Sealed Ownership Foundation - 2026-09-07

## Current Status

Follow-up: `SEALED_SCHEMA_RECONCILIATION_REPLAY_20260907.md` corrects the
overbroad ledger-parity statement below and records the isolated reconciliation
repair. The original audit artifacts here remain unchanged. Sealed ownership
is still not deployed.

Founder requested full sealed parity with cards: Vault addition and totals,
Wall/sections, vendor pricing, sale/trade, sharing and exact-copy history.
Contract: `docs/contracts/SEALED_OWNED_COLLECTIBLES_V1.md`.

Implementation is partial and offline. No sealed ownership button, writer,
database migration or client rollout flag has been deployed or enabled.
Do not report sealed ownership as working on build 314 or the website.

Worktree: `C:/grookai_vault_pokemon_sealed`.
Branch: `feature/sealed-owned-collectibles-v1`.
Starting merged main: `0688a21a1d5f54c4d0c90dabfebe43927bb4e98a`.
Root and Mac app checkouts were not changed. No production writes, Storage
changes, pricing publication, app builds or deployments were made here.

## Completed

- Read-only production schema audit with canonical target verification and
  repeatable-read/read-only transaction followed by rollback.
- Canonical sanity readback: 170,404 cards, 3,397 sets and 32,903 traits.
  This is environment verification, not a full catalog or personal Vault audit.
- Inspected ownership anchors, owner/GVVI allocation, live triggers, archive,
  disposition, section-membership functions and sealed catalog/price readers.
- Added pure executable ownership/transaction-plan contract. Separate card,
  slab and sealed identities; package quantity; stable request-payload binding;
  evidence-qualified mixed totals and type subtotals; currency separation;
  sale/trade/cash/removal plans that preserve history and withdraw listings.
- Unpriced products remain ownable; contents never become implicit inventory.
  Unknown/opened/damaged package condition is not given an invented valuation.
- 70 new offline contract tests pass. Selected existing Vault/archive/pricing
  and sealed client regression tests also pass: 98 total, zero failures/skips.
- Node syntax check passes. No network/provider calls in the contract tests.

These tests do not prove SQL atomicity, database authorization, durable
idempotency, concurrency, UI integration or device behavior. Plan fingerprints
are bindings for a future transactional writer, not a security boundary.

## Schema Safety Gate

Strict command:

```powershell
pwsh -NoProfile -File scripts/migration_preflight_strict.ps1 -Phase AuditLinkedSchema
```

Migration-ledger comparison passes, but linked schema diff is non-empty, so
the strict command exits 1. The captured final run's diff command itself exits
0; the gate correctly refuses the resulting differences. Do not apply its SQL.

The output includes the sealed image dimension constraint and replacements of
existing pricing, search, Vault and memory functions/views. It is not a sealed
ownership migration. Each difference still needs classification against live
definitions and replayed source; this alone does not establish data corruption.
The earlier console-only diff was also non-empty; use the retained final log,
not truncated chat output, for further investigation.

Docker Desktop had been stopped and was started hidden for preflight. Existing
local Supabase data was not reset or deleted. Its observed migration maximum
was `20260907070000`; use a separate disposable replay environment rather than
resetting that populated local database during the next gate.

## Exact Remaining Integration

| Area | Existing constraint | Required change / proof |
| --- | --- | --- |
| Ownership | `vault_item_instances` permits card or slab only | Nullable real sealed variant FK; exactly one anchor; package/seal condition; owner-request binding; atomic existing GVVI allocation |
| Archive | `vault_archive_exact_instance_v1` requires resolved card ID | Sealed dispatch without legacy card bucket; preserve card/slab behavior; withdraw exact-copy listings |
| Sale/trade | Disposition table requires card ID; V2 RPC rejects missing card | Typed sealed event anchor and immutable snapshots; atomic archive/event; replay and competing-request tests |
| Triggers | Binder invalidation watches card/slab identity; interest graph skips cardless rows | Explicit sealed identity-change handling; preserve card-only interest semantics |
| Market reads | Catalog RPCs paginate; current price/image eligibility can expire | Bounded exact-variant quote reader with active per-game release provenance; ownership independent of current quote/image eligibility |
| Flutter Vault | Collector rows and totals assume `card_id` and child printing | Typed mixed inventory, totals/subtotals, unpriced counts, exact-copy bulk selection; no sealed UUID in card fields |
| Vendor | Workspace drops rows without resolved card ID | Package condition, asking price, section, visibility, sale/trade/cash and removal for sealed |
| Wall / privacy | Card-specific public read projections | Sealed identity/images plus owner, section, block and audience checks; archived listings absent |
| GVVI / lots | Card-specific detail, sharing and presentation | Exact product/package/language labels, photos, QR and lot rendering; customer/owner separation |
| Web | Canonical collector, Wall, GVVI and vendor adapters assume cards | Same typed read contract and lifecycle as Flutter; identical totals and permission behavior |
| Activation | No ownership migration or client flag exists yet | Isolated replay, RLS/rollback/card regression tests, reviewed exact deployment plan, bounded owner canary, then enable both clients |

Start by resolving the preflight differences, without bulk-applying its output.
Then implement the database ownership/lifecycle changes against a disposable
replay and wire clients only when real add/readback and transaction APIs exist.
Do not put a success-returning placeholder Add button on a browse-only backend.

## Retained Evidence

Operator root:
`C:/grookai_vault_operator_artifacts/sealed_ownership/20260907_foundation/`.

| Artifact | SHA-256 |
| --- | --- |
| `read_only_audit.json` | `5b2d4084d4362020973afc89fdb41e1244bf2b9249b7ca3f08e0605228145c52` |
| `strict_preflight.log` | `403ed9ba4ccfe6f219e7ab9fc978e8c2ef90e354300e2ba362c60fdf494edb29` |
| `contract_tests.tap` | `d6c748115efa0147d5c0521e8e9c5c98e0b19587482795ae05cc885331b0f761` |

`audit.mjs` in that directory is the executed read-only metadata probe. It
loads the existing canonical environment quietly and uses verified CA trust
via `node --use-system-ca`; never copy credentials into tests or artifacts.
The schema log stays in operator artifacts rather than a broad generated SQL
migration. Existing sealed releases, exclusions and image-isolation deferral
remain unchanged.
