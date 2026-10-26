# Pricing completion agent — October 13, 2026

Implementation worktree: `C:/gv_pricing_completion_agent_20261013`, branch
`feature/pricing-completion-agent-20261013`, based on main
`7719e3c091244732cdbfe5190dc50e87f63ee6da`. Preparation runtime updated; no database writes.

## Current continuation — October 14 UTC, combined-feed qualification

The unchanged eight-module discovery worker is staged for a fresh V9 Master plus
warehouse feed. Publisher V4 changes only the feed path and fixed Master
collector/file/SQL pins. Its 31 isolated offline tests passed, including full
historical Master and warehouse capture validation. Receipt SHA256:
`72069a64bc9306621385e54c0c9874370def9721cbff59d38b5572369f14f044`.

The actual discovery state was copied while idle with every copied file rehashed;
the original timer was restored. The immutable baseline has 532 state files and
157,341,927 bytes. Manifest SHA256:
`d4d3015eb0da66aeb2589d921a5b8e45d986d265a11f53dcbfe17b09ee5cef6f`.
All 16 installed pricing/discovery runtime files match their reviewed closures;
canonical inventory SHA256:
`073b03ec5e4016060f1070b34d4395093dee764b0d5e24beeb2759d5fa21bfbb`.

The first fresh combined qualification failed at the Master collector after
180.270 seconds. No accepted capture, combined generation, queue import, repair,
or price publication resulted. The original timer was restored enabled/waiting;
discovery remains disabled. The retained generic ValueError does not distinguish
SQL timeout from the collector's total process deadline. Failure review SHA256:
`10e0496b44e833e11cb28ce806b8298ede4f509f46e0c32b3ff89e69015e9996`.
Evidence is in `operator-readback/discovery-v9-publisher-live-failure-v1`; remote
failed staging remains at `/var/lib/grookai-discovery-v9-publisher-qualification-v1`.
The fixed V9 diagnostic keeps the exact SQL and 120/180-second limits and emits
only whitelisted error/progress metadata. It confirmed `psql_timeout` at 180.005
seconds after 141 complete pricing batches, with no stderr, SQLSTATE or partial
record. The database did not acknowledge the terminal rollback in this aborted
run. V10 is being prepared with a 300-second process bound and matching
305-second collection validation; the SQL and 120-second statement timeout stay
unchanged. The consumer's corresponding Master duration guard also requires a
narrow changes; both Master and warehouse guards will use 305 seconds. Copied-queue
first/restart, storage-capacity, installation, manual-cycle and activation gates
are still pending; draft handoff/audit packages do not satisfy them.

The subsequent V5 live retry completed Master under the expanded bound, then
failed in Warehouse after 4m43.476s with sanitized `warehouse_capture_failed`.
No generation, feed, queue import, repair, or price publication resulted; the
pricing timer was restored enabled/waiting and discovery remains disabled. The
failed artifacts are retained under
`operator-readback/discovery-v10-publisher-qualification-v1`. V6 is being
prepared with the Warehouse process bound expanded to 300 seconds and a fresh
feed path; no production installation or execution has occurred.

The V6 offline qualification then ran after the pricing preparation service
returned idle. All31 tests passed in23.668 seconds (unit runtime23.949 seconds,
exit0); the pricing timer was restored active/waiting. The retained historical
Master and warehouse fixtures passed, including the new warehouse305-second
acceptance and306-second rejection checks. Output hashes are preserved under
`operator-readback/discovery-v6-offline-qualification`; the test log SHA256 is
`0bb903c4a17977c36a72d2b59b4b89271e4afdaf957ede21032a228ae9f75afd` and the
exit marker SHA256 is
`9a271f2a916b0b6ee6cecb2426f0b3206ef074578be55d9bc94f6f3fe3ab86aa`.
This qualifies the offline package only; the live V11 publisher remains
unexecuted pending consumer qualification and receipt review.

The first consumer attempt exposed one remaining internal warehouse normalizer
bound at185 seconds. That attempt failed11-test qualification as expected. The
candidate was corrected to305 seconds in
`pricing_completion_warehouse_intake_v1.mjs` (SHA256
`c0c13308fb2b33dfc4e95d14837b1f5e47a22184b6fc466e8f30a42fa4ffc8d3`) while
the controller remains SHA256
`c0eef12f14adabcd4acd6170b77b29de190419d25dc9e46109f1284ae116e239a`.
The focused consumer suite now passes11/11 in1.774 seconds, including both
lanes at305 seconds and rejection at305001. This is still an isolated code
qualification; installation and live feed execution remain gated.

The V11 live combined-feed qualification then completed Master but failed the
Warehouse collector again after4m43.160s with sanitized
`warehouse_capture_failed`; unit memory peak was579,149,824 bytes and CPU time
8.115s. No generation or queue input was accepted, and the pricing timer was
restored active/waiting. The V4 warehouse process bound is300 seconds, so the
next gate is a warehouse-only diagnostic using the exact pinned SQL and source
to identify whether the remaining failure is the process deadline or an
underlying query/statement timeout.

The bounded qualification controller was then syntax-reviewed and installed as
`grookai-discovery-v11-qualification-controller-v1.service` with its enabled
15-minute timer. The controller and its three launchers match the reviewed
manifest SHA256 `68b69cff8f442e851b2be0542e6b1849f2a0c06e22e8207036fcc14369e3b279`.
Its first run is active and has emitted `waiting_for_pricing_idle`; it is
configured for a six-hour idle budget, one diagnostic and at most two fresh
publisher attempts. The deterministic controller has zero authority to install
or activate production code; optional Ollama/Ruflo integrations can only format
notifications and cannot authorize actions.

The enabled controller then ran unattended and correctly blocked on an
intermittent warehouse diagnostic failure: `psql_failed` with SQLSTATE `57014`
(`query_canceled`) after122.131 seconds, only environment/publication records,
and no rollback acknowledgment. The notification is
`warehouse_diagnostic_not_successful`; no publisher retry followed, and no
database, queue, installation, or activation action occurred. The remaining
work requires a reviewed warehouse query-performance change or an explicit
decision to keep the current120-second statement timeout.

Controller V2 then collected the plan-only receipt automatically. The exact
warehouse SQL was explained without `ANALYZE` in1.874 seconds; rollback was
acknowledged, no warehouse query was executed, and no writes occurred. The
estimated top-level cost was629,408, with major CTE costs for `decisions`
(188,882), `observations` (152,269), and `current_observations` (130,945), plus
repeated CTE scans and aggregates. The controller stopped at
`query_canceled_plan_collected`; an optimization candidate must preserve exact
JSON/output equivalence before any live retry.

The offline warehouse optimization candidate is staged at
`C:/grookai_vault/docs/sql/warehouse_v4_optimized_candidate.sql` with SHA256
`ad175ae15b81f316dc75844f2dbf3cdbf000f3480f06ef1eb1233bc7d1c11962`.
Its focused contract suite passes4/4 in67.879ms, covering read-only/receipt
anchoring, tuple and JSON equivalence, CTE consolidation, and reproducible
handoff hashing. No live SQL or production change occurred. The next gate is a
bounded staging benchmark against an isolated copy before any collector update.

That benchmark completed against a temporary PostgreSQL17.4 fixture. Candidate
and baseline outputs/tuples were exactly equal, with canonical output SHA256
`ef7b16f534e9d86dc5b6f7eb5a09e8ef7ee4ac23710f3b3d29b5bd9dc58b69d5`. Across
five measured runs, candidate median was85.9439ms versus baseline86.1970ms,
only about0.29% improvement. Candidate SQL SHA256 remains
`ad175ae15b81f316dc75844f2dbf3cdbf000f3480f06ef1eb1233bc7d1c11962`; fixture
SHA256 is `fde146142c6b9413e2fd9539eca5546674f622a2410aa49dd0a49b0c7c3f4041`.
The result proves equivalence but does not establish that this rewrite resolves
the production120-second timeout, so it remains uninstalled.

A second offline candidate now targets the dominant planner joins by leaving the
`pointer`, `products`, `current_observations`, and `decisions` CTEs inlineable.
Its focused contract suite passes5/5 in72.867ms, preserving read-only,
repeatable-read, rollback, JSON/tuple ordering and provenance checks. The
candidate manifest records exact output equivalence, but its read-only EXPLAIN
measurement is still pending; it remains uninstalled.

## Prior continuation — October 14 UTC, queue session and outlier qualification

The candidate preparation worker now holds one exclusive writer session across
ingest, claim, defer and summary. It loads and validates the queue once while
retaining all three durable commits, full validation/checksum/fsync/rename,
durable claims before packets and durable deferrals afterward. Any failed
operation poisons the session; methods are revoked on exit and asynchronous or
reentrant use is rejected. No stale-lock recovery or history pruning was added.
The two-file update was installed at 19:30:54 UTC on October 14 after the old
cycle finished. The installer preserved the queue and feed cursor byte-for-byte,
saved immutable backups, verified the new code hashes and restored the original
enabled timer. The first automatic preparation cycle ran 19:37:14–19:42:26 UTC
and exited successfully: 500 items prepared, all 43,107 entries retained in its
report, zero resolved or leased, and zero price publications. Memory peaked at
1,063,182,336 bytes. The independent audit passed against an immutable idle
snapshot: all 43,107 prior keys and complete history prefixes survived; all 500
claims and packet digests matched. Two absent-source entries were prepared with
retained evidence; the other 297 absent-source entries remained unchanged.
The original timer was restored enabled/waiting. Audit receipt SHA256:
`6a87d6c272b9cdd4b48665bf9c38cce11676dc3d3f8a4ca938b18551fe83a814`.
The next automatic cycle also exited successfully, 19:53:47–19:58:49 UTC,
with a 1,067,900,928-byte memory peak. This second cycle has terminal health
evidence, not a separate full-history audit. At 20:00:27 UTC both phases were
idle/successful, the original timer enabled/waiting, and discovery disabled.

All 50 focused tests passed in the retained offline Windows Sandbox. They cover
ordinary API equivalence, partial operation/rename failures, falsy thrown errors,
packet failure, reentry/revocation and actual child-process exit with durable
claims plus a stale lock. The first test attempt retained a test-counter failure;
only its instrumentation changed before the passing second attempt. Receipts are
under `output/queue-session-v1` and `output/queue-session-v2` in the private
validation root. The successful receipt SHA256 is
`cb33f632087b9c8e77cd168f69593c0c58cc1c8ffab21a9e7da91989a90c9ec5`.

Historical full-size qualification also passed: baseline, candidate, candidate
from the retained failure snapshot, and candidate restart each prepared 500
items. All 43,022 keys and complete prior history prefixes survived three
independent data-only audits; restart claims covered 1,000 distinct items.
Elapsed times were 107,990 / 58,966 / 55,263 / 55,179 ms respectively. The first
candidate cycle was approximately 45.4% faster in this Windows fixture; maximum
RSS remained about 879 MiB. Baseline ran first, so cache ordering is a limitation.
This is not Linux CPU/memory parity or proof for the growing current queue.
Receipt `output/queue-session-fullsize-v1/receipt.json` SHA256:
`acd7ba36532213f1f4bdc909f964020565f9bb4ba57d6afcf3a5c8b817dedfb0`.
All 22 receipt artifacts and 877 independent audit references were checked.

The bounded live outlier probe reproduced a timeout on batch 23's unchanged
expanded-original query after its 30-second statement limit. Batch 22's six full
25-column hashes matched across original RPC, expanded original and candidate.
Batch 23 candidate, batch 24 and EXPLAIN plans were never reached. The sanitized
failure records SQLSTATE 57014 and BrokenPipeError; there is no accepted census
or acknowledged terminal rollback. This implicates the original expanded path
as well as the stored RPC; it does not prove the candidate fixes the outlier.
Receipt `operator-readback/master-pricing-outlier-result-v1.json` SHA256:
`dcac1b203c6113e39b26409b2c1ce20ff5ee07fbddbc3492a0fe3f584980d857`.
All 14 isolated parser tests and exact offline wrappers/selector checks passed.

Current-size copied-queue qualification under the actual Linux 50% CPU / 1 GiB /
no-swap limits passed. The fixed idle copier captured the 143,008,245-byte queue
and a published feed at 19:01:47.591 UTC, with source hashes unchanged and the
original timer restored. The first/restart cycles took 298,303 / 295,601 ms;
both prepared 500 items and exited successfully within the 600-second cap.
Exact cgroup memory peaks were 1,064,366,080 / 1,063,886,848 bytes, with zero swap.
This establishes runtime compliance for this fixture, not spare growth capacity.

The independent read-only history audit passed: all 43,107 prior keys and full
history prefixes survived both cycles; 1,000 claims were distinct; every queue
envelope and packet digest matched. The feed contained 42,808 observed identities.
Of 299 absent identities, five then two eligible items were prepared without
changing their retained source evidence; other absent items remained identical.
No row was inserted, reopened, resolved or left leased. These are test-copy counts.

Proofs under `operator-readback/queue-session-current-linux-v1`:

- `first-result.json`: `ca824da23f58162e49b2113fd18bdea9df25b7f0de530f983c526c120a7d44df`.
- `restart-result.json`: `0b292d5f7f36e1b58133d836a218f6a2ccc94f8e76eba4f4797f6bc1b609e888`.
- `audit-result.json`: `a65a7696a0cedfb1d438d992b6e9ce770135f16f4d39e356c9be6e7b50cb3faf`.

Transient units were unloaded before the launcher's post-exit property queries;
their default-looking `*-unit.txt` files are not resource/configuration evidence.
Actual running restart/audit configuration captures, the pinned launcher and
terminal journals/logs supply that evidence. All downloaded output hashes match.
At 19:20:20 UTC the original timer was enabled/active and had started source
collection; the next preparation cycle had not yet started. The production queue
still matched the captured `c8dc52f6307aec274d6cb1bd4ecccebfa9f3e7587dc118026f9651ab55be17f5`
hash and had no writer lock. Discovery remained disabled with its earlier failure
retained. Do not describe the newly started normal cycle as completed.

The first V9 fixture SQL completed successfully, but its harness
incorrectly assumed one JSON record per physical line; its stopped cluster, dump,
roles and failed receipt are preserved under `output/master-census-v9-candidate-v1`.
V2 passed with complete logical JSON documents. All five server payloads matched
the original baseline after explicitly recorded Windows CRLF-to-LF transport
normalization; raw wire bytes and hashes are retained separately. Exact batches
500/500/1 cover 1,001 printings, with all 25 columns. Wrong-owner and missing-RPC
cases exited 3 with SQLSTATE 22012 / 42883 and zero payload. All 15 fixture table
fingerprints and the original RPC hash remained unchanged. The fresh cluster was
dumped, roles exported and stopped. Receipt
`output/master-census-v9-candidate-v2/receipt.json` SHA256:
`fa6f19d5c56a4cbbf5a54926b26f1c3461a36f026b209cf9ca8ee471282094a3`.
This is synthetic wrapper qualification, not production performance proof.
The V9 V2 bounded read-only full-census rehearsal passed in 158.028 seconds.
Its immutable 82,706,106-byte capture was independently audited at 19:59:43 UTC.
All 59,491 parents and 75,056 printings were covered; all 151 batches (last 56)
returned every printing exactly once with all 25 columns. Current source tuple,
freshness, repeatable-read snapshot and terminal rollback checks passed.
Independent receipt `operator-readback/master-v9-independent-audit-v2.json`
SHA256 `1e5119503f6c805651f3d1f6c99d3682484fab5544089700c14a2903b0489059`.

The verified snapshot has 31,982 available positive USD prices and 43,074
unavailable printings: 42,623 have no current qualified market price, 427 are
special_variant_v1_1, 18 lack a positive market price and 6 lack a mapping method.
There are also 6,172 parents without printings, 63 missing parent GVIDs (overlap
with that group), and 2 missing printing GVIDs: 6,174 distinct integrity entities.
Do not add parent and printing counts or treat fresh-but-unavailable rows as priced.
These are existing master-catalog coverage counts, not proof of worldwide card
completeness or equivalence to a successful full V8 census.

The census is verified evidence only: no candidate function was installed, no
discovery feed published, and no census rows imported into the repair queue.
Next qualify and install the bounded census feed/admission path, preserving the
catalog-integrity and unavailable-price partitions, before enabling recurring
discovery. Repair/publication execution remains a separate unfinished capability.
Its independent validator passed all 15 targeted tests in the credential-free
Linux test unit at 19:31 UTC. The V2 two-file queue-session installer completed;
its pinned receipt is `operator-readback/queue-session-installed-receipt-v2.json`
(SHA256 `c86817e8229ecfa266ec7d88ab99ff053f832859a4b9a2ffd3bf3390561d7c81`).
The earlier V1 installer remains unexecuted; its pending proof pins
prevent an accidental install. Installation must preserve the other six runtime
files, four original units, all queue/cursor data and code-only rollback backups.
The normal live cycle and independent history readback both passed.
Only the two preparation runtime files changed; query definitions, the feed
implementation, catalog and prices did not change. The update improves preparation
runtime; it does not enable price repair or publication. V15 preserves the
completed qualification evidence from before installation. V16 records the
installation, successful live history audit and independently verified census.

## Previous continuation — October 14 UTC, full-census compact diagnostic

A fixed diagnostic now preserves the original V8 parent/printing JSON SELECTs,
RPC payload SELECT and dynamic500-ID grouping byte-for-byte. It constructs each
complete payload, then returns its UTF-8 byte length/hash, identity counts/digest
and stage clocks. It makes no candidate-function change and cannot publish a
feed or accept a census. Additional hashing, JSON identity extraction and possible
psql interstatement roundtrips are included in timings; this is not pure query
execution timing or a controlled transport-only benchmark.

Operator `inspect_master_compact_v1.py` SHA256:
`74ea0851739687d0f6adfd72037cded510447e519a34de72ce7a24890c21cc9e`.
SQL `master_compact_v1.sql` SHA256:
`cda4d0506d9b8efdcd5d2a03f0d1122339240c6923fa1e82556052503d475e5f`.
All12 isolated parser tests passed, including failure-progress sanitization,
exact batch remainder, source/owner/migration guards and rollback requirements.
Test log SHA256:
`ae3061f1009dd103d3f557797f6260d64c9415f424f46b5ee86bbab3f5694bdf`.

Offline fixture V1 failed at startup with `process_output_flush_timeout`: pg_ctl
started PostgreSQL successfully, but inherited output handles prevented the raw
stream-copy task from reaching EOF. No test database had been created. The new
cluster was preserved, dumped, roles exported and stopped; independent pg_ctl
status returned3. All failed artifacts remain under
`output/master-census-compact-v1`, receipt SHA256
`2705d8df74978a3b907cedb16d8e0032a08eae8cbd7f46469439ed8bae397063`.
V2 uses the previously qualified Start-Process capture for pg_ctl only, retaining
raw UTF-8 byte capture for psql and a fresh cluster/database.

V2 passed against PostgreSQL17.11 with1,001 Pokémon parents/printings and two
excluded other-game rows. The exact five inventory/batch payloads matched the
independent original JSON byte lengths and SHA256 values, including Unicode
names and all25 RPC output columns. Batches500/500/1 covered every printing once.
The read-only repeatable-read transaction acknowledged rollback. A fixed division
by zero before batch2 exited3 and suppressed all later batches and success records.
All15 committed fixture table fingerprints and the original RPC hash remained
unchanged. The populated fixture was dumped, roles exported and its fresh cluster
stopped; pg_ctl status returned3. Earlier clusters remain intact.

Successful receipt `output/master-census-compact-v2/receipt.json` SHA256:
`006da4e41e3c59eedebad86b80366d4f010f1434a906db8e489851431ac50086`.
All41 artifact hashes and eight SQL pins passed verification. The retained offline
Sandbox and original wider output mapping are explicitly disclosed. Synthetic
helper behavior and a1,001-printing fixture do not establish production performance
or full schema/helper parity.

The live diagnostic ended at17:29:06UTC with `psql_timeout` after180.004 seconds.
Receipt `operator-readback/master-compact-result-v1.json` SHA256:
`8221500594be7a1143a05b11a1dcad2286d5f3e0babd68709512ef3000a0ec56`.
All downloaded hashes match. Only36,749 stdout bytes and zero stderr bytes were
received. Complete progress records cover both inventories and RPC batches0–35
(36 of the previously measured151 batches). Parent/printing payload construction
took1.255/4.439 seconds. Batch23 took72.571 seconds; batches5,4 and10 took8.945,
6.093 and5.518 seconds. These are observed stage durations, not query-plan or lock
attribution. No unfinished-stage record was received; buffering means the last
received record does not identify where the server stopped. This incomplete
receipt does not perform full V8 tuple validation or acknowledge terminal rollback.
The pinned SQL is read-only; no census, feed, queue mutation or repair was produced.

Compact output did not recover the workload. This is evidence against reducing
transport output as a sufficient fix, not proof that transport never contributes:
the diagnostic adds hashing/identity extraction and has a large stage outlier.
The earlier88-batch timeout and this36-batch timeout are separate observations,
not a controlled performance comparison. Inspect the outlier and qualify the
scoped query candidate before another bounded full-output census rehearsal.

A conditional V9 collector draft is saved under
`operator-readback/master-v9-candidate-draft`, SHA256
`09873ad725d8c84dc0bde91663d1fe1c10c7c380468474f1e48f4b0726a06cb2`.
It expands the previously qualified candidate SELECT inside the existing500-ID
wrapper and adds an installed-RPC-owner guard plus the RPC's public search path.
Code outside SQL remains byte-identical to V8. It is unexecuted, unuploaded and
undeployed. Next gate: isolated exact format/gexec wrapper qualification with
owner match/mismatch/missing-function cases, full25-column equivalence and the
exact remainder. Then review a bounded read-only full-output rehearsal; do not
install a function or publish a feed from this static draft.

A separate preparation failure occurred this cycle: systemd hit the600-second
limit at17:25:25UTC and reported `Result=timeout`. The worker exited0 at17:25:28
and saved `prepared` for500 items. Peak memory was1,067,491,328 bytes, with no
swap. The17:28:36 readback found no writer lock; the saved report has revision656,
37,107 pending,6,000 review_needed,0 leased and0 resolved, totaling43,107 unresolved.
The heartbeat/report timestamps refer to cycle start17:15:25.789UTC, not completion.
These are worker-reported counts, not a new independent full-queue/history audit.
There are zero active production executors, writes or price publications.
Evidence is preserved in `master-compact-preparation-timeout-{heartbeat,report}-v1.json`
and `master-compact-preparation-timeout-services-v1.txt` under operator-readback.

Runtime headroom is now a measured problem. Code inspection shows repeated full
queue reads/validation across ingest, claim, defer and summary for a141,757,245-byte
snapshot. Do not assume a smaller500-item batch solves that cost. A queue execution
change requires isolated full-size crash/restart/history qualification. No limits,
schedules, history or leases were changed. At17:32:11UTC the next source cycle had
succeeded and its preparation phase was still running; that is not a successful
completed cycle. Discovery remains disabled and the original timer enabled.

Immutable `validation_manifest_v14.json` binds the offline receipts, live failure,
service/worker evidence and conditional draft while preserving V13. No complete
Master-to-price census or newly repaired price is claimed.

## Previous continuation — October 14 UTC, six-cohort pricing comparison

The follow-up comparison adds an unchanged expanded-original control beside the
installed original RPC and expanded candidate. This separates the SQL rewrite
from differences in query execution path. Six disjoint 500-ID printing batches
cover the start, quarter, middle, previous timeout boundary (zero-based batch88),
three-quarter and final batch. The final batch must have its exact remainder.
Each cohort rotates the three variants, then reverses that order:36 measurements.
All six complete result hashes and counts must agree within every cohort.

Offline PostgreSQL17.11 qualification passed. Five generated universe sizes
exercise91,151,200,201 and300 batches, final remainders1,56 and500, and sorted
UUID-range disjointness; three invalid universes are rejected. All36 exact live
query wrappers executed against the same33-row synthetic scope, with11 available
printings. That repeated fixture scope tests wrappers, not production disjointness.
The separate generated-universe tests establish selector arithmetic/disjointness.
The retained16 semantic cases across25 columns also passed. This is not full
production schema or real edition-helper qualification.

Receipt `output/master-pricing-cohort-v1/receipt.json` SHA256:
`7347c54960ea84c26f61195954eae18c7e644cc2f23f1534337fddd886932cf3`.
All36 artifact hashes and six SQL pins were independently checked. The retained
offline Sandbox used fresh database `pricing_cohort_fixture_v1` and preserved
all earlier databases. Its original wider output mapping remains disclosed.
The fresh cluster was dumped, roles exported and stopped; pg_ctl returned3.
The dump contains the empty post-rollback database. No production access occurred.

All12 parser tests passed in the credential-free Linux rootfs. Log SHA256:
`a5dd0092711c1024b4fedee28dd3c6f675a3b16bcc0e719240d536bd08bcfbac`.
The reviewed live comparison passed at16:38:17.417UTC, with zero database or
definition writes and acknowledged ROLLBACK. Receipt
`operator-readback/master-pricing-cohort-result-v1.json` SHA256:
`40a4010ec7b325aa4573b41fa5192576e6467e9bde858e1190edcd35b20d512d`.
All downloaded proof hashes match. The PostgreSQL17.4 environment, original
RPC/owner and current publication/source pins passed. The universe contains
75,056 Pokémon printings in151 batches. Sample indices0,37,75,88,112,150 cover
2,556 distinct printings, including the56-row final batch. Every full-row digest
and count matched across all six measurements within each cohort. The sample
contains1,120 available and1,436 unavailable prices; these are sample counts,
not full-catalog coverage or newly repaired prices.

| Zero-based batch | Original RPC second call (ms) | Original expanded second call (ms) | Candidate expanded second call (ms) |
| --- | ---: | ---: | ---: |
| 0 | 206.689 | 157.351 | 128.190 |
| 37 | 197.218 | 144.516 | 132.645 |
| 75 | 168.734 | 140.715 | 127.209 |
| 88 | 174.061 | 142.770 | 118.514 |
| 112 | 167.502 | 234.841 | 118.407 |
| 150 | 84.795 | 86.714 | 80.998 |

The candidate's second occurrence is6.6–49.6% faster than the expanded-original
second occurrence in these six samples. This is evidence of a possible rewrite
benefit under repeated access, not a controlled full-census speedup. First calls
on the five500-row cohorts cost788–1,625ms, substantially more than repeat calls.
The original RPC and expanded-original control also differ. No installed-candidate
plan, repeated independent sessions or full151-batch candidate census was tested.
Do not extrapolate the warm timings to a one-pass census or deploy from this alone.

The next bounded diagnostic should preserve the original V8 full151-batch RPC
workload and exact JSON construction, but return compact payload lengths/hashes
and server-stage timings. This can distinguish execution/serialization cost from
full payload delivery and buffering before selecting a census fix. V8 timed out
inside psql after180 seconds and88 completed batches, before Python parsing began.
Compact output is diagnostic only and cannot become an accepted discovery feed.
Any candidate-function change still needs offline stored-function/full-workload
qualification and governed migration/release checks before deployment.

The original preparation cycle completed successfully at16:37:10UTC after595
seconds, close to its unchanged600-second limit. The live probe took17.546 seconds
and started with255.680 seconds until the old timer event, above its200-second
guard. Both launchers require all heavy phases idle; neither changed a timer.
At16:38:52UTC the original timer remained enabled/active/waiting, source and
preparation had exit0 and no active PID, and discovery remained disabled.
Final service readback SHA256:
`24c13b1a8eda880b76a755e2a0d6a15ceb5dc30b5728f31e728c01c2a999b749`.
The50% CPU/1GiB/no-swap limits remain intact. The preparation worker still has
no production repair executor. No prices, relationships or catalog entries were
changed. Versioned proof is `validation_manifest_v13.json`; V12 remains immutable.

## Previous continuation — October 14 UTC, Master pricing query scope

The requested-current-snapshot SQL candidate is implemented and qualified against
synthetic PostgreSQL17.11 data. It is not installed in production. The original
live RPC remains pinned to8d3e356a2e519d22d1ca166c213aea5d63fed02416f1436fa9447110e6ab5002;
candidate16b11df571f7e673f79576a1774fa596d68598c5735e9139f6264a3beba811e4
adds two materialized raw snapshot scopes before existing eligibility helpers.
Every original eligibility, visibility, invalidation, ranking and output expression
is retained. Both original and candidate definitions live outside migrations in
the external validation root's `input/master-pricing-scope-v1`.

All16 differential cases passed across all25 output columns, including independent
availability/ranking expectations, null/duplicate requests, hidden printings,
wrong publication/run, stale prices, edition holds and newest-invalid/older-valid
snapshots. Candidate helper calls were restricted to requested current snapshots.
Eight exact expanded timing-query wrappers also executed successfully: each
returned33 synthetic rows; all four hashes/counts per scope matched. Printing
availability was11, parent availability10. Synthetic helper-call reductions are
not measured production speedup. Real edition-helper semantics, full production
schema parity and stored-function cached plans are not qualified by this fixture.

Successful receipt: `output/master-pricing-scope-v3/receipt.json`, SHA256
`c220e6d286e2cae983eda4be8b79c23e6651487629cf8744b278782660a43a85`.
All32 artifact hashes and five SQL pins were independently checked. Both psql
processes exited0; the equivalence transaction acknowledged ROLLBACK. The fresh
V3 cluster was dumped, roles exported and stopped; pg_ctl reports no server
running. The dump is the empty post-rollback database, not populated fixture data.
The immutable fixture SQL and execution logs preserve reproducibility.

The retained offline Windows Sandbox was reused with a fresh cluster/database;
its earlier databases remain intact. Its original wider output mapping remains,
and the receipt states this explicitly. The ordinary V1 launcher created another
remote-session process but no second VM. Explicit second-instance startup returned
CO_E_APPSINGLEUSE. The initial observation's apparent launch-exit diagnosis was
incomplete; there was no verified V1 SQL execution. V2 then failed before initdb
because the driver assumed loopback interface1; the diagnostic proves this guest
uses200 with only loopback routes and no Up adapter. V3 derives that interface,
rejects external/default routes and verifies read-only inputs, absent credential
environment names and invisible host canary. All failures remain preserved.
Use the packaged wsb CLI with retained VM2afe75c6-298c-495e-9214-e4c5c3779ad8;
do not terminate it or reset retained databases to start another fixture.

Eight fixed-probe parser tests passed in a separate credential-free Linux rootfs
with DynamicUser, private network and read-only inputs. Test log SHA256
`f516ffe5eb715b0a4359ffac1dfc66431a38c9d4d25ce3fd198e076664efba4e`.
Root review caught and corrected the draft probe's nested terminal semicolon
before any live execution. Exact expanded query bytes were then executed offline.
The fixed live comparison uses two500-ID Pokémon scopes, original/candidate/
candidate/original order, all-column server digests and owner/RPC/context pins.
It is SELECT-only and rolls back; candidate SQL is expanded, not installed.
Same-repeatable-read pointer checks do not detect concurrent publication changes.
The live read-only comparison passed at15:48:12.460UTC on PostgreSQL17.4. All four
complete result hashes matched within each500-ID scope, including224 available
printings and157 available parents. The original function/owner and mature
environment pins passed (171,758 cards,3,404 sets,32,903 traits); publication
d82e3e50/source6afde958 remains the same accepted source tuple. Receipt SHA256
`b6c7818c82a2b46f394a224727ea97d242c754571d86ec6d3db06fe16a0f202e` at
`operator-readback/master-pricing-scope-result-v2.json`. All downloaded artifact
hashes match. Transaction ROLLBACK and zero definition/data writes are recorded.

| Scope | Original first / repeat (ms) | Candidate first / repeat (ms) |
| --- | ---: | ---: |
| 500 printings | 1802.789 / 225.158 | 212.310 / 130.047 |
| 500 parents | 1644.448 / 148.913 | 206.167 / 147.127 |

The large first-call/repeat difference prevents attributing the initial speedup
to the candidate. Warm original parent timing is essentially the same; the two
candidate printing samples are faster, but this small ordered comparison is not
a controlled benchmark. It proves sampled equivalence and bounded execution,
not a consistent global speedup, a qualified stored-function plan or recovery of
the151-batch census. Next bounded performance gate: compare six disjoint printing
batches spread across the census (early, quarter, middle, prior timeout batch89,
three-quarter and final), with exact final-batch cardinality, alternating first
variant and reversing each pair. Require complete result-digest equality and the
same time limits. If that shows a consistent benefit, qualify the installed
candidate function offline and the exact full-census workload before production
SQL migration. Do not promote the rewrite solely because its first comparison
appeared faster than the original's first invocation.

The original preparation cycle succeeded at15:31:52UTC; its next scheduled cycle
ran15:38:36–15:47:53UTC and also succeeded. The probe ran in7.833 seconds with
331.717 seconds left until the old timer's next event, exceeding its200-second
idle-window guard. No timer, production definition, mapping, catalog row or price
changed here. Final service readback at15:49:56UTC confirms the original timer
enabled/active/waiting and both latest source/preparation exits0 with no active
PID. Discovery remains disabled; its old failed census/controller statuses are
preserved. Readback SHA256
`c141f69e7f23f55e0e822b0c61e85f1cf697a3c2c13e69a94594e53b2d176c66`.
The versioned proof inventory for this continuation is `validation_manifest_v12.json`;
V11 and all earlier manifests retain their original bytes.

Release gates remain: measured bounded and complete-census performance/equivalence,
a governed migration based on the exact current RPC including Gym guards, full
replay/upgrade and normal source/release checks, then deployment and independent
application/census readback before enabling the separate discovery schedule.
Do not treat successful fixture tests as authority to activate repair/publication.

## Previous continuation — October 14 UTC, edition intake and queue memory

Recovery is complete for the legacy preparation runtime. At14:43:44UTC the
original source timer is enabled/active/waiting; its first automatic recovery
cycle completed source collection at14:33:32UTC and preparation at14:43:02UTC,
both exit0. The scheduled worker prepared another500 items and reports
revision626:43,107 unresolved,42,107 pending,1,000 review-needed, zero resolved,
leased or retry records. Its fresh capture is4149a1dc5753f13a, same source run
and publication as the audited manual cycle. All42,808 current source observations
were unchanged. The cache returned to current-plus-previous retention normally.
All18,470 original historical report hashes, all8 runtime files, all4 unit files
and isolation/resource settings are rechecked; writer lock and pause marker are
absent. The discovery timer remains disabled/inactive due to the Master timeout.
Final readback SHA256
`21cacc452f1c50f9908c871615a1298e4709b44c3d5e01cb7a788ef67355980f`;
separate timer/service readback SHA256
`85d5e530012290c4bc0980a1c58969ebe3413aeadec4abfe070181d3287332bc`.
Runtime `memory-recovery-scheduled-v1` preserves this final queue/report/heartbeat/
cursor/readbacks. Final queue is139,672,245 bytes, SHA256
`c9301a4b87b33aeefc869c8fc8093d4d1ec42a63fb9e1c400a301b7ba5816652`.
The independent full-history audit below applies to revision623; revision626
counts are worker-reported and its queue file independently hashed. Do not
claim a second independent full-history audit. The scheduled run took570 seconds
and peaked at1,071,652,864 bytes, close to the unchanged600-second/1GiB limits.
This establishes recovery for the tested backlog, not capacity for future growth.
No production executor, catalog promotion, mapping repair or price publication
was activated. Master-to-price coverage remains unknown. Earlier entries below
retain the intermediate recovery sequence, including their then-pending steps.

The live retry succeeded at14:29:01UTC (546 seconds; service memory peak
1,044,303,872 bytes). Independent live retention audit V3 passed at14:31:30UTC:
all43,022 old keys/history prefixes survived,85 new keys came from the fresh
capture, and the queue now contains43,107 unresolved records at revision623.
There are42,607 pending and500 review-needed records, with zero resolutions,
leases or retries. Of299 old rows absent from the current feed,298 are unchanged
and one received only the authenticated preparation claim/review events. All500
packet items and queue/packet checksums matched independently. Current source
tuple fields are verified; this is not full source-evidence equivalence or a
production-price verification. Audit SHA256
`7235605d9e3afeefae77231c79535d565ac2c2d8dd5a122a821b0b05748f9ab0`.
Queue SHA256 `c6cbcd8bec793be83f076a9b653ce00955cda8090b328de3fc88c97c0b5a81e6`
(139,463,745 bytes). Runtime `memory-recovery-live-v1` preserves that audited queue,
report, heartbeat, cursor and audit before the schedule can advance them.
Readback `runtime-memory-live-retry-v1.json` (SHA256
`0a53240090b9fab9c814eb68cf093c5c88890a8d60d08485c7eee8eefb0d8698`)
also reverified all18,470 historical report hashes, with no lock or pause marker.
The original source timer was restarted at14:32:26UTC and immediately triggered
its first automatic recovery cycle; that scheduled cycle is still being observed.
The separate discovery timer remains disabled/inactive.

Next discovery implementation: test a SQL rewrite that materializes all requested
current-publication/run snapshot candidates before edition validation, separately
for parent and printing paths. Preserve every eligibility/invalidation/visibility
guard and apply existing DISTINCT/ranking only afterward. Use the pinned live RPC
body8d3e356a, not an older migration that lacks the Gym guard. V8 already makes
independent500-ID calls and still reached only88/151 within180 seconds. The plan
supports this candidate, but proves neither a speedup nor a missing index. Require
identical results offline and measured bounded/full-census performance before
adoption. No SQL optimization, catalog/mapping repair or price publication was
performed by this recovery.

Live recovery update: fresh source collection succeeded at14:10:58UTC. The first
preparation attempt failed at14:11:30UTC with `FEED_CACHE_COMPLETED_LIMIT`,
`queueCycleInvoked:false`; queue revision620/hash1d0e69b9c2e6 was unchanged.
The fixed reviewed `archive_pricing_feed_cache_v1.py` (SHA256
`529386dcf0741cd2179ef7197c58d6524593669d484d071b1ff6b24dfd878c4c`)
preserved both noncurrent generations8ccbada4/dfcf0c4a by atomic same-filesystem
rename into runtime `memory-recovery-cache-v1`. All nine generation files retained
their bytes, modes, owners and inodes; current9fe11e1b, queue and accepted cursor
were unchanged. Recovery receipt SHA256
`d7195731111d409f37a05dd3477d1197263b7612d555fba38523b62bb575bd72`.
Failure evidence and intent precede the moves and remain archived. The fresh
capturefc818058/manifest732398fa is preserved locally under
`operator-readback/memory-recovery-live-v1`. A direct preparation retry began
at14:19:55UTC; live outcome, independent retention audit and timer restoration
remain pending. No pricing/catalog/mapping production writes occurred.

Latest recovery: all98 tests and all three full-size V5 cycles passed. Restart
took505,476ms and reached revision626 with two disjoint500-item batches. The
independent fixture audit preserved every one of43,022 history prefixes in both
cases, all1,869 edition holds and four absent rows, and matched all queue/packet
checksums. Audit SHA256 `cd0eb60152f82374bcac23be04c7579493fb91d9c9fdd10b0b69f39bd9e7afab`.
The reviewed fixed deployment installed only queue module996b9d61000f and moved
the original stale lock into preserved evidence without rewriting/rolling back
queue.json. Deployment receipt SHA256
`ac00edbb66ad4c3f0ef03b61497b19ee417527c342d9e8a4e8a64784dd99b3dc`.
Other seven runtime files and four unit files stayed unchanged. Both timers remain
inactive while a manually started fresh source/preparation cycle is verified.

Fresh metadata at14:05:52UTC accepted source run
`662685a2-d9bc-4178-8638-0da20491556d`, publication
`d82e3e50-ab39-46b9-829b-a37c2b5bcf15`, source sync
`6afde958-f5ca-4ab1-bc0d-47d8db954330`:208,577 selected/165,769 published,42,808
unresolved source observations. These production updates came from the regular
pricing pipeline, not this recovery. Pricing RPC bytes remain unchanged. Metadata
receipt SHA256 `7f5ea85d7747a96b9f0db192f1953c2cb21d4b23b896d413b3cbed1f4b750f44`.
Source service was manually started14:09:37UTC; its existing OnSuccess link starts
the isolated preparation worker. Live retention audit and timer restoration are
still pending. The earlier timestamps below describe preserved intermediate states.

At13:34UTC, fresh systemd/file readback confirms the original source timer remains
enabled but inactive, preparation remains failed/OOM, and the actual queue and
writer-lock hashes still match the preserved failure below. No other session has
replaced the installed queue module. The first memory candidate passed95 isolated
tests but its original-to-new-publication full-size replay was OOM-killed after
165.221 seconds at1,073,635,328 bytes. The harness stopped; failed-state/restart
cases did not run. Preserve `memory-evidence-qualification-v1-failure` and the
remote qualification namespace. That candidate is unqualified and uninstalled.
A bounded snapshot-reader candidate is now being prepared; do not recover the
actual stale lock or restart the schedule from unit-test success alone.

The streaming-reader candidate is frozen in `input/memory-evidence-borrow-v5`:
queue SHA256 `996b9d61000f3b782b4c37f3719cff1fc2b90732d1ff58499c0188ce53c8e751`,
code-manifest SHA256 `72b40f324e9449bf570d19a20b8eada1ae4a224cf858d3e4f5624281bb86d122`.
All98 isolated tests pass. The new-publication full cycle passed at13:48UTC in
503,985ms (service runtime507.354s), preparing500 observations and retaining
43,022 unresolved records at revision622, with no leases, retries or resolutions.
Its receipt SHA256 is `ce2df7ea7537fc804e77cc08bcfc8289243ce1ffe5a902234672b63c6c93e402`.
Failed-state recovery also passed at13:57UTC in491,176ms (service runtime494.659s),
preparing500 at revision623 with43,022 unresolved, no leases/retries/resolutions.
Receipt SHA256 `eb5e1eba2bc862b47d3d3ca3c2e5d715ed7f23f39c7ea5eb0e8430b42f50f408`.
Its cgroup peak was1,073,233,920 bytes: passing does not imply spare capacity.
Restart qualification is still running in the separate
`/var/lib/grookai-pricing-memory-streaming-qualification-v2` namespace. Independent
fixture history verification, installation and actual lock recovery remain pending.
The13:38:59UTC runtime readback reverified all18,470 historical report hashes;
actual queue/lock remain unchanged and both timers inactive. Readback SHA256
`fb0ab17569031b67455abf6ab02e6093de0491d3d889e1d96f091e7674724368`.

The replacement production publication `6c875d35-c8bc-4b17-91ec-226aa65ce729`
belongs to run `2b970071-c0f4-4eb8-b132-fb1102bf71d1`. A fresh read at06:00:52UTC
confirmed the unchanged pricing RPC definition and165,581 published snapshots.
Those production changes came from other work, not this worker continuation.
The first plan probe rejected its older pinned publication; the refreshed probe
passed13 tests and captured92 estimated plan nodes at06:03:42UTC. It did not
execute the pricing SELECT. The plan can evaluate edition guards before filtering
historical snapshots to the current publication, and estimates10 requested IDs
for the retained500-ID request. These are performance leads, not measured causes.
The full Master census timeout remains unresolved; the discovery timer is disabled.

The replacement source has43,018 unresolved observations, including1,869 with
`edition_bound_pricing_authority_required`. The original intake rejected that
new reason, causing the scheduled preparation failure. One explicit review route
was added, preserving exact identities and all edition holds. All57 isolated
contracts and the complete retained-capture replay passed. Only the intake module
was installed, SHA256 `6055d82f499573ac0e54c126e8d8dcaffbb3dd5fd5befe6a4a3c56904a95f00c`;
the other seven runtime files and all four service/timer/slice files stayed unchanged.
Deployment receipt SHA256 `9769b15c7f17f176dbd651623ecdc8238a0559309fe36d76128d1039f85973d3`.

The live preparation attempt started06:15:15UTC and was OOM-killed at06:17:55UTC
under the existing1GiB limit. The source timer is temporarily stopped but remains
enabled; do not mistake enablement or the old heartbeat for a successful run.
Both timers are currently inactive. The failed invocation, queue and writer lock
are preserved under `runtime/edition-intake-oom-v1`; preservation manifest SHA256
`b6b47f07a17f620df226b1c76adfe354b4d8286af281b8dac7bb4fb9324b4d80`.
The original queue snapshot remains separately preserved under
`runtime/edition-intake-before-v1`.

Independent failure audit confirms revision619→620: ingestion committed43,018
pending observations and retained four unchanged review-needed observations.
All43,022 keys, first-seen values, history prefixes and lifetime attempts survive;
all1,869 edition holds are present. No lease or temporary snapshot was committed,
and the independently calculated canonical checksum matches the stored digest.
Failed queue SHA256 `1d0e69b9c2e6c07c23230d0089d18120c6ff0feef7f3d3b2ed4f4764368b6382`;
writer-lock SHA256 `bcc2fa1023db74f21d23900a9d74b39122eb6ee08a977531055c8374fd1543bd`.
Do not clear that lock or retry before the memory repair and controlled recovery
qualify. A candidate reducing duplicate evidence allocations is under review;
full original-to-new-run and failed-state restart replays under the unchanged
resource limits remain required. No mapping, catalog or price write occurred.

## Runtime activation continuation — October 14 UTC

The companion first-run/restart Linux qualification passed with 63,247 unresolved
entities: 43,261 exact printings, 6,172 parents and 13,814 warehouse products.
Two disjoint 500-item packets were prepared; no entity was completed. Independent
readback verified all 530 retained objects and the original item histories.
Dragonite warehouse product 456093 is explicitly retained. The qualified state
was copied to the permanent separate StateDirectory with all 535 files verified.
The existing 43,022-observation queue was not migrated or replaced.

The four-phase controller and services are installed. Its first complete cycle
passed existing source and preparation, then failed the supplemental Master read.
The controller stopped before warehouse capture or new queue mutation. Receipt
`122da0cee74903b3db2ab0da96d3e601` and its failed capture remain preserved.
Independent legacy readback still verifies all 43,022 unresolved observations and
18,470 original report hashes. The new queue's CURRENT remains the handed-off
`7e7732629318b82b3256d8443bf46417fdd9bea0b8495b223291a43e3be74d04`.

A fixed isolated diagnostic passed ten disclosure/progress tests, then reproduced
psql exit 3 / SQLSTATE 57014 (`query_canceled`) after 127.156 seconds. It completed
all six census records through printings, but no RPC batch. This locates cancellation
in the statement containing 151 RPC calls; it does not independently prove the
server's cancellation reason. No raw stderr, credentials or census contents were
exposed by the diagnostic. Production writes remained zero.

Master V7 changes only that SQL block: one call to the same exact pinned application
RPC, then one join/group pass producing the same 500-ID batches. Duplicate rows
remain visible; unknown/null identities form an invalid extra batch; missing rows
still fail exact membership validation. Independent review found the printing
semantics equivalent with an empty parent request. All original transaction,
timeout, byte, freshness and coverage guards remain. Thirteen isolated V7 tests
and 29 publisher V2 tests pass; synthetic tests do not prove live SQL performance.

V7 collector SHA256 `78d8708c81dd66f12333d04c4a27ccdaaf9a00546ee5cc47fb86ca353d812c5a`;
SQL `508e11bc21ba8d07681c96baa0c8967097ee9c3f027cdc5c13b3f40d8c7e20ec`.
Publisher V2 is `8b81f7145df81dbefe10c55f07b17b5b241b7c057bb311b870e1d1e87feb3986`.
Its new `/var/lib/grookai-discovery-census-feed-v2` namespace preserves the entire
V1 feed and failed stage. The eight-module worker remains unchanged; its unit now
supplies the V7 pins and mounts V2 at `/feed`, retaining the same queue/cursor.
The second full controller cycle also failed at the Master capture at
05:06:36.048UTC, after completing existing source and preparation. Terminal receipt
`1b901cf2a77b06b42a729ecdd54d6e42` and the rejected V2 stage are retained. The new
queue CURRENT and heartbeat still match the handoff hashes. V7 is not qualified
for activation. A Master-only V8 diagnostic is being prepared with separate fixed
500-ID SELECT statements inside the same read-only repeatable-read transaction;
the original 180-second total bound remains. Both timers are temporarily inactive;
a terminal status must establish activation or restoration before work ends.

V8's real PostgreSQL 17 fixture passed 18 checks, including 500/500/1 exact UUID
coverage, a shared read-only repeatable-read snapshot and immediate ON_ERROR_STOP
failure on the second generated query. Receipt SHA256
`3e1a0ab175571b0cde686e9450af1edfa9418d9aaea255a3ce4ac0db0b0ed883`.
The first guest harness waited on PostgreSQL descendants; a separate stop recovery
and corrected native exit-code handling are preserved with all failed attempts.
No retained database was reset or dropped; the successful fixture was dumped and
the cluster stopped. Thirteen V8 static tests and ten diagnostic tests also pass.

The live V8 Master-only diagnostic reached 88 of 151 RPC batches before the
unchanged 180-second process timeout. It received 59,253,206 bytes with no stderr;
validation and terminal rollback acknowledgment did not complete, so no census
was accepted or published. Receipt SHA256
`2a47683db29b29e6c3ed7d8a1d007db01238269043f5e8835d771c4da7422e3f`.
V8 is not qualified for recurring use. The conditional V3 publisher/unit drafts
remain uninstalled; the recurring units still reference V7 and feed V2.
The fixed fallback restored the exact original legacy source unit and its
OnSuccess preparation target, then enabled/started the original source timer.
The new timer is disabled/inactive. The restored legacy source succeeded at
05:24:55UTC and preparation succeeded at05:29:39UTC. Its timer is enabled/waiting.
Independent legacy readback verifies43,022 review-needed observations, zero resolved,
18,470 preserved historical report hashes and unchanged deployed worker code.
Legacy readback SHA256
`d2c31c523c8efbcca0b2515bcc90af53e150395a830f53038f9c05bda6f9f053`.
Independent discovery recovery readback verifies all535 handoff files byte-for-byte,
all eight code files,530 immutable objects,two packets and63,247 unresolved entities
with1,000 preparation attempts. Both failed controller receipts and feed failure
statuses remain intact. Recovery readback SHA256
`5e40428d64979d80c74a45911a03de5d8a04f837cbf87ec2639871f2c2c681d7`.
The historical Windows relationship-repair scheduled task remains Disabled.

The next performance check is metadata and bounded EXPLAIN without ANALYZE,
not another full-census retry. The exact RPC performs latest-decision history
lookups for every printing, including those with current prices. The prior
warehouse metadata already shows the printing-history index exists; do not add a
duplicate index on an assumption. Its use/validity and the publication-snapshot
join plan require direct evidence. The edition-link active/retired predicate also
differs from existing partial-index predicates, but table size and actual plans
must establish whether that matters. None is a confirmed timeout root cause.
The V8 duration includes census transfer, RPC execution and output handling.

The bounded metadata collector's first read completed its SQL but failed its own
table-identity validation: PostgreSQL OIDs serialize as JSON strings. Metadata V2
adds only explicit bigint casts for table/index OIDs; strict validation, TLS,
read-only transaction and45-second/1MiB bounds remain. Thirteen isolated tests pass.
The first V2 launch then correctly stopped at its120-second timer-window guard;
no V2 database read began during that attempt. Its test log and empty window file
are retained, and the retry reuses the pinned successful tests.
`operator-readback/master_pricing_plan_probe_v1.sql` is a later-step draft only:
EXPLAIN without ANALYZE over the pinned expanded RPC body and first500 IDs. It has
not been uploaded or executed and does not reproduce the stored function's cached
generic/custom plan. It is not accepted runtime or production-change authority.

Metadata V2 was accepted at05:46:29UTC after the next original scheduled cycle
completed successfully (source05:41:07UTC, preparation05:45:43UTC). Readback SHA256
`74a64b7d720d657e4b6b8e22b5c56bbaff77713919450be629232be33203b25c`.
All28 scoped indexes are valid, ready and live. The printing-history and
publication-set/printing read indexes both exist with their expected definitions.
Catalog estimates are14,075,000 decision rows,9,902,370 snapshot rows and128 edition
links. These are estimates; low cumulative row counters and null analyze timestamps
do not prove tables were never analyzed or that statistics are stale. No index,
ANALYZE, schema, mapping, catalog or price operation was performed. The next gate is
bounded internal query-plan evidence, followed by a qualified performance repair.
The new discovery timer stays disabled until a complete four-phase cycle passes.

## Latest continuation — October14UTC, bulk discovery intake qualification

The companion discovery implementation uses real parent, printing and warehouse
product identities. Master catalog defects and missing prices are deduplicated by
printing; no-child parents remain explicit parent work. The all-warehouse intake
retains products excluded from pricing selection, classification failures and
mapping gaps. Source quotes do not count as published prices or identity authority.

The separate durable queue uses immutable hashed shards and generation receipts,
with an atomic CURRENT pointer. It preserves absent items unresolved, prior history
and unchanged semantic records; bounded leases and review packets never resolve
work. Its namespace cannot overwrite the existing V1 queue. Seventeen isolated
queue tests,23 Master tests and16 warehouse tests pass. Historical full-data
replays produce49,433 Master work entities and13,814 warehouse work entities;
these are not distinct-card counts and must not be summed with the V1 observation
queue as unique cards. Maximum evidence sizes fit the4KiB queue bound.

The fixed supplemental operator publisher passed29 offline Linux tests and a
fresh protected read-only capture. At03:59:03.139UTC it published immutable pair
`a9196a0590cba75b2e0abb723b332a2a12c8b151b13c3f19af09925306d47d07`,
binding separate repeatable-read transactions to the same source/publication tuple.
Manifest SHA256 `a432fa1cb581bcf287fa5e99a81f4baff29a4ba1f55215ccf9a77daf96b77883`.
The one-shot took253.055s and peaked at1,057,869,824 bytes under a1GiB/no-swap
cap. Headroom is small; the peak process/phase was not observed. No recurring
companion schedule or production repair executor was activated by that test.
Independent receipt is external
`operator-readback/discovery-census-live-qualification-v1/independent-qualification-receipt-v1.json`
SHA256 `b226382a30107208ea41458359e536b55b26b47194679cc76e399350507c49cb`.

The combined worker consumes both validated censuses before admitting one queue
generation; packet persistence precedes acknowledgment. Review added freshness
checks after ingestion, before acknowledgment and before the final heartbeat.
It has no database/network/Git access or production execution API. Full-size
first/restart runtime qualification remains pending at this checkpoint section;
the terminal continuation below, when present, owns the actual outcome.

## Previous continuation — October14UTC, complete Master census and bulk admission

The fresh read-only Master census succeeded. It retains both Pokemon and Japanese
set families: 59,491 parents, 75,056 exact printings, 31,795 usable market prices,
43,261 exact-printing price gaps and 6,172 parents without printings. There are
6,174 catalog integrity entities (the 6,172 parents plus two printings); overlapping
issues are not added as distinct cards. The unresolved entity union is 49,433.
No invalid parent routes remain in this census. These are the specified USD
TCGPLAYER_MARKET scope, not condition/grade pricing or proof of global completeness.
The separate V2 inventory and integrity ledger are accepted offline; the installed
V1 source worker does not consume them and no queue import occurred.

The initial V5 collector rejected a changed RPC definition. Fixed read-only
inspection identified the exact two Gym edition predicate additions already present
in main 9c6d9af7d0b09ed0f969a19e9f40812c95f8553b. The V6 collector was repinned only
after body comparison with the Gym migration. Other-session changes were preserved;
production now reports 447 migrations and four more Pokemon parents/printings than
the historical census. No migration, card or price was written by this work.
The V6 capture at 02:35:25.899UTC is SHA256
`333c8d895a5079c3ee90fc7a26ee5c015122acabe5453f5808cfe9c3ff7dc116`.
The final 18 Master V2 contracts pass. Fresh intake qualification is
`output/master-v6-fresh-intake-qualification-v1.json`, SHA256
`bea949f681efddaa8ff1d2d9054b7e011debdd0dcd7738e3edfd77b185479276`.
Earlier rejected captures and the initial Sandbox launch failure are retained.

The new default-disabled `reviewed_operator_snapshot_v1` admission path checks
externally pinned fixed operator data, the complete 120-product ME05 population,
all sibling observations/decisions and selected Master authority. Genuine fresh
capture admission passed all five unchanged batches: 120 mappings supporting 194
observations. This is pure admission, not a production executor dry-run or apply.
The receipt is `output/me05-genuine-operator-admission-v1.json`, SHA256
`179d680133c49e20aee41f0525a06dd832606a65fa84f86e4c155db00576bce9`.
Original offline-reviewed plans remain dry-run-only. No receipt was relabeled.

Independent review found and fixed two issues: apply now holds a shared publication
pointer row lock through commit, and selected reviewed raw product artifacts must
match the freshly captured product payload hashes. The final 37 focused contracts
pass. A real two-session PostgreSQL 17 probe proves the lock blocks pointer updates
until commit and rejects stale serializable acquisition. Its new database/dump,
initial wrapper failure and successful recovery logs are retained; the cluster is
stopped. Other rereads retain transaction-snapshot semantics, not a stronger
through-commit freshness guarantee. Clean committed producer packaging, current-main
integration, full real-executor rehearsal, confined writer qualification and normal
release gates remain open. No production executor was invoked or enabled.

Warehouse-wide V3 succeeded at 02:59:07.192 UTC after two retained timeouts. It
captures all 32,875 category-3 products across 220 groups, including 1,391 products
not selected in the current pricing run. There are 2,144 without current positive
quotes, 589 without any historical observation, 12,331 without active TCGPlayer
mappings and 12,211 without either recognized parent-mapping source. These are
products, not an adjudicated count of missing cards; sealed and other product
kinds remain included. All 20,664 mapped products join an exact parent UUID in the
separate Master census. No missing group or mapping group mismatch was found.

The fixed EXPLAIN diagnostic identified the historical count aggregate as about
89% of estimated query cost, visiting approximately 20.9 million indexed rows.
V3 uses an indexed latest-observation lookup per product. Historical observation
counts explicitly remain null/not_collected; exact presence/latest date, current
observations, decisions and mappings are retained. No timeout/output cap increased.
The final collector passed 15 offline tests and independent review. The successful
capture SHA256 is `4188d2248cb82ab1a6ddf72295d9d5165665099a270b15a2cdbf90c8b9d75e40`.
Both earlier failed attempts and the four-test EXPLAIN proof remain preserved.

Fixed data-only projection produced the full per-product ledger and exact-ID Master
joins in `operator-readback/warehouse-v3-projection-v1`. There are 24 GameStop-name
products; all have positive current source quotes and 22 have no recognized parent
mapping. Dragonite product 456093, `Dragonite - 131/195 (Gamestop Exclusive)`, has
a source quote of USD 16.67, no parent mapping and an excluded qualification decision
with `unsupported_product_kind` plus missing identity/mapping/finish reasons.
That source quote is not a published Master price. The two mapped GameStop products
also have no available exact-printing price in the separate Master readback.
These are text discovery and exact mapping joins, not retailer identity adjudication
or verified application search behavior. Do not create duplicates or substitute
ordinary printings for stamped promotions. Classification/identity, mapping, finish
and price publication all remain necessary repair lanes. The prepared Python
analysis runner was not qualified because the offline guest has no Python on PATH;
the actual projection used only fixed PowerShell JSON reads/writes and pinned bytes.

The recurring timer was restored at 02:59:45 UTC and started a fresh source cycle.
The restored source/preparation cycle passed. Readback at 03:06:39.7832 UTC found
both services successful/inactive, the timer enabled/waiting, all 43,022 items
unchanged and unresolved, zero inserted/reopened/resolved, no pause/writer lock,
and all 18,470 historical report hashes preserved. The installed eight worker
files remain unchanged. Readback SHA256 is
`a97f314295b6a27118596aa5028c911da91b76c698a3fd438cc1323a50ad8cec`;
queue SHA256 is `b75ea88744b35888248b612f8aef1169231e9020d5b5c2ec8d52112b6dcbf1e4`.
The refreshed capture time is 03:00:38.681 UTC; source freshness still uses October13
09:36:39.447 UTC. Master V2 and warehouse V3
are not yet imported into that V1 scheduled worker; the existing 43,022-item queue
remains distinct from the new census. No production mapping, card or price was
written. GameStop/Dragonite repair and searchability remain open.

Remaining implementation order: qualify combined V2 Master/V3 warehouse intake
without resetting the existing queue; integrate the bulk executor against current
main/schema and run the real retained-database/release checks; create exact retailer
identity/classification repair plans for the discovered GameStop population; then
reconcile/publish and independently verify exact-printing prices and searchability.
The 120 ME05 mappings are the currently admitted repair population, not evidence
that those GameStop identities or the remaining catalog have been repaired.
`validation_manifest_v9.json` binds this continuation; V8 and all earlier receipts
remain immutable.

## Earlier continuation — October14UTC, protected recurring preparation

The protected source service and credential-free Linux preparation service are
installed. The first live migrated cycle passed: source capture at01:52:41.149UTC,
43,022 unchanged review-needed items, zero inserted/reopened/resolved and zero
production writes/publications. All18,470 historical report artifacts retained
their hashes. `operator-readback/runtime-live-readback-v1.json` records code,
unit, credential-file metadata (no values), feed and queue readback. Independent
post-handoff comparison passed at02:00:44.384UTC: all43,022 keys, unchanged
generations and history prefixes survived, with no additions or closures. The
timer was enabled at02:01:08UTC and triggered its first automatic collection.
The automatic source and preparation cycle both passed. Final readback at
02:07:21.350035UTC found both services inactive/successful, the timer enabled
and waiting (next02:17:20UTC), no pause or writer lock, all43,022 unchanged
review-needed items and all18,470 historical reports still hash-identical.
`operator-readback/runtime-scheduled-readback-v1.json` SHA256 is
`b960603708d444700a077e869c702ded27b7f95227cab712969e085de5117690`.
The scheduled post-cycle queue SHA256 is
`acfdf53b877073df560b71239f8ae5b0f99f948f7989be1c70beb603b4c83dc9`.

The old Windows worker PID5148 stopped at01:48:38.546UTC after a verified pause;
its original state remains paused and preserved. The handoff transferred18,475
files byte-identically, including all queue state and review reports. Never resume
that old state beside the Linux worker. The unsafe historical Windows publisher
task remains Disabled. No application deployment, commit or push occurred.

Final streaming queue digest/snapshot implementation passed41 Sandbox contracts
and preserved legacy digest/serialization bytes. The first two Linux full-size
attempts exhausted the768MiB JavaScript heap; both failures remain retained.
The final implementation passed18 synthetic scenarios,13 isolation checks and
both full43,022-item first/restart cycles, preserving identities, attempts and
history. Qualification reached the1GiB cgroup limit without swap; CPU allowance
was increased to50% of one core. This is measured capacity, not spare-headroom
or arbitrary-size assurance. The fixed source publisher separately passed22
offline fault/retention tests. See the runtime and feed contracts for exact scope.

One post-handoff source attempt at01:50:53.859UTC failed with the sanitized code
`collector_capture_failed`; the failure is preserved. The single retry succeeded.
The cause is not established. Failed/in-progress collection fences the prior
feed; freshness and identity checks were not bypassed. Source freshness remains
bound to October13 09:36:39.447UTC, not the newer capture time.

This is bulk recurring preparation only. All43,022 observations remain unresolved.
Master/all-warehouse coverage, qualified repair execution and independent price
publication verification remain unfinished. GameStop/Dragonite is not closed by
this infrastructure work. The earlier sections below are historical evidence.
`validation_manifest_v8.json` binds this continuation; earlier manifests and
failed qualification/capture artifacts remain preserved.

## Earlier continuation — October14UTC, restricted access and current source capture

The production permission audit now covers all11 non-system LOGIN roles, including
the existing Supabase read-only-named account. No role qualifies for the proposed
isolated worker. The new reader is absent. PUBLIC database TEMP, PUBLIC schema
USAGE on net/public and PUBLIC EXECUTE on all10 net routines are recorded in
`operator-readback/mapping-read-capabilities-v2.json` (SHA256
`f0e8d74bc0009db5d32107fa94bf2f001f672f8c53d0217ae7ae13b725b3aa46`).
These are metadata findings; no network routine was invoked. No production ACL
was changed. The blocked reader SQL is a proposal, not a migration or activation
gate. Its limited real CASE/function-ACL negative probe, database and dump are
preserved under `output/reader-capability-v1`; the probe login is disabled and
the retained PostgreSQL cluster stopped. Full reader provisioning was not tested.

The candidate planner now requires the exact proposed reader login; the executor
permits that account only for dry-run and verifies its direct session before
target reads. Forty-nine connection/mapping tests pass, but these do not qualify
effective production permissions. Historical operator executor access remains
separate. Production planning must use the qualified operator-data route until
an appropriate database capability exists.

A fixed current-publication collector is installed at
`/var/lib/grookai-pricing-completion-operator-v1/export_pricing_source_v2.py`,
SHA256 `91eeb5f032b150ec5c23eaa0b8880850de761952bb3e3aca0c1dc42c41bd8e5c`.
Its exact SQL SHA256 is
`2b48b80cab4d9b1317bf7fdbafcaa5bbbbfee9fe6637cef3d28f6d8f67190155`.
It has no caller-selected SQL, run IDs, repository imports or worker inputs.
It enforces one read-only repeatable-read transaction, session read-only startup,
verified TLS, source age/count/identity checks and bounded time/output. Parent
directories and configuration are root-owned; the minimal existing DB credential
copy is0600 under root0700 `/etc/grookai-pricing-completion`. The old service
environment and all running services remain unchanged. No credential entered
candidate code. This is a manually launched operator collector, not a timer.

The00:18:56.873UTC capture selected run
`51ce449c-5bdf-4662-8f97-d0190f959384` and publication
`58f535eb-fbfa-40a9-907d-219cbbf541a4` without a hardcoded run ID:
208,599 observations,165,577 published,43,022 unresolved. Source finish remains
October13 09:36:39.447UTC; capture time never renews source freshness.
`operator-readback/pricing-source-v2-capture-01.json` SHA256 is
`767b4bbfb051a10d402146472bfd9db3df6636f3dfe26d1c7d46045de689036e`.
Its terminal record confirms ROLLBACK, read-only on and read-committed restored.

Offline V2 ingestion independently validates all43,022 rows with no database
access. Output is `output/source-feed-v2-capture-01-normalized`, snapshot SHA256
`8af2c45071bf181bf1adf74684abaf1a5fec04f4a787e04cd4459d25494fb13b`.
Thirty-one source/adapter tests pass, including V1 compatibility, six-record V2
terminal checks, source freshness, exact USD scope and strict byte/SQL pins.
The existing preparation queue remains unchanged:43,022 unresolved,zero resolved,
no repair executor. Its heartbeat at00:19:45UTC still reports
`blocked_execution_capability`; the historical Windows publisher task is Disabled.

Remaining: isolated recurring collector deployment, atomic operator-owned
generation manifests/data handoff and worker refresh; full Master and warehouse
coverage; qualified bounded repair execution and independent price publication
readback. No mapping/card/price write, commit, push or app deployment occurred.
`validation_manifest_v7.json` binds this continuation; prior manifests remain
historical. The pre-existing JS timestamp calendar-normalization limitation is
not fixed here; trusted Python collector timestamps are validated strictly.

The founder authorized implementation of continuous pricing completion. The
durable queue, strict intake, immutable review packets and bounded preparation
worker are implemented. Read [worker contract](../contracts/PRICING_COMPLETION_WORKER_V1.md)
before operating them. Combined read-only source and Pokemon Master enumeration
adapters are implemented and qualified against a minimal PostgreSQL 17 fixture.
Production runtime qualification, execution integration and independent closure
remain absent. See the October 13 continuation below for current live readback;
the earlier historical preparation measurements are retained as evidence.

## Verified evidence

Candidate tests run only inside Windows Sandbox, using the Authenticode-verified
installed OpenJS Node binary. No repository hooks, tests or dependencies execute
as the host Windows account. Sandbox configuration disables networking, clipboard,
audio/video/printer sharing and maps only a dedicated read-only input directory
and a dedicated writable output directory. The probe observed no active network
adapters/default routes, denied input writes, could not see the host-only canary,
and found none of the credential environment variable names checked. This is
preliminary isolation evidence, not exhaustive production-runtime qualification.

Evidence root:
`C:/grookai_vault_agents/pricing_completion_validation_20261013`.
`output/tests-5.tap`: 106 tests passed, zero failed, zero skipped. These include
strict SQL-client fixtures; they are not a full-schema database replay or live
query-plan proof. `validation_manifest.json` binds the candidate files, trusted
Node binary and TAP output by SHA-256.

Final review additionally bound combined source/Master exports to the actual
current publication run/set, cross-checked source observation identity, and
changed the Master census to include Pokemon parents with invalid/missing set
links (validation fails instead of silently dropping them). Freshly exported
TCGPlayer Market quotes use the explicit `NOT_CONDITION_SPECIFIC` scope sentinel,
with market basis and no physical-condition assertion. The goal is the market
quote displayed by the app; NM prices are not an invented completion requirement.
Independent completion must match that market basis on publication and readback.
Historical inputs without bound basis evidence retain `UNKNOWN`.

`output/reports/latest.json` after the first historical cycle:

- Imported 30,890 unresolved identity observations; prepared 500 in bounded groups.
- Source report describes 42,857 non-published observations. The other 11,967
  records are absent from its detailed identity export; Master coverage is unknown.
- Source run `72ef2bc7-c073-456f-87a6-04df88ed8874`, completed October 12 at
  12:15:10.478 UTC. It is stale under the 24-hour policy.
- All 30,890 identities retain unknown condition/currency. No NM/USD assumption.
- Resolved: zero. Prices published: zero. Production executors: zero.

## Running preparation process

Started October 13 at approximately 18:54 UTC inside Sandbox
`2afe75c6-298c-495e-9214-e4c5c3779ad8`, initially guest PID 1736. After all 106
tests passed, it was paused, verified idle without a writer lock, and restarted
on the final tested code at 19:00 UTC as guest PID **7520**. It runs `--prepare-only
--watch --interval-seconds=60 --batch-size=500`, using read-only
`C:/PricingInput/backlog/input.json`, persistent mapped state
`C:/PricingOutput/state` and reports `C:/PricingOutput/reports`. The first
background cycle directly reported another 500 prepared rows, zero publications
and `blocked_execution_capability`. Final-release direct readback at 19:00:21 UTC
confirmed **3,000 prepared**, 27,890 pending, 30,890 unresolved, zero resolved and
zero production writes. Restart ingestion inserted/reopened zero rows and retained
all 30,890 existing items. Current logs are `output/watch-v2.stdout.log` and
`output/watch-v2.stderr.log`; initial logs are retained. See `output/watch.pid`
and `output/reports/heartbeat.json` for current process/liveness evidence.

The process continues only while that Sandbox remains running. It has no Windows
restart persistence and no new-source discovery feed. State/output survive guest
shutdown on the host; runtime restart and stale-lock recovery follow the worker
contract. To pause, create `output/state/PAUSE`; the next cycle reports paused.
This is a preparation process, not an active production repair executor.

Retained source copies are under `input/backlog`, with a hash-bound manifest.
Report SHA-256: `2afd2b7cd2cf066a0214087adf4c63db52adf9762fbe404062b8bdae02fbe358`.
Identity JSONL SHA-256: `07098b6ccd3103ac1bd0263455d1672ab1f48e935e868e02d23f3feb881bf99c`.

## Boundaries and remaining work

Do not reactivate the historical Pokemon Relationship Repair task or publisher.
This implementation supplies no host credential bridge and does not modify that
task. Other-session Gym/MEP repair work remains separate and must be reconciled
from fresh production readback before any repeat repair.

Still required: run the new combined exporter against a qualified read-only
snapshot, enumerate warehouse products absent from selected pricing runs, qualify
the isolated production runtime, integrate the existing guarded exact-repair and
publication paths, and acquire independently authenticated app-price readback.
`PRICING_COMPLETION_READONLY_DB_URL` was not present in the checked process
environment or the known main/repair worktree environment files (key names only
were examined); broader existing database credentials were not passed to the
candidate runtime. At that initial checkpoint no live source export or database
query had occurred. The continuation below records subsequent fixed operator
reads. No catalog mutation, price publication, Git push, or deployment occurred.

Existing integration points: `backend/maintenance/tcgplayer_market_exact_mapping_apply_v1.mjs`
through `run_canon_maintenance_v1`, the guarded
`scripts/workers/tcgplayer_market_publication_worker_v1.mjs`, and exact-printing
`get_market_pricing_read_model_v1` readback. Reuse their reviewed scope and immutable
plan/source bindings; the English Pokemon mapping adapter is not a general MTG
repair authority. Aggregate publication counts cannot close individual queue rows.

## October 13 continuation: SQL and production inspection

The new data-only maintenance handoff validates immutable source/plan/master
evidence and requires independently authenticated exact review plus an atomic
durable reservation capability. It has no executor, production verifier, or
installed reservation ledger. See `PRICING_COMPLETION_HANDOFF_V1.md`.

Actual PostgreSQL 17.11 runs inside the same offline Sandbox, using freshly
downloaded official binaries and Microsoft-signed runtime DLLs. No host database
or candidate Node code was executed on Windows. The minimal typed fixture loads
the unchanged application price RPC, with a conservative false Jungle dependency;
it is not full-schema replay or edition-branch qualification. A dedicated direct
reader login initially passed twelve explicit SELECT/RLS policies while being denied
writes, DDL, role escalation, unrelated tables, and unrelated functions.

`output/tests-6-postgres.tap` contains 119 passing contract tests and one failed
fixture setup assertion: PostgreSQL returned `127.0.0.1/32` for an inet text value.
After using `host(inet_server_addr())`, `output/tests-7-postgres-v2.tap` passed all
10 real-database tests with zero skips. Both fixture databases and failed evidence
are retained. The previous 106-test manifest remains historical. The source count
query now binds both publication-set and run IDs, avoiding a history-wide scan.

A separate one-shot operator inspection used fixed reviewed SQL, installed remote
Python standard library and `/usr/bin/psql`, verified TLS and the pinned public CA.
The existing credential stayed in the remote child environment; no candidate
code, repository imports, supplied SQL, hooks, or scheduled publisher ran with it.
The first inspection completed its SQL but rejected multi-line PostgreSQL JSON;
the retained v2 parser accepts complete JSON objects and checks exactly five
expected record kinds. This proves only the fixed read-only transaction, not
that the existing privileged credential is intrinsically read-only.

Live production readback: project `ycdxbpibncqcchqiihfz`, PostgreSQL 17.4,
171,754 card parents, 3,404 sets, 32,903 traits, 444 migrations, latest
`20261012013000`. Current verified production run
`51ce449c-5bdf-4662-8f97-d0190f959384`, publication set
`58f535eb-fbfa-40a9-907d-219cbbf541a4`, completed October 13 at 12:11:07 UTC,
selected 208,599 observations and published 165,577 snapshots. The difference is
43,022 observations, not a count of unique cards or a whole-warehouse census.

All twelve exporter read tables have RLS enabled. No role name matched the
pricing/export/reader/audit search, and no PUBLIC-executable SECURITY DEFINER
function was found in schema public. This is not a comprehensive effective
privilege audit and no dedicated reader has been provisioned. The historical
`Grookai Pokemon Relationship Repair` scheduled task remains Disabled.
Inspection evidence is outside guest mappings under `operator-readback/`.

## Fresh complete selected-run source export

The reviewed one-shot source export completed successfully at
`2026-10-13T19:36:14.791Z`. Its fixed SQL captured every non-publish decision in
the same read-only repeatable-read transaction, verified counts and observation
identities, and rolled back. The remote and downloaded 51,912,210-byte result
share SHA-256
`eb3c73022bbdf8eb705877c9deb4986cb4bf39910b108aa8f7a8ad9d58dc20d9`.
Only that data file entered the offline Sandbox. No production credential or
operator script entered its input mappings.

The offline adapter passed all 12 tests in `output/tests-9-operator-readback.tap`.
Its first CLI success test exposed an argument regex that excluded digits in
`sha256` option names; that was fixed and the earlier 11-pass/1-fail TAP retained.
Combined final coverage is 131 contract tests plus 10 real PostgreSQL tests,
141 passing in separate retained suites. No full-schema qualification is claimed.

The actual 43,022-row operator result then passed offline conversion. Receipt:
`output/source-export-20261013-v1/receipt.json`. Snapshot SHA-256:
`8af2c45071bf181bf1adf74684abaf1a5fec04f4a787e04cd4459d25494fb13b`.
Its source finished October 13 at 09:36:39.447 UTC. At validation it was fresh,
all six source lanes were fully enumerated, and unknown identity dimensions
were zero. Currency/market basis come from source evidence; no physical condition
or NM price is inferred. Master coverage remains unknown. This is one selected
pricing run, not a whole-warehouse or Master Index completeness result.

| Source lane | Unresolved observations |
|---|---:|
| Identity mapping / provenance | 31,031 |
| Catalog evidence | 7,428 |
| Exact printing | 1,873 |
| Source price | 1,697 |
| Finish assignment | 601 |
| Variant support | 392 |

Of these, 13,658 observations are Pokemon and 29,364 Magic. Pokemon reasons:
10,806 missing active mappings; 6 missing mapping methods; 1,843 missing exact
printing identities; 601 Cosmos finish/assignment gaps; 392 special variants;
10 missing positive source prices. Counts are observations, not unique cards.
Do not invent a value for those ten source-price gaps or route Magic through
the English Pokemon repair authority.

The original historical worker was paused with `output/state/PAUSE`, observed
paused without a writer lock, and its exact process identity checked before
stopping PID 7520. Retained historical state contains 17,500 prepared and 13,390
pending observations, zero resolved. An initial transition command stopped the
old process but did not start a new one; a separate process inventory confirmed
no Node process before the guarded fresh startup. No old state was deleted or
marked repaired.

At 19:40:22 UTC the fresh preparation worker started as guest PID **5148** using
`input/backlog-fresh-20261013-v1/input_manifest.json`,
`output/state-fresh-20261013-v1`, and `output/reports-fresh-20261013-v1`.
Logs: `output/watch-fresh-v1.stdout.log` and `.stderr.log`; startup receipt:
`output/transition-fresh-v1.json`. It remains prepare-only, bounded to 500 rows
each cycle with a 60-second interval, with no production executor or automatic
data refresh. The current pause path is `output/state-fresh-20261013-v1/PAUSE`.
First-cycle readback at 19:40:48 UTC confirmed all 43,022 rows imported, 500
`review_needed`, 42,522 pending, zero resolved, fresh source coverage in every
lane, and zero unknown dimensions. It reports `blocked_execution_capability`;
that is the truthful lack of a production executor, not a failed preparation
cycle. `validation_manifest_v2.json` binds 22 exact candidate/test/RPC files,
the trusted Node binary and 14 test/operator/runtime evidence artifacts. Its
SHA-256 is `6e227a9611541a2eeed04165e432434c542a6beebf9dfac5011cb50efcb642fd`.

Both PostgreSQL fixture dumps, roles, metadata and configuration are retained
under `output/postgres17-preservation-v1`; only that loopback fixture cluster was
stopped, leaving Sandbox and preparation available. No catalog, mapping, price,
production permission, scheduled task, Git remote or deployed service was changed.

Next activation work remains a qualified recurring read-only feed, warehouse
products absent from selected runs, live exact Master price census, installed
trusted review/reservation capabilities, guarded lane execution/publication and
independent application-price closure. The new offline data adapter is documented
in `PRICING_COMPLETION_OPERATOR_READBACK_V1.md`.

## Next continuation: live Master census and bulk mapping preparation

The fresh source preparation worker remains active. The retained source data
contains 24 unresolved GameStop observations, including Dragonite product
`456093` with `missing_active_source_mapping`. These are source-pricing gaps,
not proof that all 24 canonical cards are absent. Retailer promotional identity
must not be matched to an ordinary unstamped parent by the base-card planner.

The live exact app reader definition was independently captured without executing
it. Its body matches the tested migration after line-ending normalization; full
`pg_get_functiondef` SHA-256 is
`e64f6a40bbead6ce3c163c87a94a023477996fa6d05f561aa875d6f6cec1918d`.
Operator evidence is `operator-readback/rpc-readback-v1.json` and
`live-rpc-body-binding-v1.json`. Subsequent Master captures pin that definition.

The first live Master capture failed before any RPC batches. Its diagnostic-only
second attempt identified SQLSTATE `42703` at the census query. Independent live
column inspection found `card_prints.game_id`, linked to `games.code`, rather
than the nonexistent `card_prints.game` assumed by both the adapter query and
its minimal fixture. The earlier fixture pass did not qualify production schema
compatibility. Preserve those receipts as historical evidence; they cannot be
used to claim the original Master query was production-ready.

The Master and mapping-context queries are being corrected to use the parent's
own game foreign key, keeping LEFT JOIN set routing checks. The corrected SQL
fixture must include `games` and exclude the invented card `game` column. A fresh
database is used for corrected qualification; prior databases are not reset.
No failed live capture has produced an accepted Master snapshot or closed a row.

The new standalone Master offline adapter passed 12 tests in
`output/tests-10-master-operator.tap`. It binds independent result/SQL/app-RPC
hashes, exact 500-printing batches, current publication identity and counts,
and retains missing-printing parents as explicit coverage gaps. A separate
Master transaction must not be labeled a single atomic source/Master snapshot.

2026-10-13 canonical game schema correction: the live read-only column census
confirmed `card_prints.game_id` is UUID; there is no `card_prints.game` column.
The earlier minimal fixture incorrectly invented that column, so its passing
Master census tests did not qualify production schema compatibility. The reader
and operator v3 now join `games.id = card_prints.game_id`, filter `games.code`,
and retain the LEFT JOIN to sets so malformed set routing still fails closed.
The corrected fixture explicitly asserts the absence of the invented column.

Fresh offline database `pricing_completion_fixture_20261013_v3` passed 40 Master
contract checks plus 10 real PostgreSQL checks (50 total, zero failures/skips).
Its 18-table projection includes `games`; the direct reader has exactly 13 named
SELECT/RLS policies. Evidence, database dump, role metadata, and corrected schema
are retained under `output/postgres17-game-schema-v3`. The exact guest cluster
was stopped after preservation; v1/v2 databases and evidence remain intact.
Initial restart plumbing used the retained configuration's default port, then a
corrected launcher returned no usable exit code; both failures occurred before
fixture creation and are retained. The verified loopback/55439 continuation
created v3 once. This remains a minimal-schema proof, not a complete migration
replay or production permission proof; the Jungle helper remains a false stub.

## Actual bulk mapping plan and reconciled Master diagnostic

The fixed mapping-context v3 capture completed at `2026-10-13T19:58:54.315Z`.
Its result SHA-256 is
`f5125fc89275cf6f3b034443e482bda81a474ade8b3689a64489d28453a377a9`;
its SQL SHA-256 is
`38c792ef30d670cd001b50e15e1b2ef96b9655125f5bf677d676a3cc6bb7d5ba`.
The scope is 858 ordinary Pokemon products across 114 source groups, with all
1,033 corresponding observations/decisions and all 59,487 Pokemon parent targets.
It includes full raw product payloads, existing inactive mappings, sibling subtype
decisions and complete group edges. It does not include the retailer promo lane.

The offline CLI produced `output/mapping-plan-20261013-v1`, verified by its
`accepted_manifest.json`. Plan SHA-256:
`2bc8246642fb5cd9d3e8ea87de6f5ca66778a136fd717decbf720aebae5e02bf`.
There are **120 ME05: Pitch Black mapping candidates**, covering **194 source
observations**, in five review batches of 25/25/25/25/20. These are existing-parent
mapping proposals, not new cards or published prices. All require reviewed Master
authority and bounded live revalidation before the existing writer can apply.

The other 738 products remain held: 274 without exact set/number/name targets,
252 without printed-number evidence, 202 without unique set authority, nine
whose targets already have active TCGPlayer mappings, and one ambiguous target.
No source number was guessed from a name and no GameStop stamp was discarded.
All 16 mapping adapter/CLI tests passed in the offline Sandbox, including raw
payload tampering, complete sibling decisions, offset timestamps and file guards.
Evidence: `output/tests-13-mapping-context-final.tap`.

The corrected fixed Master v4 SQL completed its read-only repeatable-read census
and rollback. Its original validator then rejected parent inventory. Preserve
`operator-readback/master-raw-v4.jsonl` unchanged, SHA-256
`94bfcf44206663bdd64f8b826a22a97daf4b192660b7c0516d37df2b70212aff`.
An isolated diagnostic helper reconciled all 159 records, 151 RPC batches,
59,487 parents and 75,052 exact printing/readback IDs without duplicates,
omissions or orphans. Results are retained in `output/master-diagnostic-v4`;
metadata SHA-256:
`da9482529c0724b820c944b576c7db039802000c323339c59252f908a1a6cd5c`.
These files are diagnostic only, not an accepted Master queue input.

As of `2026-10-13T20:01:50.773552Z`, the exact application RPC returned:

| Set family | Exact printings | Current TCGPlayer USD market price | Unavailable |
|---|---:|---:|---:|
| pokemon | 47,205 | 31,795 | 15,410 |
| pokemon_jpn | 27,847 | 0 | 27,847 |
| Total | 75,052 | 31,795 | 43,257 |

All available observations pass positive-price, provenance and 24-hour freshness
checks for the declared market basis. Unavailability does not prove no quote
exists at another provider or in another currency. Japanese membership is valid:
the 26,100 Japanese parents are not broken game routes. Do not map them to English
products to satisfy this USD census or count the strict equality check as truth.

Another **6,172 parents have no printing children** (6,103 pokemon / 69
pokemon_jpn). All **63 parents missing GV-IDs** are Japanese and already included
in that no-child population. **Two exact printings lack GV-IDs** and are unpriced.
Retained issue lists preserve their actual UUIDs; do not invent identities or add
overlapping counts as unique missing cards. The acceptance path still needs
explicit supported-family handling and a catalog-integrity ledger. The terminal
record also reports the post-ROLLBACK default `transaction_read_only=off`; the
census transaction itself reports `on`. The original on-only terminal assertion
would reject as well. Do not rewrite raw bytes or claim a production role boundary
from transaction settings.

The source preparation worker was observed live at 20:08 UTC, with 9,000 rows
prepared, 34,022 pending and zero resolved (43,022 total). Counts continue to move;
the heartbeat reports `blocked_execution_capability` because no production
executor is installed. It has no automatic fresh feed or restart persistence.
The historical `Grookai Pokemon Relationship Repair` task remains Disabled.
No catalog/mapping/price write, publication, Git push, deployment, credential
provisioning or scheduled-task change occurred in this continuation.

The next repair work is reviewed ME05 physical-printing/source authority for the
five prepared batches, followed by the existing guarded dry-run/apply and separate
price publication/readback. Master intake must preserve integrity gaps and valid
Japanese partitions; whole-warehouse products absent from the selected run still
require enumeration. None of these populations may be marked resolved solely
because a preparation packet or diagnostic report exists.

## ME05 physical evidence and fresh catalog qualification

The next continuation located the official expansion gallery's linked English
card-list PDF and retained its exact bytes, acquisition metadata and rendered
page under `output/me05-source-evidence-v1`. The root and relationship reviewer
visually checked the legend and every row: black checkboxes explicitly identify
63 Standard Set cards and red checkboxes identify 57 Standard Set Foil cards.
The PDF does not establish the 74 reverse printings. Official PDF SHA-256:
`9fd0a19ea2580eb77e6e33a60172c608459c9fbe54057b0e2b1b4bdf5423015d`.

All 120 independently retrieved TCGdex card payloads agree on the exact card
identity and selected standard finish, including explicit detailed variant type.
The root independently checked the raw file hashes, names, numeric coordinates,
set and expected standard finish: zero differences. These payloads corroborate
the official checklist; price fields and standalone generic flags are not finish
authority. Official card names 083/084 use Darkness/Lightning glyphs; the matching
full names are Shadowy Darkness Energy and Voltaic Lightning Energy.
The source evidence manifest SHA-256 is
`a036ef3635c1c437b30abb246c7b50eeda8b934d8fcca9dc852cc1d19072c29b`.

Preserved Bulbapedia set and Build & Battle wikitext explicitly describes the
five additional Normal versions as Build & Battle exclusives. This evidence
is retained as a separate product-specific lead; it does not overwrite the
official standard foil facts or independently authorize a finish mutation.
The selected mapping review covers one proven standard printing per each of
120 parents under `verified_parent_families`, not complete-set or complete-pack
printing coverage. All 79 additional existing children (74 Reverse and five
Normal) remain preserved outside this particular mapping evidence selection.

A fresh fixed, manually reviewed operator catalog capture completed at
`2026-10-13T20:42:33.44Z`, with no repository imports or worker-supplied SQL.
`operator-readback/me05-catalog-readback-v2.json` SHA-256:
`1587d3cbabf46812e2400e83fbc3f0844bd2e4b5b5693bc4fbd569aa9900cb22`.
It reconciles 120 parents, 120 active standard identities, 199 children, 199
active verified/visible truth reviews and 120 legacy `tcgcsv` mappings. There
are no active `tcgplayer` mappings to these parents. All parent domains are
`pokemon_eng_standard`, variant keys empty and printed modifiers null. No child
lacks a printing GV-ID or is provisional. The initial capture succeeded in SQL
but its validator assumed mapping IDs were UUIDs; the actual integer IDs caused
rejection. V2 corrects only that type check, preserving the failed V1 evidence.

The live catalog also preserves a historical ME05 printing-repair trace that was
not found in the prior local authority-file search. That trace explains existing
printing rows; it is not a current candidate-bound mapping review and does not
authorize replaying the old printing repair.

After independently reviewing and pinning the public-options function and four
visibility helpers, a separate read-only capture invoked the bounded public SQL
reader for all 120 parents. At `2026-10-13T20:47:26.146Z`, it returned all 199 exact
child tuples, with zero missing options or parents. Evidence:
`operator-readback/me05-public-options-readback-v1.json`, SHA-256
`416e8904e834eea70d775d3cd378a7d180d1a3ede79fa82e8449945950d2c447`.
This is the default SQL session without JWT claims, not authenticated browser/UI
verification. All function definitions are checked before invocation. Both
captures use verified TLS, read-only repeatable-read transactions and acknowledged
rollback; credentials remain remote. No public visibility or production row changed.

## Reviewed 120-parent mapping packages completed

After actual source adjudication, the root issued a separate immutable source
review at `output/me05-authority-review-v1.json`, SHA-256
`1a4e8f1cf1ca117815301773f727471a35217beac7236164ed033d521c438587`.
It explicitly identifies the reviewer as an AI agent and does not claim founder
execution approval. The review binds the complete 120-parent/120-standard-printing
projection, all 120 original candidate assertions and actual source bytes.
Projection hash:
`5df934d7421d6a64362236638f0937e0914b220fe5762985174bb9f20fabd49e`.
Scoped Master file SHA-256:
`461e2f60d9c45c0708169cee9a980f34adc71c5ecb8b662c421bae4d89ba27f9`.
The original unsigned projection and all prior evidence remain unchanged.

`output/me05-reviewed-mapping-authority-v1` contains the resulting reviewed
manifest, Master, source bytes, artifact map and review. Final manifest fingerprint:
`07db4d7c5bda02422412d894d8d89294296b5e8f0369ea09dfbe68d44b0dba5d`.
Final manifest file SHA-256:
`6477c8a06356977a653d5b7404787678c00c1a8e450450fc8064244e04efa0a7`.

The pure bulk packager validates the complete selection before splitting. An
independent review found output bytes initially depended on object-key/scope
ordering; canonical serialization and sorted scopes fixed that reproducibility
issue. All **10** targeted Sandbox tests now pass, including key reordering,
multiple scopes, cross-batch duplicates and tampered evidence. Evidence:
`output/tests-mapping-authority-batches-v2.tap`, SHA-256
`5ea403e3f649d3103a6877ce149d94e41b2855574db3e8ef416401cc104b5b22`.
The earlier eight-test receipt is retained as historical evidence.

Actual packaging produced five authority/selected-data pairs of **25/25/25/25/20**
in `output/me05-reviewed-mapping-batches-v1`. Its `package-receipt.json` SHA-256:
`868d1f15c14c366d03dd5b6a267aa9eade9344974eb702060af7411081cbf034`.
Every serialized package passed the existing printing/mapping authority validators
and exact parent checks against both accepted live captures. Root independently
verified all selected/authority file hashes, 120 unique parents, 120 unique source
products and 194 supporting observations. These are qualified evidence packages,
not production writer dry-run receipts or published prices.

At 20:51 UTC the preparation heartbeat was live: 23,500 prepared, 19,522 pending,
zero resolved. No recurring export feed, production executor or restart persistence
has been installed. The legacy scheduled publisher remains disabled. No code was
committed/pushed and no production mapping, catalog or price was changed.

Remaining before real execution: integrate the exact reviewed data into the
repository-contained release package, qualify committed source and the trusted
bounded runtime without exposing host credentials to researcher code, then run
the existing guarded dry-run and immediate transactional preflight. Each write
must follow its existing bounded execution contract. Source review is not that
write authority. After mapping, price qualification/publication and independent
exact application-price readback are still required; none of the 194 observations
is marked resolved here. Preserve the separate Gym/MEP and GameStop work.
Final independent review found no remaining material defects in canonical
serialization, evidence bindings or the limited 120-parent review scope. The
versioned validation record is `validation_manifest_v4.json` in the external
validation directory; v3 and all failed/unsigned captures remain preserved.

## October 13 continuation: actual executor rehearsal

Repository-contained dry-run inputs now exist in
`docs/audits/pricing/pricing_completion_me05_20261013/batch_01` through `batch_05`.
All 35 files were hash-verified against the external release receipt, SHA-256
`50e5965ad8ca15748f5f7df552827980afa20ac4e15a4e354c0df9cb25e811f2`.
Candidate and Master authority bytes are unchanged from the reviewed packages.
The new pure release helper and minimal executor branch explicitly distinguish
`offline_reviewed_export` from the legacy live-planner receipt. All five new
contract tests passed in Sandbox. Apply rejects this mode before a DB connection;
no existing clean-source, ancestry, confirmation or transaction gate was relaxed.
The original offline planner has no asserted clean producer commit. Release
checkout observation is real HEAD7719e3c/dirty at21:13:03UTC, not execution proof.

A separately reviewed fixed operator capture reran literal read-only SQL through
installed remote psql with verified TLS. Script SHA-256:
`1621823dc4c826f2ce2e3a23d279d4b2121c2dfd312906e35b357b75060961ce`.
Accepted capture `operator-readback/me05-mapping-preflight-readback-v1.json`,
SHA-256 `1f32583a998f2c50f0ae2dd5691afe5b36c5d4f56720a44673521c7b7f0274cf`,
contains120 products,120 parents,120 standard identities,194 observations,
120 legacy mappings, two artifact metadata rows and no publication overlap.
No active or inactive TCGPlayer source mapping exists; source observation run
bindings have zero drift. Source age was11.64hours, within the24-hour policy.
This capture is input evidence, not an invocation of the production executor.

The actual maintenance launcher then ran five dry-runs against a fresh offline
PostgreSQL fixture, selecting25/25/25/25/20 mappings. Every summary passed with
acknowledged ROLLBACK, no COMMIT attempt and zero mapping/publication/customer
writes. Every public fixture table, including retained complete original rows,
matched its baseline after every batch. A direct non-admin SELECT-only role with
RLS denied mutation, role escalation, role/table creation and private-capture reads.
An actual launcher invocation in apply mode rejected the offline provenance.

The fixture uses nine typed query tables plus one private raw-row preservation
table. Captured production column types and all frozen Master parent fields were
checked, but full production schema, policies and triggers are not reproduced.
The standalone guest Git commit f46b5b7c9d18503ce1d61ff4838aa22d0b43cb0c is
synthetic fixture provenance only, never a qualified source/release commit.
All candidate code, dependencies and Git ran inside the offline Sandbox without
host credentials. The existing scheduled publisher was not enabled.

Preserved setup failures: mapped-folder Git needed an exact safe.directory;
the first fixture commit completed before its follow-up Git spawn failed due to
PATH and was independently reconciled without recommitting. Cluster startup was
independently verified after its PowerShell ExitCode check reported failure.
All five dry-runs and the fixture dump succeeded, but the harness then exited1
at the roles export. Its empty role file and failure log remain intact. A separate
roles export specifying maintenance database postgres succeeded; final independent
readback and recovery receipt record completion without rerunning any batch.

Production runtime qualification and live executor dry-run remain outstanding.
These dry-run-only packages cannot be applied. A separately qualified source plan,
committed source, trusted bounded runtime and all governed execution checks must
precede real writes. Mapping alone still cannot resolve a price queue item:
publication and independent exact application-price readback are required.

Final evidence recovery completed without replay. Recovery v1 exposed a PostgreSQL
`name[]` decoding difference in the policy-role metadata assertion; its failed log
remains intact. Recovery v2 casts only that SELECT result to `text[]`, then proves
all ten fixture tables still match the pre-run baseline, verifies exact role/RLS
permissions, rechecks the existing dump and all five successful original receipts.
`output/me05-executor-rehearsal-v1/recovery-v2/recovered-receipt.json` SHA-256:
`9dfde4d7e5e514ea4ba3a8f23bd6daf0d5a18bd61bdb59d2f00162d2503068fb`.
Independent readback SHA-256:
`4ebf0857988260be9995d62f7374782fe654008111551ad6be800ad45742e414`.
Fixture dump SHA-256:
`c0140650eaf54705a63bbe8b4c21c42e035c1264b7737539e0851ab2face5f60`.
The cluster was stopped and pg_ctl independently returned no server running.
All retained databases and files remain preserved. Versioned proof inventory is
`validation_manifest_v5.json`; v1-v4 retain their original historical bytes.
Production writes and price publications remain zero; no commit, push, deployed
production executor or recurring privileged bridge was created in this step.

## October 13 continuation: planner TLS and credential-free Linux isolation

Review of the committed legacy planner found remote TLS certificate verification
was disabled. The candidate now reuses the exact project connection guard with
verified TLS, authenticated-stream checks, startup read-only settings, no URL
option overrides and bounded connection/query timeouts. A failed or unauthenticated
connection closes. Receipts explicitly distinguish production_project from
isolated_local_fixture. A new executor guard rejects explicitly fixture-labelled
plans before production apply constructs a client. Existing offline-export apply
rejection remains intact. Historical missing-field receipts retain their separate
legacy gates; no claim is made that this guard retroactively qualifies them.

All40 focused TLS, execution-guard and planner-policy tests passed in Windows
Sandbox with zero skips/failures. The earlier36-test run is historical and overlaps;
do not sum these suites. Final TAP `output/tests-mapping-fixture-provenance-v1.tap`
SHA-256 `305f5d2c9de585e6e50f90812e2ee05c994b4960825dfa07c6e9afb92a9b43ba`.
Earlier120-row rehearsal inputs and its synthetic Git checkout remain untouched;
that rehearsal predates this narrow source change and is not its deployment proof.

Two fixed credential-free probes qualified a Linux isolation configuration on the
existing host:15 Python checks and14 Node checks passed. The fresh RootDirectory,
DynamicUser, read-only inputs, dedicated output, empty capabilities, private
network and NoNewPrivileges were exercised directly. Node20.19.6 ran with
--jitless while MemoryDenyWriteExecute remained enabled and spawned trusted Git.
No candidate repository code, dependencies, dotenv, database credential or
production network access was supplied. Existing production services were not
changed. Successful transient probe units exited and unloaded; no timer was made.
The failed first probe and its PermissionError are retained separately.

Python probe SHA-256:
`b2d23ff3c6bc2ed0d3e152bf559963d24466ad869cdf7ffae62a61922e737ac6`.
Node probe SHA-256:
`7c2adcf5bf76ec9c87b22a233181c79ec89a70465f41667b7174ddce8e24931f`.
Read [runtime qualification limits](../contracts/PRICING_COMPLETION_RUNTIME_QUALIFICATION_V1.md)
before reusing any configuration.

A fixed verified-TLS operator metadata capture accepted at23:44:22UTC still binds
publication58f535eb/sourcec0fb6b75,208599 selected and165577 published. The source
remains within24hours. `operator-readback/mapping-read-capabilities-v1.json`
SHA-256 `6b7d79e34ee6db7dbefebd4cad94874d678909ceff879f727c7600db21862ef6`.
The explicitly searched role-name scope found only postgres, with broad mutation,
role-creation and ownership authority. Three separately inspected installed service
configurations also use that broad account. No credential values were emitted or
passed to the worker. This does not prove that no differently named reader exists.
The capture retains nine-table grants, RLS metadata,16 membership edges and583
SECURITY DEFINER routine metadata rows; zero of those routines granted PUBLIC
EXECUTE. No role/permission changes or candidate-role login tests occurred.

Next concrete gate: establish a directly authenticated dedicated read capability
with exact project/role pins and independently verified grants/RLS, then qualify
immutable source/dependencies and constrained DB egress. The current guard still
pins postgres and cannot yet consume that future restricted identity. Preserve the
original proof and use fresh live plan/source checks before any governed apply.
No production mappings/prices changed, no code was committed/pushed, and the
historical publisher remains disabled. Versioned proof is validation_manifest_v6.json.
At23:47:44UTC the preparation worker heartbeat remained live with43022 items in
review_needed, zero pending and zero resolved. This completes packet preparation
for the frozen captured run only, not repairs, whole-warehouse coverage or a
recurring discovery feed. All original queue state remains preserved.

## October 17 continuation: deep warehouse candidate rejected by live read-only EXPLAIN

The V2 qualification controller collected the warehouse plan after the query repeatedly hit SQLSTATE 57014. The deeper join candidate was then compared against the frozen baseline in the same production project using separate `repeatable read read only` transactions, `EXPLAIN (FORMAT JSON, COSTS TRUE)`, no ANALYZE, and rollback guards. Both plans passed the transaction/read-only/provenance checks. The candidate increased estimated total cost from `1,793,135.15` to `2,361,325.80` (`+568,190.65`, about `31.7%` worse), so it is rejected and remains uninstalled. Receipt: `operator-readback/warehouse-v4-deep-join-explain-receipt.json`; candidate SHA `e0510e020ef1765ce73ccd7757c23ab3eb73da782d6568bdf0daec06bd91134d`; baseline SHA `ad175ae15b81f316dc75844f2dbf3cdbf000f3480f06ef1eb1233bc7d1c11962`.

The automated controller is therefore correctly stopped at the plan-qualified blocked state. The next engineering step is a third, narrower optimization focused on the dominant `mappings` CTE and the repeated decision/product joins, followed by the same read-only EXPLAIN gate. No production writes, pricing publications, queue mutations, or installs occurred.

The mapping-selection candidate was also rejected by the live read-only EXPLAIN gate. Baseline estimated total cost was `1,793,135.15`; candidate cost was higher by `15,044,526.20`. Candidate SHA `b12b501c2512755c70e4800f10a89070044da2412928d6112b77152751d4344f`. Receipt: `operator-readback/warehouse-v4-mapping-selection-explain-receipt.json`. It remains uninstalled; no production writes or queue activity occurred.

The product-key-reuse candidate passed its 5-test contract suite and the live read-only EXPLAIN safety gate, but estimated total cost increased by `653.24` (`1,793,135.15` to `1,793,788.39`, approximately `0.036%` worse). It is rejected as a performance candidate and remains uninstalled. Receipt: `operator-readback/warehouse-v4-product-key-reuse-explain-receipt.json`; candidate SHA `dc2e9149c132775e63e0a7d1088e6a66ad9e7c8eac9072a24a6935a413ecbbc9`.

The rollup-aggregation candidate passed its 5-test contract suite and read-only EXPLAIN guards, but increased estimated total cost by `3,905.27`. It remains rejected and uninstalled. Receipt: `operator-readback/warehouse-v4-rollup-aggregation-explain-receipt.json`; candidate SHA `a90f90ced30a62b26b58a3424da6797b2c03cd61ec678a2399af9b68d070b2bf`.

The reuse-stats candidate passed its 5-test contract suite and read-only EXPLAIN guards, but increased estimated total cost by `383.67`. It remains rejected and uninstalled. Receipt: `operator-readback/warehouse-v4-reuse-stats-explain-receipt.json`; candidate SHA `5b2e2c1dade5b4b48a6dd8737c00e234242c0c93307cc8d19c4236fdaff54700`.

The sixth-step database-side qualification found the missing planner support: `external_mappings` already had the exact `(source, external_id)` indexes, so no redundant mapping index was created. Statistics were stale or absent on the four dominant base tables. A bounded `ANALYZE` was run for `external_mappings`, `market_price_qualification_decisions`, `tcgcsv_source_price_daily_observations`, and `tcgcsv_source_products`; this changed planner statistics only, not rows or application data. The post-ANALYZE read-only EXPLAIN baseline fell from `1,793,135.15` to `1,740,791.24` (about `2.9%` lower). No queue, price, publication, or schema DDL change occurred. The controller still needs a fresh bounded warehouse diagnostic to confirm whether execution now clears the timeout.
