# eBay Native Account Access and Release V1

## Status and scope

Active implementation and release contract. It governs the native **Account →
Connected accounts → eBay seller account** path and the authenticated native
seller API. It complements `EBAY_SELLER_PUBLISHER_V1`; it grants no publication
authority and does not replace the collector's final Publish action.

## Account entry and sign-in

- A signed-in collector can reach eBay connect or reconnect from the native
  Account screen through **Connected accounts → eBay seller account**.
- The entry opens the existing seller workspace and OAuth consent flow. It must
  not create another seller implementation, change the selected grookai owner,
  or publish a listing.
- A missing or expired grookai session uses the normal app sign-in. After
  sign-in, the Account route and seller workspace remain usable without a
  reinstall or another Android package.
- Seller connection status is read from the native `GET /api/ebay/seller`
  endpoint. Legacy web draft-detail endpoints are separate and cannot prove
  native Account access.

## User identity at the Supabase boundary

- Every native request forwards its grookai bearer token to the server.
- `sellerOwner` must validate the authenticated user through
  `auth.getUser()` and return a user-scoped Supabase client carrying that same
  JWT for RPCs protected by `auth.uid()`.
- A service-role client may not be substituted for the user's client on those
  RPCs. Service role has no collector identity.
- Errors at this boundary return a stable, actionable status and safe message;
  they must not be represented as a marketplace reconnection failure when the
  grookai session itself is missing or expired.

## Release gate

- Verify the exact production candidate with a signed-in `GET
  /api/ebay/seller`. It must return 2xx and the expected linked or reconnect
  state for the same collector account.
- Verify a saved draft read with the native route. Do not publish the draft as
  part of qualification; never use a prepared live draft for a write test that
  could discard its review, fee quote, or provider state.
- The Samsung update keeps `applicationId = com.grookai.vault`, uses the
  production signing key, and has a build number greater than the installed
  build. If the installed device is ahead of the frozen `pubspec.yaml` baseline,
  use the existing signed APK workflow's validated `build_number` input; do not
  rewrite frozen cross-platform release metadata to create a device-only bump.
  Do not install a lower or differently signed APK or create an app variant to
  test this feature.
- Record source commit, deployment ID, Android build number, native endpoint
  result, and whether the custom domain was promoted. Promote only the exact
  candidate that passed these checks.

## Required regression coverage

- Contract tests prove the Account entry opens the existing eBay seller flow.
- Contract tests pin bearer propagation through `createServerComponentClient`
  and user verification before any `auth.uid()` seller RPC.
- Contract tests reject service-role use in the native seller owner path.
- Release evidence uses the installed production package identity and native
  API route. Tests against legacy web routes are reported separately.
