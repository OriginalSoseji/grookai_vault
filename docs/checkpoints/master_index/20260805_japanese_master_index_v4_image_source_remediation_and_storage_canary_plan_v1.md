# Japanese Master Index V4 Image Source Remediation And Storage Canary Plan V1

Date: 2026-08-05

## Context

The Japanese V4 image-acquisition canary validated 70 source images. Seventeen
official-source images met the high-resolution threshold, while 53
minority-source images were only 136 x 189 pixels. This gate investigated
higher-resolution evidence for those 53 rows and prepared a bounded Storage
canary without accessing Storage or the database.

Work ran on branch `catalog/jpn-v4-production-integration-v2`, starting from
commit `9c3cfcd67ed03d07a530b4fc1ded71b011c76337`.

## Problem

The low-resolution Limitless images prove image availability but are not
suitable as the default production or scanner source. Some rows have exact
official Japanese image evidence, some have a full image discoverable from an
already preserved Serebii detail page, and others remain ambiguous or below
the production threshold. Those cases must remain distinct.

Separately, the high-resolution download proof did not establish that the
production Storage bucket permits non-overwriting upload, byte-exact
readback, and reliable rollback. That proof requires a mutation-capable but
strictly fingerprinted future canary.

## Risk

- Matching by English name could select the wrong Japanese card.
- A matching set, number, and printed Japanese name can still return multiple
  official images for distinct source variants.
- A full community-hosted image may be better than its thumbnail but still
  below the product quality threshold.
- A valid HTTP response can contain malformed or non-card image bytes.
- A Storage test could overwrite an existing object or leave orphaned test
  objects if rollback is not mandatory.
- A Storage upload must not silently authorize a database image pointer.

## Decision

### Source Remediation

Use only two evidence lanes:

1. Exact official match on printed set abbreviation, printed number, and
   Japanese printed name, with automatic selection only when exactly one
   official assertion matches.
2. A full image extracted from the exact Serebii detail page already linked by
   the applied row's preserved assertion key and thumbnail URL.

English name alone is never a source-selection key. Multiple official matches
remain review-only unless an independent preserved exact source resolves the
row.

### Storage Canary

Prepare an exact 17-object transient canary from the original official-source
high-resolution sample. The future runner must:

- verify the code bundle, approval fingerprint, and plan hash;
- fetch and stage all 17 exact source byte streams before any Storage call;
- stop before the first upload if any target object already exists;
- upload with `upsert: false` and no overwrite permission;
- download and verify exact hash, size, dimensions, and format;
- remove every object created by the canary;
- verify all 17 target paths are absent after removal;
- perform no database reads, writes, or image-pointer updates.

## Current Truths

### Remediation Scope

- Low-resolution rows evaluated: 53
- Candidate image URLs fetched: 79
- Serebii detail pages fetched: 32
- Candidate fetch exceptions: 0
- High-resolution candidates: 71
- Valid but below high-resolution threshold: 7
- Invalid candidate images: 1
- Database reads/writes: 0 / 0
- Storage reads/writes: 0 / 0

Official identity matching:

- Unique exact official match: 31
- Multiple exact official matches: 8
- No exact official match: 14

Final dispositions:

- Ready high-resolution source: 36
- Review: ambiguous official image: 6
- Review: usable but below high-resolution threshold: 7
- Blocked: invalid higher-resolution source: 1
- Blocked: no higher-resolution exact source: 3

Selected source authority for the 36 ready rows:

- Unique exact official source: 31
- Preserved exact Serebii detail-page source: 5

The seven usable review images are not promoted because they are below the
600 x 825 high-resolution threshold. They remain useful evidence but require
an explicit quality decision or better source.

The six unresolved official ambiguities are:

- Friends in Hisui, S12a 160
- Friends in Sinnoh, S12a 154
- Canceling Cologne, S9a 63
- Sweet Honey, S9a 62
- Trekking Shoes, S12a 137
- Basculegion, S9a 24

The invalid higher-resolution source is Sabrina's Suggestion, SM9 109. The
three rows with no higher-resolution exact source are Unit Energy SM5p 49,
Unit Energy SM5p 50, and Unit Energy SM6 94.

### Storage Plan

- Planned assets: 17
- Source host: `www.pokemon-card.com` for all assets
- Source quality: high for all assets
- Local cache hash and size readback: 17/17
- Supabase project: `ycdxbpibncqcchqiihfz`
- Storage bucket: `user-card-images`
- Existing-object policy: hard stop
- Upsert: false
- Durable objects expected after canary: 0
- Storage access performed in this gate: false
- Database access performed in this gate: false

## Fingerprints

### Source Remediation

- Artifact content:
  `34d55e59a676a0011bac0e4a29a0eea81037b6f60005d1cd805afb569f6db9f5`
- Row dataset:
  `6504c7ea959be66549cf0f9d8d0798d85a244b0e8125ffb9451e3414ebaa6bde`
- Official assertion source:
  `0ce5133d8ea8298e721a0e477dcbd4cd433914eaad00897c67556ca6bdfbcc8e`
- Serebii assertion source:
  `7110fdcc0657fc705b5c1591397c2a08717b5f0359748e72d8d89b22c9762371`

### Storage Canary Plan

- Artifact content:
  `123693d3ef4d7757eacbb6f09c01a949c1096715521112b2050b86e849b57f72`
- Asset dataset:
  `d29053b4d246732876965d307f7f391c0c203d14fe5f86fcf52401aa303fe85a`
- Code bundle:
  `a83f7296fcee737c2c7ef0d59b870c535e271f071add1c98b61e5c84524d586e`
- Approval fingerprint:
  `ef7d4745196a3f670870fa27f7d5b7a4d6609d61beae5889f4d90ea18d8394d7`
- Storage plan hash:
  `0d387055da45e4e1f38cfb2007eb8cb4e175023eb221c6d55391d46d6d6779ae`

## Artifact Hashes

- Source remediation JSON:
  `7b74e0cb5c8e37655c9f135b031b31cef879c9d425752e2efe321650be38365f`
- Source remediation Markdown:
  `0addff10283eadb22506ba74950237ca7ab1f3f8b72c287a23edaa1e9b983788`
- Source remediation row shard:
  `d7c00190333957d08675d1eb205cbd6ef345e811119743929f02505a2d407bd3`
- Storage plan JSON:
  `04d3dd941224802789faf3deca246c6b30b296be0522bd824ef6b1eef7efad1c`
- Storage plan Markdown:
  `9907bd7cc01b2235a6012d1c3334e36c853157265e55bf3fde44355703711154`
- Storage asset row shard:
  `6f8ad815930fe7a0d7ed74c17ea0060835ac99a376f4765bc52d02cac4510a34`

## Verification

- Script syntax checks passed for remediation, plan, and apply runners.
- Focused contracts: 19/19 passed.
- Full Japanese Master Index contracts: 164/164 passed.
- Release secret guard passed.
- `package.json` parsing passed.
- `git diff --check` passed.
- Plan-only apply-runner reconciliation returned the exact frozen fingerprint
  and plan hash with `storage_access_performed: false`.

## Invariants

- Source quality is not identity authority.
- Unique official selection requires exact Japanese printed identity, set, and
  number evidence.
- Multiple official candidates must not be guessed.
- Usable sub-threshold images must not be labeled high resolution.
- Remediation-ready is not Storage-ready until an authorized upload succeeds.
- Storage-ready is not database-pointer approval.
- The transient canary must leave zero durable Storage objects.
- No child printing, family promotion, scanner index, public visibility,
  pricing, vault, English, or non-Japanese data may change.

## Explicit Next Gate

Obtain explicit approval for the transient 17-object Storage canary using the
exact approval fingerprint and plan hash above. The authorized command is:

```text
node scripts/audits/japanese_master_index_v4/image_storage_canary_apply_v1.mjs --apply --fingerprint=ef7d4745196a3f670870fa27f7d5b7a4d6609d61beae5889f4d90ea18d8394d7 --plan-hash=0d387055da45e4e1f38cfb2007eb8cb4e175023eb221c6d55391d46d6d6779ae
```

Stop unless all 17 source images stage, all target paths are initially absent,
all uploads and readbacks verify, all newly created objects are removed, and
all target paths verify absent afterward. Do not update database image
pointers.

After that canary passes, prepare a separately approved permanent Storage
upload package for the 53 currently high-resolution-ready rows: the original
17 plus the 36 remediated rows. Database pointer updates remain a later gate.

## Stop State

Source remediation is complete without guessing: 36 of the 53 low-resolution
rows now have deterministic high-resolution candidates, 13 remain review-only,
and 4 remain blocked. The 17-object transient Storage canary is fully planned
and fingerprinted but has not accessed Storage or the database.
