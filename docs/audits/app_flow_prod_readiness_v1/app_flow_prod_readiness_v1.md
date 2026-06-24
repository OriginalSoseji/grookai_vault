# APP_FLOW_PROD_READINESS_AUDIT_V1

Generated: 2026-06-24T22:08:11.444Z

Status: NEEDS_PRODUCT_DECISION

Recommended next step: SCANNER_SCAN_ENTRY_PROD_READY_V1

## Flow Findings

### mobile_card_detail_add_to_vault

Status: prod_wired

Card detail Add to Vault is no longer a placeholder. It calls the governed vault edge function, includes selected child printing context, requires a returned GVVI id, records engagement, and navigates to the exact owned copy.

Next action: Keep this covered by static contract tests and remove stale checkpoint language that still calls it a placeholder.

### mobile_scan_entry

Status: intentionally_parked_visible_placeholder

The visible Scan entry defaults to a construction-safe placeholder. That is identity-safe, but it is still a half-finished user-facing process.

Next action: Choose a production stance: hide Scan until ready, relabel it as a beta tool, or route it to the real identity scan pipeline with a clear failure path.

### mobile_identity_scan_pipeline

Status: partially_prod_wired

The newer identity scan path has real storage, enqueue, polling, result reading, and Add to Vault wiring, but it does not yet navigate to the exact owned copy after add.

Next action: Align post-add behavior with card detail/search by requiring the returned GVVI id and opening VaultGvviScreen.

### legacy_scan_identify_screen

Status: stale_unrouted_placeholder_code

Legacy ScanIdentifyScreen still calls card-identify with a placeholder request body. Current static references do not route to it, but leaving it compiled creates confusion during hardening.

Next action: Delete it if unused, or convert it to the same IdentityScanService pipeline before exposing it.

## Source Fingerprint

20e3778ba54c94bf8d5e4375ad1205ea6ef265763ddb76afffdb4dd22881497b
