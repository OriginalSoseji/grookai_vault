# App Store Connect Automation

This repo can now drive most of the iOS release flow without clicking through App Store Connect.

## One-Time Apple API Key

Create an App Store Connect API key in App Store Connect, then place the downloaded key here:

```bash
mkdir -p ~/.appstoreconnect/private_keys
mv ~/Downloads/AuthKey_<KEY_ID>.p8 ~/.appstoreconnect/private_keys/
```

Set the key metadata in your shell:

```bash
export ASC_KEY_ID="<KEY_ID>"
export ASC_ISSUER_ID="<ISSUER_ID>"
```

The script will default to `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`. Use `ASC_KEY_PATH` if the file lives somewhere else.

## Reviewer Values

App Review also needs real contact and demo-account values. Keep them out of git:

```bash
export ASC_REVIEW_CONTACT_PHONE="+1..."
export ASC_DEMO_USERNAME="reviewer@grookaivault.com"
export ASC_DEMO_PASSWORD="..."
```

## Commands

Upload the current archive:

```bash
ruby scripts/app_store_connect/ios_release_automation.rb upload
```

Apply metadata, age rating, free pricing, review notes, TestFlight text, and attach the configured build after Apple processing finishes:

```bash
ruby scripts/app_store_connect/ios_release_automation.rb apply --wait-build
```

Upload the configured iPhone and iPad screenshots:

```bash
ruby scripts/app_store_connect/ios_release_automation.rb screenshots
```

Run the full flow from archive creation through metadata:

```bash
ruby scripts/app_store_connect/ios_release_automation.rb release --wait-build
```

Check the current App Store Connect version/build state:

```bash
ruby scripts/app_store_connect/ios_release_automation.rb status
```

Non-secret release metadata lives in:

```text
docs/release/app_store_connect_ios_1_0.json
```

App Privacy data-type disclosures are still completed in App Store Connect. Apple exposes the privacy policy URL through the public API, but the nutrition-label data-type questionnaire remains a web form. The current iOS 1.0 answer sheet is:

```text
docs/release/app_store_privacy_ios_1_0.md
```
