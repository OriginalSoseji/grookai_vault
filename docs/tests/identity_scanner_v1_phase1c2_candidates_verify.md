# Identity Scanner V1 Phase 1C.2 — Candidates + Evidence Verification Notes

Env note: Full execution not run here (CLI/JWT unavailable). Intended checks:

1) Run worker once:
   ```
   node backend/identity/identity_scan_worker_v1.mjs --once --max-jobs 1
   ```
   (Ensures ingestion_jobs seeded and one pending event processed.)
2) Inspect newest `identity_scan_event_results`:
   - `status`: `complete` or `failed` (see error)
   - `error`: `null` (when candidates exist), `no_candidates`, `no_search_inputs`, or `search_rpc_failed`
   - `signals.evidence_summary` contains signal flags and `search:rpc` (and `search:no_candidates` if empty)
   - `candidates`: array of objects `{card_print_id,name,set_code,number,image_url,evidence}` with chips like `name_match`, `number_match`, `printed_total_match`, `set_abbrev_present`
3) Confirm append-only discipline:
   - Only inserts into `identity_scan_event_results`; no updates to `identity_scan_events` or canonical identity tables.
4) Sample result fields to spot-check:
   ```
   status: "complete"
   error: null or "no_candidates"
   signals: { name_ocr, number_raw, number_digits, printed_total, printed_set_abbrev_raw, evidence_summary: [...] }
   candidates: [
     { card_print_id: "...", name: "...", set_code: "...", number: "...", image_url: "...", evidence: ["name_match","number_match"] }
   ]
   ```
