# Scanner V5 Backend

Scanner V5 is the current local identity service and regression harness for card-photo recognition.

## Local service

```bash
npm --prefix backend run scanner:identity:v5
```

The default command uses the committed fixture artifact so a fresh clone can start the service without private `.tmp` files. Production-sized runs should pass `SCANNER_V5_ARTIFACT_DIR` or `--artifact-dir` pointing at the full compact artifact.

## Regression

```bash
npm --prefix backend run scanner:identity:v5:regression
```

The regression cases use committed fixtures only:

- Rufflet required cases from `test/fixtures/scanner_cache`.
- Amaura fixed-slot still from `backend/identity_v3/scanner_v5/fixtures/images`.
- Tynamo synthetic smoke fixture from `test/fixtures/scanner_cache`.

The scored gate requires the Rufflet cases to resolve to `GV-PK-ASC-173` and the Amaura case to resolve to `GV-PK-ME03-023` by OCR number/set lookup. The Tynamo fixture is intentionally smoke-only because it is a synthetic drawing rather than a real card photo.

## Contract

`POST /scanner-v5/identify` returns candidates with vault-ready `card_id` plus `gv_id`, `display_name`, `name`, `image_url`, `confidence`, and `rank`. The mobile Add button must use `card_id`, not a public GV ID.
