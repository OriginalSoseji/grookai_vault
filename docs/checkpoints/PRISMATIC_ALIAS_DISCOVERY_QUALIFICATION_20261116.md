# Prismatic discovery correction: local qualification

## Current V4 release source

[V4](../contracts/PRISMATIC_ALIAS_DISCOVERY_READ_REPAIR_V4.md) binds the immutable
V3 projection and revision 2 of the unshipped V4 identity-query repair. The
candidate hashes are recorded in `scripts/schema/prismatic_alias_candidate_v4.json`.
The corrected query normalizes both free-text search and its tokens through the
approved set resolver. A rollback-only regression with ordinary card names
returns 194 parents for both set codes and one retained object for its exact
legacy GV ID. The earlier incomplete V4 draft is preserved as a lossless archive
and in its original local labs. Production still ended at November 14 when the
linked migration list was checked before revising that unshipped candidate.

The final qualification uses `final-v4-fresh-498` and
`final-v4-retained-496`, followed by `local-qualification-v4/qualification.json`.
Their exact replay, populated upgrade, runtime, schema/security and protected
state receipts qualify the complete two-file package. Normal commit/push and
production readback records are kept in the same private evidence root named
below. The source/API fixture changes also passed 39 focused native tests.

## Atomic release qualification on November 17

The current package follows
[PRISMATIC_ALIAS_DISCOVERY_READ_REPAIR_V3](../contracts/PRISMATIC_ALIAS_DISCOVERY_READ_REPAIR_V3.md).
It contains `20261117190000_prismatic_alias_discovery_v3.sql` with SHA-256
`c156db90c92db979ad4cca995cf7fd83293e613fa5edafeac3fbadd6d44c35c5`.
The two local drafts retain their original bytes under
`supabase/migration_drafts/prismatic_alias_discovery_20261116`.

Fresh production496 comparison passed in `baseline-07` and
`release-gate-v3-start`. A genuine reset and full497 CLI replay passed in
`atomic-fresh-497`. The populated496-to497 upgrade passed in
`atomic-retained-496`, including rollback, no-op and identical fingerprints
for all449 protected tables. Both labs passed the complete anonymous and
authenticated reader regressions and idempotence checks.

`local-qualification-v3/qualification.json` records complete fresh/retained
schema equality, unchanged existing security and private schemas, exactly nine
read functions and four views, and real anonymous HTTP readback of one set,
194 canonical parents and180 direct legacy parents. All14 stamped parents and
the fixture's three retained legacy ownership instances passed.

Normal managed commit and push checks produce separate receipts under
`C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116`.
The exact production package, preflight and independent publication readback
are recorded there against the committed source and migration hash. The
November16 record below describes the earlier local two-migration package.

## Earlier local qualification record

Date: November 16, 2026 (America/Denver).
Status: candidate prepared and locally verified; production unchanged.
Source: `C:/grookai_prismatic_alias_20261116`, branch
`fix/prismatic-catalog-alias-20261116`, based on `9c302f51c1`.

## Result

Local SQL-role checks and real anonymous PostgREST reads show one populated
Prismatic set, `sv8pt5`, with 194 distinct parents including 14 stamped variants.
Legacy `sv08.5` set references resolve to that set when all 180 approved aliases
have visible targets. Search and pagination filter legacy aliases before limits.
Web and native metadata reads consume the backend destination rather than
independently opening the legacy set coordinate.

The 180 retained legacy parents remain directly readable. Existing alias rows,
UUIDs, GV IDs, source mappings, printings, Vault references and history are not
moved or deleted. Local owned copies still reference their original legacy
parents. Hidden targets, an inactive alias and an additional unaliased parent
prevent an unsupported whole-set redirect. Other games/families remain intact.

## Candidate and forward repair

The SHA-256-bound local candidate set is in
`scripts/schema/prismatic_alias_candidate_v2.json`:

- `20261117063000_prismatic_alias_discovery_v1.sql`
- `20261117064000_prismatic_alias_query_initplans_v2.sql`

The first reader regression exposed repeated set resolution inside SQL identity
search and hit the 60-second timeout. That locally applied draft and failed
receipts are preserved unchanged. The second migration is a forward repair
using scalar InitPlans for constant request resolution; the final reader tests
pass. Do not release V1 alone or reuse its failed runtime receipt.

The final schema delta is exactly two bounded helpers, seven existing read
functions and four discovery views. Existing owners, ACLs, RLS, security options
and private schemas are unchanged. New helpers have only the intended
anon/authenticated/service-role execution grants, with no PUBLIC grant.

## Verified paths

- Fresh full 498 replay: a new unlinked internal-network lab, genuine CLI prefix
  reset, explicit synthetic 647-pair prerequisite, complete unchanged history,
  both candidate migrations and successful no-op push.
- Retained 496→497→498: genuine official CLI upgrades and no-op pushes; all 449
  protected table fingerprints remain identical across each definition change.
- Transaction rollback restores both schema/security and protected rows.
- Reapplying the final forward definition repair is idempotent.
- Anonymous and authenticated SQL-role regressions pass in the new full replay
  and both prior forward-upgrade labs. These include ordinary and explicit
  legacy-code search, exact historical GV-ID search, set routing/catalog,
  printing discovery, complete pagination, all 14 stamped parents, retained
  ownership, hidden canonical targets, inactive aliases and extra unaliased rows.
- Actual anonymous HTTP/PostgREST smoke on loopback shows one Prismatic set,
  194 canonical cards, canonical legacy-code routing and 180 direct legacy reads.
- Complete fresh/retained schema comparison is empty across `public`,
  `grookai_square`, `grookai_inventory` and `grookai_vendor_pricing`.
- Complete baseline→candidate schema diff contains only the 13 intended read
  objects; generated diagnostic SQL was never executed.
- Fresh read-only production baseline 04 remains at 496 with zero schema/security
  differences from its preserved replay and the canonical count gates satisfied.

Application verification: 28 native set tests, 14 web set/resolver guards, Dart
analysis, web TypeScript, changed-file ESLint, syntax and whitespace checks pass.
The normal Next type-generation command rejected the absent production release
activation, as intended; direct `tsc --noEmit` passed without enabling a release
or starting an application against production.

## Exact evidence locations

Private root:
`C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116`.

- `baseline-04/qualification.json`: scoped read-only production496 parity.
- `fresh-v2-498/replay-proof.json`: genuine complete498 replay/no-op.
- `fresh-v2-498/runtime-proof-v2.json`: final full-replay reader proof.
- `retained-496/upgrade-proof.json`: original496→497 protected upgrade.
- `retained-496/upgrade-proof-v2-retry.json`: protected497→498 upgrade.
- `retained-496/runtime-proof-v2.json`: final retained-reader proof.
- `fresh-497/upgrade-proof-v2.json`: independent populated497→498 upgrade.
- `fresh-497/runtime-proof-v2-02.json`: final independent reader proof.
- `local-qualification-v2-03/qualification.json`: exact schema/security delta,
  fresh/retained equality and real anonymous HTTP smoke.

Failed receipts are retained. In addition to the V1 performance failure, local
fixture preparation initially lacked the premium finish-key seeds; its
transaction rolled back and an explicit fixture supplied them. The hidden-set
negative fixture initially omitted required `release_version`; the corrected
fixture passed. A retained-upgrade harness attempt rejected an existing V1 log
name before its CLI apply, then resumed using distinct V2 logs. Diagnostic schema
validation first rejected the engine's unexecuted `check_function_bodies` prologue
and unquoted function identifiers; the corrected validator permits only that
exact prologue and the same explicit13-object allowlist. None was a production
write, and no failed receipt authorizes release.

## Continue safely

Read `PRISMATIC_ALIAS_DISCOVERY_READ_REPAIR_V2` before continuing. The named
preflight supports AuditLinkedSchema only; boundary tests reject PrePush,
combined scopes and admission through the older V1 mode. No production apply
command or gate has been added. The next release qualification must bind the
complete candidate set and successful receipts, clean committed source and
normal hooks, fresh production496 parity, an exact CLI package, and protected
production readback. V1 must never become a standalone live release.

Preserve all populated labs and the original dirty checkout. Do not reset them,
edit any applied history, replay old approval intents, mutate canonical identity,
or claim production duplicates are corrected before live publication/readback.

## V4 revision 3 final qualification

Revision 3 normalizes legacy set-code tokens once before identity matching, tokenization and ranking. Both anonymous and authenticated rollback probes passed whole-code, mixed-name, prefix, suffix, middle and repeated-token inputs with canonical ranking equality. Revision 2 sources, populated labs and receipts remain preserved. Final proof paths use `final-v4-r3-fresh-498`, `final-v4-r3-retained-496` and `local-qualification-v4-r3`; the production package remains two pending migrations above the linked 496 baseline.

## Production V4 and forward V5 guard

V4 revision3 was committed as `f4b212a6b7bdae5592c31c3ae9a95481a0dba0cd` and published in PR942 after both normal managed hooks passed. Exact PrePush and CLI dry run passed; the official CLI applied the two bound migrations to production at498. Independent readback confirmed qualified schema/security and all120 protected production table fingerprints unchanged. Live catalog and set search returned one canonical194-parent set with raw legacy180 retained. Identity RPCs hit the production statement timeout.

The read-only query plan exposed a filtered-browse scan even for a nonempty query. V5 changes only that guard to a scalar InitPlan. Read-only full-data prepared-query results and ranking matched exactly, reducing whole-set query execution to about1.5–1.6seconds in the recorded probes. V5 keeps all498 applied sources immutable and adds only `20261117220000`. Its fresh499 replay and populated498-to499 upgrade are recorded under `final-v5-fresh-499` and the retained `final-v4-r3-retained-496`; complete proof is `local-qualification-v5`. Production V5 apply remains pending until its exact release gates pass.

### V5 revision2: retained scoped identities

Automated review942 found that exact legacy GV parent/printing IDs were rejected when a legacy set filter was supplied. Revision2 preserves the raw explicit set coordinate for exact GV queries, matching game-search v4/v5, while keeping the scalar empty-query performance guard. The scoped proposal passed both reader roles with explicit synthetic printing IDs assigned only inside rolled-back local transactions: four parent/finish documents, one exact printing, identical ordered document identity to unscoped queries, wrong-set rejection and all449 protected tables restored. Revision1 SQL/source/labs/receipts remain preserved; no applied production history changed. Final proofs use `final-v5-r2-fresh-499`, retained `final-v4-r3-fresh-498` and `local-qualification-v5-r2`.
