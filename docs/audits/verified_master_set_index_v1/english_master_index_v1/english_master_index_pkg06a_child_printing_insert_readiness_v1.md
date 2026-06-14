# PKG-06A Existing-Parent Child Printing Insert Readiness V1

This is a read-only classifier. It does not execute apply, create SQL artifacts, create migrations, delete rows, merge rows, run cleanup, or mutate canonical truth.

## Safety

- audit_only: true
- db_reads_performed: true
- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- apply_paths_executed: false
- write_ready_now: 0

## Summary

- package_id: PKG-06A-EXISTING-PARENT-CHILD-PRINTING-INSERTS
- package_fingerprint_sha256: `dd24c520e03d1f0de308ad73fe039ac35fa4491da8e9d52aa2b05b55423f1d4c`
- live_read_available: true
- live_parent_printing_rows_read: 58305
- master_verified_printings_classified: 38841
- eligible_child_printing_insert_only: 0
- recommended_bucket_sets: 0
- recommended_bucket_child_printing_inserts: 0
- write_ready_now: 0

## Classification Counts

| classification | count |
| --- | --- |
| already_present_in_grookai | 35538 |
| blocked_finish_taxonomy_not_child_ready | 2443 |
| blocked_parent_missing_or_alias_unresolved | 816 |
| blocked_multiple_parent_matches | 44 |

## Recommended Readiness Bucket

No child-only insert bucket selected.

## Top Remaining Blocked Or Missing Sets

| set_key | set_name | rows |
| --- | --- | --- |
| swsh4.5 | Shining Fates | 150 |
| gym1 | Gym Heroes | 134 |
| gym2 | Gym Challenge | 133 |
| neo4 | Neo Destiny | 114 |
| neo1 | Neo Genesis | 111 |
| base1 | Base | 103 |
| sm115 | Hidden Fates | 103 |
| base5 | Team Rocket | 86 |
| mep | MEP Black Star Promos | 85 |
| svp | Scarlet & Violet Black Star Promos | 79 |
| swsh9 | Brilliant Stars | 77 |
| neo2 | Neo Discovery | 75 |
| swsh11 | Lost Origin | 72 |
| swsh12pt5gg | Crown Zenith Galarian Gallery | 70 |
| swsh10 | Astral Radiance | 67 |
| base2 | Jungle | 66 |
| neo3 | Neo Revelation | 66 |
| base3 | Fossil | 64 |
| smp | SM Black Star Promos | 64 |
| swsh12 | Silver Tempest | 58 |
| swshp | SWSH Black Star Promos | 49 |
| sv02 | Paldea Evolved | 48 |
| swsh7 | Evolving Skies | 47 |
| swsh6 | Chilling Reign | 41 |
| swsh8 | Fusion Strike | 41 |
| sv05 | Temporal Forces | 40 |
| sv10 | Destined Rivals | 40 |
| sve | Scarlet & Violet Energies | 39 |
| swsh1 | Sword & Shield | 38 |
| swsh5 | Battle Styles | 35 |
| bw11 | Legendary Treasures | 33 |
| me01 | Mega Evolution | 32 |
| bw1 | Black & White | 31 |
| pl2 | Rising Rivals | 30 |
| col1 | Call of Legends | 28 |
| exu | Unseen Forces Unown Collection | 28 |
| sv09 | Journey Together | 27 |
| swsh3 | Darkness Ablaze | 26 |
| cel25c | Celebrations: Classic Collection | 25 |
| sv08.5 | Prismatic Evolutions | 25 |

## Stop Rules

- Do not execute apply from this report.
- Do not create a SQL artifact from this report without a separate approval boundary.
- Do not mix PKG-05A pending missing-set inserts into PKG-06A.
- Do not insert a child printing unless the finish is active in public.finish_keys and exactly one live parent card_print matches the Master Index set, number, and card name.
- Do not include taxonomy-blocked labels such as first_edition_holo, first_edition_normal, or stamped in child-only insert packages.
- Do not include deletes, merges, unsupported cleanup, parent inserts, or identity modifier work.
- A future PKG-06A dry-run package must create its own fresh snapshot, rollback proof, dry-run transaction artifact, approval fingerprint, and real-apply gate.
