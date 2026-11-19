# Mobile Binder Build 554 Checkpoint

## Finding

The Samsung SM-S908U (`R5CT3291F6E`) is running `com.grookai.vault` build 552.
Binder refinement code is already on `main` and is included in the merged
mobile release source: custom checklist editing, artwork and details modes,
drag arrangement, persistent grid sizing, Binder library search and sorting,
and web parity. The installed 552 build predates that source, which is why the
visual updates are not visible on the phone.

The prior CI build-553 APK was built from the merged source but uses a release
signer that cannot update the Samsung's debug-signed install. The local Android
debug certificate matches the phone's installed signer, so a local 554 debug
APK can update in place after the mandatory version/signer preflight. No app
data has been cleared or removed.

## Paired baseline

- `pubspec.yaml` and iOS App Store Connect metadata are synchronized at
  `1.0.0+554`.
- Both platforms must be rebuilt from the same merged source commit.
- The current Android build is for same-signer device verification; it does not
  count as a paired release until iOS build 554 is archived, uploaded, and read
  back from App Store Connect.
- Tailscale ping to `cesars-macbook-pro-2` timed out during this checkpoint.
- The first local 554 debug APK omitted the `SUPABASE_URL` and
  `SUPABASE_PUBLISHABLE_KEY` Dart defines. It passed package/version/signer
  preflight and installed without clearing data, but showed the guarded startup
  failure screen. Build 555 is being prepared with the production endpoint and
  public publishable key supplied through the same Dart defines as CI.

## Next evidence

- Build configured Android 555 and pass
  `scripts/android_update_preflight.ps1` before installing over build 554.
- Verify Binder artwork, arrangement, grid sizing, and checklist navigation in
  the installed app while preserving the existing account and collection.
- Reconnect to the Mac, then archive and upload iOS 554 from the same merged
  source commit and record App Store Connect processing readback.
