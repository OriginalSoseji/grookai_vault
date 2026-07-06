# Scanner V5 Identify Contract V1

Scanner V5 identifies a single still capture. It does not run a live identity loop and it never writes to the vault automatically.

Endpoint:

```text
POST /scanner-v5/identify
GET  /scanner-v5/health
```

Input:

- Raw JPEG/PNG request body, or
- JSON with `image_base64`, or
- multipart form data containing one image file.

Pipeline:

1. Rectify still capture into one canonical 716x1000 card plane.
2. OCR collector number and optional set token from the bottom strip.
3. Resolve OCR candidates against the existing compact full-card artifact metadata.
4. When OCR is ambiguous or missing, embed one image only: the whole rectified card.
5. Return at most three UI candidates.

Response shape:

```json
{
  "ok": true,
  "mode": "ocr_exact",
  "candidates": [
    {
      "id": "GV-PK-ME03-023",
      "name": "Amaura",
      "set": "ME03",
      "number": "023",
      "image_url": "https://...",
      "distance": null
    }
  ],
  "latency_ms": {
    "read_ms": 2.1,
    "rectify_ms": 40.2,
    "ocr_ms": 120.8,
    "embedding_ms": null,
    "total_ms": 170.4
  }
}
```

Modes:

- `ocr_exact`: OCR resolved exactly one canonical card. The UI may pre-focus Confirm, but no write occurs without user tap.
- `fused`: OCR found a number with multiple canonical siblings. Embedding ranks the siblings.
- `embedding_only`: OCR missed; whole-card embedding returns the top visual candidates.
- `unreadable`: rectification/OCR/embedding did not produce a usable candidate. This is the only mode where `candidates` may be empty.

Candidate rules:

- `candidates` is capped at three for app UI.
- `distance` is present only for embedding-ranked candidates.
- `image_url` is display-only and must not be treated as proof of exact ownership.

Write authority:

- Scanner V5 has no single-signal auto-write authority.
- User confirmation is the sole vault-write authority.
- Choosing a candidate may emit scan telemetry for training and audit, but it must not mutate identity canon or write a vault card without the explicit Confirm action.

Boundaries:

- No Supabase schema changes.
- No identity promotion.
- No scanner_v3/scanner_v4 live-loop imports in the app V5 capture screen.
- The existing `/scanner-v3/resolve-crops` route remains independent and rollback-safe.
