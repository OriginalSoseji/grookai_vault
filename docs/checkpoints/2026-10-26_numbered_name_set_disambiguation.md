# Numbered card-name and implicit set disambiguation

## Verified release state

PR 798 merged as `ec4523f0835983ead7edddf7fda82a351e2571ef` after both normal
installed hooks and all 18 hosted checks passed. Vercel reported its production
deployment successful. Public endpoint readback then found a second, distinct
failure: `greninja 081` and `maushold 155` worked, while `mega greninja 081`,
`mega greninja 81`, and `081 mega greninja` returned no rows and incorrectly
displayed `Set: mega`. The deployment was not reported as a complete repair.

## Evidence and repair

The set/name ambiguity check sent the collector number to the name-only RPC
and required it to occur in the returned card name. Live publishable-key RPC
reads confirmed `mega greninja 081` returned no name rows while `mega greninja`
returned the canonical Mega Greninja ex parents, including `GV-PK-MEP-081`.
The failed name probe allowed the implicit Mega Evolution set shortcut to win.

`getCompleteNameSearchQuery` now shares the existing name-discovery cleanup
with interpretation. The original query, number, fraction, unknown words, and
explicit set filters remain inputs to result filtering. The trusted first
name page is retained using the same cleaned name, avoiding a duplicate RPC.
Exact-name opening-word checks are unchanged. No SQL, schema, canonical data,
pricing, ownership, scanner service, model, index, APK, or environment changes.

Branch: `fix/search-number-set-name-20261026`, based on the merged PR 798.

## Qualification before full release gates

- 47 focused tests passed across catalog-set interpretation, actual GET route
  routing, collector-number regression, and GameStop combined-search behavior.
- Tests cover padded/unpadded/reversed/#/fraction numbers, retained-page reuse,
  number-only input, unknown/fuzzy name fragments, and explicit set constraints.
- The actual GET route and real readers were executed with the live catalog
  through the publishable-key SDK. Only Next response and request-client adapters
  were replaced; writes and unexpected RPCs were prohibited. All six checks
  passed: the three Greninja number forms, incorrect 080, incompatible explicit
  Mega set, and Maushold 155. Measured local request times were 1.1–2.2 seconds;
  these are local read-only probes, not hosted latency claims.
- Receipts: `.tmp/name-number-set-focused.log`,
  `.tmp/name-number-set-real-route.json`, and the preserved first deployed
  readback `.tmp/deployed-resolver-first-readback.json`.

Installed commit/push hooks, hosted CI, merge, and deployed endpoint readback
remain required. No gate bypass or manual founder retest is needed.

The first normal commit-hook attempt recorded three timeouts in unchanged
`pokemon_legacy_ingestion_admission_v1.test.mjs` cases (10–15 second limits).
The entire unchanged 25-test file passed immediately in 6.3 seconds on its
isolated recheck. The failed log is preserved and the full hook is retried;
no test timeout, assertion, or gate was relaxed.

A second full attempt timed out in a different unchanged case of that same
ingestion file. The loopback-only hook runner now uses the normal Node CA
configuration instead of adding NODE_USE_SYSTEM_CA to every child process.
The extra CA setting is unnecessary for local fixtures; its involvement is
unproven. Public HTTPS evidence probes retain explicit system-CA trust.
All installed checks and original timeout limits remain required.

The next full attempt passed all 8343 contract tests, web checks, and analysis,
but Flutter lost its loopback runner connection before the unchanged
`brand_typography_contract_test.dart` suite loaded. The two typography tests
then passed immediately in isolation. The failed full log and separate recheck
are preserved. All full gates are retried; the typography contract is intact.

## Held after local runtime failures

Five normal commit-hook attempts were made without bypass. The fourth again
timed out in three unchanged ingestion cases. The fifth passed 8340 contract
tests but timed out in three unchanged
`legacy_justtcg_mapping_review_only_v1.test.mjs` CLI fixture cases; child
processes were killed by their original 15-second timeout before any fixture
request arrived. All 23 tests in that file then passed unchanged in isolation
in 5.05 seconds. The entire 25-test ingestion file also passed in the same
sanitized environment under both PowerShell and Git Bash.

The specific runtime cause is unproven. Changing CA configuration did not
eliminate the recurrence. No proxy environment was present; memory and TCP
connection counts did not establish exhaustion. No system services, network
settings, test limits, assertions, or shared hooks were changed.

The full contract suite passed once (8343 passed, 11 skipped) together with
web typecheck/lint/build and Flutter analysis, but that same attempt lost the
Flutter test-runner connection before typography tests loaded. Therefore no
complete normal hook success exists for this follow-up.

**Release remains held.** HEAD is still PR 798's merged main commit
`ec4523f0835983ead7edddf7fda82a351e2571ef`; the six-file follow-up is staged
on `fix/search-number-set-name-20261026`. No follow-up commit, push, PR, merge,
or deployment occurred. The public deployment retains the independently
verified working `greninja 081` lookup, but the full `mega greninja 081`
case remains unresolved publicly. Resume only by resolving or requalifying
the local runtime and passing the normal full hooks, then hosted CI and
actual deployed endpoint readback. No founder manual retest is required.

Failed full logs: `.tmp/numbered-name-commit-timeout-attempt*.log`,
`.tmp/numbered-name-commit-flutter-connection-attempt.log`. Isolated readbacks:
`.tmp/release-ingestion.log`, `.tmp/release-justtcg.log`,
`.tmp/release-typography.log`. The 47 focused tests and six actual-route live
catalog probes remain the evidence for the proposed code, not release proof.
