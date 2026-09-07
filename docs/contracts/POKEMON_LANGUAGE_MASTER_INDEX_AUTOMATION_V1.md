# Pokemon Language Master Index Automation V1

## Objective

Every discovered Pokemon card must enter a persistent, language-scoped Master
Index before canonical reconciliation. The daily automation may record source
candidates and admit independently proven identities. It may never use a raw
provider row as direct canonical writer input.

## State Model

Each language has two independent states:

1. `source_candidate`
   - A source reported the set or card.
   - The observation is persistent, cumulative, and auditable.
   - It has no canonical authority.
2. `master_admissible`
   - Independent evidence proves the language, set owner, card coordinate, and
     printed identity.
   - Only this state may enter canonical reconciliation.

`source_candidate` is not a weaker spelling of `master_admissible`. It is a
different authority class.

Provider rows that cannot safely join the normal set/card graph are retained as
`source_anomalies`. This includes missing identity fields, cards with no source
set owner, and colliding source IDs. The complete provider payload is preserved,
the anomaly is fingerprinted, and `canonical_authority` remains false. A source
anomaly is persistent evidence and operational debt, not a discarded row and
not permission to invent a set owner.

## Daily Order

```text
source discovery
-> language candidate index
-> evidence-qualified admission
-> data-only validation
-> automatic Master Index publication
-> fresh canonical reconciliation
-> bounded source-specific writer
```

The publication job performs no database, Storage, image-pointer, pricing,
publication, or Vault writes.

## Persistent Language Scopes

The candidate registry recognizes all TCGdex language scopes:

`de`, `en`, `es`, `es-mx`, `fr`, `id`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`,
`pt-br`, `pt-pt`, `ru`, `th`, `zh-cn`, and `zh-tw`.

An unavailable or empty provider scope remains an explicit zero-card language
scope. It does not disappear from governance and it does not authorize inferred
cards.

TCGdex API rows are preferred for candidate refreshes. If the API host is
unavailable, the worker may parse identity fields from the official MIT-licensed
TCGdex cards-database repository snapshot. The fallback must record the exact
source commit, parse source files without executing them, and retain
`canonical_authority: false`.

The same pinned fallback may recover an otherwise successful API response only
when the existing catastrophic card-count guard rejects it (baseline at least
100 cards, current source below 80 percent of baseline). The fallback must pass
the unchanged language, count, owner, and coordinate checks. A healthy response
does not invoke recovery; a direct identity conflict does not authorize fallback.
Offline fixture runs never perform network recovery. Fallback cannot recurse.

Retain the rejected API response and fallback snapshot under the run's
`source_recovery/<language>/` directory, with exact hashes in `summary.json`.
These raw files remain outside the candidate directory copied by apply.
`source_recovered_languages` reports candidate continuity, not API health or
canonical admission. Keep the adapter-health issue open while a primary-source
regression needs fallback. If fallback is unavailable, unpinned, or invalid,
preserve the baseline and report the failure; do not weaken validation.

English continues to use the verified English Master Index as admitted
authority. Japanese continues to use Japanese V4 plus the append-only
incremental overlay. Other languages remain candidate-only until an independent
admission adapter is contracted.

## Automatic Publication

A data-only update may merge automatically only when:

- the job started from the current default branch;
- source candidates are frozen before apply;
- candidate fingerprints reconcile exactly;
- all changed paths are in the Master Index allowlist;
- no unexplained identity removals occur;
- no owner, coordinate, or source collision exists;
- focused Master Index, discovery, and promotion contracts pass;
- the final branch rebases cleanly onto current `main`;
- the allowlisted diff and tests pass again after rebase.
- the automation-created pull request's required guard is approved, completed,
  and read back as successful before merge.

The merged SHA, source fingerprints, row deltas, and downstream dispatches are
recorded in the run artifacts.

## Japanese Incremental Admission

A recent Japanese set may enter the incremental admitted overlay only when:

- the release date has arrived;
- TCGdex provides one complete card list through its structured API or an exact
  cards-database source snapshot;
- a separate Bulbapedia checklist provides the same complete coordinate list;
- both full-set counts equal the expected count;
- every coordinate is unique and appears in both lists;
- TCGdex supplies a non-empty Japanese printed name for every admitted card;
- the set code resolves to zero or one persistent owner;
- any existing owner's expected count is compatible;
- no existing card coordinate collides.

Official Japanese product evidence remains set/release context. It does not
silently substitute for missing card-level identity evidence.

## Continuity

- A transient source outage preserves the prior index.
- A Japanese evidence-source outage cannot block candidate capture for other
  languages; it preserves the prior Japanese admitted index and creates visible
  adapter-health debt.
- A catastrophic provider row-count drop rejects that source. Only a separately
  validated pinned fallback may recover candidate continuity as described above.
- Temporarily unobserved candidate rows remain present with revalidation debt.
- Printed-name changes preserve prior names.
- Coordinate changes fail closed.
- Source anomalies remain evidence-only, are included in language fingerprints,
  and keep the language adapter-health issue visible until independently fixed.
- Automatic deletion is forbidden.

## Downstream Boundary

### Read-Only Anomaly Evidence

`scripts/audits/pokemon_language_anomaly_evidence_v1.mjs` is a diagnostic,
not a candidate or canonical writer. The daily refresh runs it against the
generated German/Chinese candidate snapshots, with output outside the candidate
directory copied by apply. It freezes at most 300 anomaly IDs and 300 requests,
uses three workers with no retries, follows no redirects, and stops new calls
after 401/403/429 while draining in-flight evidence. Responses are limited to
4 MiB and 20 seconds. Existing output directories cannot be reused.

An orphan card can receive `candidate_revalidation_supported` only when its
fresh detail endpoint matches its original card ID, name and number and supplies
an explicit, consistent owner. Prefixes are endpoint probes only. An available
set endpoint must agree; a 404 remains upstream adapter debt. Returned set names
and counts must agree across the affected cards. This diagnostic never grants
independent admission, edits a candidate, or clears a quarantine record.

A single set endpoint cannot resolve two colliding source set records. Source
filenames do not override conflicting declared IDs. Both records stay preserved
until corrected evidence supports an explicit reconciliation.

The issue report distinguishes supported revalidation evidence from unresolved
records and transport failures. Diagnostic execution failures are visible in
adapter health but cannot grant authority or block unrelated valid data-only
updates. Raw source responses and their hashes remain in the existing 90-day
workflow artifact. A successful diagnostic does not make the primary inventory
healthy or establish complete language coverage.

After a successful data merge, automation dispatches fresh discovery and bounded
promotion from the merged default-branch SHA. Promotion continues to enforce its
existing source-specific maximum-target and rollback rules.

Unknown languages, candidate-only rows, ambiguous owners, incomplete lists,
future releases, and conflicting evidence produce no canonical write.
