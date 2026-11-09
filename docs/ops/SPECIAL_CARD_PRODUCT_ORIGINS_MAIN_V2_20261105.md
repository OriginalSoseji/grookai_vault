# Fresh-main Eevee and Snorlax content integration

Status: local candidate, verified with focused checks; the user approved the
exact 20-file local staging/commit allowlist by continuing with “Next step”
after its explicit approval request. Merge and deployment remain unapproved.
The original content release remains preserved at
`d48ea00792787ca548c6d885a29bdf7fb128c7d2`.

## Result

The existing web/mobile origin section receives the same four reviewed product
descriptions for unstamped and Pokémon Center Eevee SVP 173 and Snorlax SVP 051.
The descriptions and sources are unchanged from the [V1 review](SPECIAL_CARD_PRODUCT_ORIGINS_V1_20261105.md).
All 3,326 other row references remain intact. The current stored parent images
already match; no image replacement or child-finish certification is proposed.

Current main has 18 lowercase `grookai` corrections in its generated mobile
origin data that are absent from its generated web data. Replacing that mobile
file with the original branch output would undo those fixes. V2 preserves each
exact mobile string and applies the same brand-only correction to the web data.
All 54 existing mobile family definitions remain unchanged. The only existing
web family edits are the 18 recorded `grookai_rule` casing corrections; product
facts, source URLs and collecting claims remain unchanged.

## Authority and preservation

The latest fetched authority is `3bf51e8404f9052103b165922c385a06ee3f0316`.
The first isolated candidate used `2141c0ecc64f05e262821b0ef9c7fbed36006b9e`.
When main advanced, that worktree and its changes were retained, then carried
into a new checkout based on the newer SHA. Relevant data, lookup code,
dependencies and mobile generation code did not change between those authorities.

Current checkout: `C:/gv_special_card_product_origins_main_refresh_20261105`.
Branch: `integration/special-card-product-origins-refresh-20261105`.
The earlier candidate remains at `C:/gv_special_card_product_origins_main_20261105`.
The committed V1 source checkout remains clean and untouched. The dirty shared
checkout was not reset, stashed, cleaned, rebased or mass-staged.

Only this content capability is transplanted. The original branch's pricing
worker ancestors are excluded. The current-main operator playbook is retained
and receives this entry rather than being replaced with the older playbook.
The original V1 audit packet, audit hashes and historical verification receipts
retain their committed bytes; a separate V2 integration review records the new
authority and the 18 preserved corrections. The source commit is the recovery
point for the original work, and the pinned main SHA is the integration baseline.

This is a bounded content integration, not a restart or completion claim for
the repository-wide reconciliation/parity project. No schema, route, workflow,
production pricing, identity, ownership, database or Storage change is included.

## Regeneration

```powershell
node scripts/audits/export_special_card_etb_origins_v2.mjs
node scripts/audits/export_variant_origin_mobile_data_v1.mjs
```

V2 calls the unchanged V1 exporter through an exact reversible projection, then
preserves the recorded current-main brand corrections. The V1 packet and its
baseline hash are not edited to force acceptance. The compatibility projection
must recover the exact original V1 fingerprint. A non-brand text change, drift
in a preserved main string, modified source packet or unexpected baseline fails.
Regeneration is deterministic and repeated runs produce identical data.
Use V2 for this integrated tree; the archived V1-only invocation is historical.

## Verification and next gate

19 focused Node contracts, 11 Flutter tests including the brand contracts,
focused Flutter analysis and web typechecking pass. The actual web resolver and
explanation builder return the four product descriptions, native UUID/GV-ID
lookups agree, and the complete generated mobile/web payloads match. The
preservation comparison verifies every retained current-main family and row.

The exact 20-file integration allowlist is recorded under
`docs/audits/special_card_product_origins_main_v2_20261105/release_allowlist.txt`.
The exact local staging/commit paths are approved; use the normal managed commit
hook. The full release hook has not run for this integration tree. Hosted CI,
reviewed merge, deployment and native distribution are later gates, with a fresh
main-authority check before merge. Do not deploy an old source checkout wholesale.

The completed 279-row source-owner repair and active Gengar price suppression
remain unchanged. This content lane cannot clear that suppression or create the
separate ordinary Fennekin mapping. The broader STAFF, retailer, promo and error
inventory remains outside this first four-card content batch.
