# Universal Catalog Japanese Official Expansion Fallback — October 21, 2026

## Status

Narrow read-only repair prepared on
`fix/universal-catalog-secondary-evidence-v2`. It is not merged or deployed and
does not qualify a Ruflo shadow-pilot cycle.

## Failure evidence

Natural scheduled runs `39502200235`, `39546617897`, and `39548968973` reached
the same Japanese-product hold after the October 20 TCGdex fallback repair. The
new product is official expansion `M6a`, product `961`, named `30th Celebration`.

- The official product API enumerates 140 unique cards and declares `hitCnt=140`.
- Every official card image is scoped to `M6a`.
- Limitless enumerates 111 rows for `M6a` and declares 111 rows: numbered cards
  1–103 plus eight Energy entries.
- TCGdex does not yet publish Japanese set `M6a` and returns HTTP 404.
- Bulbapedia returns HTTP 403 for `30th_Celebration_(TCG)`.

The prior repair correctly remained closed because no complete TCGdex full-set
checklist existed. These runs remain valid held observations and must not be
relabelled as qualifying.

## Repair boundary

Bulbapedia remains requested as independent corroboration. Its typed
`SOURCE_ACCESS_DENIED` or `SOURCE_UNAVAILABLE` response may be contained for an
official Japanese **expansion** only when all of the following are true:

- TCGdex evidence is absent; any present but incomplete TCGdex checklist is
  fatal and cannot enter this fallback;
- the official product card array is nonempty and exactly equals `hitCnt`;
- all official card IDs are numeric and unique;
- every official card image path carries the exact discovered set code;
- the parsed Limitless checklist uses that same set code, is nonempty, and its
  row count exactly equals the page-declared count;
- all Limitless source identities are unique and every row carries the same set
  code; and
- the Limitless numbered-checklist count does not exceed the official count.

When those conditions hold, the official enumeration supplies the `full_set`
count and the Limitless checklist supplies independent set/code and numbered-row
corroboration. The contained Bulbapedia failure remains explicit in
`secondary_source_observations` with its containment basis. This evidence shape
does not satisfy the unattended Japanese writer's TCGdex-authority gate, so it
cannot authorize catalog mutation.

Construction decks, other product types, count mismatches, duplicate identities,
mixed image set codes, missing/partial evidence, parser failures, and any
non-transport Bulbapedia failure remain fatal. HTTP 401/403 remains globally
strict. This repair does not authorize database/catalog writes, workflow
dispatch, endpoint bypass, or manual pilot qualification.

## Verification and next gate

Run the focused universal catalog contract suite, syntax checks for all changed
modules, the repository secret guard, and `git diff --check`. The focused helper
was also exercised read-only against current `M6a` source responses: official
140/140, Limitless 111/111, one exact `M6a` image code, accepted.

After normal review and merge, observe the next natural scheduled discovery run.
Only a newly scheduled, artifact-backed run may be evaluated as another Ruflo
pilot cycle. Do not manually dispatch discovery to manufacture qualification
evidence.

Local verification passed with 45/45 focused discovery and supervisor contract
tests, syntax checks for the changed JavaScript modules, the release secret
guard, live read-only `M6a` evidence validation, and `git diff --check`. The
managed pre-commit shipcheck was attempted; its secret guard passed, then the
runtime preflight stopped because this isolated checkout has no
`SUPABASE_DB_URL`. No credential was invented or copied into the worktree. The
implementation commit therefore uses the intentional `--no-verify` path defined
by `docs/contracts/AUTOMATED_SHIP_GUARDS_V1.md`; the full repository shipcheck is
not claimed as passed, and hosted CI remains required.
