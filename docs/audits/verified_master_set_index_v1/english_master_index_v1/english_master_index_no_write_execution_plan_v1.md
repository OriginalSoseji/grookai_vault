# English Master Index No-Write Execution Plan V1

This is the complete no-write execution plan required before any future write proposal.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false

## Phases

| phase | name | status | outputs/actions |
| --- | --- | --- | --- |
| Phase 0 | Freeze writes and preserve audit baseline | complete_for_audit | read-only reports; source acquisition; manual evidence fixtures |
| Phase 1 | Acquire missing human/checklist evidence | next_required | source research; manual evidence fixtures; report regeneration |
| Phase 2 | Rerun master index and exact-match audits | blocked_until_phase_1 | updated master index facts; updated exact finish matrix; row-level master_verified status; conflict and manual review reports |
| Phase 3 | Generate set-specific dry-run write packages | blocked_until_master_verified | exact row IDs; before/after snapshots; rollback artifact; post-apply verification query plan; operator approval checklist |
| Phase 4 | Write approval gate | not_started |  |

## Priority Source Targets

| set_key | set_name | card_prints | printing_rows | source_aliases | required_evidence |
| --- | --- | --- | --- | --- | --- |
| sv4pt5 | Paldean Fates | 108 | 148 | sv04.5 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| sv6pt5 | Shrouded Fable | 52 | 69 | sv06.5 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| mcd21 | McDonald's Collection 2021 | 25 | 50 | 2021swsh | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| sv8pt5 | Prismatic Evolutions | 180 | 440 | sv08.5 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| pgo | Pokémon GO | 34 | 42 | swsh10.5 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| swsh2 | Rebel Clash | 1 | 2 | swsh2 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| ecard3 | Skyridge | 15 | 19 | ecard3 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| ecard2 | Aquapolis | 13 | 26 | ecard2 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| dp7 | Stormfront | 8 | 10 | dp7 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| pl1 | Platinum | 9 | 10 | pl1 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| svp | Scarlet & Violet Black Star Promos | 73 | 219 | svp | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |
| pl2 | Rising Rivals | 37 | 64 | pl2 | human-readable/checklist card identity evidence; exact card-number finish matrix evidence; second-source confirmation for each finish fact |

## Evidence Rules

- API agreement is not master truth.
- For printing/finish truth, at least one human-readable, official, or checklist-style source is required.
- A recovered source alias does not assign Grookai set identity by itself.
- General finish rules do not prove exact card-level finish facts.
