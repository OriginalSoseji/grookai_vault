# Audit Rule L1 – UI Pricing Panel (card_print_latest_price_curve)

## Summary
- Pricing V3 assets exist in SQL: table `card_print_price_curves` with per-condition medians/samples and view `card_print_latest_price_curve` selecting latest per `card_print_id`.
- Flutter app has no pricing usage: no pricing queries, models, or UI sections; only Home/Vault screens with direct Supabase reads.
- No card detail screen or section exists; current UI operates on list cards with inline actions.
- Async pattern is stateful widgets performing Supabase `select` calls with `setState` loading flags (no repositories/models).
- Safe to proceed with UI-only implementation: YES.

## Existing
- **DB**: `supabase/migrations/20251124010000_pricing_v3_snapshots.sql` defines `card_print_price_curves` (`card_print_id uuid not null ref card_prints`, `created_at timestamptz`, `nm_median numeric`, `nm_floor numeric`, `nm_samples int`, `lp_median numeric`, `lp_floor numeric`, `lp_samples int`, `mp_median numeric`, `mp_floor numeric`, `mp_samples int`, `hp_median numeric`, `hp_floor numeric`, `hp_samples int`, `dmg_median numeric`, `dmg_floor numeric`, `dmg_samples int`, `confidence numeric`, `listing_count int`, `raw_json jsonb`) and view `card_print_latest_price_curve` as `SELECT DISTINCT ON (card_print_id) * FROM card_print_price_curves ORDER BY card_print_id, created_at DESC`.
- **Pricing code in Flutter**: none found (`card_print_price_curves`, `card_print_latest_price_curve`, `price_curve`, `pricing` not referenced in `lib/`).
- **Card detail screen**: none present; app exposes Home (stats/recent) and Vault list with add/edit quantity only.
- **Identity flow**: Vault items sourced from `v_vault_items` rows; card/catalog identity handled as raw map fields (`card_id`, `set_name`, etc.) without typed models.
- **Async pattern**: Stateful widgets using Supabase client directly in methods (`reload`, `_fetch`) with `_loading` flags and `setState`; no repository/provider layer in use.

## Missing
- Pricing curve Dart model for `card_print_latest_price_curve`: missing.
- Repository/service method to fetch latest price curve: missing.
- UI pricing section or placeholder on a card detail screen: missing (card detail screen itself absent).

## Risks & Constraints
- No existing pricing logic in Flutter to reuse; new code must stay read-only against `card_print_latest_price_curve` — Severity: Minor.
- No card detail screen baseline; adding a pricing panel requires introducing a new detail flow or section placement decision — Severity: Moderate.
- Direct Supabase usage (no models/repositories) means type/column name mismatch risk when mapping pricing view fields — Severity: Minor.
- Rulebook forbids client-side pricing logic or schema changes; any deviation would violate contracts — Severity: Blocker.

## Recommendation
Architecture and contracts permit a UI-only, read-only pricing panel that queries `card_print_latest_price_curve` by `card_print_id` and renders latest medians/listing_count/confidence; implementation will need to introduce a detail view and lightweight model/query following existing direct Supabase + `setState` pattern or a small repository wrapper for consistency. Safe to proceed with UI-only implementation: YES.
