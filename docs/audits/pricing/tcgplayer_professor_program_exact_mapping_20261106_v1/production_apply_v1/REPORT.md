# TCGPlayer Professor Program exact mapping production apply V1

Status: **passed**

The approved `TCGPLAYER-PROFESSOR-PROGRAM-EXACT-MAPPING-V1` package was applied to production on 2026-11-06. The guarded transaction committed seven insert-only active TCGPlayer parent mappings and its immediate readback returned the same seven rows.

## Bound authority

- Approved package fingerprint: `6b977b88eccc59a959701f64f5189eeb7ad31787261ea285c5108cecbca4eda9`
- Source plan commit: `ea15d95e9d09bb37943c07a4049e79b8486fa7d2`
- Producing commit: `5d1f261c339fa647771e43ab56df06a7c0c3688a`
- Candidate artifact SHA-256: `49e845552c5b34650ade6e4b78b558e71d7e9d3a86c15a69163c2b4a981df957`
- Master authority SHA-256: `92628190d14a1c7c0a962bcdc9e4664b4b75d05fb0faa703b4ab6960b82d8b9c`
- Dry-run rollback proof: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` before and after rollback

## Production result

- Maintenance run: `299090b7-3d1f-4e89-a9ed-4b76751e231a`
- Batch fingerprint: `07f29b3b6e022ab16f2c03589c2e3b76da9eb77086ec63f826476ccf94977d37`
- Inserted and committed: 7
- Immediate transaction readback: 7
- Independent post-commit readback: 7
- Products mapped: `176629`, `176630`, `176631`, `176632`, `176633`, `213516`, `499366`
- Excluded product `176638` active mapping count: 0
- Active publication overlap: 0
- Pricing writes: 0
- Publication writes: 0
- Parent, identity, and printing writes: 0
- Deletes, merges, and migrations: 0

The independent readback used a separate read-only PostgreSQL session with the repository-pinned Supabase certificate chain. It verified the seven mapping IDs and targets, candidate and master-authority provenance, the held product exclusion, and the absence of current-publication overlap.

`rollback_manifest.json` is the exact recovery manifest for the seven inserted mapping IDs. No rollback was required.
