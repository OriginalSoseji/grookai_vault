# Search QA — Numbers and Names

## Inputs that should work
- 49
- 049
- 049/203
- pika 49
- pika 049/203
- pikachu 049

## Server behaviors
- search_cards(q) parses numbers (`gv_num_int`, `gv_total_int`) and normalizes names (`gv_norm_name`).
- Ranking boosts short name similarity (e.g., `pika` vs `pikachu`).

## Quick PostgREST checks
```
POST /rest/v1/rpc/search_cards
{"q":"Pikachu 049/203","limit":50}

POST /rest/v1/rpc/search_cards_in_set
{"q":"49","set_code":"sv8","limit":50}
```

## Fallback
- If RPC is missing, query `v_cards_search_v2` with `name_norm ilike *term*` and `number_int eq n`.

