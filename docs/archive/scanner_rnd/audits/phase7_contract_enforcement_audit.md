# Phase 7A Contract Enforcement Audit

Source of truth: `docs/contracts/phase7_fingerprint_index_contract_v1.md`

Files audited:

- `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql`
- `backend/fingerprint/fingerprint_hash_v1.mjs`
- `backend/fingerprint/fingerprint_index_worker_v1.mjs`
- `supabase/functions/fingerprint_lookup_v1/index.ts`
- `lib/screens/scanner/native_scanner_phase0_screen.dart`

## 1. Overall Status

PARTIAL

Reason: no critical stop condition is present, but lookup candidate retrieval is not proven contract-complete because it prefilters candidates before Hamming ranking and thresholding.

## 2. Contract Rule Enforcement

### Data Model

| Rule | Status | Evidence |
| --- | --- | --- |
| `card_print_id` is required and anchors every row. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:3` defines `card_print_id uuid not null references public.card_prints(id)`. |
| `source_type` is required and enum-limited to `exact`, `alt`, `representative`. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:4`, `:15-16`. |
| `hash_d` is required. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:7`. |
| `hash_norm` is optional. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:8`. |
| `algorithm_version` is required. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:9`. |
| `computed_at` is required. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:10`. |
| `image_source` is present. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:11`. |
| `is_exact_image` is required boolean. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:12`. |
| `is_representative` is required boolean. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:13`. |
| `is_verified` is required boolean. | OK | `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:14`. |

### Data Rules

| Rule | Status | Evidence |
| --- | --- | --- |
| MUST support multiple fingerprints per `card_print_id`. | OK | Migration creates only a non-unique index on `card_print_id`; no unique constraint is defined on `card_print_id`: `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:21-22`. |
| MUST be append-only and MUST NOT overwrite existing fingerprint rows. | OK | Worker checks existing rows and skips them at `backend/fingerprint/fingerprint_index_worker_v1.mjs:163-195`; writes use insert only at `:257-259`. |
| MUST NOT store only one fingerprint per card. | OK | Schema does not constrain one row per card; `card_print_id` is indexed, not unique: `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:21-22`. |
| MUST differentiate exact, alternate, and representative image sources. | OK | `source_type` check allows `exact`, `alt`, `representative`: `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:15-16`; worker emits `exact` or `alt`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:88-107`. |
| MUST NOT treat representative imagery as exact imagery. | OK | Migration prevents `is_exact_image` and `is_representative` from both being true: `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:17-18`; worker sets `is_representative: false` for generated rows: `backend/fingerprint/fingerprint_index_worker_v1.mjs:240-242`. |
| MUST keep fingerprint index separate from identity, pricing, ingestion, and condition fingerprint binding data. | OK | Migration creates separate `public.card_fingerprint_index`: `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:1`; audited worker writes only `card_fingerprint_index`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:257-259`. |

### Generation Rules

| Rule | Status | Evidence |
| --- | --- | --- |
| Generation MUST read canonical card rows from `card_prints`. | OK | Worker reads `.from('card_prints')`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:301-306`. |
| Generation MUST use `card_prints.image_url` OR `card_prints.image_alt_url`. | OK | Worker selects `image_url,image_alt_url` and filters with `.or('image_url.not.is.null,image_alt_url.not.is.null')`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:301-305`; source selection uses `image_url` then `image_alt_url`: `:88-107`. |
| Generation MUST NOT run inside ingestion workers. | OK | Audited generation file is independent under `backend/fingerprint/fingerprint_index_worker_v1.mjs`; no audited ingestion file is modified. |
| Generation MUST run as an independent backend worker. | OK | `backend/fingerprint/fingerprint_index_worker_v1.mjs:1-14` defines a standalone backend worker entry with its own worker name and config. |
| Generation MUST skip representative images in Phase 7A. | OK | Worker skips representative statuses at `backend/fingerprint/fingerprint_index_worker_v1.mjs:83-85` and `:182-185`; worker does not select `representative_image_url`: `:301-304`. |
| Generation MUST NOT mutate identity keys, resolver contracts, card print schema, pricing rows, or ingestion rows. | OK | Worker reads `card_prints` at `backend/fingerprint/fingerprint_index_worker_v1.mjs:301-306` and inserts only into `card_fingerprint_index` at `:257-259`. |

### Lookup Rules

| Rule | Status | Evidence |
| --- | --- | --- |
| Lookup MUST use Hamming distance for perceptual hash similarity. | OK | `hamming64` XOR/popcount is implemented at `supabase/functions/fingerprint_lookup_v1/index.ts:126-134`; ranking computes distances through `hamming64`: `:212-219`. |
| Lookup MUST NOT use numeric subtraction distance as the similarity measure. | OK | Similarity distance is Hamming at `supabase/functions/fingerprint_lookup_v1/index.ts:212-219`; no `ABS(hash - input)` similarity expression appears in the audited lookup file. |
| Lookup MUST return multiple candidates when multiple candidates satisfy the threshold. | VIOLATION | `rankRows` can return multiple fetched candidates at `supabase/functions/fingerprint_lookup_v1/index.ts:203-232`, but candidate retrieval is limited to exact/one-bit values and a signed numeric range before Hamming ranking at `:136-143`, `:181-197`, `:278-284`. This does not prove all threshold-qualified Hamming candidates can be retrieved. |
| Lookup MUST apply threshold filtering before returning match candidates. | OK | Threshold filter is applied at `supabase/functions/fingerprint_lookup_v1/index.ts:218-219`; response returns `candidates` after ranking at `:285-294`. |
| Lookup output MUST include `candidates`, `confidence`, and `ambiguous`. | OK | Response includes all three fields at `supabase/functions/fingerprint_lookup_v1/index.ts:290-294`. |
| Lookup MUST filter out representative fingerprints in Phase 7A. | OK | Query filters `is_representative = false` and `source_type != representative` at `supabase/functions/fingerprint_lookup_v1/index.ts:169-172` and `:191-194`; rank guard repeats this at `:207-208`. |
| Lookup MUST filter out unverified fingerprint rows. | OK | Query filters `is_verified = true` at `supabase/functions/fingerprint_lookup_v1/index.ts:169` and `:191`; rank guard repeats `row.is_verified !== true` at `:207`. |

### Scanner Rules

| Rule | Status | Evidence |
| --- | --- | --- |
| Scanner fingerprint lookup MUST run before upload. | OK | Scanner computes/looks up fingerprint at `lib/screens/scanner/native_scanner_phase0_screen.dart:282-288` before `_startIdentityHandoff` at `:295`; upload starts inside `_startIdentityHandoff` at `:540-570`. |
| Scanner MUST skip AI only if confidence is high, ambiguity is false, and candidates exist. | OK | Fast path rejects unless `confidence == high`, `ambiguous == false`, and candidates exist: `lib/screens/scanner/native_scanner_phase0_screen.dart:428-435`; only then returns true and skips `_startIdentityHandoff`: `:438-450`, `:292-295`. |
| Scanner MUST fall back to existing AI identity path otherwise. | OK | Any non-match returns false in `_tryFingerprintIndexFastPath`: `lib/screens/scanner/native_scanner_phase0_screen.dart:408-456`; caller then invokes `_startIdentityHandoff`: `:292-295`. |
| Scanner MUST NOT break existing upload, AI, resolver, and result path. | OK | Existing handoff and polling path remains present: `_startIdentityHandoff` at `lib/screens/scanner/native_scanner_phase0_screen.dart:540-589`; `_pollIdentityUntilDone` at `:591-662`. |
| Scanner MUST treat fingerprint matches as a fast-path signal, not as replacement identity contracts. | OK | Fingerprint path only sets candidates/status in screen state and does not mutate identity contracts: `lib/screens/scanner/native_scanner_phase0_screen.dart:438-450`. |

### Failure Rules

| Rule | Status | Evidence |
| --- | --- | --- |
| Fallback on no local hash. | OK | Null/invalid hash returns false: `lib/screens/scanner/native_scanner_phase0_screen.dart:408-412`; caller falls back at `:292-295`. |
| Fallback on no match. | OK | Empty candidates return false: `lib/screens/scanner/native_scanner_phase0_screen.dart:430-435`; caller falls back at `:292-295`. |
| Fallback on lookup function unavailable. | OK | Non-2xx response returns false: `lib/screens/scanner/native_scanner_phase0_screen.dart:415-420`; caller falls back at `:292-295`. |
| Fallback on low confidence. | OK | Anything other than `high` returns false: `lib/screens/scanner/native_scanner_phase0_screen.dart:428-435`; lookup maps non-qualifying distances to lower confidence at `supabase/functions/fingerprint_lookup_v1/index.ts:151-155`. |
| Fallback on medium confidence. | OK | Anything other than `high` returns false: `lib/screens/scanner/native_scanner_phase0_screen.dart:428-435`; lookup can emit `medium` at `supabase/functions/fingerprint_lookup_v1/index.ts:154`. |
| Fallback on ambiguity. | OK | `ambiguous == true` returns false: `lib/screens/scanner/native_scanner_phase0_screen.dart:429-435`; lookup emits ambiguous flag at `supabase/functions/fingerprint_lookup_v1/index.ts:286-288`. |
| Fallback on representative-only candidates. | OK | Lookup filters representative rows before return: `supabase/functions/fingerprint_lookup_v1/index.ts:169-172`, `:191-194`, `:207-208`; empty candidate result falls back at `lib/screens/scanner/native_scanner_phase0_screen.dart:430-435`. |
| Fallback on unverified fingerprint rows. | OK | Lookup filters unverified rows before return: `supabase/functions/fingerprint_lookup_v1/index.ts:169`, `:191`, `:207`; empty candidate result falls back at `lib/screens/scanner/native_scanner_phase0_screen.dart:430-435`. |
| Fallback on lookup errors. | OK | Scanner catches lookup errors and returns false: `lib/screens/scanner/native_scanner_phase0_screen.dart:451-456`; caller falls back at `:292-295`. |

### Forbidden Behaviors

| Rule | Status | Evidence |
| --- | --- | --- |
| MUST NOT modify `card_prints`. | OK | Migration only creates `card_fingerprint_index`: `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:1-28`; worker only inserts into `card_fingerprint_index`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:257-259`. |
| MUST NOT mutate existing schema except through additive fingerprint-index schema. | OK | Migration creates one new table and indexes only: `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:1-28`. |
| MUST NOT reuse `fingerprint_bindings`. | OK | Audited files contain no `fingerprint_bindings` references; worker writes `card_fingerprint_index`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:257-259`. |
| MUST NOT treat fingerprint data as identity truth. | OK | Scanner fast path updates only local scanner state; it does not write identity events/results or identity contracts: `lib/screens/scanner/native_scanner_phase0_screen.dart:438-450`. |
| MUST NOT block the ingestion pipeline. | OK | Fingerprint generation is isolated in `backend/fingerprint/fingerprint_index_worker_v1.mjs`; audited ingestion files are not modified. |
| MUST NOT run inside TCGdex, PokemonAPI, JustTCG, or pricing ingestion. | OK | Generation entry is `backend/fingerprint/fingerprint_index_worker_v1.mjs`; no audited ingestion worker contains this generation path. |
| MUST NOT treat representative images as exact scanner confirmations. | OK | Worker skips representative status rows and emits `is_representative: false`: `backend/fingerprint/fingerprint_index_worker_v1.mjs:83-85`, `:182-185`, `:240-242`; lookup filters representative rows: `supabase/functions/fingerprint_lookup_v1/index.ts:169-172`, `:191-194`, `:207-208`. |

## 3. CRITICAL VIOLATIONS (STOP CONDITIONS)

None found.

| Stop condition | Status | Evidence |
| --- | --- | --- |
| NOT using Hamming distance. | OK | Hamming implementation and use: `supabase/functions/fingerprint_lookup_v1/index.ts:126-134`, `:212-219`. |
| Using `ABS(hash difference)`. | OK | No `ABS(hash - input)` expression appears in audited lookup; similarity uses Hamming at `supabase/functions/fingerprint_lookup_v1/index.ts:212-219`. |
| Scanner skips AI without strict gating. | OK | Strict gating at `lib/screens/scanner/native_scanner_phase0_screen.dart:428-435`; skip only after true at `:438-450`, `:292-295`. |
| Representative images used in fast-path. | OK | Lookup filters representatives at `supabase/functions/fingerprint_lookup_v1/index.ts:169-172`, `:191-194`, `:207-208`. |
| Fingerprint not anchored to `card_print_id`. | OK | Schema FK at `supabase/migrations/20260427090000_phase7_fingerprint_index_v1.sql:3`; lookup returns `card_print_id` at `supabase/functions/fingerprint_lookup_v1/index.ts:203-232`. |

## 4. Safety Classification

- migration -> SAFE
- worker -> SAFE
- lookup -> UNSAFE
- scanner -> SAFE

Lookup is classified UNSAFE because the audited retrieval strategy cannot prove contract-complete Hamming-threshold candidate coverage.

## 5. FINAL VERDICT

PATCH REQUIRED

Required patch scope: lookup candidate retrieval must be made contract-complete for Hamming-threshold matching, or the contract must explicitly permit approximate preselection with bounded false negatives. No critical stop condition requires a full stop.
