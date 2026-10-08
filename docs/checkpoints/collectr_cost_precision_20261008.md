# Collectr exact average-cost candidate

Base: PR609/main ea7368a3267d5555d6c8d444682388640ebc92b7.
Integrated current main7731220e9 (audit/index data only); product and SQL bytes
from the first qualification remain unchanged apart from the local test allowlist.
Branch: fix/collectr-sealed-scopes-20261007. Live import remains 1,620 accounted
copies, 541 review rows and 1,331 source groups. No production schema change,
deployment or new import occurred. All consumed receipts remain consumed.

The combined candidate includes the previous sealed-product scope fixes and
exact acquisition costs through four decimal places. Values such as 9.9950 and
4.9980 are recorded per copy without rounding or allocating different amounts
to different copies. Original CSV strings remain unchanged. Currency, aliases,
quantity, notes, identity and release checks retain their existing behavior.
Values beyond four places, except trailing zeroes, remain review cases; negative,
nonfinite, malformed and out-of-bound amounts reject.

Additive migration 20261008100000 replaces only the existing V3 writer's cost
precision guard. A contract compares the complete function and grants against
the prior migration and requires all other bytes to match. Existing source/group
validation, owner locking, mixed-write rollback, receipt recovery and service-only
permissions remain intact. Applied migration 20261005080000 is unchanged.

The numeric acquisition-cost column and owner readback RPC already retain the
required precision. Web/native manual-add forms keep their existing cent input
contract; those writers are not changed. Owned sealed settings edit asking price,
intent and condition, not acquisition cost. Asking prices and sales remain cents.
Native V2 imports are outside this website sealed-import candidate.

## Completed verification

- Fresh production429 schema/security matches the qualified429 replay, including
  all 1,170 security definitions and the existing column-order reconciliation.
  Canonical counts: 171,736 cards, 3,403 sets, 32,903 traits. Production reads only.
- 971 importer contracts and16 staging-target checks pass. The website strict
  build, TypeScript, lint and git diff checks pass against the qualified430 lab.
  Only its exact127.0.0.1:33701 address was added to the existing test-only allowlist;
  mixed modes, alternate hosts, paths and credentials remain rejected.
- 38 database scenarios pass against the retained, isolated429 lab inside a
  rollback-only transaction. Exact costs and numeric totals, owner readback,
  unchanged source and targets, repeat-request recovery, zero-add retry, boundary
  rejection, mixed-write rollback and existing privacy checks all pass.
  Prior lab copies, groups, receipts and writer definition are unchanged afterward.
  The old429 relay was returned to its previous stopped state. All38 scenarios
  also pass on the new430 replay, with its schema/data restored after rollback.
- New full430 replay/reset and no-op push pass. The populated429-to430 upgrade,
  second no-op push and exact schema/security parity pass. Three saved copies,
  one receipt book, import source/group and V3 receipt remain unchanged. Recovery
  returns the original receipt and never recreates copies. No populated lab reset.
- Fresh full-export preview and save-time resolution qualify 9 rows/20 copies.
  Five fractional-cost rows contain 16 copies; the label fixes supply four more.
  Projected outcome: 1,640 accounted copies and 532 review rows. Every other preview
  row and all 1,331 saved source-group selections remain unchanged. Original file
  hash is unchanged. Fresh catalog has 5,828 variants and complete frozen releases.

## Remaining release work

The default linked CLI audit initially failed because this worktree is deliberately
unlinked. The new narrowly scoped CollectrCostBaselineV1 audit passed through the
existing authenticated read-only connection. It accepts AuditLinkedSchema only;
it cannot apply SQL or stand in for PrePush qualification.

These new labs are retained on3370x and3372x, internal10.245.201/202 networks.
Initial upgrade startup timed out before reset/fixtures; the bounded retry passed.
A fixture-only array serialization error was corrected and resumed against the
existing two copies and receipt book, without resetting or reseeding them. The
final retained upgrade proof includes the third imported copy and prior receipt.
Failed attempts, resume intents and resulting proofs remain in private evidence.

Automatic approval review blocked deletion of ignored Next.js caches; none were
deleted. NTFS compression of30 generated snapshots preserved every SHA256 and
recovered approximately0.9GB. File contents and retained databases are unchanged.
Continue to monitor host free space before large native/build work.

Run normal hooks, qualify the exact release package and CLI dry-run, and
release the additive writer before the compatible website parser. The unrelated
deferred receipt migration 20261005150000 remains in source but outside this
release package. No changes to historical SQL or bypasses of validation gates.
After deployment use one fresh original-file USD browser attempt, save once,
and independently verify its receipt and prior copies. Never replay old imports.

Private source, catalog, receipts and proof files remain outside the repository:
C:/grookai_vault_operator_artifacts/collectr_cost_precision_20261008/.
Its CHECKPOINT.json owns actual status. The graded-item preference remains pending.
