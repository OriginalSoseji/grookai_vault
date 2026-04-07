# Real Device Validation V1

Date: 2026-04-06
Repo: `/Users/cesarcabral/grookai_vault`

## Device Used

- `Cesar’s iPhone`
- Device id: `00008150-001C5DCA0A84401C`
- iOS: `26.4`

## Install Method Attempted

1. `flutter devices` to confirm device visibility
2. `flutter run -d 00008150-001C5DCA0A84401C --debug` for direct local install
3. `xcodebuild -workspace ios/Runner.xcworkspace -scheme Runner -configuration Debug -sdk iphoneos build -allowProvisioningUpdates` to separate device trust issues from project signing issues

## Signing Notes

- The iPhone is visible to Flutter and Xcode tooling.
- Direct device run is currently blocked by device-side development readiness:
  - Flutter reported that Developer Mode must be enabled on the device.
  - Flutter also reported that the device must trust this Mac for local development.
- The Xcode project is also not yet provisionable from this Mac:
  - `PRODUCT_BUNDLE_IDENTIFIER` is still `com.example.grookaiVault`
  - `DEVELOPMENT_TEAM` is not configured in the iOS project
  - `security find-identity -v -p codesigning` returned `0 valid identities found`
  - Xcode preferences on this Mac do not currently show a signed-in Apple developer account
- Result: the app was not installable to the real iPhone from this machine in this pass.

## Validated Flows

- None on real hardware in this pass, because install was blocked before app launch.

## Broken / Blocked Flows

- `App install to founder iPhone`: `BROKEN`
  - blocked by missing Developer Mode / trust on device
  - blocked by missing Xcode signing identity / development team on Mac
- All requested real-device flow validation items remain blocked behind install:
  - launch to Wall home
  - bottom nav feel
  - Explore curated/search
  - Vault smart views
  - Card Detail + zoom
  - Network stream + contact
  - Inbox + thread
  - Account
  - Import Collection
  - Submit Missing Card
  - Scan tab
  - Camera capture
  - Quad adjust
  - Picker behavior
  - Follow / unfollow

## Feels-Wrong Findings

- No app-runtime feels-wrong findings were recorded on real hardware, because the app never launched on the device.

## Next Bug-Fix Priorities From Real Hardware Evidence

1. Enable Developer Mode on the founder’s iPhone and reconnect with the device unlocked.
2. Sign into Xcode on this Mac with the founder’s Apple developer account or personal development Apple ID.
3. Set a real development team in the iOS Runner target.
4. Replace the default bundle identifier with a unique founder-specific development identifier before retrying install.
5. Re-run this exact validation pass once install succeeds.
