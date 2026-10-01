# Search latency — October 1

The founder reports slow in-app search. This isolated branch changes the shared
name resolver and native result enrichment, without schema or catalog writes.

Named searches read their first page normally, preserving the existing name
decision. A full first page starts bounded windows of four read-only RPC pages.
Responses are consumed in offset order. All required pages retain duplicate-page
and offset-cap guards; any required-page error fails the lookup. A short page
ends the result immediately, without waiting for unused speculative pages.
Rejections from those already-started reads are handled. At most three extra
tail reads can occur; one-page and unknown-name searches never fan out.
The caller, game, language and explicit set scopes and final filter/sort pipeline
are unchanged, preserving artist/finish/printing constraints and result ordering.

Native search displays the existing complete result list in batches. Pricing,
ownership and printing options now load independently for visible cards, publish
as they finish, and request only newly shown cards on Load more. A stale response
cannot update a newer search. Errors leave the result list usable and do not
invent zero prices or default finishes. Quick-add still resolves exact printings
through its existing guarded action path.

Read-only anonymous production RPC comparison preserved every result identity.
Pika30th retained36 matches and285 candidate rows in5 requests; two paired runs
measured1.35–1.37s before and0.71–0.75s after for this lookup stage, not end-to-end
UI performance. Mewtwo30th retained4 matches and improved0.48–0.49s to0.39–0.40s,
with two extra empty speculative reads. Wurmple30th, Base Set Chari and Pika
Ascended keep their one-page path. These are small warm samples, not controlled
cold-cache benchmarks. The earlier per-set fanout candidate was abandoned during
review because many release labels could add unnecessary requests. Its benchmark
and interrupted commit-v1 log remain preserved; only V2 evidence qualifies this
final implementation.

Focused search contracts, native widget/repository/transport checks, TypeScript
checking, targeted lint and Flutter analysis passed. The widget proof stalls
pricing, verifies printing details appear independently, checks24+6 visible-card
batches and suppresses stale printing responses. Earlier fixture failures were
test setup errors (response.request missing and scroll targeting), corrected
without weakening assertions. Full integration/release state is recorded in
`C:/grookai_vault_operator_artifacts/search_latency_20261001/CHECKPOINT.md`.

The founder explicitly removed physical iPhone testing as an importer release
prerequisite: validate the online workflow, then carry it to the app. Use web and
real sandbox Auth/HTTP/SQL proof plus native compilation/static checks. Record
physical verification as unperformed, not as a passing test or release blocker.
Importer PR562 remains a separate candidate; its authoritative private checkpoint
is `C:/grookai_vault_operator_artifacts/collectr_set_scope_20261001/CHECKPOINT.md`.
Build340/backendV2 version4 were live at this checkpoint; no real collection save
or new deployment is established by these local search tests.
