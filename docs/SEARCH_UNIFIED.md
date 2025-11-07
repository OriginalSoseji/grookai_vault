# Unified Search (Numbers + Names)

Supported inputs:
- "49", "049", "049/203"
- "Pikachu 49", "Pikachu 049/203", "PIKACHU #049"
- Works without set code; optional per-set RPC exists.

How it works:
- `gv_num_int()` extracts the leading card number (e.g., 49).
- `gv_total_int()` extracts the denominator if present (e.g., 203).
- `gv_norm_name()` normalizes names for trigram matching.
- `search_cards(q, limit)` ranks by number match, total match, and name similarity.

Client usage (PostgREST):
- POST /rest/v1/rpc/search_cards
  Body: {"q":"Pikachu 049/203","limit":50}
- Optional per-set:
  POST /rest/v1/rpc/search_cards_in_set
  Body: {"q":"49","set_code":"sv8","limit":50}

