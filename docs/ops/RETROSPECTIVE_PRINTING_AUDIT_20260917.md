# Retrospective Printing Audit

Date: 2026-09-17 UTC
Mode: Read-only production queries and offline comparison. No mutations.

## Evidence

Full report:
`C:/grookai_vault_operator_artifacts/retrospective_printing_audit_20260917/REPORT.md`

Finish details: `FINISH_COMPARISON.md` in the same directory.
Frozen SQL, responses, per-set worklist, exact affected parent/child IDs, master
source hashes and summaries are retained alongside the report.

Scanned all 3,399 set records and reconciled 170,658 parent cards to production
sanity counts. Deeper physical Pokemon comparison excludes Pocket and keeps
Japanese, stamped and special-product lanes separate.

## Findings

- Pitch Black: 120 parent cards, zero child printings/public options.
- 30th Celebration Classic Collection: 30 parents, zero child printings/options.
- HS Gyarados and Raichu Trainer Kits: 29 parents missing children in each.
- McDonald's 2021: only 25 Normal children; stored master lists 25 Holo too.
- 60 exposed Pokemon children across 14 sets lack a printing GV-ID.
- 25 parent/child GV-ID prefixes differ; resolve legacy aliases before changes.
- 3,064 non-Japanese physical Pokemon parents across 150 sets have no child.
  Most are explicit product/stamp identities, not missing ordinary base cards.
- 33 exact basic-finish discrepancies against 193 historical master shards;
  these require source/suppression reconciliation, not automatic insertion.
- One Piece's parent-only import contract explicitly deferred children. Its
  6,885 missing-child parents are unfinished finish admission, not proof that
  their canonical card identities are wrong.
- Japanese identity-only and provisional lanes remain separately incomplete.
- MTG passed structural checks: 104,412 parents, 157,678 children; no missing
  children or observed printing GV-ID/provenance gaps. Full physical finish
  completeness was not re-proven against Scryfall.

## Verified Clean

- 30c base: 161 Holo children and public options; existing repair intact.
- ME04: 122 parents; 202 children (68 Normal, 76 Reverse, 58 Holo). All forbidden
  Normal rows remain absent and protected facts remain present.
- No duplicate non-null printing GV-IDs or public adverse active review rows.

## Required Candidate Correction

The prior local ingestion guardrail is not production-ready for Pokemon
monitoring: the scheduled worker inner-joins catalog game release controls,
but Pokemon has no game-control row and its live visibility function defaults
to public. Correct selection to mirror the live visibility rules and add a
regression before deploying that candidate. Do not mark Pokemon hidden because
the initial coverage artifact says `released:false`; that field describes the
control-table join, not effective Pokemon app visibility. RPC spot checks prove
Pitch Black and Classic parents visible with zero printing options.

Also, coverage counts alone cannot detect a missing second finish, as shown by
McDonald's 2021. Exact reviewed manifests remain necessary.

## Next Repair Order

1. Repair scheduled selection and test default-public Pokemon versus hidden
   games/sets, without changing production release controls.
2. Prepare bounded, source-backed printing admission for Pitch Black, Classic
   Collection and trainer kits; reconcile the 33 historical finish candidates.
3. Freeze an identity repair package for 60 missing printing GV-IDs. Adjudicate
   the 25 prefix mismatches separately. Preserve row IDs and dependencies.
4. Work through special-product, Japanese and One Piece coverage under their
   own identity/source contracts. Do not bulk-create guessed Normal rows.

No backfill, rename, approval, quarantine, deployment or production write was
performed by this retrospective audit.
