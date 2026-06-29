# MEE Core Low Signal Remaining Drain Post Apply Audit V1

Generated: 2026-06-27T02:25:16.698Z

Mode: run only, read-only audit

## Source

- Source package: `MEE-CORE-INTERNAL-REVIEW-ACTION-FUNCTION-LOW-SIGNAL-REMAINING-DRAIN-PLAN-V1`
- Source package fingerprint: `b21c27179f29d96b26fcad410753a1b9555c23ae236d7e5616f3172c29b3f031`
- Source row manifest hash: `c35053de84118c1655e16342bebbd90125d2d41d98cd25146cb9feb755a99050`

## Readback

- Expected target rows: `219`
- Matching action event rows: `219`
- Distinct event disposition rows: `219`
- Updated target disposition rows: `219`
- Remaining eligible low-signal rows: `0`
- Event public flag rows: `0`
- Target public flag rows: `0`
- Pricing observation rows: `0`
- Public pricing view references: `0`

## Low Signal Status

- resolved/monitor_only, needs_review=false: `380`

## Next Recommendation

- Package: `MEE-CORE-INTERNAL-CLASSIFICATION-REVIEW-QUEUE-AUDIT-V1`
- Reason: Low-signal monitor rows are fully resolved. Audit classification_review next because classification defects should be blocked or corrected before high-signal or publication-gate work.

## Findings

- None
