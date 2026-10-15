# Report foundation rollout

This change stages the first event-economics surface for the vendor workflow:

- `/account/store/reports` provides a read-only reports entry point linked from the sales desk.
- The report model separates item sales, tax, trade credit, receipts, payouts, purchases, and operating expenses.
- Known-cost profit uses immutable sale-time cost snapshots. Missing or unqualified cost stays visibly unknown.
- Event association and expense mutations are implemented behind `GV_VENDOR_EVENTS_V1=1`.
- The private profit panel is implemented behind `GV_VENDOR_PROFIT_V1=1`.
- Both flags default off. The included Supabase migration is additive and is not applied by this change.

The event contract and focused web vectors are included so production activation can be qualified separately against the actual hosted database, web UI, and native client. Until that qualification is complete, the safe production behavior is the existing sales dashboard plus the new reports route with events and profit disabled.
