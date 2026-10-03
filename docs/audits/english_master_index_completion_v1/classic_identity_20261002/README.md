# English Classic identity candidate

All102 identities (34 per deck) qualify from204 exact independent PkmnCards and
Bulbapedia checklist records. `identity-package.json` preserves the fact-level
joins and source hashes; `source_fixtures/classic-identity.json` is compatible with
the existing Master fixture loader. Compressed original HTML is in
`source_snapshots/`; SHA-256 values describe decompressed original bytes.

This candidate is `card_identity_complete_finish_incomplete`. It contains zero
printing facts and does not replace the active Master, admit canonical cards or
authorize production writes. Counts are unique identities; each physical deck
has60 cards because some identities repeat within that deck.

The proposed set keys classic-clv/classic-clc/classic-clb preserve printed
CLV/CLC/CLB separately. MTG owns the globally unique code clb. The source snapshot
does not authorize reassigning that code or any existing identity.

Run `node --test tests/contracts/pokemon_classic_identity_evidence_v1.test.mjs`
to replay the actual bytes and negative cases. Use the offline CLI and the
governing `POKEMON_CLASSIC_IDENTITY_EVIDENCE_V1` contract for a new package.
Before active Master integration, complete finish review, guarded staging,
non-regression and completion exports. Keep database admission as a separate
governed package with fresh transactional collision checks and direct readback.
