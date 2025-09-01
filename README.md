# Grookai Vault

Flutter + Supabase app for TCG collection management.

## Quick start
1. Copy \lib/main.dart\ and set your Supabase URL/anon key.
2. Run:
   \\\powershell
   flutter clean
   flutter pub get
   flutter run -d emulator-5554
   \\\

## Backend
- Tables: \card_catalog\, \ault_items\
- View: \_vault_items\ (coalesces catalog → name/set/photo)
- RPCs: \catalog_search\, \ault_add_from_catalog\, \ault_inc_qty\

## Roadmap
- Phase 1: Vault polish (images from catalog, search/sort, edit/delete)
- Phase 2: Market pricing + alerts
- Phase 3: Camera → condition grading + AI signals

## CI Status
[![Flutter CI](https://github.com/OriginalSoseji/grookai_vault/actions/workflows/flutter-ci.yml/badge.svg)](https://github.com/OriginalSoseji/grookai_vault/actions/workflows/flutter-ci.yml)
