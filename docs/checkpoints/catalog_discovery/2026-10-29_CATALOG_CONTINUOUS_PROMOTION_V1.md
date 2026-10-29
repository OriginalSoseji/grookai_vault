# Catalog Continuous Promotion V1 checkpoint

Date: 2026-10-29
Status: implementation candidate; production activation follows merged checks

## Baseline

- Production project: `ycdxbpibncqcchqiihfz`.
- `card_prints`: 172,404.
- `sets`: 3,410.
- `card_print_traits`: 32,903.
- Latest 24-hour canonical card growth: 0.
- Latest seven-day canonical card growth: 255.
- Universal discovery ran successfully every six hours but remained read-only.
- Latest evidence found nine missing MTG `fra` parents and the missing 30-card
  English Pokemon `30th-c` set.
- The shadow workflow had twelve consecutive failures at the global released-set
  presentation gate and never dispatched a canonical writer.

## Decision

Keep discovery and shadow reconciliation read-only. Add a separate
default-branch-only workflow that consumes the exact successful discovery
artifact and executes only registered outcome packages. Begin with the existing
governed writers; admit the exact Scryfall partial-extension shape already
implemented by the MTG writer. Keep `30th-c` held until Master Index admission.

## Safety proof required before activation

- exact source commit and source run validation;
- internal artifact hash and package fingerprint validation;
- no more than five unique targets;
- rollback-proven dry run for every target;
- same-fingerprint apply;
- exact durable readback;
- persisted operations-agent terminal state;
- 90-day GitHub evidence artifact;
- deduplicated failure incident.

## Authorization

Founder instruction in the active operator session: `do it`, following the
evidence-backed report that discovery was working but promotion was not. This
authorizes implementation and activation only inside
`CATALOG_CONTINUOUS_PROMOTION_V1`; it does not authorize broader catalog,
printing, pricing, Storage, publication, Vault, or visibility mutation.
