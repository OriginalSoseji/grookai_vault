# Physical iPhone acceptance — developer trust gate

Readback: 2026-09-23 01:33 UTC (September 22 locally).
Native source remains the frozen f53ea3bb4 payload, identical to the reviewed
application source. No product edits, deployment or store distribution occurred.

## Completed

- Removed 523 MiB of this task's regeneratable simulator output on the Mac after
  verifying resolved paths under the isolated checkout's `build/ios`. The signed
  physical build, source and historical evidence were preserved. Free space
  increased from 179,142,656 to 727,810,048 bytes at that observation.
- Re-established read-only device access after an initial CoreDevice tunnel
  timeout. Xcode advertised USB, while USB enumeration did not show the phone
  and Flutter reported wireless debugging; do not infer a cable connection from
  Xcode's interface label alone.
- Installed the signed isolated app and its permission-test helper on the
  iPhone 17 Pro running iOS 27. The bundle IDs are
  `com.cesar.grookaivault.combinedsearch20260922` and
  `com.grookai.audit.IphoneNextPermissions.xctrunner`.
- Read back existing Grookai application metadata before/after. The original
  application remains build 324; its metadata and the other pre-existing Grookai
  installations match. No existing app was replaced.
- Stopped all owned test/debugger processes and the two LAN relay listeners.
  Removed temporary test sources and matched all 225 native source/dependency
  hashes again. Original packaging is restored. The two isolated installations
  deliberately remain so the user can trust their development profile.

## Actual remaining blocker

Apple refused to launch the permission test runner because its Developer App
certificate is not trusted on the phone. The signed app and helper use the same
existing Apple Development identity. The exact signing account and diagnostics
are private evidence; no new certificate or provisioning resource was created.

The user must open Settings → General → VPN & Device Management on the iPhone,
select their Apple Development profile and trust it. Authentication/trust dialogs
must not be automated. Keep the phone unlocked and connected to the Mac's network
for the contained fixture journey. Physical search acceptance remains OPEN:
there is no passing journey or screenshot from this attempt.

## Debugger workflow for resume

The Xcode debugger path stalled. Flutter's direct LLDB path is supported by the
installed Xcode 26.6, but its normal global configuration disables that feature.
In this Flutter version, an explicit config value takes precedence over the
environment override. Use the private task-specific `XDG_CONFIG_HOME` directory
with an `enable-lldb-debugging: true` settings copy; do not change the user's
global settings. An attempted project-manifest override was restored and is not
the final workflow. Preserve original line endings when comparing/restoring files.

The prepared `run-iphone-final.py` uses the original prebuilt app, contained LAN
fixture endpoints, screenshot driver and scoped permission helper. After trust,
refresh device/app readback, confirm the Mac LAN address and both loopback backend
routes, then run this helper. It removes only the isolated app/helper on completion.
`pause-iphone-for-trust.py` is the explicit pause path that stops owned processes
and relay while retaining the isolated installations for the manual trust step.
Do not rerun the earlier stalled launch wrappers or terminate unrelated Xcode work.

Evidence stays under the private `combined_search_20260922` artifact directories
on Windows and Mac. Key receipts: `iphone-retry-space.json`,
`iphone-trust-apps.private.json`, `iphone-trust-pause.json`,
`iphone-final-test.private.log`, `iphone-final-permissions-test.private.log`.
Earlier diagnostic attempts are not passing tests. Some older cleanup helpers
contain the prior disconnected-device description; the new trust-pause receipt
is authoritative for current installation and cleanup state.

After physical acceptance, production HTTPS dispatch, representative candidate
performance, and separately approved web/native rollout remain independent gates.

## Local backend restored before pause

The report/dev listeners and Docker backend were offline later in the attempt.
The Docker GUI was running without its backend process. Restarted that stalled
GUI after checking its executable path and absence of the backend, then allowed
Postgres's normal crash recovery to finish. No volume reset, deletion or fixture
reseed was performed. The engine restarted containers according to their existing
policies; unrelated container configuration was not changed.

At 01:41:34 UTC, local auth health returned 200 and the actual dev resolver again
returned the expected 168 Yuka reverse printings, 84 shared-credit any-holo
printings, and 2,710 broad 5ban results. Receipt: `iphone-backend-recovery.json`.
The loopback report on 3203 and dev app on 3202 are restored. Next's generated
startup instruction files and dev-only type-reference changes were removed from
the candidate diff; no product changes belong to this step.

The Mac's pre-existing loopback forwards were also absent. Restored them with
private `serve-iphone-mac-tunnels.mjs`: Mac 54322 → Windows 54321 and Mac 3202 →
Windows 3202. Fresh Mac readback returns auth health 200 and web redirect 307.
These forwards bind only Mac loopback; the physical LAN relay stays stopped
until the next contained test. The Docker CLI restart timed out, but the checked
GUI restart restored the engine and the subsequent health checks passed.
