# MTG Sealed World V1 Forward Gate

Date: 2026-09-03

Status: `READ-ONLY GATES PASSED - PRODUCTION WRITES NOT AUTHORIZED`

## Producer

- Branch authority: `main`
- Producer SHA: `515ce390f4c0c47383a5e59d7b0c65d7e778c05d`
- Migration: `20260903130000_sealed_product_per_game_release_v2.sql`
- Migration SHA-256: `630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6`

## Migration History Repair

The migration was originally committed as `20260816170000` but remained
unapplied after newer production migrations entered the ledger. PR #397
retimestamped that still-unapplied file to `20260903130000`, preserved its
schema statements, removed every `--include-all` use, and added a remote ledger
inspection before migration operations.

No applied migration was edited, renamed, deleted, or replayed.

## Live Read-Only Proof

GitHub run `33756902964` executed against the exact producer SHA. It proved:

- no remote-only migration rows;
- latest remote migration `20260901190000`;
- exactly one local-only migration, `20260903130000`;
- ordinary `supabase db push --dry-run` would apply only that migration;
- no `--include-all` bypass;
- zero database writes.

GitHub artifact digest:
`sha256:1fbb63bc88f77e3417f397d70d41732300a0112434848c74bd0865451cf399b0`.
The CLI-formatted ledger transcript is stored byte-for-byte as
`migration_list.txt.gz`; its uncompressed SHA-256 is
`830b90748d8fd45069df12309b8c0d2931f993896fc69602a3a02f7f7efa4eac`.

## Frozen MTG Plan

GitHub run `33757112453` froze the live plan from the same producer SHA:

- plan fingerprint: `ed336dd1cbf442f1788a9d889d3b3d2b5a643e5f1c3b9cb39220f129542b8bae`;
- source fingerprint: `4930912401798650fee813993ca9e588b198cc1fc8d259e0aeb71e72d9f805af`;
- source rows: 117,484;
- candidate price products: 2,923;
- candidates/variants/reviews/mappings: 2,904 each;
- families: 237;
- evidence rows: 14,070;
- qualifications: 2,779;
- qualification holds: 144;
- fresh exact release members: 2,182;
- blocked missing price: 480;
- blocked stale: 117;
- releases: 1.

GitHub artifact digest:
`sha256:62b160fb57c03dcd02184f58727e5f5ecb3be9dd8513e519d78aa7315770dc8c`.

## Boundaries

Both runs committed zero database writes. They performed no card, Storage,
Vault, catalog release-control, One Piece, pricing publication, or visibility
mutation. Anonymous and pre-release authenticated visibility remain false.

## Exact Next Gate

Obtain explicit production authority for applying only migration
`20260903130000_sealed_product_per_game_release_v2.sql` at SHA-256
`630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6`.

After migration apply and independent schema/security readback, regenerate the
live plan because production source rows can change. Then run preflight, the
full rollback canary, a separately authorized durable MTG sealed-world apply,
and independent readback. Do not treat this frozen plan as durable write
authority.
