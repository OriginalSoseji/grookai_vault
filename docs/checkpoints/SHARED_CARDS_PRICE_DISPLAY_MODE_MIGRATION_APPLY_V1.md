# SHARED_CARDS_PRICE_DISPLAY_MODE_MIGRATION_APPLY_V1

## Objective
Apply the missing `shared_cards.price_display_mode` migration to the active Supabase project.

## Root Cause
Public collector queries selected `shared_cards.price_display_mode`, but the active DB schema did not yet have that column, causing Postgres error `42703`.

## Action
- applied migration:
  - `20260408113000_add_shared_cards_price_display_mode_v1.sql`
- method used:
  - direct execution of the migration SQL against the active Supabase database via `psycopg`
  - migration history row inserted into `supabase_migrations.schema_migrations`
- note:
  - `supabase` CLI was not installed in this shell, so `supabase db push` was not available

## Verification
- information_schema check:
  - `price_display_mode` now exists on `public.shared_cards`
- previously failing query:
  - `shared_cards?select=card_id,public_note,price_display_mode&limit=1`
  - now succeeds with HTTP `200`
- app verification:
  - `flutter run -d "iPhone 17 Pro"` launched successfully
  - simulator screenshot shows `My Wall` rendering cards instead of the failure state

## Evidence
- query success payload:
  - `temp/public_wall_price_mode_query_after.json`
- query success headers:
  - `temp/public_wall_price_mode_headers_after.txt`
- simulator screenshot:
  - `temp/shared_cards_price_display_mode_wall_after.png`

## Notes
- no app code changes
- no fallback logic needed
