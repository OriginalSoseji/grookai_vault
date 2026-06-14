# PKG-08N Parent Identity Backfill Real Apply V1

Real apply for the approved Call of Legends SL parent identity backfill package.

| Field | Value |
| --- | --- |
| apply_status | pkg08n_parent_identity_backfill_real_apply_committed |
| package_id | PKG-08N-PARENT-IDENTITY-BACKFILL |
| package_fingerprint_sha256 | `6401517a347571d92a766178f17c1dfc98dc45f31740802f9cdf6796f56464cf` |
| committed | true |
| parent_rows_updated | 6 |
| child_rows_written | 0 |
| delete_rows | 0 |
| migrations_created | false |
| unsupported_cleanup_performed | false |
| stop_findings | 0 |

| set | number | number_plain | modifier | card | parent |
| --- | --- | --- | --- | --- | --- |
| col1 | SL11 | 11 | number_prefix:SL | Suicune | 29014612-f4fe-4e93-b495-93259ccbacab |
| col1 | SL2 | 2 | number_prefix:SL | Dialga | b99eb073-791d-4f94-9dc9-199b97c2df9a |
| col1 | SL3 | 3 | number_prefix:SL | Entei | 3cb50761-3241-4b26-9145-746736670098 |
| col1 | SL4 | 4 | number_prefix:SL | Groudon | 8a8ba5d1-eac0-4bc8-9c75-ed955b9de177 |
| col1 | SL7 | 7 | number_prefix:SL | Lugia | 65a51be9-0633-4ca2-b6cb-b94f7c42848a |
| col1 | SL9 | 9 | number_prefix:SL | Raikou | ed0104d5-30a4-444e-85da-4458ed8196e2 |

## Safety Boundary

- Only parent identity fields were updated.
- No child writes, deletes, merges, unsupported cleanup, migrations, or global apply were performed.
- printed_identity_modifier=number_prefix:SL keeps SL cards distinct from numeric Call of Legends checklist cards.
