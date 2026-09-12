# Collector Authenticated Staging V1

Date: September 10, 2026 (America/Denver).
Authority: founder accepted the authenticated staging follow-up and said "Do it."

## Scope

Preserve the approved collector design while proving actual account workflows.
Use existing auth, Vault, wishlist, Wall, Binder, Pulse and governed pricing contracts.
Add compact condition, quantity and Save controls; repair bounded autocomplete.
No production switch, mobile release, production data write or production schema apply.

## Isolation

- Branch: `preview/collector-authenticated-20260910`.
- Tree: `C:/grookai_vault_collector_authenticated`.
- Preserve both existing local previews and the protected read-only Vercel deployment.
- Start with the existing loopback sample Supabase, not the recovery-drill project.
- Existing sample identities are copied public reference data, not canon expansion.
- Use only synthetic accounts. Never copy production users, Vault rows or secrets.
- Do not reset the existing database, change its schema implicitly, or start workers.
- Refuse production/recovery Supabase endpoints at build and runtime.
- No remote writable staging deployment until a distinct hosted database is prepared
  and its schema, target and cross-account isolation are verified.
- Pricing must remain unavailable when evidence is absent. Test prices, if introduced,
  must be explicitly labeled and must never be presented as live market evidence.

## Verification

Verify persisted saves, exact printing/condition/copy counts, ownership isolation,
Vault readback/totals, Wall, Binders, Pulse, sign-out, desktop/mobile layout and images.
Do not substitute mocked UI success for database readback. Record blockers separately.
No new production migration, pricing publication, catalog ingestion or store submission.
