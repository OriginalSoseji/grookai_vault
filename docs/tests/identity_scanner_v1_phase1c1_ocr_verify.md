# Identity Scanner V1 Phase 1C.1/1C.2 — OCR + Candidates Verification Notes

Environment note: OCR endpoint added to AI border service (`/ocr-card-signals`) using pytesseract when available; falls back to null signals if missing. CLI execution not performed here. Intended verification steps:

1) Ensure AI service is running with `GV_AI_BORDER_ENABLE=1` and `GV_AI_BORDER_URL` pointing to the service.
2) Enqueue an identity scan (edge `identity_scan_enqueue_v1`) for a snapshot with a valid front image.
3) Run worker once:
   ```
   node backend/identity/identity_scan_worker_v1.mjs --once --max-jobs 1
   ```
   (Worker bootstraps ingestion_jobs and processes one event.)
4) Inspect `identity_scan_event_results` for the event:
   - `status` should be `complete` if name/number extracted; otherwise `failed` with `error='ocr_no_signal'` or OCR error.
   - `signals` should include: `name_ocr`, `name_conf`, `number_raw`, `number_conf`, `number_digits`, `printed_total`, `total_conf`, `printed_set_abbrev_raw`, `set_abbrev_conf`, plus border/warp metadata and `evidence_summary`.
   - `candidates` should be present (may be empty); each has `card_print_id,name,set_code,number,image_url,evidence`.
5) Negative/edge cases:
   - If OCR is unavailable, `debug.engine` will indicate `pytesseract_missing`; worker will insert a failed result with `ocr_no_signal`.
   - If search inputs missing -> failed with `no_search_inputs`.
   - If RPC fails -> failed with `search_rpc_failed`.
   - If no candidates -> status complete with `error='no_candidates'`.
   - No updates to `identity_scan_events`; results are appended-only in `identity_scan_event_results`.
