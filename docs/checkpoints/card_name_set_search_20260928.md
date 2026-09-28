# Card name and set search — September 28

Candidate: `fix/search-name-set-20260928`, based on main
`8ff4d785ea6b880bf3711ef64da6008d7ca60b77`.
Worktree: `C:/gv_search_name_set_20260928`.

The shared web/native resolver now recognizes caller-visible catalog set names,
canonical display names, codes and eligible printed codes alongside card-name
text. It retains the existing curated aliases. Longest matching set names win,
so Base Set 2 and Expedition Base Set do not become Base Set searches.
Card-name fragments remain literal substring constraints, not guessed spelling
corrections. Recognized set filters remain visible and removable.

`30th anniversary` groups actual Pokemon catalog releases named 30th Celebration
or 30th Anniversary. A specific collection name selects that collection. No
25th/20th releases or invented catalog identities are added. `from`, `in`, and
optional `the` immediately before a recognized set are removed with its chip.
Both name/set orders, capitalization, commas and extra spaces are covered.

Single-word sets work without special syntax. Before applying an ambiguous
single-word set, the existing release-aware name RPC checks whether the whole
remaining query is an exact card name. Thus `Aerodactyl Fossil` can select Fossil
while `Unidentified Fossil` remains a card-name search. Quoted text is protected.
Set names containing numbers, years or finish words are protected from the
other smart filters. Unknown words remain search constraints.

Set metadata is read through the ordinary caller-scoped client, paginated to
completion without a shared visibility cache. Read failures return an explicit
503 rather than dropping a set constraint. Multi-release set searches use the
complete combined-search path and paginate only after applying constraints.
Artist, finish, language and explicit set-parameter behavior are retained.
There are no migrations, catalog edits or permissions changes. The additional
native input-settings change below requires a new app build.

## Verification

- 103 search/resolver contract tests pass, including actual route invocation,
  old-client artist paging, late metadata failures, 501-row metadata reads,
  combined artist/finish/set constraints and the new examples in either order.
- TypeScript checking and targeted ESLint pass.
- Strict production-mode web build passes on the final candidate using the
  preserved local staging API29421 and read-only DB29422, with external Node
  connections denied. The final receipt is dated September 28 at 05:56 UTC.
- Read-only production catalog comparison used 1,382 Pokemon set rows. The
  candidate interpretation matches four Mewtwo/Mewtwo ex parents from `30c`
  and one Charizard parent from `base1`. This is parser/catalog evidence,
  not proof that the new endpoint has been deployed or tested on a phone.

Private evidence is outside the repository at
`C:/grookai_vault_operator_artifacts/search_name_set_20260928`:
`catalog-match-proof.json`, `search-tests.log`, `build-result.json`, `build.log`.

## Release boundary

Source release preparation is in progress. Normal commit and push hooks run
the complete shipcheck against isolated local services. Authoritative current
commit/push/PR results are in the private operator checkpoint and receipts;
the earlier focused checks alone do not establish release readiness.
Next: source review and an explicitly approved web deployment, followed by
live web and native-client smoke of both examples, chip removal and pagination.
The previous native-import production approval is not a search deployment
approval. Do not replay its already completed migrations or Edge deployment.
All previous worktrees, labs and audit evidence remain preserved.

## Search keyboard follow-up

The founder also requested disabling autocorrect in the search bar. Shared web
search-toolbar inputs and the header fallback now set autocorrect off,
autocapitalize none, spellcheck false and browser autocomplete off. The explicit
catalog suggestion list and resolver interpretation remain unchanged.
Flutter catalog and Vault searches disable autocorrect, keyboard suggestions,
capitalization and spellchecking for Android and iOS.

Web TypeScript checking, targeted ESLint, existing three search UX contract
checks and diff whitespace checks pass. Dart formatting/syntax parsing passes
with no formatting changes; this fresh worktree has no Dart package resolution,
so the formatter warned that the flutter_lints include could not be resolved.
No native build or physical-keyboard verification is claimed. The earlier full
web build receipt precedes this input-only follow-up. Web deployment and a new
native build/distribution are still pending.

The subsequent full shipcheck includes Flutter dependency resolution, analysis
and tests as well as a fresh web build. Consult its final receipts rather than
treating the earlier missing-package warning as a permanent native blocker.

## Hosted security review follow-up

PR527's CodeQL review identified polynomial backtracking in the set cleanup
regex. Cleanup now uses linear token/boundary scanning, and the resolver rejects
queries longer than 500 characters before catalog access. Regression checks
cover repeated tabs/commas and the early length rejection. The finding remains
pending hosted re-verification until the corrected head's CodeQL result passes;
the original failed result must not be dismissed or counted as passing.
