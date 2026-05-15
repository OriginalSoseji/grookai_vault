# SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1

## Status

Active.

This contract records a permanent scanner architecture decision: OCR is not a viable primary identity strategy for Grookai live scanner recognition.

For Grookai scanner identity, OCR is treated as rejected for production authority unless this contract is explicitly superseded by a future versioned contract.

## Decision

OCR must not be used as:

- scanner identity authority
- the primary recognition path
- a live hot-path lock signal
- the path to the under-2-second scanner identity target
- a replacement for visual/canonical-reference matching

## Why OCR Is Rejected

Repeated Grookai scanner work has shown that OCR fails the real production conditions the scanner must handle:

- moving phone video
- autofocus and exposure settling
- motion blur
- glare, holo, foil, and sleeves
- low or colored lighting
- perspective distortion
- partial crops
- tiny title, set, and collector-number text
- multi-card scenes
- full-art cards and stylized text

OCR can appear useful on hand-picked still frames, but that does not make it a reliable live scanner identity system. In the Grookai scanner, OCR creates slow paths, brittle preprocessing work, and false confidence without solving the core product requirement: fast, correct visual identification from a phone camera.

## Binding Rules

Do not build or propose OCR-first scanner identity.

Do not use OCR as final identity authority.

Do not use OCR to satisfy `SCANNER_IDENTITY_PERFORMANCE_CONTRACT_V1`.

Do not use OCR text as the lock trigger for live scanner identity.

Do not spend implementation cycles tuning OCR preprocessing as the route to production recognition.

Do not weaken visual identity gates because OCR produced a plausible title, name, set, or number.

Do not add OCR dependencies to the live scanner hot path.

Do not treat OCR success on a hand-picked frame as production evidence.

## Allowed Use

OCR is allowed only when clearly non-authoritative:

- offline diagnostics
- manual debug experiments
- post-capture annotation that cannot lock identity
- optional secondary audit signal after visual identity already passed
- future research only if explicitly contracted and time-boxed

OCR output must be labeled weak and non-authoritative. It must never override visual/canonical identity.

## Required Production Direction

Scanner identity work must prioritize:

- camera readiness and fast usable crop delivery
- stable card framing and rectification
- visual embeddings, ANN, or equivalent visual retrieval
- canonical reference images and view shards
- confidence gates, caching, and rollbackable serving artifacts
- deterministic canonical `card_prints` identity mapping

## Stop Rules

Stop and point to this contract if a future scanner plan depends on:

- OCR reading title, name, set, or number to identify the card
- OCR as the path to under 2 seconds
- OCR preprocessing improvements as the main production work
- OCR correcting weak visual matches
- OCR replacing visual ANN/reference matching
- OCR output written into canonical identity
- OCR becoming a hot-path dependency

## Acceptance

The scanner architecture remains compliant only if production identity locks are visual/canonical-reference driven, and OCR is absent from the authoritative live recognition path.
