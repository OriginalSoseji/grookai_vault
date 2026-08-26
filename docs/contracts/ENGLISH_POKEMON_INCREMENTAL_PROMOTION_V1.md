# English Pokemon Incremental Promotion V1

## Purpose

Promote a bounded English Pokemon parent-card delta only when the immutable English Master Index and the current TCGdex set registry prove the same complete set scope. This contract does not reopen or weaken `ENGLISH_MASTER_INDEX_COMPLETION_V1`.

## Admission

A set may enter the unattended writer only when:

- it already has exactly one canonical `public.sets` owner;
- TCGdex provides a positive full-set count;
- the checked-in English Master Index has exactly that many `master_verified` card identities;
- every identity has at least two independent preserved sources;
- every missing Pokemon family resolves exactly to one canonical species;
- every existing card number agrees with the Master Index name;
- every existing canonical coordinate belongs to the admitted full-set Master Index;
- collision preflight is zero for parent IDs, GV-IDs, natural coordinates, active identity hashes, evidence hashes, and family-review hashes.

Partial Master Index coverage, source-only rows, finish-only claims, ambiguous aliases, missing set containers, and unresolved species remain report-only.

## Alias Reconciliation

An empty source-alias set is not a missing catalog when every `master_verified` coordinate already exists under one other canonical set owner. Discovery may suppress the empty alias row and attach its source code to the one exact owner for reconciliation. It may not move, update, or duplicate cards.

## Write Boundary

The writer is insert-only and may create only:

- parent `card_prints` rows;
- active `card_print_identity` rows;
- preserved `card_print_identity_source_evidence` rows;
- pending, non-promotable `card_print_family_review_queue` rows.

It may not write child printings, Storage, image pointers, external mappings, pricing, publication, Vault state, approvals, updates, or deletes.

## Execution

- `plan` builds and fingerprints the exact payload.
- `dry-run` inserts, reads back, rolls back, and proves every inserted ID absent.
- `apply` requires the exact clean commit SHA, repeats collision preflight, commits once, and performs durable readback.
- `apply` may read identity evidence only from the checked-in default English Master Index directory.
- Missing TCGdex card details are fetched before Trainer, Energy, or Pokemon family resolution.
- The catalog supervisor routes only a discovery gap containing full-set `english_master_index_completion_v1` evidence.

## Initial Proven Lane

`wp` / W Promotional is the first bounded lane: seven identities, each supported by Bulbapedia's human-readable card list and Cardmarket's marketplace checklist. No external image is admitted by this identity gate.
