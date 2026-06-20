# TCG Mapping TCGdex -> TCGplayer Readiness V1

Audit-only readiness report. No DB writes, no migrations, no cleanup, no image writes.

## Summary

- fingerprint: `301f0fd37e9eebd23c3beab04e8792e067d5ba6d5e9d0a85b5ffdc20ebce50c4`
- generated_at: `2026-06-19T06:06:40.255Z`
- input_active_tcgdex_mappings: 22664
- input_active_tcgplayer_mappings: 14118
- missing_tcgplayer_candidates_scoped: 8686
- ready_to_insert: 3066
- no_product_id: 5468
- ambiguous_product_ids: 0
- conflicting_existing_external_id: 150
- fetch_error: 2

## Guardrails

- db_writes_performed: false
- migrations_created: false
- cleanup_performed: false
- image_writes_performed: false
- source: active TCGdex external mappings plus live TCGdex pricing payload product IDs
- target: missing active `external_mappings.source = tcgplayer` rows only

## TLS Note

This run used a local one-command Node TLS workaround because Windows Node could not verify the TCGdex certificate chain. The workaround is not persisted in code or configuration.

## Ready Sample

| set | number | name | card_print_id | tcgdex | tcgplayer |
| --- | --- | --- | --- | --- | --- |
| sv09 | 101 | Bombirdier | `9553a435-5e03-4398-9f04-f64c23284ce1` | `sv09-101` | `623528` |
| sv04 | 102 | Nacli | `83150d67-60cb-4f96-93d2-93ade5881bbf` | `sv04-102` | `523772` |
| sv04 | 104 | Garganacl | `a582bdb5-4e56-4348-8b5d-035a9fb0792f` | `sv04-104` | `523774` |
| sv04 | 127 | Ferroseed | `43300ce3-2353-41d0-b263-9e1fb175692f` | `sv04-127` | `523804` |
| sv04 | 103 | Naclstack | `72d7400b-fd67-4985-9378-98eff1e2f051` | `sv04-103` | `523773` |
| sv04 | 113 | Absol | `ed1ec152-addf-4f86-b159-e32cc5cbfa3c` | `sv04-113` | `523787` |
| sv04 | 124 | Roaring Moon ex | `727e3eaa-8f1f-457c-85ec-8da58bdf01b4` | `sv04-124` | `523800` |
| sv04 | 129 | Durant | `fb646318-b121-42aa-ac7f-554e3dc4d900` | `sv04-129` | `523806` |
| sv04 | 134 | Aegislash | `6f092ad8-88f0-4860-9c71-a622bf5dff6a` | `sv04-134` | `523813` |
| sv04 | 122 | Lokix | `e96423b2-4b56-48ee-a32f-d66cd5e03648` | `sv04-122` | `523797` |
| sv04 | 138 | Orthworm | `5c2595e8-5e81-4d07-b9d0-bc2ce488c857` | `sv04-138` | `523817` |
| sv04 | 139 | Gholdengo ex | `10d8582d-ef90-448b-933c-11154bea31e8` | `sv04-139` | `523818` |
| sv04 | 107 | Slither Wing | `164b4228-2d10-416e-a67c-86ad72df6ce1` | `sv04-107` | `523779` |
| sv04 | 170 | Professor Sada's Vitality | `79f69f10-a40c-4485-a0be-4b6bfab4d67a` | `sv04-170` | `523851` |
| sv04 | 132 | Doublade | `1381a124-8bc2-4da9-bdab-93353447bdef` | `sv04-132` | `523809` |
| sv04 | 105 | Klawf | `3b09e8f3-3438-4402-9f06-42d7f6e2db0e` | `sv04-105` | `523777` |
| sv04 | 114 | Purrloin | `aad885d8-e0bf-41a2-b7be-1827ff5b0d88` | `sv04-114` | `523788` |
| sv04 | 117 | Garbodor | `e0a5e3be-439d-43aa-8dec-b842bf8c3a05` | `sv04-117` | `523791` |
| sv04 | 111 | Golbat | `bb3020fe-b783-4e92-87e2-dc2b162353fb` | `sv04-111` | `523784` |
| sv04 | 101 | Nacli | `1a75127f-94a9-4c81-9c51-f0be8d6a87fc` | `sv04-101` | `523771` |
| sv04 | 131 | Honedge | `04921b45-a4d7-4237-a6b4-24386e13c0b9` | `sv04-131` | `523808` |
| sv04 | 121 | Morpeko | `c3e4974f-c021-4330-9663-7d94a74e4d9d` | `sv04-121` | `523796` |
| sv04 | 120 | Thievul | `4d52eeef-3157-400a-bbf7-7661b4fbfe62` | `sv04-120` | `523795` |
| sv04 | 135 | Aegislash ex | `82f30f6c-0abe-4178-9398-3df26d976736` | `sv04-135` | `523814` |
| sv04 | 116 | Trubbish | `4c8e0b1b-0b60-4066-ae5b-19d9371d4c55` | `sv04-116` | `523790` |

## Next Package

Recommended next package: `TCGMAP-01A-TCGDEX-TCGPLAYER-MAPPING-INSERTS` guarded dry-run only.
Package should insert only the `ready_to_insert` rows from this exact report fingerprint.

