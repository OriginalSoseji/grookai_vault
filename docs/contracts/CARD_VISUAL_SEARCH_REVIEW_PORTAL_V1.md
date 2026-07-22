# Card Visual Search Review Portal V1

## Purpose

Provide an invitation-only web surface for remote human calibration of the frozen visual-search packet while preserving a strict no-server-write boundary.

## Access

- Route: `/review/visual-search`
- Existing Grookai Supabase authentication is required.
- Access is limited to the founder, the built-in PokeJavi auth identity, and optional user IDs in `GROOKAI_VISUAL_SEARCH_REVIEWER_USER_IDS`.
- Unauthorized authenticated users receive a not-found response.
- The route is not indexed and is not linked from public navigation.

## Data Boundary

- The review packet is immutable and bundled as a private Brotli-compressed server asset.
- The packet contains calibration queries only.
- The sealed holdout is not bundled, served, or executed.
- The compressed asset is streamed only after server-side authentication and authorization.
- No packet endpoint is available as a public static asset.

## Write Boundary

- The portal performs no database, storage, provider, canonical, description, approval, embedding, or search-index writes.
- Draft progress is stored only in browser `localStorage` under the packet run key.
- Completed work leaves the browser only through the explicit JSONL download command.
- The downloaded JSONL remains an untrusted reviewer submission until founder review and offline evaluator validation.

## Review Experience

- Search-match evidence is visibly separate from the complete saved visual record.
- Clicking evidence opens the source image beside the complete Fact Graph and exact saved generated-row JSON.
- Reviewers can judge ranked results, record evidence notes, assign query-level failure labels, complete or reopen queries, filter progress, and export JSONL.

## Invariants

- Reviewer judgments cannot mutate source evidence.
- Reviewer completion does not approve any card description.
- A browser or device change does not transfer drafts automatically.
- The reviewer must export JSONL before clearing browser storage or switching devices.
- Only the offline calibration evaluator can convert a complete, provenance-valid submission into calibration metrics.
