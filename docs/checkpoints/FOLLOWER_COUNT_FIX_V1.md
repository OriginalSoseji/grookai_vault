# FOLLOWER COUNT FIX V1

## Purpose
Fix incorrect follower/following counts on the public collector profile.

## Count Source Audit
- owner file: `lib/services/public/public_collector_service.dart`
- service method: `loadPublicProfileBySlug()` -> `_loadFollowCounts()`
- source table/view: direct reads from `public.collector_follows`
- profile identity used: `public_profiles.user_id` resolved from the loaded profile slug
- current count fields: `PublicCollectorProfile.followingCount`, `PublicCollectorProfile.followerCount`
- likely failure path: direct `collector_follows` reads are subject to RLS and therefore do not return the public profile owner's full relationship graph for arbitrary viewers

## Raw Truth Audit
- profile slug: `wobis`
- profile user id: `47544b87-8c55-40df-b665-db9253e92c3c`
- expected follower count: `2`
- expected following count: `0`
- current UI count path: derived from direct `collector_follows` reads in `_loadFollowCounts()`
- mismatch explanation:
  - `collector_follows` grants `select` only to `authenticated`
  - policy `collector_follows_select_owner` uses `auth.uid() = follower_user_id`
  - that means follower counts on a public profile can only see rows where the current viewer is the follower, not the profile owner's true inbound follow rows
  - for `wobis`, raw truth is two follower rows (`pokejavi -> wobis`, `imnotcesar -> wobis`), but a signed-in viewer like `imnotcesar` could only see their own row through the current path, yielding `1` instead of `2`
