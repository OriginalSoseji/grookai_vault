# SAFE_TO_SHIP

Before commit or push:

- [ ] `npm run preflight` passes (or `PASS_WITH_DEFERRED_DEBT` is understood)
- [ ] `npm run contracts:test` passes
- [ ] `npm run contracts:runtime-health` passes
- [ ] `npm run contracts:drift-audit` has 0 critical failures
- [ ] no new canon write path without runtime boundary
- [ ] no new owner/trust write without owner boundary
- [ ] no new deferred debt without explicit reason
- [ ] `npm run contracts:quarantine-report` is clean (or understood)
- [ ] relevant app flow manually sanity-checked (if applicable)

Rule:
If unsure, do not push.
