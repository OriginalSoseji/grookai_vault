# Public Wall MVP

Overview
- Readable by anyone; writable by signed-in users.
- Tables: wall_profiles, wall_posts, wall_media, wall_likes, wall_follows.
- View: v_wall_posts_public (active posts with profile + cover).
- RLS: Owner modify; public read (where active).
- Storage: bucket `wall` — public read, auth write with path rules.

Edge Functions
- wall_publish: create/update post; toggle is_active.
- wall_list: list public posts with pagination.
- wall_user_feed: personalized list (own + followees).

Flutter UI
- Entry points (flagged by GV_ENABLE_WALL):
  - Profile sheet → Public Wall
  - UnifiedSearchSheet overflow → Add to Wall
- Pages:
  - WallFeedPage (MVP placeholder list)
  - WallPostComposer (MVP placeholder composer)
  - WallProfilePage (MVP placeholder profile)

Env/Flags
- GV_ENABLE_WALL=true (dev default)

Limitations
- Minimal validation and moderation.
- Media upload rules must be configured in Storage policies.
- Filters/sorting are basic in MVP.

