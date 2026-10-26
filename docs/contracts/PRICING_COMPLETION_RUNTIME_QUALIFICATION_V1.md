# Pricing completion runtime qualification V1

The subsequent queue-session candidate has passed 50 isolated focused tests,
four historical full-size cycles and their independent history audits. Two
current-size Linux cycles also completed under the existing 50% CPU / 1 GiB /
no-swap / 600-second bounds in 298,303 / 295,601 ms. The independent current-history
audit passed, preserving every one of 43,107 keys and history prefixes through
1,000 distinct prepared items. The original timer was restored and the production
queue hash remained unchanged at 19:20:20 UTC. The two-file update was installed
at 19:30:54 UTC after the next old cycle finished. Installation preserved queue
and cursor bytes, retained backups and restored the original enabled timer.
The first automatic cycle completed successfully at 19:42:26 UTC after 312
seconds, preparing 500 items with a 1,063,182,336-byte memory peak. Its independent
history audit passed against an immutable idle snapshot: all 43,107 keys and full
prior history prefixes survived, all 500 claims/packets matched, and no item was
resolved or left leased. The original enabled timer resumed.
The next automatic cycle also succeeded in 302 seconds, with a 1,067,900,928-byte
peak. At 20:00:27 UTC the original schedule was enabled/waiting and discovery
remained disabled. The second cycle has terminal health evidence only.
The separately isolated V9 read-only census and independent audit also passed:
all 75,056 existing printings across 151 batches were covered. This qualifies a
captured census; it does not install its query, publish a feed, admit queue work
or enable a production repair/publication executor. See the checkpoint's counts.
Memory peaks of 1,064,366,080 / 1,063,886,848 bytes leave limited headroom.
Transient unit properties must be captured while the unit is loaded/running;
post-exit `systemctl show` can return defaults after systemd unloads the unit.
Use pinned launcher arguments, active configuration captures and terminal
journal/launcher records together, never unloaded defaults as resource evidence.

Latest recovery state is maintained in
`docs/checkpoints/pricing_completion_agent_20261013.md`. The October14 recovery
installed a bounded queue JSON reader after 98 isolated tests, three full-size
cycles and independent history verification. Original OOM and cache-cap failure
evidence are preserved. An actual fresh live cycle and independent retention
audit passed; the legacy timer resumed and its first automatic cycle succeeded
at14:43:02UTC. The final14:43:44UTC readback verifies active/waiting scheduling,
the runtime boundary and original historical reports. Scheduled preparation
took570 seconds and peaked at1,071,652,864 bytes under600-second/1GiB limits;
future growth capacity is not established. The timestamps below describe earlier
qualification and must not be read as current health.

Status at 2026-10-14T02:07:21.350035Z: the protected source service and
credential-free Linux preparation service completed both their first live cycle
and first scheduled cycle successfully. The independent post-handoff history
audit passed and the timer is enabled and waiting. Production repair
and price publication execution are not qualified or activated.

October14UTC update: fixed manual operator source collection is now installed
under `/var/lib/grookai-pricing-completion-operator-v1` and verified against a
live read-only snapshot. Its minimal configuration is root-only under
`/etc/grookai-pricing-completion`; every ancestor is root-owned. The existing
service-user-owned parent directories did not satisfy the new immutable-input
check. No candidate module/dependency or worker input runs in this collector.
Its data-only output normalized successfully in offline Sandbox. The final fixed
publisher now writes the atomic feed under
`/var/lib/grookai-pricing-completion-feed-v1`. The source service
`grookai-pricing-completion-source.service` runs installed Python in isolated
mode and fixed psql SQL. It has a separate protected root filesystem, a clean
environment, read-only operator/configuration mounts and only its feed writable.
It does not import repository code or accept worker commands. Its existing broad
database credential remains confined to this separately reviewed operator path.

On source-service success, systemd starts
`grookai-pricing-completion-preparation.service` after collection has finished.
The worker receives only the eight frozen code files and read-only feed; it has
no database, application, Git or model credentials. It uses a separate root
filesystem, DynamicUser, PrivateNetwork, IPAddressDeny=any, empty capabilities,
NoNewPrivileges and one dedicated writable state/cache/report root. Node runs
with `--jitless --max-old-space-size=768`; MemoryDenyWriteExecute remains enabled.
The shared slice has MemoryMax=1G, MemorySwapMax=0 and CPUQuota=50% of one core.
Both services have LimitCORE=0. Qualification reached the 1 GiB memory limit;
passing is not evidence of spare memory or capacity for a larger backlog.

The installed `grookai-pricing-completion-source.timer` specifies 15 minutes
after source-service inactivity. It was enabled at 2026-10-14T02:01:08Z and
immediately triggered source collection; that scheduled cycle succeeded. At the
final readback it was active/waiting, with the next run due at 02:17:20Z.
No optional worker watch loop is used.

Publisher retention keeps at least the newest two generations, the current and
previous generations, and generations within the 30-minute consumer age window.
Only validated publisher-owned immutable files are pruned. Worker cache retention
keeps current plus previous after success; repeated failures cap completed caches
at three and interrupted staging directories at two. Unknown files, stale inputs,
publisher failure/in-progress status and cleanup errors fail closed. Queue records,
review packets and history are never pruned by these retention mechanisms.

Final qualification includes 41 Windows Sandbox queue/feed/worker tests, 22
publisher tests, 18 synthetic Linux feed checks and 13 runtime-boundary checks.
The V3 full-size rehearsal preserved all 43,022 queue identities and every history
prefix through first and restart cycles, with zero closures. Its streaming digest
matched the original large queue's recorded legacy digest. The first two full-size
attempts failed with Node heap exhaustion and remain preserved; lifetime scoping
and bounded JSON checksum/snapshot serialization fixed the observed allocations.
The successful rehearsal used a historical clock and does not itself certify live
freshness. See external validation receipts under
`output/pricing-completion-feed-qualification-v5-streaming.json` and
`operator-readback/feed-qualification-v3/independent-readback`, plus the preserved
`feed-qualification-v1` and `feed-qualification-v2` failure evidence.

The original Windows worker PID 5148 stopped at 2026-10-14T01:48:38Z. The handoff
transferred 18,475 files byte-identically, preserving the original files and queue
history. Transferred queue SHA-256:
`274cda86e9553143edb935e425bf697ea0c766158783e61bc9add031ff65b3bc`.
The initial post-handoff collector attempt at 01:50:53Z failed with
`collector_capture_failed`; its failure is retained. A single retry captured at
01:52:41.149Z, published at 01:52:47.198Z and finalized successful publisher status
at 01:52:49.972Z for generation
`c64ae9b728069f7ee9331a31bfe5caa80c2f30e05d39628e376db136f2319a15`.
The resulting preparation cycle completed successfully; source and preparation
services are inactive with Result=success and exit status 0. Fixed readback
`operator-readback/runtime-live-readback-v1.json` verified 18,470 historical report
hashes unchanged and 43,022 unchanged review-needed records, with zero inserted,
reopened or resolved items. Revision is 599; no new packets were prepared because
all records already required review. The heartbeat's 01:52:51.431Z timestamp is
cycle start, not completion. The report remains `blocked_execution_capability`.
Post-cycle queue SHA-256:
`6e3eac69f0de1a45ebdf1b6aa93c6a0af5fae384684b09c092157f568d508c17`.
Independent comparison of the complete post-handoff histories passed at
2026-10-14T02:00:44.384Z: all 43,022 keys and generations match, every historical
prefix is preserved, and no records were added or resolved. Evidence is retained
at `operator-readback/handoff-history-audit-v1/audit-receipt.json`; the reviewed
audit launcher SHA-256 is
`8382db3e368d6e125cd5d434901aee68f083af3bda35945180f4dd358b550cd7`.

Final scheduled-cycle evidence is
`operator-readback/runtime-scheduled-readback-v1.json`, SHA-256
`b960603708d444700a077e869c702ded27b7f95227cab712969e085de5117690`.
Generation `11ba2c2e376e6f279ac50752ab7675f587bead0efad5cb7f2889a8c5f60d5bf9`
was captured at 02:02:10.069Z, published at 02:02:16.521Z, and acknowledged by
publisher status at 02:02:19.478Z. Both services finished with Result=success and
exit status 0. All 43,022 records remain unchanged/review-needed with zero
insertions, reopenings or resolutions; 18,470 historical report hashes remain
unchanged. There is no pause file or writer lock. Revision is 601 and queue
SHA-256 is `acfdf53b877073df560b71239f8ae5b0f99f948f7989be1c70beb603b4c83dc9`.
This successful recurring preparation path still has no production repair or
price-publication executor.

The expanded11-login-role metadata census found PUBLIC TEMP and network routine
permissions inherited by new roles. The direct-reader proposal therefore remains
blocked; no global ACL or production role changed. The fixed operator collector
continues using the existing broad credential exclusively inside its reviewed
operator/psql process. This is not a restricted-account claim.

The October 13 fixed operator probes ran on the existing Linux host in transient
systemd services. They used a fresh root filesystem, root-owned read-only input,
a dynamic non-root identity, empty capabilities, NoNewPrivileges, PrivateNetwork,
IPAddressDeny=any, restricted address families, protected home/kernel/control
paths and a single dedicated writable output directory. No repository code,
dependencies, database credential or application environment file was supplied.
These probes do not change existing production units or create a recurring job.

The Python probe passed15 checks. The actual installed Node20.19.6 probe passed14
checks, including spawning the installed Git binary within the same boundary.
Node ran with `--jitless` so MemoryDenyWriteExecute stayed enabled. Both probes
proved denied input writes, root escalation and external networking, unavailable
host credential paths/sockets, and successful dedicated output writes. They do
not prove unrestricted Node dependencies or a future network-enabled runtime.

Probe results and exact launch scripts are retained under the external validation
root's `operator-readback`. Both successful transient services finished and were
unloaded. The first Python probe failed because a denied stat raised PermissionError;
that failure remains preserved. A new probe correctly treated permission denial
as the expected result. No failure was overwritten or reported as a success.

Read-only production metadata found only postgres among the explicitly searched
current/session/grookai/pricing/discovery role names. That is not an enumeration
of every production role. The three inspected pricing/discovery/catalog service
configurations all use the broad project postgres account. None was passed to
candidate code. The capture also records zero PUBLIC EXECUTE grants on583 app
SECURITY DEFINER routines at that moment; this fact alone does not qualify a role.

Before a live candidate planner runs, implement and verify the exact dedicated
read capability, including direct login identity, table/RLS permissions, lack of
mutation/escalation paths, credential confinement and explicit project/role pins.
The planner now pins the exact proposed dedicated reader login and verifies its
direct session identity. The executor's new reader branch is dry-run-only;
historical broad operator access remains separately guarded. No production role
has been provisioned or certified by these connection checks. Source/runtime
immutability, dependencies, normal release checks, verified TLS, constrained
database egress and fresh source/target checks remain required. These probes
grant no production write or publication authority.
