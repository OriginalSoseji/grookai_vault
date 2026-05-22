# APP_BOOT_EXPERIENCE_V1 Branding + Timing

Date: 2026-05-21

## Scope

Implemented the first safe mobile boot pass:

- Android launcher icon generated from the existing Grookai repo logo.
- Android native launch background now uses the Grookai logo on a black field.
- Debug-only boot timing markers added for startup diagnosis.
- Flutter branded warmup screen added as the first lightweight rendered route.
- App-link setup and debug intent bridge setup now defer until after the warmup first frame.

No product data, scanner, pricing, Species Dex, identity, or DB behavior changed.

## Logo Source

Source asset:

```text
apps/web/public/grookai-logo-512.png
```

## Native Splash

Launch background:

```text
#000000
```

Centered logo:

```text
@mipmap/launch_logo
```

## Boot Timing

Added:

```text
lib/services/diagnostics/app_boot_timing.dart
```

Debug logs use:

```text
[APP_BOOT_V1]
```

Markers include native-to-Flutter handoff, Supabase init, auth state, warmup route, shell first frame, and initial feed load.

## Device Smoke

Device:

```text
SM S908U
```

Observed after warmup pass:

```text
383ms first_route_warmup
531ms root_first_post_frame
1069ms first_route_shell
1398ms app_shell_first_post_frame
3495ms network_feed_initial_rpc_complete
3631ms network_feed_initial_render_ready
```

Result:

- A branded Flutter frame appears before app shell work begins.
- Shell first frame appears around 1.4s after Dart start.
- Feed data freshness remains a separate optimization target.

## Safety Confirmation

- No DB writes.
- No migrations.
- No scanner changes.
- No pricing changes.
- No Species Dex changes.
- No identity route changes.
- No public route changes.
