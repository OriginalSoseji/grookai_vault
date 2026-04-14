# PUBLIC RELATIONSHIP LIST FIX V1

## Purpose
Fix public follower/following list screens so they use a public-safe relationship source and match the truthful header counts.

## Path Audit
- followers list owner file:
  - `lib/screens/public_collector/public_collector_relationship_screen.dart`
- following list owner file:
  - `lib/screens/public_collector/public_collector_relationship_screen.dart`
- current service path:
  - `PublicCollectorService.fetchFollowerCollectors(...)`
  - `PublicCollectorService.fetchFollowingCollectors(...)`
  - both route through `_fetchRelationshipCollectors(...)`
- current source table/view/rpc:
  - direct `.from('collector_follows')` reads in `lib/services/public/public_collector_service.dart`
  - counts already use `public_collector_follow_counts_v1`
- likely failure path:
  - relationship lists still depend on direct `collector_follows` reads from the public mobile path
  - this is inconsistent with the fixed header counts, which already use a public-safe RPC

## Truth Comparison
- profile slug:
  - `imnotcesar`
- profile user id:
  - `03e80d15-a2bb-4d3c-abd1-2de03e55787b`
- raw followers:
  - `1`
- raw following:
  - `2`
- current list path result:
  - followers direct-table read under app auth returned `0`
  - following direct-table read under app auth returned `2`
- current header count result:
  - follower count RPC returned `1`
  - following count RPC returned `2`
- mismatch explanation:
  - `collector_follows` select policy is `auth.uid() = follower_user_id`
  - follower lists for a viewed public profile are blocked unless the signed-in viewer is also the follower for each row
  - this is why `wobis` also reproduced as partial truth: raw followers `2`, app list followers `1`

## Public-Safe Source Contract
- source chosen:
  - new public RPC returning relationship rows with joined public profile data
- why it is public-safe:
  - `security definer` reads `collector_follows` server-side instead of relying on viewer-scoped table access
  - mobile only receives already-shaped public relationship rows
- fields returned:
  - `user_id`
  - `slug`
  - `display_name`
  - `avatar_path`
  - `followed_at`
- how it maps to current list UI:
  - direct 1:1 mapping into `PublicCollectorRelationshipRow`
  - existing list layout and tap-to-profile navigation can stay unchanged

## Verification
- migration applied:
  - `public_collector_relationship_rows_v1`
- service result after fix:
  - `imnotcesar` followers RPC rows: `1`
  - `imnotcesar` following RPC rows: `2`
  - `wobis` followers RPC rows: `2`
  - `wobis` following RPC rows: `0`
- header/list consistency:
  - verified against `public_collector_follow_counts_v1`
  - list lengths now match header counts for the audited profiles
- runtime capture:
  - followers list screenshot captured for `imnotcesar`
  - following list screenshot captured for `imnotcesar`
  - tap-through to `/u/wobis` public profile captured from the relationship list flow
