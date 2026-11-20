# Best of Game transaction rehearsal — November18,2026

Status: local PostgreSQL transaction proof complete; production remains unchanged.
Branch/worktree: `fix/best-of-game-repair-20261118` at
`C:/grookai_best_of_game_repair_20261118`, based on main `d143f4128`.
The earlier [source preparation](BEST_OF_GAME_REPAIR_20261118.md) remains historical.
Contract: [BEST_OF_GAME_PRINTING_REHEARSAL_V1](../contracts/BEST_OF_GAME_PRINTING_REHEARSAL_V1.md).

## Implemented and verified

The separate bounded engine and CLI admit only the dedicated loopback database
`bog_printing_rehearsal_20261118_v1` on port64240. The CLI validates routing before
authentication; the engine additionally checks the live server's address/name.
Production execution is unavailable. The original McDonald's executor is unchanged.

The exact proposed transaction is one raw reviewed evidence record, two reverse
children on existing BP8/9 parents and two append-only truth reviews. It updates
or deletes no existing record. Raw evidence precedes the child/review inserts.
Both families are locked, schema/side effects and global identity collisions are
checked, and all retained parents/children plus protected table digests must match.
After the precommit callback, the engine repeats schema, identity and preservation
checks immediately before commit. No existing `-REV`/`-STD` printing is renamed.

The source manifest remains
`48ba01523ae9f62d47165f3f0e7effc06b4637fff25ee538cad4915931617089`.
The local execution plan is
`f86ea7c42a6a3a46aff1692fb04c418783f7a18dab03a20dfcc572aeb5a40263`.
The reusable CLI's producer binding is
`e860f9acc036841f3c99434b55bba026b34f322d1633f9073a9f260ce74fcb03`.
This plan is local-only and must never be presented as production authority.

The real PostgreSQL rehearsal passed:

- Read-only preflight with zero writes.
- Complete transaction rollback, followed by exact independent before-state equality.
- Actual SQLSTATE23505 duplicate-key failure after all intended writes; full rollback.
- Deliberate JSON-reference and price-fixture changes after the initial readback;
  the final precommit guards rejected both and restored the exact original state.
- Acknowledged local commit of exactly one raw row, two children and two reviews.
- Independent connection readback with18 exact public printing options.
- Zero-write replay, including zero extra raw evidence or sequence advancement.
- Actual COMMIT acknowledgement loss on an already-exact zero-write replay;
  uncertainty was recorded and independent readback resolved the state. This does
  not claim a second ambiguous nonzero commit.

All22 parents,16 original children, the owned copy and14 local protected tables
remained unchanged. The local database is stopped, port64240 is closed, and its
data, credentials and every receipt are retained privately. No Docker container,
volume, service or daemon was reset or deleted.

## Verification boundaries

Production is PostgreSQL17.4; the available native fixture runtime is16.2. The
three mutation tables' copied columns, constraints, indexes, triggers and exact
printing RPC match production introspection. Support tables copy columns/defaults,
generated expressions and non-FK constraints. The fixture does not qualify the
full Supabase17 platform, support-table FKs, RLS/permissions, Auth or client delivery.
The checked-in unit fixture uses synthetic creator/provenance labels and contains
no owned rows; actual full before rows remain private.

The strict read-only511 audit passed in `baseline-v1-executor-r3`: every historical
SQL byte, the ledger, all four application schema models and security match the
closed Shrouded release. Actual PowerShell negative probes reject PrePush and mixed
scope switches before Node/database work. No migration was added or edited.
Focused tests passed220/220 across five files; syntax, whitespace and secret
packaging checks passed. Managed full shipcheck, commit/push and deployment are
not represented by these focused checks.

The production reference inventory captured all95 inbound FKs across79 relations
under the unchanged five-second statement cap. Metadata lists363 JSON columns;
semantic JSON reference review remains open. An earlier full426-table hash scan
hit its45-second statement timeout and is retained as a failed attempt, not a
passing preservation proof. The bounded inventory succeeded without increasing
timeouts. It is point-in-time evidence, not a production execution plan.

A final verified-TLS read at `2026-11-19T05:44:39Z` confirms511 migrations,
173837 parents,3420 sets,47409 traits and325 vault projection rows. Both sets,
all22 family parents,16 children,30 mappings,22 identity rows and the owned copy
hash-match the earlier production before rows. The two proposed UUIDs/GV-IDs are
still collision-free. Original preserved web retrieval hashes also match.

## Evidence and continuation

Private root: `C:/grookai_vault_operator_artifacts/best_of_game_repair_20261118/`.
Start with `native-lab-v1/transaction-v2/result.json`, the sibling rollback,
forced-failure, local-apply, independent-readback and zero-write receipts;
`native-lab-v1/cli-readback-v1` and `cli-apply-v1` verify the reusable entry point.
Also retain `rehearsal-contracts-v4.log`, `production-read-v3.json`,
`scoped-reference-v2/result.json`, `schema-gate-negative-v1.json`,
`native-lab-v1/runtime-and-stop-v1.json` and `docker-health-v1.json`.

The earlier schema-adapter error, bootstrap's missing support-check functions and
masked-inet address rejection remain preserved with their failed producer sources.
The original start wrapper stayed attached to the background server and its delayed
port query failed after deliberate shutdown; actual database connections and
pg_ctl start/stop logs independently establish the successful lifecycle. Do not
count that wrapper's final exit as a passing test.

`scripts/audits/best_of_game_printing_rehearsal_v1.mjs --print-code-binding`
prints the current producer binding. Other modes require explicit `--mode=`,
`--connection-file=`, `--plan=`, `--plan-fingerprint=`, `--code-fingerprint=` and
a new `--out-dir=`. Readback/apply against this retained exact local plan writes
zero rows. Preserve the populated fixture; never rerun its bootstrap or reset it.
To start the retained cluster, use a hidden launcher for native pg_ctl with its
exact data/log paths and `-o "-h 127.0.0.1 -p 64240 -c max_connections=12 -c shared_buffers=64MB -c timezone=UTC"`.

Next gates: restore an authorized usable Docker/Supabase17 verification route,
complete full platform and normal managed release checks, close the remaining
application/JSON scope review, and freeze a separately bounded production path.
Production rollback/apply then require exact founder execution authority under
the existing printing execution contract. Neither a general continuation nor
this local proof supplies that approval. Afterwards qualify the nine discovery
aliases, preserving four Winner parents, all legacy rows and global Bog/Boggart
search behavior. Both Docker contexts currently time out on read-only health
requests; no daemon restart was attempted.
