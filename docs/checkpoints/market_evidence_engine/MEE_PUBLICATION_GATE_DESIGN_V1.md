# MEE Publication Gate Design V1 Checkpoint

Date: 2026-06-27

## Why This Checkpoint Exists

The Market Evidence Engine foundation is closed for internal lifecycle, assignment, review, and safety-gated evidence handling. The next missing layer is a publication gate that decides what could become a future public pricing candidate.

This checkpoint keeps that work separate from acquisition and public pricing.

## Confirmed State

- Evidence lifecycle exists.
- Assignment to `card_print_id` and `gv_id` is clean.
- Internal review lanes exist.
- Internal dashboard views exist.
- Internal quality scoring exists.
- No public pricing is enabled by the foundation.

## Publication Gate Boundary

The publication gate may create internal candidate decisions only.

It may not:

- publish prices,
- expose app-visible prices,
- treat active listings as market truth,
- treat reference APIs as market truth,
- write public pricing tables,
- modify card identity,
- modify vault data,
- modify image data.

## Required Future Safety

Any future implementation must preserve:

- service-role-only access,
- lane separation between raw singles and slabs,
- blocked reference-only evidence,
- blocked low-signal evidence,
- blocked classification issues,
- replayability to raw evidence,
- explicit rule versions,
- closed public flags by default.

## Canonical Contract

See:

`docs/contracts/MEE_PUBLICATION_GATE_DESIGN_V1.md`

