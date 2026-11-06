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
- source commit: `926071417ecdc0c69f2c6a3cb3ca74315edf38de`
- package fingerprint: `302c082a0d821c57f1fa0d66630d03adf1bfcd29033a102c59cb0e1480cff521`
- candidate artifact: `49e845552c5b34650ade6e4b78b558e71d7e9d3a86c15a69163c2b4a981df957`
- Master Index mapping authority: `bf303b057f8ad77e148f447dd847f302b543ddab0eec85b808e4085e38a26915`
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

> Approve real TCGPLAYER-PROFESSOR-PROGRAM-EXACT-MAPPING-V1 apply only. Source commit: 926071417ecdc0c69f2c6a3cb3ca74315edf38de. Fingerprint: 302c082a0d821c57f1fa0d66630d03adf1bfcd29033a102c59cb0e1480cff521. Scope: 7 insert-only active TCGPlayer parent mappings for Professor Program products 176629, 176630, 176631, 176632, 176633, 213516, 499366. Dry-run rollback proof: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945 == 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945. Excludes Professor Sycamore product 176638. No pricing writes. No publication writes. No parent, identity, or printing writes. No deletes. No merges. No migrations.
