# Bounded complete-name search — October 1

Source: fix/search-name-plan-20261001, based on PR571 main a6032c616a.
Private evidence: C:/grookai_vault_operator_artifacts/search_name_plan_20261001.
That directory records actual release status; source changes alone are not live.

Production read-only plans showed Char64 rows ~196–199ms and all421 raw rows
~196–198ms, both5328 buffer hits. Repeating the64-row query incurred redundant
work. Shared name search and its request-local interpretation probe now request
512 rows from the new V5 function. Keep the server-created WeakSet provenance
check; serialized server-action input cannot provide a trusted first page.

V5 preserves all V4 fields, predicates, deterministic order, language/game/set,
number, artist, exact GV-ID, visibility checks and permissions. Only name/default
page bound and function-local custom planning differ. V4 is unchanged. Complete
paging still rejects errors, duplicate progress and exhausted offset bounds;
Pocket filtering does not shorten the raw database page. No collection/catalog
writes or native binary release are included in this change.

Production413 baseline passed strict inspection. Its already-applied pricing
migration is copied byte-exact from the qualified413 replay in the separate
Duraludon workstream; do not apply it again. New414 full replay and retained413
upgrade use fresh one-use fixtures. The runtime fixture compares real anonymous,
authenticated and service-role HTTP results. Earlier synthetic setup errors are
preserved; corrections touch only the isolated fixture. Never reset either lab.

Before release: normal commit/push hooks, clean source, strict PrePush, exact CLI
dry-run/apply/readback, hosted candidate/browser and uncached live timing proof.
The website remains on PR571 until a private terminal release receipt says otherwise.
