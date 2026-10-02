# Collectr Adventure-name matching

This isolated follow-up starts from main398c41aba after the anniversary search
release. The real Collectr collection has not been saved. No pricing, schema or
catalog changes belong to this repair.

Collectr exports Adventure cards under the permanent name, while the catalog
records the permanent and attached spell together. Web preview, the V2 server
validator and the native source-aware predicate now accept that permanent name
only when one active English MTG identity proves the full name, Adventure layout,
set, number and Scryfall print ID. Spell-only names, unsupported layouts, unknown
treatments, missing evidence and special-foil labels stay held. Every existing
grade, finish, source and unique-child requirement remains independent.

Fifteen added shared cases exercise permanent/full-name matching, verified
treatments and number suffixes, plus wrong spell, number, set, layout evidence,
malformed name, missing identity and unsupported foil/treatment rejection.
The focused server/handler/web suite passes244 tests. Native focused tests pass96
with one opt-in private replay skipped. The first HTTP attempt stopped before
fixture writes because Docker network inspection did not respond. CLI checks
through both Windows engine pipes timed out; the prepared HTTP proof has not
passed. Docker inspection now has a15-second bound. Normal full shipcheck and
release outcomes are recorded separately in the private checkpoint.

Read-only production evidence refreshed all1,083 parents in FIN/FIC with their
active identities and public printing options. The unchanged real export has
1,872 source rows. Before/after replay against the same refreshed evidence moves
10 rows/12 copies into Ready:1,092 rows/1,261 copies ready and780 rows held.
All1,082 prior ready rows retain parent, child and quantity. Every source field
is unchanged and all64 graded rows remain held. Other sets use the retained
snapshot; this is not a new full-catalog coverage claim.

`GV_COLLECTR_ADVENTURE_HTTP_PROOF=1` runs the existing real Auth/Next/SQL/browser
proof in the fixed `C:/gv_collectr_adventure_20261001` worktree with a fresh
synthetic Adventure fixture. It uses the retained full410 lab at58540/58541 and
Next58863, preserving prior rows and controls. It verifies exact child/cost/condition
readback, original source, denied grade/foil writes, owner privacy, repeated saves,
interrupted browser response and reload/retry. Never reset that lab or route a
development app to production. Physical iPhone testing is not a prerequisite.

Private source, replay results, HTTP evidence and terminal status belong under
`C:/grookai_vault_operator_artifacts/collectr_adventure_20261001`. Check that ledger
before releasing or describing this as live. A local pass does not establish a
website/Edge deployment, a new TestFlight build or a saved real collection.
