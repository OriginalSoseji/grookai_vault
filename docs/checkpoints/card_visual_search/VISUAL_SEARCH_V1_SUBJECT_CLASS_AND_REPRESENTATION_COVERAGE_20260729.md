# Visual Search V1 Subject Class And Representation Coverage

Status: COMPLETE; LOCAL SEARCH SEMANTICS REPAIRED, COVERAGE GAP MEASURED

Date: 2026-07-29

Branch: `agent/visual-search-lab-runtime-fix`

Parent commit: `5788e19820f9463091869bfb19e05705854d3509`

## Context

The local lab previously treated `Pokemon` as a card-branch filter. That made
queries such as `Pokemon as food` search for ordinary food on Pokemon cards,
and made `sleeping Pokemon` unable to express a visible-subject constraint
across Trainer, Stadium, Item, and Pokemon card branches.

Role-qualified queries also returned strict zero whenever the typed
`character_representations` or `depicted_subjects` row was absent, even when
the saved Fact Graph contained direct object-level evidence such as
`Pokemon plush toys` or `ice cream resembling Vanillite`.

## Decision

- Bare `Pokemon` is a visible subject-class constraint.
- `Pokemon card` and `Pokemon cards` remain canonical branch constraints.
- Bare Pokemon subject-class queries default to `scene_subject`.
- Subject-scoped facts must bind to the matching Pokemon observation, or every
  subject in the requested role must independently be a Pokemon.
- Typed subject-role evidence remains authoritative.
- Missing typed role rows may be recovered only from one observation-backed
  object or surface entry containing both identity/class and the requested
  qualifier.
- Food forms require an explicit identity-to-shape relationship.
- Card UI, creature anatomy, human appearance, pose, action, and generic
  co-occurrence cannot create a representation.

## Coverage Audit

Permanent external artifact:

`C:\grookai_visual_search_releases\card_visual_search_corpus_release_v1_1_20260721\_analysis\card_visual_search_representation_coverage_v1\2026-07-30T04-30-30Z_coverage`

The audit processed `10,376/10,376` Fact Graph rows:

- rows with any typed character representation: `5`
- rows with a typed Pokemon character representation: `2`
- rows with any typed depicted subject: `37`
- omission-candidate rows: `92`
- Pokemon character-representation candidates: `59`
- generic character-representation candidates: `28`
- Pokemon depicted-subject candidates: `13`

Candidates are review leads, not newly asserted facts. The audit excludes card
UI and creature-anatomy lookalikes from candidate recovery.

## Live Corpus Proof

The lab loaded `9,532` artwork groups from the immutable release.

- `pokemon as pillow`: `0`
- `pokemon as food`: `1` - Japanese Vanillite
- `pokemon food shape`: `1` - Japanese Vanillite
- `pokemon ice cream`: `1` - Japanese Vanillite
- `sleeping pokemon`: `34`
- `jumping pokemon`: `125`
- `flying pokemon`: `551`
- `pokemon standing`: `1,411`
- `pokemon running`: `182`
- `Pokemon cards with sleeping`: `37`

The Vanillite result is backed by `obs_objects_001`: an ice cream cone visibly
resembling Vanillite. Direct image inspection confirmed that the food object is
separate from the physically present Vanillite. Ordinary Vanilluxe anatomy and
a Pokemon merely holding ice cream do not satisfy this query.

## Verification

- Syntax checks: passed
- Focused lab and coverage contracts: `12/12` passed
- All visual-search contracts: `107/107` passed, including the final
  anatomy-versus-representation regression
- `git diff --check`: passed before checkpoint creation
- Release secret packaging guard: passed
- Repository-wide pre-commit and pre-push shipchecks: stopped during runtime preflight
  because `SUPABASE_DB_URL` is not available in this worktree. No database
  connection or statement was attempted.
- Browser smoke: passed for `pokemon as food` and `sleeping pokemon`
- Provider calls: `0`
- Database writes: `0`

## Invariants

- Raw observations remain unchanged.
- Recovery changes search eligibility only; it does not mutate the Fact Graph.
- A scene subject is not converted into a character representation because its
  anatomy resembles food, an object, or a manufactured form.
- No candidate is promoted to fact without governed review or re-extraction.
- No provider, database, approval, embedding, holdout, or public-release path
  was added.

## Current Truth

Pose queries are usable now against the processed corpus. Representation
search is usable where structured role rows or explicit object/surface evidence
already exists. The current 10K extraction materially under-recorded character
representations; a strict zero still means no qualifying indexed evidence, not
that no matching card exists.

## Exact Next Gate

Review the `59` Pokemon character-representation and `13` Pokemon
depicted-subject candidate rows, remove false candidates, and run targeted
Fact Graph re-extraction only for confirmed omissions. Rebuild the deterministic
projection afterward. Do not rerun all 10K cards and do not open the sealed
holdout as part of this repair.
