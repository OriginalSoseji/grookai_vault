FOLLOW ACTION V1

Purpose

Add a real Follow / Following action to public collector profiles using the existing follow relationship system.

Capability Audit
- profile header owner: `lib/screens/public_collector/public_collector_screen.dart` via `_PublicCollectorHeader`
- existing follow service owner: `lib/services/public/collector_follow_service.dart`
- current relationship read path: `CollectorFollowService.fetchFollowState(...)`
- current follow mutation path: `CollectorFollowService.followCollector(...)`
- current unfollow mutation path: `CollectorFollowService.unfollowCollector(...)`
- missing pieces if any: no backend/schema gap; mobile header does not currently load or expose follow state/action

Profile Context Rule
- self detection path: compare `Supabase.instance.client.auth.currentUser?.id` to `PublicCollectorProfile.userId`
- viewed user id source: `PublicCollectorSurfaceResult.profile.userId`
- follow state source: `CollectorFollowService.fetchFollowState(...)` for signed-in viewer vs viewed profile owner
