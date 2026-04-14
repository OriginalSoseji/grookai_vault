# APP_SHELL_RECOVERY_AUDIT_V1

| Missing import | Exists in HEAD | Exists in repo history | Likely source commit/branch | Recovery action |
| --- | --- | --- | --- | --- |
| `lib/screens/account/account_screen.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`, retained in `4e0fc90`) | restore from specific branch tip |
| `lib/screens/compare/compare_screen.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/screens/network/network_inbox_screen.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/screens/sets/public_set_detail_screen.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/screens/sets/public_sets_screen.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/screens/vault/vault_manage_card_screen.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`, updated in `4e0fc90`) | restore from specific branch tip |
| `lib/services/public/card_surface_pricing_service.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/services/public/compare_service.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/services/public/public_collector_service.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`, updated in `4e0fc90`) | restore from specific branch tip |
| `lib/services/public/public_sets_service.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/widgets/card_surface_artwork.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`, updated in `4e0fc90`) | restore from specific branch tip |
| `lib/widgets/card_surface_price.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`, updated in `4e0fc90`) | restore from specific branch tip |
| `lib/widgets/card_view_mode.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`, updated in `4e0fc90`) | restore from specific branch tip |
| `lib/widgets/app_shell_metrics.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/main_shell.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |
| `lib/main_vault.dart` | no | yes | `checkpoint/app-milestone-v1` (`8010d10`) | restore from specific branch tip |

## Decision
- Chosen path: `A`
- Why: the missing real-shell files are not present in `HEAD`, but they do exist on the local branch `checkpoint/app-milestone-v1`, and that branch tip contains the full shell support set needed by the current `lib/main.dart`.

## Additional Missing Shell Support Files
- The current worktree is also missing additional `lib/` files that exist on `checkpoint/app-milestone-v1` and are likely required by the restored shell/support surfaces:
  - `lib/screens/account/following_screen.dart`
  - `lib/screens/account/import_collection_screen.dart`
  - `lib/screens/account/submit_missing_card_screen.dart`
  - `lib/screens/gvvi/public_gvvi_screen.dart`
  - `lib/screens/identity_scan/identity_scanner_ui_mapper.dart`
  - `lib/screens/network/network_thread_screen.dart`
  - `lib/screens/vault/vault_gvvi_screen.dart`
  - `lib/services/account/account_profile_service.dart`
  - `lib/services/import/collection_import_service.dart`
  - `lib/services/navigation/grookai_web_route_service.dart`
  - `lib/services/network/card_interaction_service.dart`
  - `lib/services/network/network_stream_service.dart`
  - `lib/services/public/collector_follow_service.dart`
  - `lib/services/public/following_service.dart`
  - `lib/services/vault/vault_gvvi_service.dart`
  - `lib/services/warehouse/warehouse_submission_service.dart`
  - `lib/widgets/contact_owner_button.dart`
  - `lib/widgets/follow_collector_button.dart`
  - `lib/widgets/scanner/identity_scanner_bottom_panel.dart`
  - `lib/widgets/scanner/identity_scanner_overlay.dart`
