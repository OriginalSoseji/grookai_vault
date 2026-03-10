# SET_REPAIR_RUNNER_V1

## Purpose
`backend/tools/set_repair_runner.mjs` automates the auto-safe subset of `SET_REPAIR_PROTOCOL_V1` for a set code.

Automated actions:
- Numeric canonical mapping backfill into `public.external_mappings`
- TG routing mapping into `<set>tg` canonical prints when TG lane is present
- Reverse printing generation into `public.card_printings` with `finish_key='reverse'`
- Post-check coverage v2 assertion (`still_unmapped = 0`) before commit

Out of scope:
- Canon creation (new `card_prints` rows)
- Suffix lane alias handling (`50a`, `50b`, etc.)
- Image auto-repair updates
- Schema changes or migrations

## Safety Model
- Default mode is dry run (`--dry-run` implicit).
- Writes happen only with `--apply`.
- Caller must provide exactly one selector:
  - `--set <code>`
  - `--all-auto-safe`
- In apply mode, writes are wrapped in one transaction per set (`BEGIN/COMMIT`, rollback on any failed assertion).

Hard stop rules (no writes for that set):
- Missing rows contain non-auto-safe localId shapes (suffix/other) outside numeric or TG lanes
- TG lane exists but `<set>tg` subset set is missing
- TG lane exists but canonical TG prints are missing in `<set>tg`
- RC prefix risk exists (`cp.number ~ '^RC[0-9]+$'` with blank `variant_key`)
- Numeric/TG/reverse joins are ambiguous
- Numeric/reverse joins are unmatched (canon gap; canon creation is not attempted)
- Numeric-lane TG image contamination exists (`image_url ILIKE '%/TG%'`)

Auto-safe definition used by runner:
- `still_unmapped > 0`
- zero stop reasons

## Connection + Environment
- Primary DB connection: `DATABASE_URL`
- Fallback accepted by runner: `SUPABASE_DB_URL`
- Prints database identity at startup:
  - `current_database()`
  - `inet_server_addr()`
  - `inet_server_port()`
  - `current_user`

## DATABASE_URL Poison (ENOTFOUND base)
- Symptom: runner attempts a poisoned `DATABASE_URL` target and fails with host resolution errors like `ENOTFOUND base`.
- Fix:
  - Remove `Env:\DATABASE_URL` in the active shell.
  - Remove User-scope `DATABASE_URL` so new shells do not inherit it.
  - Set `SUPABASE_DB_URL` explicitly for the intended target.
- Guard script: run `scripts/env_audit_db_poison.ps1` before repair runs.
- Note: Codex execution env and standalone PowerShell env can differ; verify in a fresh shell.

## CLI
```bash
node backend/tools/set_repair_runner.mjs --set swsh12 --dry-run
node backend/tools/set_repair_runner.mjs --set swsh12 --apply
node backend/tools/set_repair_runner.mjs --all-auto-safe --dry-run
node backend/tools/set_repair_runner.mjs --all-auto-safe --apply
```

Optional flags:
```bash
--limit 10
--include-reverse true|false      # default true
--include-tg-routing true|false   # default true
```

## Output Contract
Per set output includes:
- `preflight`
  - `still_unmapped`
  - `missing_numeric`
  - `missing_tg`
  - `missing_suffix`
  - `missing_other`
  - `has_tg_subset_set` / `tg_prints_present` (when TG lane exists)
  - `has_rc_prefix_rows`
  - `rc_blank_variant_count`
- `plan`
  - `would_insert_external_mappings_count`
  - `would_insert_tg_mappings_count`
  - `would_create_reverse_printings_count`
- `apply` (apply mode only)
  - `inserted_external_mappings_count`
  - `inserted_tg_mappings_count`
  - `inserted_reverse_printings_count`
  - `post_still_unmapped`

If stopped:
- Prints deterministic `STOP` record
- Includes exact SQL snippet for diagnosis
- Includes manual pointer to `docs/playbooks/SET_REPAIR_PROTOCOL_V1.md` section

## Example Output (Closed Set, Dry Run)
```text
connection database=postgres server_addr=10.168.175.208/32 server_port=5432 db_user=postgres mode=dry-run
features external_printing_mappings=true card_printings=true finish_keys=true admin_change_checkpoints=true include_reverse=true include_tg_routing=true

=== set=swsh12 ===
preflight still_unmapped=0 missing_numeric=0 missing_tg=0 missing_suffix=0 missing_other=0 has_tg_subset_set=n/a tg_prints_present=n/a has_rc_prefix_rows=0 rc_blank_variant_count=0
plan would_insert_external_mappings_count=0 would_insert_tg_mappings_count=0 would_create_reverse_printings_count=0
status set=swsh12 CLOSED still_unmapped=0 mode=dry-run no_writes
```

## Example Output (Auto-safe Candidate, Dry Run)
```text
=== set=col1 ===
preflight still_unmapped=11 missing_numeric=11 missing_tg=0 missing_suffix=0 missing_other=0 has_tg_subset_set=n/a tg_prints_present=n/a has_rc_prefix_rows=0 rc_blank_variant_count=0
plan would_insert_external_mappings_count=11 would_insert_tg_mappings_count=0 would_create_reverse_printings_count=95
status set=col1 dry-run auto-safe
```

## When It Stops: Next Action Map
- `suffix_lane_requires_manual`: use `SET_REPAIR_PROTOCOL_V1` §9
- `other_lane_requires_manual`: use `SET_REPAIR_PROTOCOL_V1` §3 classification and lane routing
- `tg_subset_missing`, `tg_subset_prints_missing`, `tg_mapping_ambiguous`, `tg_mapping_unmatched`: use §4
- `rc_lane_unisolated`: use §5
- `canon_gap_numeric`, `numeric_mapping_ambiguous`: use §6 and §7
- `reverse_tables_missing`, `reverse_finish_key_missing`, `reverse_mapping_ambiguous`, `reverse_mapping_unmatched`: use §8
- `image_contamination_requires_manual_repair`: use §10

## Idempotency Notes
- Mapping inserts use `ON CONFLICT (source, external_id) DO NOTHING`
- Reverse generation uses `ON CONFLICT DO NOTHING`
- Re-running `--apply` on already-fixed sets yields zero inserts with `post_still_unmapped=0`

## Checkpoints
- If `public.admin_change_checkpoints` exists, the runner attempts checkpoint insertion with label:
  - `SET_REPAIR_RUNNER_V1:<set_code>:dry`
  - `SET_REPAIR_RUNNER_V1:<set_code>:apply`
- If checkpoint insertion cannot be completed, the runner skips it silently.
