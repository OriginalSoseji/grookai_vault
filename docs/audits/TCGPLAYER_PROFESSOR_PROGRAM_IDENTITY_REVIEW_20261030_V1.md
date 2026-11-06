# TCGPlayer Professor Program identity review — October 30, 2026

## Outcome

The 48 blocked products in TCGPlayer group `2332`, `Professor Program Promos`,
contain **zero mapping-ready products**. All 48 remain explicit holds. The
machine-readable adjudication is
[`tcgplayer_professor_program_identity_review_20261030_v1.json`](tcgplayer_professor_program_identity_review_20261030_v1.json).

| Hold reason | Products |
| --- | ---: |
| Energy/event number has no unique underlying set identity | 16 |
| Top 8 or Finalist is an identity-bearing event qualifier | 2 |
| Unique card and stamp evidence exist, but no distinct live Professor Program parent/child link is proven | 8 |
| No exact Master Index name, number, and printed-total match | 5 |
| Professor Program stamp is not proven by the current Master Index row | 17 |

The eight catalog-identity-first rows are TCGPlayer products `176629`, `176630`,
`176631`, `176632`, `176633`, `176638`, `213516`, and `499366`. Their ordinary
set/card identities are uniquely resolved, but an ordinary parent must never be
used as a substitute for the stamped physical identity.

## Safety finding

TCGPlayer's group label is useful routing evidence, not set authority. Its price
subtype is finish-selection evidence only and cannot create a stamped parent or
child. A Professor Program product may enter the exact mapping planner only
after a current catalog audit proves one distinct parent with
`variant_key=professor_program_stamp`, the same printed identity modifier, and
one active verified child matching the source finish.

The older Grookai audit used here does not carry those variant fields. A unique
ordinary parent in that file therefore remains a hold, not an authority
candidate. The report performs no database reads or writes and grants no
catalog, mapping, pricing, publication, or customer-state mutation authority.

## Reproduction

Run the audit against the exact production planner's `blocked.jsonl` artifact:

```powershell
node scripts/audits/tcgplayer_professor_program_identity_review_v1.mjs `
  --blocked=<exact-mapping-plan>/blocked.jsonl `
  --out=<new-output-path>.json
```

The checked-in report freezes SHA-256 hashes for the blocked source, Master
Index sets/cards/printings, and Grookai reconciliation audit. The command fails
if group identity drifts, the source count is not exactly 48, a product ID is
duplicated, an argument is missing or repeated, or the output already exists.
