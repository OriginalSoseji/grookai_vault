# Identity Scanner V1 Phase 0 — DB Verification

## Objects created
- Tables: `identity_scan_events`, `identity_scan_selections`
  ```
                  List of relations
 Schema |           Name           | Type  |  Owner   
--------+--------------------------+-------+----------
 public | identity_scan_events     | table | postgres
 public | identity_scan_selections | table | postgres
  ```
- RLS enabled:
  ```
         relname          | relrowsecurity 
--------------------------+----------------
 identity_scan_events     | t
 identity_scan_selections | t
  ```
- Triggers (immutability + auth uid):
  ```
                  tgname                   
-------------------------------------------
 trg_identity_scan_events_block_delete
 trg_identity_scan_events_block_update
 trg_identity_scan_events_set_auth_uid
 trg_identity_scan_selections_block_delete
 trg_identity_scan_selections_block_update
 trg_identity_scan_selections_set_auth_uid
  ```

## Append-only guard checks
- Inserted `condition_snapshots` row (with `request.jwt.claim.sub` set) → id `c72627cc-8cfe-4e6e-bb5e-4d232814606b`.
- Inserted `identity_scan_events` referencing that snapshot → id `228fe175-17ea-41f0-89b6-49e95d11c51e`.
- Update blocked:
  ```
  ERROR:  identity_scan_events is append-only
  CONTEXT:  PL/pgSQL function gv_identity_scan_events_block_mutation() line 3 at RAISE
  ```
- Delete blocked:
  ```
  ERROR:  identity_scan_events is append-only
  CONTEXT:  PL/pgSQL function gv_identity_scan_events_block_mutation() line 3 at RAISE
  ```
