# Grookai Vault

[![Prod Edge Probe](https://github.com/OriginalSoseji/grookai_vault/actions/workflows/prod-edge-probe.yml/badge.svg?branch=main)](https://github.com/OriginalSoseji/grookai_vault/actions/workflows/prod-edge-probe.yml)

# Grookai Vault

Flutter + Supabase app for TCG collection management.

## Quick start
1. Copy \lib/main.dart\ and set your Supabase URL/Publishable key.
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

![Bridge Status](https://img.shields.io/badge/bridge-clean-brightgreen)


## Environment Variables

Use only these keys in this repo:

- `SUPABASE_PUBLISHABLE_KEY` — sb_publishable_… (safe for client and Edge calls)
- `SUPABASE_SECRET_KEY` — sb_secret_… (server-only; never sent to Edge functions)
- `BRIDGE_IMPORT_TOKEN` — shared token for protected Edge Function routes

Do not use legacy anon or service-role key env names. Edge Functions are invoked with `apikey` and `x-bridge-token` headers only — no `Authorization: Bearer`.
