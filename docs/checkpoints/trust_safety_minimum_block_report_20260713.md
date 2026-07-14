# Trust Safety Minimum Block And Report Checkpoint

Date: 2026-07-13
Branch: `main`

## Closed In Repo

- Added `trust_blocks` and `trust_reports` ledgers with owner-scoped RLS.
- Added `trust_block_exists_between_v1`, used by the `card_interactions`
  insert policy so either direction of a block prevents new card messages.
- Updated `v_card_contact_targets_v1` so authenticated viewers do not see
  contact targets for collectors blocked in either direction.
- Added web Report/Block controls to active inbox conversations.
- Added web Report/Block controls to the card-owner contact modal used by
  Network, public Wall cards, public card owner offers, and public exact-copy
  contact surfaces.
- Added mobile Report conversation / Block collector actions in the message
  thread overflow menu.

## Remaining Product Hardening

This is a launch-minimum safety layer, not a full moderation console. Founder
review queues, reason-specific forms, unblock management, and richer public
profile header placement remain follow-up work.
