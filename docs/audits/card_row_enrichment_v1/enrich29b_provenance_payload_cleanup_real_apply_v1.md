# ENRICH-29B Provenance Payload Cleanup Real Apply V1

Package: `ENRICH-29B-PROVENANCE-PAYLOAD-CLEANUP`

## Result

- Pass: true
- Package fingerprint: `12f3937c4b87a1a9e69dea5cc8a77fbf3a09afea3643ecdd004c069117b01aa2`
- Dry-run proof: `b7e61359a442a3b2587f9d0e0f50ac32b1e8e7c88eefbac04f0d6d142d95812d == b7e61359a442a3b2587f9d0e0f50ac32b1e8e7c88eefbac04f0d6d142d95812d`
- Real apply proof: `d74618c0c50c4aef8e6934b8065a7b6d005d1aa3494f5473ec021f9c33887b51`
- Updated rows: 22

## Scope

- Wrote only `card_prints.external_ids->verified_master_index_v1` provenance fields.
- No parent identity writes, child writes, identity writes, external mapping writes, species writes, trait writes, deletes, merges, migrations, image writes, or global apply.

## Updated Rows

| set | number | card | status | urls | sources |
| --- | --- | --- | --- | --- | --- |
| bw5 | 37 | Jolteon | provenance_payload_usable | 2 | 3 |
| bw5 | 84 | Eevee | provenance_payload_usable | 2 | 3 |
| dp1 | 35 | Pachirisu | provenance_payload_usable | 2 | 2 |
| dp1 | 49 | Grotle | provenance_payload_usable | 2 | 2 |
| dp1 | 56 | Monferno | provenance_payload_usable | 2 | 2 |
| dp1 | 58 | Prinplup | provenance_payload_usable | 2 | 2 |
| dp1 | 98 | Shinx | provenance_payload_usable | 2 | 4 |
| dp5 | 56 | Chimchar | provenance_payload_usable | 2 | 2 |
| dp5 | 62 | Eevee | provenance_payload_usable | 2 | 2 |
| dp5 | 70 | Pikachu | provenance_payload_usable | 2 | 2 |
| dp5 | 71 | Piplup | provenance_payload_usable | 2 | 2 |
| dp5 | 77 | Turtwig | provenance_payload_usable | 2 | 2 |
| sm1 | 128 | Professor Kukui | provenance_payload_usable | 2 | 3 |
| sm6 | 105 | Diantha | provenance_payload_usable | 2 | 3 |
| sv02 | 53 | Cetoddle | provenance_payload_usable | 2 | 2 |
| sv02 | 58 | Frigibax | provenance_payload_usable | 2 | 2 |
| swsh7 | 43 | Cryogonal | provenance_payload_usable | 2 | 2 |
| swsh8 | 84 | Snom | provenance_payload_usable | 2 | 2 |
| xy1 | 83 | Honedge | provenance_payload_usable | 2 | 3 |
| xy1 | 84 | Doublade | provenance_payload_usable | 2 | 3 |
| xy10 | 94 | Chaos Tower | provenance_payload_usable | 2 | 3 |
| xy8 | 145 | Parallel City | provenance_payload_usable | 2 | 3 |

## Stop Findings

_None._
