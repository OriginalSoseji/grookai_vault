# LOCAL_COMMUNITY_FEED_V2 Wishlist Live Smoke

Status: PASS

## Scope

- Production linked database smoke for the v2 local community feed RPC.
- Uses a rollback-only wishlist fixture.
- No persistent wishlist, vault, image, price, identity, route, or geofence writes.

## Results

- Viewer: `imnotcesar`
- Function exists: true
- Authenticated execute grant: true
- Anonymous execute grant: false
- Baseline rows: 4
- Baseline wishlist matches: 0
- Post-fixture rows: 4
- Post-fixture wishlist matches: 2
- Selected row matched: true
- Selected match reason: viewer_wishlist

## Candidate

- Owner: `pokejavi`
- Card: Piplup (`GV-PK-PFL-098`)
- Source: `showcase`
- Distance bucket: `nearby`
- Already matched before fixture: false

## Public Safety

- No raw user IDs exposed: true
- No exact location exposed: true
- No private wishlist data exposed: true
- Forbidden columns: 0
- No persistent proof fixture rows: true
