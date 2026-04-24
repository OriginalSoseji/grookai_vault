# NEW_WRITE_PATH_CHECKLIST

Every new write path MUST answer:

1. Does this mutate:
   - canon?
   - ownership?
   - pricing?
   - mappings?
   - public trust?
   - quarantine?

If YES:

2. What boundary protects it?
   - `execute_canon_write_v1`
   - `execute_owner_write_v1`
   - maintenance boundary

3. What proof verifies it?
   - which invariant
   - what failure looks like

4. Can this bypass the boundary?
   - if yes -> invalid design

5. Does it introduce new deferred debt?
   - if yes -> document it

Rule:
No write path exists without:
- boundary
- proof
- explicit authority
