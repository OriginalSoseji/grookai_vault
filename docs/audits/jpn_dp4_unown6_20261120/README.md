# Japanese DP4 Unown subject repair

Six exact official-card images and printed Pokédex numbers establish the Unown F, G, H, L, P, and Q forms. The six English identity claims were corrected. The P and Q primary species links were replaced with Unown links; prior links remain inactive as evidence. Parent prints, other links, species, ownership, prices, publication and related state were protected.

The frozen plan and captured source bytes are in this directory. The writer retains source bytes and preimages in `raw_imports` before its guarded changes. A same-writer rollback rehearsal passed (run `37d0b3bb-b56f-434c-b16c-c80374ebd3c8`); the production transaction was applied and verified (run `f0d31f13-9290-422e-9b69-2f5c8cbb8513`, receipt `177099`). The separate read-only audit in `independent-readback.json` verifies all six exact postimages, the two replacements, identity hashes and retained sources. The runtime preflight passed with documented deferred debt.

Two earlier read-only inspections failed to fetch external pages before Node was configured to trust the system certificate store; no catalog writes occurred. The later source revalidation succeeded using `NODE_USE_SYSTEM_CA=1`.

This is a bounded correction, not proof that all catalog fields or resolver behaviors are launch-ready. Coordinate integration with the overlapping catalog-write registrations in the DP4 artist and identity repair branches.

Follow-up: after the independent readback above, a separate official-source artist fill changed the parent `artist` field on all six cards (receipt `177107`; `docs/audits/jpn_dp4_artist8_20261120/`). This writer's strict verification deliberately expects the earlier complete parent preimages, so it will now report parent drift. Use the historical readback together with the later artist receipt when reconstructing the sequence; do not rerun or alter the original proof to conceal that subsequent change.
