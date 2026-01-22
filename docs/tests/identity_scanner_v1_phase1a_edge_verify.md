# Identity Scanner V1 Phase 1A — Edge Function Verification (local)

Environment note: Supabase CLI is not available in this environment, so functions were not executed end-to-end. Below are the intended test commands and expected behaviors for when CLI/JWT are available.

## Intended test cases
- A) Enqueue without auth → 401
  ```
  curl -i -X POST http://localhost:54321/functions/v1/identity_scan_enqueue_v1 \
    -H "content-type: application/json" \
    -d '{"snapshot_id":"00000000-0000-0000-0000-000000000000"}'
  ```
- B) Enqueue snapshot not owned → 404/403
  ```
  curl -i -X POST http://localhost:54321/functions/v1/identity_scan_enqueue_v1 \
    -H "authorization: Bearer <user_jwt_other>" \
    -H "content-type: application/json" \
    -d '{"snapshot_id":"<existing_snapshot_other_user>"}'
  ```
- C) Enqueue owned snapshot → 200 with event id
  ```
  curl -i -X POST http://localhost:54321/functions/v1/identity_scan_enqueue_v1 \
    -H "authorization: Bearer <user_jwt>" \
    -H "content-type: application/json" \
    -d '{"snapshot_id":"<owned_snapshot_id>"}'
  ```
- D) Get list → includes newly created event
  ```
  curl -i "http://localhost:54321/functions/v1/identity_scan_get_v1?limit=20" \
    -H "authorization: Bearer <user_jwt>"
  ```
- E) Get by event_id not owned → 404/403
  ```
  curl -i "http://localhost:54321/functions/v1/identity_scan_get_v1?event_id=<event_other_user>" \
    -H "authorization: Bearer <user_jwt>"
  ```
- F) Append-only confirmed by absence of any update/delete routes (edge exposes only enqueue/get).
