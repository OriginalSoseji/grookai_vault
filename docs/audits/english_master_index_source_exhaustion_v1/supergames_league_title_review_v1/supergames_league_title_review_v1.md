# Super Games League Title Review V1

Generated: 2026-06-22T13:09:38.142Z

This is audit-only source acquisition. It does not create fixtures, write-ready rows, DB writes, migrations, cleanup, or quarantine.

## Summary

- Target current queue rows: 56
- Products loaded: 220
- Parsed product titles: 95
- Review rows with explicit active finish but missing explicit set name: 0
- db_writes_performed: false
- migrations_created: false

## Rule

Super Games product titles may be used as review evidence only unless the title/page proves exact set + card number + card name + stamp/variant + active finish.

## Review Rows

_None._


## Status Counts

| Status | Rows |
| --- | --- |
| blocked_unparseable_product_title | 125 |
| blocked_no_current_queue_match | 86 |
| blocked_title_finish_not_active_finish_proof | 9 |
