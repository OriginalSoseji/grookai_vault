# LOCAL_COMMUNITY_FEED_V1 Phase 3 RPC Proof

Status: PASS

## Scope

- Authenticated local community feed RPC/read model only.
- No UI implementation.
- No DB writes by this proof script.

## Results

- Function exists: true
- Authenticated execute grant: true
- Anonymous execute grant: false
- Public execute grant: false
- Anonymous rejected: true (28000)
- Viewer: `imnotcesar`
- Candidate rows returned: 4
- No raw user IDs exposed: true
- No exact location exposed: true
- Parent card route targets only: true

## Public Columns

- `feed_item_id`
- `source_type`
- `owner_slug`
- `owner_display_name`
- `owner_avatar_path`
- `gv_id`
- `card_name`
- `set_code`
- `set_name`
- `card_number`
- `intent`
- `image_url`
- `display_image_kind`
- `locality_label`
- `distance_bucket`
- `relationship_context`
- `created_at`
- `route_target`

## Safety

- No exact coordinates.
- No geohash prefix in the response.
- No raw owner user IDs.
- Child public routes remain disabled; feed rows route to parent card routes.
