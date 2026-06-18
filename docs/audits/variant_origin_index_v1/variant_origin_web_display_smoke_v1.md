# Variant Origin Web Display Smoke V1

Read-only route smoke test for the card-detail Variant Origin panel.

```text
db_writes_performed: false
migrations_created: false
cleanup_performed: false
quarantine_performed: false
```

## Summary

- Base URL: http://127.0.0.1:3000
- Cases: 2
- Passed: 2
- Failed: 0
- Fingerprint: `27c8245fa8a196244f8052f24b70733e75579e2e93b855fdc4a07f15e09b12df`

## Cases

| Case |Status |HTTP |Elapsed ms |Failures |URL |
| --- |--- |--- |--- |--- |--- |
| source_backed_special_variant |pass |200 |345 |none |http://127.0.0.1:3000/card/GV-PK-BASE2-1-NO-SYMBOL |
| ordinary_parent_no_origin_panel |pass |200 |57 |none |http://127.0.0.1:3000/card/GV-PK-BASE1-58 |
