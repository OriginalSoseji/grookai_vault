# Pricing Checkpoint 78: One Piece Complete Staging Applied

## Current Truth

The complete frozen English TCGPlayer One Piece source manifest is now stored
in production as immutable, service-only staging evidence.

- New immutable batches: `83`
- New immutable staging rows: `7,261`
- Total immutable batches, including the historical ST-01 proof: `84`
- Total immutable staging rows, including the historical ST-01 proof: `7,282`
- Exact single-card candidates preserved: `6,852`
- Numbered-card candidates preserved: `6,627`
- DON!! candidates preserved: `225`
- Sealed-product candidates preserved: `403`
- Ambiguous quarantines preserved: `6`
- Future or presale holds preserved: `82`
- Source price lanes preserved: `7,053`

The warehouse contains `84` active source groups, while the manifest contains
products in `83` groups. The remaining group is source group `24775`,
`The World's Strongest Warriors Release Event Cards`, with zero source
products. It is recorded as a coverage diagnostic rather than represented by
an invalid empty staging batch.

## Frozen Producer And Authority

- Branch: `agent/one-piece-ingestion-readiness-v1`
- Exact apply producer SHA:
  `4b42a484063ecc532d2392c706a365d165c5ecc7`
- Source manifest logical SHA-256:
  `4cf38876576da399747dc8d5d0925c143812f89ecf4a75e6f9ced7a220828824`
- Source manifest compressed SHA-256:
  `973bec5c186adc8853dcff91218e1057772aea384f9a3318919fb03b9c39bc0e`
- Frozen plan fingerprint:
  `80bb5b09f654fcc403a34f21655f2840d1a72beb98cd71f1287934626ba029ad`
- Release payload fingerprint:
  `890b5d0c3a3a2f9d842e280baec1323b3d780d78565c40ebd10dba04e78787fc`
- Production preflight fingerprint:
  `0385f61e0d1551edb616b348f92cf7952dc0c36644847c2239c8fa921260eb62`

## Proof Chain

The production preflight proved:

- zero proposed batch-ID collisions;
- zero proposed batch-fingerprint collisions;
- zero proposed staging-row-ID collisions;
- exact source payload-hash coverage for all `7,261` products;
- exact forced-RLS, grant, policy, trigger, and migration-ledger state;
- the expected `21` historical ST-01 source-product overlaps;
- no public or application visibility.

The representative rollback canary exercised three groups and `1,382` rows,
including the largest promotion group, future holds, sealed products, and
quarantines. It produced exact transaction-local readback and then proved:

- durable batch delta: `0`;
- durable staging-row delta: `0`;
- protected-domain findings: `0`.

The durable transaction then inserted exactly `83` batches and `7,261` rows.
The transaction-local and fresh readbacks both passed with zero findings. A
separate read-only verifier reproduced exact selected-batch, selected-row, and
source-product-ID hashes.

## Artifact Hashes

- Frozen plan summary SHA-256:
  `43abe76f1c7af0d2e6631fa0303bc7b14ecede9d1322ec21343ef838882b4da5`
- Production preflight summary SHA-256:
  `effead276c14d344acef614ed6e4fda7f60e84e318fb89dcdaa97aae901745cf`
- Rollback canary summary SHA-256:
  `6954de4ec3494ed6113278de29eb4bfbef75b1ea124e0315cb6864b199a3faa0`
- Durable apply summary SHA-256:
  `7cdcf41bc3944ec7ac00e736d3b019ac1ffdfc11ac27b94b07a237cd2616f4d0`
- Independent verifier summary SHA-256:
  `35ef83b826c52e09c14025599eeade2b8f093336f13f8ac399cd746b3495e762`

## Security And Visibility

The One Piece release remains `hidden`.

- Anonymous visibility: `false`
- Authenticated visibility: `false`
- Service-role application visibility: `false`
- App-role staging grants: none
- Service-role staging grants: `SELECT`, `INSERT` only
- Staging update/delete/truncate authority: none
- Immutable update/delete triggers: active

## Invariants

- Staging evidence grants no canonical identity or publication authority.
- Every staged row remains tied to its exact source payload and payload hash.
- Numbered cards, DON!! cards, sealed products, quarantines, and future holds
  remain separate lanes.
- The six ambiguous products remain quarantined.
- The `82` future or presale products remain held.
- Source price lanes remain evidence and are not published prices.
- External image references remain source evidence, not self-hosted pointers.
- Existing ST-01 canonical cards and printings were not rewritten.
- No canonical card, set, printing, mapping, sealed-catalog, Storage,
  image-pointer, pricing, publication, Vault, Pokemon, Japanese, or MTG write
  occurred in this gate.

## Artifacts

`docs/audits/pricing/one_piece_complete_staging_release_v1/`

The directory contains the frozen plan, batch index, read-only production
preflight, representative rollback proof, durable transaction proof, fresh
writer readback, independent read-only readback, reports, and hash manifests.

## Exact Next Gate

Build a complete offline canonical reconciliation from this exact staged
release. The reconciliation must:

1. promote only current, exact numbered-card candidates through a separately
   reviewed parent-identity lane;
2. preserve DON!! cards in their own identity lane;
3. preserve sealed products for the separate sealed catalog;
4. keep all `82` future/presale rows held and all six ambiguous rows
   quarantined;
5. reconcile existing ST-01 canonical identities and exact TCGPlayer mappings
   without duplicate insertion or mutation;
6. define exact set identity, parent identity, source evidence, and mapping
   payloads before any database write;
7. pass collision, duplicate-identity, source-ownership, rollback, and hidden
   visibility proofs before a bulk canonical apply.

One Piece must remain hidden until canonical identity, printing, image,
pricing, and client-read contracts are each proven independently.
