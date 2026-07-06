# Market Listing Title Retarget Repair V1

- Mode: `plan_only_no_writes`
- Applied: `false`
- Retargeted candidates found: `38570`
- Inserted candidates: `0`
- Existing corrected candidates skipped: `0`

## Target Regression

```json
{
  "gv_id": "GV-PK-ASC-276",
  "corrected_candidate_count": 3,
  "insertable_candidate_count": 3,
  "sample": [
    {
      "id": "efeda4b6-b5aa-5565-1cb8-43892f5e01ef",
      "source_listing_id": "v1|117256153402|0",
      "candidate_hash": "8df347096908694b10819b54f099a419d3c7b9a39e3c20c27e6312ce15522970",
      "title_retarget": {
        "version": "MEE_EBAY_TITLE_RETARGET_EXACT_SET_NUMBER_V1",
        "status": "title_retargeted_exact_set_number",
        "retargeted": true,
        "score": 120,
        "reasons": [
          "title_has_card_name",
          "title_has_exact_number_total",
          "title_has_set_context",
          "collector_rarity_bonus"
        ],
        "original_gv_id": "GV-PK-CC-5",
        "original_card_print_id": "80458cce-def2-439c-a567-7e8a384e2fa1",
        "resolved_gv_id": "GV-PK-ASC-276",
        "resolved_card_print_id": "737f427f-f6d8-405b-a5ac-bbdc5d349b04"
      }
    },
    {
      "id": "c1f8930f-88ef-3cf0-39aa-e6c5082c54a4",
      "source_listing_id": "v1|117256153402|0",
      "candidate_hash": "3534305d05a4269e2e51fdc05a75e4c69aef44bf9ae3464270582a867aeb5c34",
      "title_retarget": {
        "version": "MEE_EBAY_TITLE_RETARGET_EXACT_SET_NUMBER_V1",
        "status": "title_retargeted_exact_set_number",
        "retargeted": true,
        "score": 120,
        "reasons": [
          "title_has_card_name",
          "title_has_exact_number_total",
          "title_has_set_context",
          "collector_rarity_bonus"
        ],
        "original_gv_id": "GV-PK-CC-5",
        "original_card_print_id": "80458cce-def2-439c-a567-7e8a384e2fa1",
        "resolved_gv_id": "GV-PK-ASC-276",
        "resolved_card_print_id": "737f427f-f6d8-405b-a5ac-bbdc5d349b04"
      }
    },
    {
      "id": "2f25afc7-4c74-0278-f39a-d454cc7c73c0",
      "source_listing_id": "v1|168483553132|0",
      "candidate_hash": "b97ef363e4f0bb596d3ec8235d8b4bbb30cf4976f9c1a8f5500c9467ad73537e",
      "title_retarget": {
        "version": "MEE_EBAY_TITLE_RETARGET_EXACT_SET_NUMBER_V1",
        "status": "title_retargeted_exact_set_number",
        "retargeted": true,
        "score": 120,
        "reasons": [
          "title_has_card_name",
          "title_has_exact_number_total",
          "title_has_set_context",
          "collector_rarity_bonus"
        ],
        "original_gv_id": "GV-PK-TK-tk-ex-latio-6",
        "original_card_print_id": "a9b48a66-712b-44da-9db4-a6a3feba1253",
        "resolved_gv_id": "GV-PK-ASC-276",
        "resolved_card_print_id": "737f427f-f6d8-405b-a5ac-bbdc5d349b04"
      }
    }
  ]
}
```

## Boundary

```json
{
  "provider_calls": false,
  "source_fetches": false,
  "db_writes": false,
  "market_listing_card_candidates_writes": false,
  "pricing_observations_writes": false,
  "ebay_active_prices_latest_writes": false,
  "public_pricing_views": false,
  "app_visible_pricing": false,
  "public_price_rollups": false,
  "identity_table_writes": false,
  "vault_writes": false,
  "image_writes": false,
  "deletes": false,
  "upserts": false,
  "merges": false,
  "migrations": false,
  "global_apply": false
}
```

## Findings

- none
