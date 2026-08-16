# Pricing Checkpoint 49: MTG DSK Hidden Canonical Applied

## Status

The hidden Duskmourn: House of Horror (`dsk`) MTG canonical canary is durably
applied and independently reconciled in production.

The MTG release remains `hidden`. Anonymous and authenticated clients receive
zero MTG catalog rows and zero MTG search rows. No images, Storage objects,
pricing publication, Vault rows, or public release controls were changed.

## Source Scope

The canonical card source is the Scryfall `default_cards` bulk export:

- bulk object URI:
  `https://api.scryfall.com/bulk-data/e2ef41e3-5778-4bc2-af3f-78eca4dd9c23`;
- downloaded object:
  `https://data.scryfall.io/default-cards/default-cards-20260813090526.jsonl.gz`;
- source SHA-256:
  `4d74b3827c1de6cc882dede2f6a75e74f67974f2bc49054693ba7e3413fb6c7c`;
- source objects: 116,703;
- eligible English paper print candidates: 104,712;
- eligible sets: 953;
- finish-specific printing candidates: 158,262;
- candidates with Scryfall image references: 104,550.

The pricing/product evidence source is the existing TCGCSV warehouse:

- source product rows: 117,267;
- exact linked products: 97,918;
- supported current Normal/Foil lanes: 144,482;
- positive current `marketPrice` lanes: 142,690;
- ambiguous collisions quarantined: 26.

The 2,866 rows applied in this canary are not the complete catalog. They are
the normalized relational rows for one set only:

- 1 set;
- 417 parent card prints;
- 417 identity rows;
- 807 finish-specific child printings;
- 417 Scryfall mappings;
- 807 TCGPlayer printing mappings.

## Durable Apply

- Apply artifact:
  `docs/audits/pricing/mtg_canonical_catalog_promotion_writer_v1/2026-08-13T21-33-11Z_apply/`
- Apply status: `hidden_canonical_promotion_applied_and_read_back`
- Promotion plan SHA-256:
  `a336eabaeafcc0d216794fd069e892de9dce1008357db3c844393d64881b8a54`
- Writer payload fingerprint:
  `83d491f692c6544ad7602e06dc6acce4c6cfc2895aabb9aabcf93735ed1d2ad7`
- Promotion rows SHA-256:
  `714a1ea492d4f1d74d7d43651958ae239801818c2212ceb8741f8ef90ba25238`
- Foundation migration SHA-256:
  `d4085f0dab4c9d5724dcda5644b1774ab48bb3535f94b42f0ca3cea1786de082`
- Visibility migration SHA-256:
  `925b31fcf1ba0895f2ed276bb77b45c948d3f1f0c2ef147843487be7ba7125a4`
- Mutation contract SHA-256:
  `fbc8760b5b47b0c08bf7576b930c4f7b83ec9919656ffa6b05ac02350fca4899`
- Migration ledger fingerprint:
  `de5cdf352f30466605aa7b84401afac70f4493ac0bc6c8540d46a877aaf0b42d`

## Independent Readback

Permanent evidence:

- `docs/audits/pricing/mtg_canonical_catalog_promotion_post_apply_readback_v1/2026-08-13T21-39-13Z/`

The independent verifier opened a read-only production transaction and
reconstructed the frozen promotion plan from the committed payload and local
migration files. It did not reuse the writer's in-memory result.

Verified results:

- exact canonical sets: 1 / 1;
- exact parent cards: 417 / 417;
- exact identities: 417 / 417;
- exact child printings: 807 / 807;
- exact Scryfall mappings: 417 / 417;
- exact TCGPlayer mappings: 807 / 807;
- durable service-only staging rows: 2,866 with the frozen row hash;
- current TCGPlayer source lanes: 807 / 807;
- positive current `marketPrice` lanes: 807 / 807;
- non-null parent or child image pointers: 0;
- anonymous MTG catalog/search visibility: 0;
- authenticated MTG catalog/search visibility: 0;
- readback findings: 0;
- database writes during readback: 0.

Pokémon remained unchanged from the apply proof:

- service-visible Pokémon parent rows: 58,769;
- authenticated-visible Pokémon parent rows: 58,768.

## Security Invariants

- MTG release status remains `hidden`.
- Five restrictive catalog-release policies remain active.
- The release-control table remains unreadable by `anon` and `authenticated`.
- The internal unfiltered search function remains unavailable to client roles.
- The governed wrapper search remains executable but returns zero MTG rows.
- No client role can infer hidden MTG canonical rows through direct table reads
  or either search path covered by this gate.

## Current Truths

- MTG canonical infrastructure is now proven on one production set.
- DSK is canonical and service-readable, but intentionally absent from the app.
- Exact Normal/Foil TCGPlayer mappings are present for the DSK canary.
- No MTG image has been self-hosted or connected to canonical rows.
- No MTG price has been published through the governed pricing read model.
- The remaining 104,295 eligible Scryfall parent candidates have not yet been
  promoted from the full reconciliation into canonical production tables.
- Full-catalog work must remain set-batched, deterministic, idempotent, and
  hidden behind the existing release control.

## Exact Next Gate

Build a deterministic full-catalog batch manifest from the frozen 104,712-card
Scryfall reconciliation. Exclude or idempotently reconcile the 417 already
canonical DSK parents. Prove every batch offline for row counts, hashes,
cross-batch uniqueness, collision quarantine, and exact set ownership.

Then run one bounded service-only staging batch for additional sets. Do not
activate MTG visibility, self-host images, repoint image fields, publish prices,
write Vault data, or bulk-promote the remaining catalog until the batched
staging writer and independent readback are proven.
