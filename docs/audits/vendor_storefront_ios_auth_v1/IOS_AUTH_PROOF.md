# Storefront iOS local authentication proof — September 19

The complete production Dart application passed the real local Auth/Storage/web API
journey on a dedicated iPhone 17 Pro simulator running iOS 26.5. This extends the
existing Android proof. It is not a TestFlight install, provider OAuth, cold-process
link or production proof.

## Verified source and environment

- Production Dart dependency: the clean Mac storefront worktree at
  `7a13b553278aced661a35ffd8457727b448a7fb3`. Native inputs remain identical at release
  head `daadd09367a50211f635afb30ee208cdebbb2f74`.
- Isolated native package: `com.grookai.storefrontauthproof`. Its entry invokes the
  real application's `main()` using the checked-in full-app test templates.
- Common package versions match the release lock. The wrapper uses the release's
  iOS 16 minimum, plugin registration and the default Flutter scene behavior.
  It does not register the scanner camera bridge, which is outside this journey.
- Retained synthetic 164xx Supabase project, with zero background workers and cron
  executions. No reset, new production user, entitlement grant or remote request.
- Current release's locally built Next server on loopback 15440, API relay 15439
  to 16421; separate loopback SSH connections expose 16421 and 15440 to the simulator.
- Firebase is disabled by the harness and Dart/Node network guards reject external
  requests. Synthetic credentials stay in ignored private files.

## Passing journey

1. An actual OS custom-scheme store link arrives while signed out. Real email login
   preserves the destination and loads the store's custom collectible.
2. Refresh rotates the actual local refresh token without losing the store route.
3. The app drawer opens Vendor Mode and Manage store. The owner saves settings;
   the published slug remains frozen and the saved notice stays on screen.
4. An owner product-preview link survives sign-out/login and loads private imagery.
5. A separate visitor follows the public in-app product link without private SKU.
6. The visitor's request for the owner's preview returns unavailable, with no
   product details. Final sign-out clears the session.

`status.json` records exit zero, all four OS link deliveries and all five screenshot
checkpoints. Representative images: `store.png`, `owner-preview.png`, and
`foreign-preview-denied.png`. The private full log also records the refresh assertion.

## Failed attempts and corrections

The generated test wrapper first targeted iOS 13; aligning its native build target
with the existing iOS 16 release fixed compilation. The next attempts did not
deliver links because iOS presented an **Open in app** confirmation. A bounded
XCTest helper confirmed only prompts naming this disposable proof application.
Three queued diagnostic prompts were accepted; its fixed four-prompt expectation
then timed out. That helper result is not reported as a passing application test.

A scene-forwarding adapter was briefly investigated. The controlled baseline with
the default Flutter scene successfully received the OS link and preserved it through
login. The adapter was unnecessary and all application/project/test edits were
reverted. No scene patch is part of this release; archive 325 is not invalidated.

The baseline then reached the store but lacked the 15440 web connection. Starting
the guarded local Next server and adding the second loopback tunnel resolved it.
An independent authenticated local API read returned the expected selected item.
The final complete journey passed on the original application code.

All failed logs/receipts, preparation scripts, screenshots and final private logs
remain under the dedicated Mac operator directory
`~/grookai_operator_artifacts/storefront_native_325_20260919` and the release
worktree's ignored `.local/integration/goal-release/` directory. The dedicated
simulator was shut down and the two temporary SSH connections and local web server
were stopped afterward. The populated proof database is preserved, not reset.

## Remaining release gates

Real provider OAuth, cold-process/universal links, signed client delivery and
production pilot checks remain open. The iOS archive remains signed and unuploaded.
No production schema/grant/publication/deployment changed during this proof.

The separate Stripe worktree `C:/gv_store_billing_20260919` now contains a pinned
SDK, verified provider policy/gateway and 40 passing local tests plus TypeScript and
lint. Its database integration and subscription UI are not implemented or enabled.
Do not fold those uncommitted changes into the frozen browse-only migration.
