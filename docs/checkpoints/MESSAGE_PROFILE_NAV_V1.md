# MESSAGE PROFILE NAV V1

## Purpose
Make the collector identity in the network message thread header open the existing public collector profile.

## Scope Lock
- Flutter mobile only
- thread header navigation only
- no messaging logic changes
- no profile architecture changes
- reuse the existing public collector route

## Audit
- exact widget owner: `lib/screens/network/network_thread_screen.dart`
- exact data fields available for name/slug/userId: `counterpartDisplayName`, `counterpartSlug`, `counterpartUserId` from `CardInteractionThreadSummary`
- existing route used elsewhere to open public profiles: `PublicCollectorScreen(slug: ...)`
- route input expected today: `slug`
- safe fallback: if `counterpartSlug` is null/empty, do nothing and avoid navigation
