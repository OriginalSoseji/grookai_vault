# Real Device Install Unblock V1

Date: 2026-04-07
Repo: `/Users/cesarcabral/grookai_vault`

## Current Environment State

- Working directory: `/Users/cesarcabral/grookai_vault`
- Git root: `/Users/cesarcabral/grookai_vault`
- Device visible to Flutter:
  - `Cesar’s iPhone`
  - UDID: `00008150-001C5DCA0A84401C`
  - iOS: `26.4`
- Device visible to Xcode/CoreDevice:
  - `Cesar’s iPhone (26.4) (00008150-001C5DCA0A84401C)`
- Local Flutter/Xcode state:
  - Flutter `3.41.6`
  - Xcode `26.4`
  - CocoaPods `1.16.2`
- Local codesigning identity available:
  - `Apple Development: ccabrl@gmail.com (F7KCUXKNFW)`
- Current iOS signing state:
  - `PRODUCT_BUNDLE_IDENTIFIER = com.cesar.grookaivault`
  - `DEVELOPMENT_TEAM = DUADT25J5V`
  - `CODE_SIGN_STYLE = Automatic`

## What Codex Fixed Automatically

- Confirmed the project is now using a founder-specific app bundle id instead of the default example id.
- Updated the remaining default test bundle ids to the same bundle prefix:
  - `com.cesar.grookaivault.RunnerTests`
- Re-ran device build/install checks after the project-side signing audit.
- Verified that a full device build now succeeds:
  - `xcodebuild ... -destination 'id=00008150-001C5DCA0A84401C' build -allowProvisioningUpdates`
  - Result: `BUILD SUCCEEDED`
- Verified the app is installed on the iPhone:
  - `xcrun devicectl device info apps --device ...`
  - Installed app found:
    - `Grookai Vault   com.cesar.grookaivault   1.0.0   1`
- Verified the app can be launched through CoreDevice tooling:
  - `xcrun devicectl device process launch --device ... com.cesar.grookaivault`
  - Result: launched successfully

## What Is Still Blocked

- `flutter run -d 00008150-001C5DCA0A84401C --debug` still does not complete a clean interactive debug handoff.
- The remaining blocker is no longer signing or provisioning.
- The remaining blocker is the local debug-launch handoff through Xcode automation:
  - Flutter reported:
    - `You may be prompted to give access to control Xcode.`
    - `Xcode is taking longer than expected to start debugging the app.`
    - `Error executing osascript: -2`
- This means the app is installable, but the fully automated `flutter run` debug launch path still needs local macOS/Xcode permission/interaction.

## Manual Founder Steps Remaining

### On iPhone

1. Keep the iPhone unlocked and connected by cable during the next debug-launch attempt.
2. If the phone shows any developer-use, trust-this-computer, or local-run confirmation prompt, approve it.
3. Confirm that the `Grookai Vault` app icon is present and opens.

### In Xcode / macOS

1. Open the workspace once:
   - `open ios/Runner.xcworkspace`
2. If macOS prompts to allow Terminal/Codex to control Xcode, approve it.
3. In Xcode, confirm the `Runner` target still shows:
   - Team: `DUADT25J5V`
   - Bundle Identifier: `com.cesar.grookaivault`
   - Signing: `Automatically manage signing`
4. If Xcode shows any first-run device-preparation or trust prompt for the iPhone, approve it.
5. If Flutter debug launch still hangs, use `Product > Run` in Xcode once on the connected phone to complete the first live launch path.

## Exact Next Commands To Run After Manual Steps

```bash
cd /Users/cesarcabral/grookai_vault
flutter devices
flutter run -d 00008150-001C5DCA0A84401C --debug
```

If Flutter debug launch still stalls, run:

```bash
cd /Users/cesarcabral/grookai_vault
open ios/Runner.xcworkspace
```

Then in Xcode:

1. Select `Cesar’s iPhone`
2. `Product > Run`

After the first successful Xcode launch, retry:

```bash
cd /Users/cesarcabral/grookai_vault
flutter run -d 00008150-001C5DCA0A84401C --debug
```
