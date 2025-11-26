# Remote Import – Pokémon (Project ref: ycdxbpibncqcchqiihfz)

Goal: Populate the remote Supabase project (currently empty) using the existing ingestion pipeline (PokemonAPI + TCGdex) with **service-role** access. No schema changes.

## Preconditions
- Migrations applied to the target project (run `supabase db push` against ref `ycdxbpibncqcchqiihfz` if unsure).
- Service-role key for the target project (not committed).
- Node 18+ available (same as used for local ingestion).

## Required Env Vars (set in the shell before running)
- `SUPABASE_URL` — e.g., `https://ycdxbpibncqcchqiihfz.supabase.co`
- `SUPABASE_SECRET_KEY` — service-role key for that project
- `GV_ENV` — set to `remote` (informational for logs/tools)
- Optional: `POKEMONAPI_API_KEY` if you use a key

## One-shot remote import (PowerShell)
```powershell
cd C:\grookai_vault

$env:SUPABASE_URL = "https://ycdxbpibncqcchqiihfz.supabase.co"
$env:SUPABASE_SECRET_KEY = "<service_role_for_that_project>"
$env:GV_ENV = "remote"
# Optional: $env:POKEMONAPI_API_KEY = "<your_key>"

pwsh scripts/import_pokemon_remote.ps1
```

## What the script does
Runs existing workers against the provided Supabase URL/key:
1) Import sets (PokemonAPI, then TCGdex)
2) Import cards (PokemonAPI, then TCGdex)
3) Normalize (PokemonAPI, then TCGdex)
4) Enrichment (traits/types/rarity)

## Safety Notes
- Idempotent: workers upsert via raw_imports + normalize; safe to re-run.
- Remote targeting is entirely controlled by `SUPABASE_URL`/`SUPABASE_SECRET_KEY`; no defaults baked into the script.
- Do **not** run with wrong credentials; this will write to whichever project you point at.
