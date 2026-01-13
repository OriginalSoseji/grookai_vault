# Fingerprinting Binding & Provenance Contract V1

Status: LOCKED CONTRACT (documentation only; no schema/code changes in this file)  
Scope: Fingerprinting V1.1 binding, provenance, and “seen before” signal for Grookai Vault.  
Out of scope: cross-user matching, payments, marketplace, new AI endpoints, hash/match algorithm changes.

## 1) Purpose & Scope
- Governs: fingerprint_key derivation, same-user binding of fingerprints to vault items, provenance event ledger, and “seen before” signal shape for the scanner/add-to-vault flow.
- Does not govern: cross-user matching, payments, marketplace flows, schema beyond binding/provenance, or any change to existing fingerprinting V1 outputs/hashing/matching logic.

## 2) Definitions
- `snapshot_id`: id in `public.condition_snapshots` (append-only).
- `vault_item_id`: id in `public.vault_items`.
- `user_id`: owner of the snapshot/vault item.
- `analysis_version`: analysis version string (e.g., `v1_fingerprint`).
- `analysis_key`: deterministic key already used for idempotency (sha256 of snapshot_id + analysis_version + `fingerprint_v1` per worker).
- `phash`/`dhash`: 64-bit hashes as 16-char lowercase hex strings derived from normalized images.
- `face`: one of `front` or `back`.

## 3) fingerprint_key Derivation (Immutable)
- fingerprint_key is derived ONLY from hashes (never from snapshot_id) and is stable across reruns.
- Format (ASCII, no whitespace, lowercase hex hashes normalized):  
  `fingerprint_key := "fpv1:" + <payload>`
- Payload rules:
  - If both faces present with hashes:  
    `payload = "fb:" + "f=" + fphash + "." + fdhash + ";b=" + bphash + "." + bdhash`
  - If only front present:  
    `payload = "f:" + fphash + "." + fdhash`
  - If only back present:  
    `payload = "b:" + bphash + "." + bdhash`
  - If neither face has hashes: `fingerprint_key = null` (fail closed; no binding/event).
- Invariants:
  - phash/dhash must be 16-char lowercase hex (normalize input).
  - No alternative formats are permitted in V1.

## 4) Binding Semantics (Same-User Only)
- Binding maps `(user_id, fingerprint_key)` to exactly one primary `vault_item_id`.
- Creation: first successful scan with a non-null fingerprint_key attached to a vault_item_id creates the binding.
- Update: reruns only refresh `last_seen_at`, `last_snapshot_id`, `last_analysis_key`; binding target is not changed in V1.
- Deletion: bindings are never deleted in V1.
- Duplicates: user may create duplicate vault items; binding remains to the primary unless a future explicit override flow is introduced (out of scope for V1).
- “Seen before” requires BOTH:
  1) `match.decision == "same"` and `best_candidate_snapshot_id` exists.
  2) A binding exists for the matched fingerprint_key (resolvable via candidate snapshot → fingerprint_key → binding).
- If binding cannot be resolved: `seen_before=false` with reason `same_match_unbound`.

## 5) Provenance Ledger (Append-Only)
- Events are append-only; no updates or deletes.
- Event types (exact strings):  
  - `fingerprint_created`  
  - `fingerprint_matched`  
  - `fingerprint_bound_to_vault_item`  
  - `fingerprint_rescan`  
  - `fingerprint_match_unbound` (optional; if emitted, must follow same rules)
- Required fields per event:
  - `user_id` (not null)
  - `vault_item_id` (nullable only when not resolvable; rule must be explicit in code)
  - `snapshot_id` (not null when analysis exists)
  - `analysis_key` (not null when analysis exists)
  - `fingerprint_key` (nullable only if key is null)
  - `event_type` (one of the locked strings)
  - `event_metadata` jsonb (must include match score/decision when applicable)
- Append-only idempotency: at-most-once per `(user_id, analysis_key, event_type)`.

## 6) Idempotency & Apply Rules
- `analysis_key` remains the deterministic idempotency key for analysis writes.
- Binding upsert key: `(user_id, fingerprint_key)` (unique).
- Event uniqueness: `(user_id, analysis_key, event_type)` (unique) to prevent duplicate provenance rows on rerun.
- If `fingerprint_key` is null, no binding upsert occurs; events may still log failure/absence with explicit metadata.

## 7) “Seen Before” Signal Contract (Output Shape)
Stored in `measurements.fingerprint.seen_before`:
```json
{
  "is_seen_before": true|false,
  "vault_item_id": "uuid-or-null",
  "reason": "same_match_bound"|"same_match_unbound"|"no_candidates"|"uncertain"|"different"|"no_hashes",
  "best_candidate_snapshot_id": "uuid-or-null",
  "score": 0.0
}
```
- `is_seen_before` is true only when reason == `same_match_bound`.
- `score` is numeric only when a match decision was computed with candidates; otherwise null.
- `no_hashes` when fingerprint_key is null.

## 8) Verification Queries (Placeholders for implementation)
- Binding uniqueness: select by `(user_id, fingerprint_key)` to confirm one row.
- Provenance timeline: order events by `created_at` for a given `vault_item_id`.
- Idempotency: rerun worker with same `analysis_key` and confirm no additional binding rows and no duplicate events for the same `(user_id, analysis_key, event_type)`.

## 9) Change Control
- Any change to fingerprint_key format requires a new version (e.g., fpv2) and must not rewrite existing fpv1 keys.
- Any new event types require an explicit contract revision and should not overload existing strings.
