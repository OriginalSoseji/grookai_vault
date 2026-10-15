# Receipt delivery migration reconciliation — October 15, 2026

Production is at migration `20261014003500` with 447 ledger rows. The original
receipt-delivery candidate `20261005150000_vendor_receipt_delivery_v1.sql` was
left out of the production ledger while later migrations were applied. A normal
Supabase push therefore stops at that backdated file and recommends
`--include-all`. That option is intentionally not used.

This change moves the deferred candidate into `_quarantine` and adds the
forward-only `20261015090000_vendor_receipt_delivery_reconcile_v1.sql`. The new
file preserves the receipt schema and functions, uses idempotent table/index
creation, and is safe when replayed against a retained lab that already ran the
older candidate. The active migration now sits after the live ledger, so the
normal dry-run can inspect exactly one pending migration without bypassing the
migration safety boundary.

The change does not apply SQL, enable receipt sending, configure providers, or
write customer data. After merge, run the read-only receipt release gate and
then the normal Supabase dry run. Only after those receipts pass should a
separate, explicitly authorized production migration apply be considered.
