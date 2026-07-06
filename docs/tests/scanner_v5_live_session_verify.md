# Scanner V5 Live Session Verify

Purpose: run a 20-card mixed-era phone session against the V5 identity service using the full compact artifact. This is evidence collection only. Do not tune thresholds from this session.

## Service Target

Use either the droplet V5 service or a LAN-hosted local service.

### Droplet

1. Confirm the droplet is running the Scanner V5 service and full artifact.
2. Verify health:

```bash
curl https://ai.grookaivault.com/scanner-v5/health
```

Expected:

```json
{
  "ok": true,
  "service": "scanner_v5_identity_service_v1",
  "contract": "SCANNER_V5_IDENTIFY_CONTRACT_V1"
}
```

### LAN Local

From the repo root:

```bash
SCANNER_V5_ARTIFACT_DIR=.tmp/scanner_v3_ann_index_v1/full_candidate_compact_v1 \
SCANNER_V5_HOST=0.0.0.0 \
SCANNER_V5_PORT=8795 \
node backend/identity_v3/scanner_v5/run_scanner_v5_identity_service_v1.mjs
```

On the iPhone, use the computer's LAN IP, for example:

```text
http://192.168.1.25:8795/scanner-v5/identify
```

Verify from another device on the same Wi-Fi:

```bash
curl http://192.168.1.25:8795/scanner-v5/health
```

## App Setup

1. Build the iPhone app from the current scanner branch.
2. Point the app Scanner V5 base URL at the droplet or LAN service.
3. Confirm the app is not using the fixture artifact endpoint.
4. Enable scanner session logging.
5. Start a fresh session ID before scanning.

Required session log fields per scan:

- `session_id`
- `scan_id` or `request_id`
- `mode`
- `candidates`
- `confirmed_gv_id` or `confirmed_card_id`
- `confirmed_rank`
- `retakes`
- `shutter_at` or `shutter_ms`
- `confirmed_at` or `confirm_ms`

## 20-Card Mixed-Era Deck

Use cards from several eras and visual formats:

1. WOTC or early e-Card, bottom-right number if available
2. EX era
3. Diamond/Pearl or Platinum
4. HeartGold/SoulSilver
5. Black/White
6. XY
7. Sun/Moon
8. Sword/Shield
9. Scarlet/Violet
10. Japanese modern card
11. Japanese older card if available
12. Full-art ex/V
13. Holo with glare
14. Reverse holo
15. Promo
16. Trainer
17. Energy
18. Dark card face
19. Binder-page card
20. A known hard case from `.tmp/embedding_test_images`

## Capture Protocol

For each card:

1. Scan once with the full card centered and in focus.
2. If the app asks for a retake, retake once and increment `retakes`.
3. Confirm the correct card from the candidate list.
4. If the confirmed card is not rank 1, keep it as training data. Do not mark the session failed only because rank was not 1.
5. Export the session log as JSONL or JSON array.

## Summarize Session Log

From repo root:

```bash
node backend/identity_v3/scanner_v5/parse_session_log_v1.mjs path/to/session-log.jsonl \
  --out .tmp/scanner_v5_live_session/latest_summary.json
```

Review:

- per-scan mode
- confirmed rank
- retakes
- shutter-to-confirm latency
- non-rank-1 confirmations

## Pass/Fail Interpretation

This session does not set production thresholds.

Evidence to capture:

- OCR/fused/embedding-only distribution
- cards that required retake
- cards where confirmed rank was not 1
- card eras or layouts that repeatedly fail OCR
- any app-side dead ends after confirmation

Do not treat non-rank-1 confirmation as failure. It is useful training data.
