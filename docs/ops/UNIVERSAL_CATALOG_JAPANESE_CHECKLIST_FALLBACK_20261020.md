# Universal Catalog Japanese Checklist Fallback — October 20, 2026

## Status

The narrow read-only repair merged through PR #751 as main commit
`41fdd6241c70391c9f0fd2fa2588caa902d1c0ed`. Its pre-merge validation did not
qualify a Ruflo shadow-pilot cycle; only later natural scheduled runs may be
evaluated as pilot evidence.

## Failure evidence

Three scheduled Ruflo shadow-pilot observations reached the same hold: the
Japanese product lane had a complete structured TCGdex checklist, then the
secondary Bulbapedia request for Storm Emeralda returned HTTP 403. The worker
correctly classified the response as `SOURCE_ACCESS_DENIED`, but rethrew it from
the nested corroboration step and degraded the entire Japanese product lane.

Observed workflow runs:

- `39334612376`
- `39372137263`
- `39417042104`

The runs remain valid held observations. Do not relabel them as qualifying.

## Repair boundary

- TCGdex remains the primary structured full-set checklist.
- Bulbapedia remains independent corroboration; it is not bypassed or replaced.
- A typed `SOURCE_ACCESS_DENIED` or `SOURCE_UNAVAILABLE` from Bulbapedia is
  contained only when the parsed TCGdex card array is nonempty and exactly
  matches TCGdex's declared total.
- HTTP 401/403 remains non-optional in the global source fallback policy.
- Missing, empty, or partial TCGdex evidence cannot authorize containment.
- A contained secondary failure remains explicit in the discovered source set's
  `secondary_source_observations`; it is not silently converted into evidence.
- Bulbapedia parser/integrity failures and TCGdex/Bulbapedia count disagreements
  remain fatal.
- Existing expected-absence handling for an HTTP 404 or a page with no proven
  Japanese card-list rows is unchanged.

This changes no database, catalog, Storage, pricing, ownership, workflow, or
GitHub state. It does not dispatch discovery and does not authorize production
mutation.

## Verification and next gate

Run the focused universal catalog contract suite, syntax checks for the changed
modules, the repository secret guard, and `git diff --check`. After normal review
and merge, observe the next natural scheduled discovery run. Only a newly
scheduled, artifact-backed run may be evaluated as the next Ruflo pilot cycle;
do not manually dispatch a run to manufacture qualification evidence.

Local verification passed with 34/34 focused contract tests, syntax checks for
the backend helper, worker, and contract test, the release secret guard, and
`git diff --check`.

The managed pre-commit shipcheck was attempted. Its secret guard passed, then
the live runtime preflight stopped because this isolated checkout has no
`SUPABASE_DB_URL`. No credential was invented or copied into the worktree. The
implementation commit therefore uses the intentional `--no-verify` path defined
by `docs/contracts/AUTOMATED_SHIP_GUARDS_V1.md`; the full repository shipcheck is
not claimed as passed, and hosted CI remains required.
