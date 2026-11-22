# Mobile Release Continuity V2

Status: Active release contract.

## Goal

Keep Android and iOS beta candidates on one source revision and one marketing
version/build number. Android updates must preserve existing app data and must
prove package, version, signer identity, and any signing-key rotation lineage
before installation.

## Paired build identity

- `pubspec.yaml` is the shared marketing-version and build-number authority.
- Android and iOS release candidates use the same marketing version, build
  number, and merged source commit.
- Android CI records package ID, version, build number, source commit, current
  signer SHA-256, and verified certificate lineage in
  `mobile-release-manifest.json`.
- A manually dispatched build-number override is a candidate only. Before it
  becomes the release baseline, update `pubspec.yaml` and App Store Connect
  metadata together, then rebuild both platforms from the same merged commit.
- Read the installed version on the target Samsung before choosing a candidate
  build number. The candidate build must be greater than the installed version;
  never reuse a cached artifact or an older baseline because its CI run succeeded.

## Android update safety

Before installing over an existing `com.grookai.vault` app, run
`scripts/android_update_preflight.ps1 -ApkPath <apk>` with the device connected.

The preflight permits an in-place update only when all of these conditions hold:

1. Candidate and installed package IDs are `com.grookai.vault`.
2. The candidate version code is greater than the installed version code.
3. The candidate signature is cryptographically verified and uses the approved
   release certificate.
4. Either the installed signer exactly equals the candidate signer, or the
   candidate contains a verified Android signing-certificate lineage from the
   installed signer to the approved release signer, with the installed-data
   capability granted to the old signer.

The lineage must be generated with `apksigner` from both private keys. Never
trust a detached lineage file or a manifest claim alone. The preflight reads
the lineage embedded in the candidate APK and verifies its signatures using
Android's `apksig` verifier.

For a one-time development-to-release migration, only the recorded installed
certificate may be included as the old signer. Store that old private key as a
temporary GitHub Actions secret, use it only for the explicitly dispatched
rotation build, then delete the temporary secret after Samsung readback. The
release private key remains the current signer. Do not add debug signing to
ordinary release builds.

If any check fails, stop. Do not uninstall the app, clear its storage, attempt a
downgrade, or bypass package-manager signature checks. Keep installed data
intact and resolve the signing/channel mismatch first. A debug-signed build and
a CI release-signed build are different channels unless a verified lineage
explicitly authorizes the in-place migration.

## Release evidence

For each paired beta, retain the merged source commit, Android and iOS version
and build numbers, Android APK hash and signer lineage, iOS archive/build ID,
App Store Connect processing state, and Android update-preflight output.
Android-only artifacts are not paired mobile releases. A physical Android
update is complete only after the post-install package/version/signer readback
and an authenticated app launch confirm that account and collection data
remain available.
