# Identity Scanner V1 — Locked Contract

## Lane separation
- **Edge Function**: `identity_scan_enqueue_v1` = auth + validate snapshot ownership + enqueue job only
- **Backend Highway worker (VPS)**: `identity_scan_worker_v1` = border/warp + OCR + normalize via SEARCH_CONTRACT_V1 + call deterministic SEARCH RPC + rank + write append-only events
- Optional **Edge Function**: `identity_scan_get_v1` = read results only

## Hard invariants
- AI emits **signals only**; never writes canonical identity
- DB candidate resolution must be via **SEARCH_CONTRACT_V1 RPC only** (ban ad-hoc `ILIKE` queries)

## Inputs
- Reuse `condition_snapshots` as the capture source (front image required)

## Storage / tables (append-only)
- `identity_scan_events` (append-only analysis result)
- `identity_scan_selections` (append-only user selection)

## Stop rules (fail closed)
- Missing front image / no ownership / no usable signals → return low-signal result, no auto-lock
