# Pokémon TCGPlayer Identity Repair — October 12, 2026

Status: batch 01 is source-reviewed and production dry-run verified. No database
or pricing publication write has occurred.

## Why pricing is incomplete

The runtime control plane measured whether jobs ran and reconciled their bounded
outputs. It did not own the outcome that every selected source observation had a
published price. PR622 added six explicit completion lanes and a zero-backlog
rule for each lane.

The current production pricing audit has 208,458 selected observations and
165,591 published snapshots. The 42,867-row gap is partitioned exactly by first
blocking reason:

| First blocking reason | Rows |
|---|---:|
| Missing identity mapping | 30,897 |
| Missing catalog evidence | 7,424 |
| Missing exact printing | 1,868 |
| No positive source price | 1,685 |
| Missing finish assignment | 601 |
| Unsupported special variant | 392 |

The missing-identity queue is routed to four owners instead of one generic
agent: ordinary Magic (19,221 rows), Pokémon special variants (6,112), Pokémon
unsupported products (3,657), ordinary Pokémon (1,037), and Magic unsupported
products (870). Unsupported Pokémon and Magic products share one triage owner.

## Batch 01

The immutable batch is under
`docs/audits/pricing/pokemon_tcgplayer_identity_repair_20261012/batch_01`.
It selects five existing English Pokémon parents and covers seven missing-price
observations:

| TCGPlayer product | Canonical target | Set | Gap rows |
|---:|---|---|---:|
| 85720 | GV-PK-G2-75 | gym2 | 2 |
| 85721 | GV-PK-G2-76 | gym2 | 2 |
| 214239 | GV-PK-PR-SW-SWSH028 | swshp | 1 |
| 654596 | GV-PK-MEP-002 | mep | 1 |
| 654598 | GV-PK-MEP-004 | mep | 1 |

The package binds the selected candidate fingerprints, existing parent UUIDs,
reviewed printing evidence, raw TCGCSV group payloads, raw TCGdex card payloads,
and three source-adjudication records. The reviews explicitly state that they do
not authorize execution.

Key bindings:

- selected candidate SHA-256:
  `2c6854328b6533c2c792a0f49f9d1806fa27a68a2e9195502433e1abd308cb76`
- Master authority SHA-256:
  `bdc16ba4bf7a6ece6c011400d166f021a0ade1af8e8389e32f2cef612f14d176`
- authority fingerprint:
  `ebbf7848ee4f37e51380779f541b1678e1e3ea52b222064b9e3726898226156b`
- batch fingerprint:
  `f3a7a859cc4ab87df189a2b694ca69844214159a505031a5c21597aec090e4bd`

## Production dry-run

Read-only maintenance run `feb795e8-5fd2-498d-8168-d7fbb46b48a8` passed on
2026-10-12. It verified:

- the current full source sync completed with zero failures;
- all five source products are active and current;
- all five canonical targets match the frozen raw identities;
- every target has exactly one active standard identity and no TCGPlayer mapping;
- there is no active publication overlap;
- the read-only transaction rolled back with an acknowledged rollback;
- database, publication and customer-state writes were all zero.

The first attempts stopped safely before any query: the saved environment used
the direct database host, then the pooler rejected the connection until its CA
was supplied. The official Supabase Root 2021 CA was downloaded from the live
project Database Settings page. The retained operator copy is
`C:/grookai_vault_operator_artifacts/pokemon_pricing_repair_20261012/tls/prod-ca-2021.crt`
with SHA-256
`700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`.
Use it through `NODE_EXTRA_CA_CERTS`; never disable certificate verification.

The full dry-run receipt remains under the ignored operator artifact tree:
`artifacts/pokemon_tcgplayer_identity_repair_20261012/batch_01/dry_run/2026-10-12T07-19-42-206Z_dry_run_feb795e8-5fd2-498d-8168-d7fbb46b48a8`.

## Next gate

Commit and review the immutable batch. A production apply must use the exact
committed source, hashes above, a five-row limit, the governing maintenance
launcher, and a new explicit founder approval for this exact batch. The apply is
insert-only and must be followed by independent mapping readback.

Mapping does not itself publish prices. After a successful mapping apply, run a
fresh pricing backlog audit, resolve any remaining finish or price-policy holds,
then use the separate governed shadow/reconciliation/publication path. Never
claim these seven observations are priced solely because their parent mappings
exist.
