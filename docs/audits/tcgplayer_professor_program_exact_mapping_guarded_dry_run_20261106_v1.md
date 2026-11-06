# TCGPlayer Professor Program Exact Mapping Guarded Dry Run V1

## Outcome

The production rollback rehearsal passed for exactly seven Professor Program
TCGPlayer products. The rehearsal acquired the shared exact-mapping advisory
lock, revalidated the current source sync and live canonical targets, inserted
seven transient `external_mappings` rows inside one serializable transaction,
read them back, and acknowledged `ROLLBACK`.

An independent production connection then found the same empty mapping snapshot
as before the rehearsal:

- package: `TCGPLAYER-PROFESSOR-PROGRAM-EXACT-MAPPING-V1`
- source commit: `ea15d95e9d09bb37943c07a4049e79b8486fa7d2`
- package fingerprint: `6b977b88eccc59a959701f64f5189eeb7ad31787261ea285c5108cecbca4eda9`
- candidate artifact: `49e845552c5b34650ade6e4b78b558e71d7e9d3a86c15a69163c2b4a981df957`
- Master Index mapping authority: `c4cd22441ec233c9c89ee29ff3177c4051cab7b03eff7b51584d10770e3f6784`
- batch fingerprint: `07f29b3b6e022ab16f2c03589c2e3b76da9eb77086ec63f826476ccf94977d37`
- before/after rollback hash: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- durable database writes: `0`

The exact products are `176629`, `176630`, `176631`, `176632`, `176633`,
`213516`, and `499366`. Professor Sycamore product `176638` remains held because
its source requires Reverse Holofoil while the current Professor Program parent
has only a Holo child.

The machine-readable plan, reviewed evidence bundle, and rollback receipt are in
[`pricing/tcgplayer_professor_program_exact_mapping_20261106_v1`](pricing/tcgplayer_professor_program_exact_mapping_20261106_v1).

## Approval boundary

The rehearsal grants no durable execution authority. A real apply requires the
following exact separate founder approval:

> Approve real TCGPLAYER-PROFESSOR-PROGRAM-EXACT-MAPPING-V1 apply only. Source commit: ea15d95e9d09bb37943c07a4049e79b8486fa7d2. Fingerprint: 6b977b88eccc59a959701f64f5189eeb7ad31787261ea285c5108cecbca4eda9. Scope: 7 insert-only active TCGPlayer parent mappings for Professor Program products 176629, 176630, 176631, 176632, 176633, 213516, 499366. Dry-run rollback proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. Excludes Professor Sycamore product 176638. No pricing writes. No publication writes. No parent, identity, or printing writes. No deletes. No merges. No migrations.
