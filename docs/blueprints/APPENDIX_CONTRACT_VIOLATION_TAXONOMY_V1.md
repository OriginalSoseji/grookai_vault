# Appendix D — Contract Violation Taxonomy (Normative)
- Auth bypass: missing/ignored bearer token; wrong user context.
- Persistence drift: writes when zero-persistence required or without contract.
- Determinism drift: non-reproducible outputs or keys with same inputs.
- Schema drift: uncontracted fields, grades/bands leakage.
- Debug leakage: secrets printed or unsafe debug payloads.
