# WALL_SHELL_RECOVERY_V1

## Objective
Restore the newer wall/profile shell from commit 8010d10 without touching scanner/backend work.

## Source Commit
- `8010d10 feat(app): close core mobile parity across wall vault network and account`

## Files Restored
- `lib/main.dart`
- `lib/main_shell.dart`
- `lib/main_vault.dart`
- `lib/widgets/app_shell_metrics.dart`
- `lib/widgets/card_surface_artwork.dart`
- `lib/widgets/card_surface_price.dart`
- `lib/widgets/card_view_mode.dart`
- `lib/widgets/contact_owner_button.dart`
- `lib/widgets/follow_collector_button.dart`

## Backup
- `temp/wall_shell_restore_backup_20260408_101412`

## Verification
- git status after restore:
  - no new scanner/backend file changes were introduced by the restore step
  - none of the targeted shell files appeared as changed after restore
- `git diff --name-only HEAD 8010d10 -- $(cat temp/wall_shell_restore_file_list.txt)`:
  - empty
  - conclusion: the targeted shell file set already matched commit `8010d10`
- `flutter run -d "iPhone 17 Pro"`:
  - pass
- shell restored visually:
  - already present in source; restore was effectively a no-op for the targeted files
- scanner/backend untouched:
  - yes

## Notes
- No dependency refresh was needed in this pass.
- Source evidence confirms the newer wall/profile shell exists in the real repo:
  - `lib/main_shell.dart` contains `My Wall`
  - `lib/screens/account/account_screen.dart` contains `My Wall`
  - `lib/screens/public_collector/public_collector_screen.dart` contains `In Play`, `Followers`, and `Following`
- Remaining UI mismatch, if any, is not caused by drift in the targeted `8010d10` shell file set.
