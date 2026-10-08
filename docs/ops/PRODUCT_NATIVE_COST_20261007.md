# Native private cost entry — October 7

Worktree `C:/gv_product_native_cost_20261007`, branch
`feature/product-native-cost-20261007`, base integrated `12f806945`.
The combined editor/report merge passed its normal hook and is included here.
The native snapshot's eight non-conflicting file hashes match after integration;
both documentation histories are retained. The stash and snapshot remain intact.

Exact BigInt parsing, evidence labels and immutable request/confirmation identity
models are implemented with focused tests. They preserve unknown versus zero,
explicit currencies, the server maximum, legacy expected pairs and exact minor
units. Native Inventory now uses these models in its default-off private editor.

The transactional SQLite journal and owner-bound RPC service are implemented;
33 model/service tests pass, including lost responses and local acknowledgment
failures. Ten real SQLite tests pass for reopen, rollback, owner isolation,
paging, corrupt evidence and revision conflicts. Ten editor widget tests and
nine Inventory tests pass, including private entry and recovery from empty stock.
Already locked sqflite2.4.2 is now a direct runtime dependency;
do not upgrade its dependency graph. A write must commit to the local
journal before network dispatch. Requests remain identical until confirmed or
definitively rejected by the existing RPC, and an interrupted acknowledgment must
remain recoverable. Competing editors need revision checks. Account changes hide
private inputs and invalidate stale responses.

Inventory now has an owner-scoped recovery entry independent of active inventory
rows and the new-entry switch, so archived copies remain reachable. Native entry
uses `GV_COPY_COST_V1` (default false), while the backend independently authorizes
edits. Journal persistence uses the runtime sqflite plugin; desktop SQLite tests
use pinned dev-only sqflite_common_ffi2.3.6/sqlite3 2.7.6. Existing dependency
versions are unchanged.
Preserve unsent proposals on local/network failures, distinguish failed reads
from unknown cost, and never assume USD or rewrite historical sale snapshots.

Use real native SQLite persistence/reopen/concurrency proof, widget large-text and
account-change coverage, actual local Auth/RPC readback, and the normal repository
hook. Keep synthetic native testing separate from the user's primary app. No
production activation, store upload or complete-overhaul claim belongs here.

The Samsung harness uses the existing locked acceptance package and a fresh
synthetic owner on retained full431/33061. It deliberately loses a successful cost
response, archives that copy, stops/restarts the actual process and recovers from
empty Inventory with new entry disabled. Its first fixture lacked printings and
was cleaned with all 13 retained table hashes unchanged; a fresh scoped catalog
fixture completed its two-process test with exactly one backend request and all
13 retained hashes restored. The final visual run `device-1791416906152` also
passes, with four inspected screenshots, independent SQL readback and distinct
process IDs. The primary app path is unchanged, the locked test app was stopped,
and temporary reverse/VM mappings were removed. All 67 focused native cases and
full Flutter analysis pass. Commit469503b passed the full normal hook:7,525
contracts, web types/lint/build, full analysis and1,437 native tests. The combined
release candidate now integrates this exact source with the economics release gate.
The external checkpoint owns their outcomes. Never replay a consumed fixture.

The Windows Android build needs the existing task certificate store
`product_overhaul_20261007/java-ca/windows-roots.jks` via per-process
`JAVA_TOOL_OPTIONS`. The prior bare JBR run failed Maven TLS validation; the
recorded trusted-store retry passes. Preserve certificate validation and the
primary Samsung app; install only `com.grookai.vault.lockedacceptance` with `-r`.
Run normal checks with `node scripts/tests/run_product_native_cost_checks_v1.mjs
commit` after reviewed staging; freeze source throughout that hook.

External evidence:
`C:/grookai_vault_operator_artifacts/product_native_cost_20261007/CHECKPOINT.json`.
