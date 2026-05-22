# Grookai Vault iOS Beta Release

## Xcode Project

- Workspace: `ios/Runner.xcworkspace`
- Scheme: `Runner`
- Bundle ID: `com.cesar.grookaivault`
- Team ID: `DUADT25J5V`
- Display name: `Grookai Vault`
- Version: `1.0.0`
- Build: `2`
- Signing: Automatic
- Export compliance: `ITSAppUsesNonExemptEncryption = false`
- Runtime config: Xcode reads ignored `ios/Flutter/*Secrets.xcconfig` files for Supabase `DART_DEFINES`

## Local Xcode Runtime Config

The app will fail at launch if `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are missing. For Xcode runs and archives, generate local ignored xcconfig files:

```bash
ruby scripts/write_ios_xcode_secrets.rb
flutter build ios --config-only --release --build-name=1.0.0 --build-number=2
```

The first command writes:

- `ios/Flutter/DebugSecrets.xcconfig`
- `ios/Flutter/ReleaseSecrets.xcconfig`

These files are ignored by git. The committed `.example` files show the shape without storing secrets.

## Archive From Xcode

1. Open `ios/Runner.xcworkspace`.
2. Select the `Runner` scheme.
3. Select `Any iOS Device` as the destination.
4. Product > Archive.
5. In Organizer, choose the archive, then Distribute App.
6. Choose App Store Connect > Upload.
7. Keep automatic signing selected and confirm the `DUADT25J5V` team.

CLI export options live at `ios/ExportOptionsAppStore.plist` for later automation.

## App Store Connect Record

- App name: `Grookai Vault`
- Primary language: `English (U.S.)`
- Bundle ID: `com.cesar.grookaivault`
- SKU: `grookai-vault-ios`
- Primary category: `Lifestyle`
- Secondary category: `Social Networking`
- Content rights: The app displays collector-owned card data and user-generated collection content.
- Age rating notes: No gambling, no unrestricted web browsing, no explicit content by design.

## Beta App Information

Beta app description:

```text
Grookai Vault helps Pokemon card collectors organize their vault, browse sets, track collection progress, showcase public walls, and connect with other collectors.
```

What to test:

```text
Please test account sign-in, card search, vault browsing, public collector walls, Grookai Dex, set/master-set progress, drawer navigation, appearance mode switching, messaging entry points, and the scanner placeholder flow. The scanner is intentionally marked as under construction in this beta.
```

Feedback email:

```text
support@grookaivault.com
```

Beta review notes:

```text
The scanner tab currently shows an under-construction placeholder by design. Testers should use Search, Sets, and Vault flows to add and inspect cards. If reviewer credentials are required, use the demo account listed in the Sign-In Information section.
```

Sign-In Information:

```text
TODO: Create a dedicated App Review demo user in Supabase before external TestFlight review.
Username:
Password:
```

## App Store Listing Draft

Subtitle:

```text
Your Pokemon card vault
```

Promotional text:

```text
Track your collection, browse master sets, open public collector walls, and follow the cards that matter most.
```

Description:

```text
Grookai Vault is built for Pokemon card collectors who want a cleaner way to organize, inspect, and share their collection.

Search the card catalog, browse sets, track Grookai Dex progress, review master-set options, and keep your personal vault close at hand. Public collector walls make it easier to showcase cards, discover other collectors, and return to profiles by slug.

Early beta features include card search, vault views, public walls, collector discovery, messaging entry points, Grookai Dex, master-set progress, and an intentionally gated scanner surface while card scanning is rebuilt.
```

Keywords:

```text
pokemon,cards,collector,vault,trading cards,tcg,sets,dex,collection
```

Support URL:

```text
https://grookaivault.com/support
```

Marketing URL:

```text
https://grookaivault.com
```

Privacy Policy URL:

```text
https://grookaivault.com/privacy
```

## Privacy Details To Review In App Store Connect

Likely data types for the current app:

- Contact Info: email address for account sign-in and communication.
- Identifiers: user ID for account, vault, public wall, and messaging features.
- User Content: card photos, collection entries, public wall content, messages, and profile media.
- Usage Data: collection interactions and app activity used for app functionality.
- Diagnostics: crash logs and performance data from Apple/TestFlight.

Tracking:

```text
No third-party advertising tracking is currently intended.
```

## Before External TestFlight

- Create the App Store Connect app record.
- Confirm `com.cesar.grookaivault` is registered under the Apple Developer account.
- Create a dedicated demo reviewer account in Supabase.
- Confirm `support@grookaivault.com`, `/privacy`, and `/support` URLs exist or replace them.
- Upload build `1.0.0 (2)`.
- Add beta app description, What to Test, feedback email, and sign-in information.
- Add internal testers first.
- Add external tester group after the build processes; the first external build may go through Beta App Review.
