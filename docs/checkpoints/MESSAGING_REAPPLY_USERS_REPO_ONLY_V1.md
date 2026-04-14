# MESSAGING REAPPLY USERS REPO ONLY V1

## Repo Guard Proof
- required repo: `/Users/cesarcabral/grookai_vault`
- current working directory:
  - before switch: `/Users/cesarcabral/Desktop/grookai_vault`
  - active repo for this pass: `/Users/cesarcabral/grookai_vault`
- `.git` present in Users repo: yes
- Desktop repo excluded: yes

## Freeze Snapshot
- current Explore polish artifacts present:
  - `lib/main.dart` still contains `View your copy`, `Add another copy`, `GVID`, `Share`, wall-match grid constants, `Trending now`, `Search results`, and `Browse sets`
- current Manage Card tab artifacts present:
  - `lib/screens/vault/vault_manage_card_screen.dart` contains `Overview`, `Wall`, and `Copies` tabs plus collector-intent UI
- current Wall/profile artifacts present:
  - `lib/main_shell.dart` renders My Wall through `PublicCollectorScreen(showAppBar: false)`
  - `lib/screens/public_collector/public_collector_screen.dart` already has live follower/following links and preserved wall grid styling
- current messaging files already present or absent:
  - present: `lib/screens/network/network_inbox_screen.dart`
  - present: `lib/screens/network/network_thread_screen.dart`
  - present: `lib/services/network/card_interaction_service.dart`
  - present: `lib/widgets/contact_owner_button.dart`
  - absent: dedicated `messages_screen.dart`, `message_thread_screen.dart`, `message_compose_screen.dart`
- safe additive insertion points:
  - global inbox icon in `lib/main_shell.dart`
  - public wall tile destination in `lib/screens/public_collector/public_collector_screen.dart`
  - contextual inquiry CTA copy in `lib/screens/gvvi/public_gvvi_screen.dart`

## Existing Messaging/Public Surface Audit
- shell action owner:
  - `lib/main_shell.dart`
- wall screen owner:
  - `lib/screens/public_collector/public_collector_screen.dart`
- wall-card tap destination today:
  - public wall cards currently push `CardDetailScreen`
- inbox/message screens present? yes/no:
  - yes
  - inbox: `NetworkInboxScreen`
  - thread: `NetworkThreadScreen`
  - compose: existing card-anchored bottom-sheet composer inside `ContactOwnerButton`
- public GVVI present? yes/no:
  - yes
  - `lib/screens/gvvi/public_gvvi_screen.dart`
- message service present? yes/no:
  - yes
  - `CardInteractionService.sendMessage` writes card-anchored interactions using `vault_item_id` and `card_print_id`
- minimal additive plan:
  - keep the current shell and Explore/Wall polish intact
  - add a global inbox entry in the shell app bar without changing layout composition
  - route public wall cards to `PublicGvviScreen` when `gvviId` exists, with honest fallback to `CardDetailScreen` only when exact-copy context is unavailable
  - keep messaging card-anchored by reusing `ContactOwnerButton`
  - rename the public exact-copy CTA to `Inquire about this card` instead of building a second message path
