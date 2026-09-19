# Prismatic Master Corroboration

Date: September 19, 2026. Status: staged master refresh verified; not deployed
and not applied to production database. Full database repair remains open.

## Repair

The TCGCollector finish reader discarded the accent in Poke Ball incorrectly,
turning the source label into `pok ball` rather than recognizing `pokeball`.
The reader now folds accents for finish labels only, preserving raw labels and
card/set identities. Pokeball and Masterball claims also require the source DTO
to explicitly be generic, unqualified, not first edition, and not combined.
Other finish lanes were not relabeled. Imports no longer execute the fetch CLI.

Existing captured Prismatic HTML supplies exact second-source corroboration for
95 Pokeball and 67 Masterball facts. A new additive fixture preserves card URLs,
original labels, capture hash, exact card/variant IDs and retrieval timestamp.
The older workbook and TCGCollector fixtures are unchanged. Compressed original
HTML lives in `source_snapshots/prismatic_tcgcollector_20260919.html.gz`.

Five records remain held, not guessed or renamed: Professor's Research numbers
122-125 with named professor qualifiers, and the workbook's `Bindin Mochi` at
095. Two differently named sources are not silently treated as identical.

## Verification

32 contracts pass across accent/source replay, source independence, Prize Pack
scope and source-backed finish profiles, including Ascended Heroes. Captured
HTML replays the exact 162 facts. Duplicate copies of TCGCollector evidence
cannot satisfy the two-authority rule. Five unmatched names remain single-source.

The existing master refresh CLI ran in isolated operator staging against merged
authority `a0b202b9dce6d6aac1f01d6ab5e86b69f4fe7351`. It changed exactly 162
evidence/status records and preserved all 40,656 printing coordinates. Card
identity, finish, finish absence, set, conflict and manual-review records did not
change. All alias records remain intact; the per-refresh historical carry-forward
diagnostic becomes zero because the candidate already contains all aliases.
Repeat plan reports `changed: false`.

The dirty implementation worktree has an older master snapshot with 468 evidence
differences from merged authority. The checksum guard stopped the initial refresh
before writes. The staged refresh uses merged authority instead; never publish
the older worktree snapshot as a replacement for current main.

## Artifacts And Next Action

Root: `C:/grookai_vault_operator_artifacts/retrospective_printing_audit_20260917/`.

- `prismatic-master-corroboration-v1.json`: source-bound delta and five held facts.
- `prismatic-master-refresh-v1/before/`: unchanged merged authority.
- `prismatic-master-refresh-v1/refreshed-master/`: verified updated authority.
- `prismatic-master-refresh-v1/reconciliation.json`: exact preservation/hashes.
- `prismatic-master-refresh-v1/repeat/refresh_plan.json`: unchanged second plan.

Release the source/parser and data-only master delta without overwriting newer
main changes, then build fresh production manifests from that authority. Preserve
all siblings and current dependencies; use rollback/apply/readback/zero-write
repeat. Do not claim these 162 as production repairs yet or subtract them from
the current 1,811 production provenance backlog. Existing V74 receipts remain
the production truth. All database-wide, runtime and collector obligations stay
active; no paid AI or new production writes occurred in this evidence step.
