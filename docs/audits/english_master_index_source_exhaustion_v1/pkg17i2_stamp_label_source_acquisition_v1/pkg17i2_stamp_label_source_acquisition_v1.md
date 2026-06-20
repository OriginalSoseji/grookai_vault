# PKG-17I2 Stamp Label Source Acquisition V1

Audit-only mining pass for rows where Grookai has generic stamped evidence but lacks an exact stamp label.

## Safety

- audit_only: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- write_ready_now: 0

## Summary

- target_rows: 178
- candidate_external_exact_label_found: 0
- candidate_internal_checkpoint_label_found: 6
- blocked_conflicting_candidate_labels: 5
- blocked_no_candidate_label_found: 167
- fingerprint_sha256: `ac0aef7a548ad1c69d0409dffb1598c6d99564f7af3f46615bbf2dc337b57238`

## Status Counts

| status | rows |
| --- | --- |
| blocked_no_candidate_label_found | 167 |
| candidate_internal_checkpoint_label_found | 6 |
| blocked_conflicting_candidate_labels | 5 |

## Source Families Seen

| source_family | candidate rows |
| --- | --- |
| warehouse_checkpoint | 49 |

## Top Sets

| set | rows |
| --- | --- |
| svp | 26 |
| sv02 | 18 |
| sv09 | 11 |
| dp2 | 9 |
| dp1 | 7 |
| sv05 | 7 |
| bwp | 6 |
| col1 | 6 |
| dp5 | 6 |
| g1 | 6 |
| mep | 6 |
| bw1 | 4 |
| sm1 | 4 |
| sv07 | 4 |
| dp4 | 3 |
| sm12 | 3 |
| sm4 | 3 |
| smp | 3 |
| swsh6 | 3 |
| swsh7 | 3 |

## Candidate Label Rows

| set | number | card | finish | status | candidate labels | external sources |
| --- | --- | --- | --- | --- | --- | --- |
| bwp | BW29 | Victory Cup |  | blocked_conflicting_candidate_labels | Battle Road Autumn 2011 3rd Place Stamp, Battle Road Autumn 2012 3rd Place Stamp, Battle Road Spring 2012 3rd Place Stamp, Battle Road Spring 2013 3rd Place Stamp | 0 |
| bwp | BW30 | Victory Cup |  | blocked_conflicting_candidate_labels | Battle Road Autumn 2011 2nd Place Stamp, Battle Road Autumn 2012 2nd Place Stamp, Battle Road Spring 2012 2nd Place Stamp, Battle Road Spring 2013 2nd Place Stamp | 0 |
| bwp | BW31 | Victory Cup |  | blocked_conflicting_candidate_labels | Battle Road Autumn 2011 1st Place Stamp, Battle Road Autumn 2012 1st Place Stamp, Battle Road Spring 2012 1st Place Stamp, Battle Road Spring 2013 1st Place Stamp | 0 |
| bwp | BW53 | Flygon |  | blocked_conflicting_candidate_labels | Prerelease Stamp, Staff Prerelease Stamp | 0 |
| bwp | BW84 | Porygon-Z |  | blocked_conflicting_candidate_labels | Prerelease Stamp, Staff Prerelease Stamp | 0 |
| smp | SM199 | Psyduck |  | candidate_internal_checkpoint_label_found | Detective Pikachu Stamp | 0 |
| smp | SM200 | Snubbull |  | candidate_internal_checkpoint_label_found | Detective Pikachu Stamp | 0 |
| sv02 | 135 | Tyranitar |  | candidate_internal_checkpoint_label_found | Paldea Evolved Stamp | 0 |
| sv07 | 119 | Bouffalant |  | candidate_internal_checkpoint_label_found | Play! Pokémon Stamp | 0 |
| sv10 | 20 | Team Rocket's Spidops |  | candidate_internal_checkpoint_label_found | Play! Pokémon Stamp | 0 |
| me01 | 104 | Mega Kangaskhan ex |  | candidate_internal_checkpoint_label_found | Play! Pokémon Stamp | 0 |

## Rule

This report does not promote rows. Candidate labels from prior artifacts must become a separate readiness package with explicit source URLs, evidence labels, rollback-only dry-run, fingerprint, and approval before any write.
