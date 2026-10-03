# Pokemon Classic Master staging V1

This offline, identity-only candidate implements the existing Master governance
and Classic identity-evidence contracts. It has no database connection, network
acquisition, active-index promotion, or apply mode. It does not grant automated
finish review authority or impersonate a human reviewer.

The staging command replays all four original compressed source snapshots and
compares the entire result to the supplied identity package. It appends exactly
102 card facts and three collision-safe set configurations, with six source
availability rows. Existing card/set/source rows retain their full JSON values.
Printing, suppression, conflict, manual-review and finish-blocker artifacts must
remain byte-equivalent after JSON serialization. The existing locked ME04 profile
is asserted before staging and after independent file readback. Input and output
hashes detect changes during staging. Output directories must be new and outside
the baseline, active Master and identity input directories.

Run `scripts/audits/pokemon_classic_master_staging_v1.mjs` with
`--baseline-dir`, `--identity-dir` and `--out-dir` arguments using `=value`.
The preserved identity directory contains the namespace snapshot; tracked tests
use a clearly synthetic namespace fixture and replay the real source bytes.
Pass the resulting staging directory to the normal guarded-rebuild command
without `--promote`, using actual baseline floors and candidate/conflict ceilings.
The normal guard does not replace these stronger exact-preservation assertions.

The completion builder retains missing printing evidence as a separate count of
card identities. An identity with no positive working printing row enters
`card_identity_without_printing_evidence`; its `gap_unit` is explicitly
`card_identities_not_printing_facts`. No finish label or total printing count is
invented. Cross-deck facts, different names, finish absences and adjudicated
excluded rows cannot satisfy that coverage. Existing unconfirmed printing rows
stay in their normal finish-review lane and are not counted twice. A verified
subset of printings cannot make a set with uncovered identities complete.
Coverage folds numeric zero padding and uses the existing Master classifier's
name key, preserving its established GX-punctuation and Delta-display equivalence.
Deck, number suffix, denominator, retailer and ex distinctions remain significant.
This does not change any stored identity, display name, evidence or printing fact.

All three Classic decks must remain
`card_identity_complete_finish_incomplete`, with 34 admitted identity candidates,
zero printing facts and 34 missing-finish identities each. Their downstream audit
eligibility remains false. Completion and admissible-fact exports are review
artifacts, not a complete-set publication or canonical write package. All existing
historical evidence is retained, including currently unconfirmed facts.

Active Master integration still requires reviewed finish evidence, locked exact
per-deck profiles, normal source checks/hooks and the applicable governance path.
Canonical set/parent/printing/mapping admission requires its own newly qualified
executor and frozen production plan. A candidate can pass preservation while
remaining unsuitable for either publication or production writes.
