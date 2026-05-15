# Scanner Live Rollout Readiness V1

Date: 2026-05-09

Branch: `scanner-v4-card-present-gate`

## Status

Hosted scanner identity endpoint is live. Do not flip the mobile release until the app is rebuilt with the hosted endpoint and verified on device.

The native CameraX scanner and batch identity client are wired and proved on a real Samsung device, but the current passing identity evidence depends on a local Node service:

```text
backend/identity_v3/run_scanner_v3_identity_service_v1.mjs
```

Current successful device install used:

```text
SCANNER_NATIVE_CONDITION_CAMERA_ANDROID=true
SCANNER_V3_IDENTITY_BASE_ENDPOINT=http://127.0.0.1:8787
```

That is a USB/debug setup only. It depends on:

```text
adb reverse tcp:8787 tcp:8787
```

When USB disconnects, identity goes offline.

## Required Live Shape

Production scanner identity must use a hosted HTTPS endpoint:

```text
SCANNER_V3_IDENTITY_BASE_ENDPOINT=https://<scanner-identity-host>
```

The app derives:

```text
https://<scanner-identity-host>/scanner-v3/resolve-crops
```

The production endpoint must implement:

```text
GET  /health
POST /scanner-v3/resolve-crops
```

The old separate embed/vector endpoints may remain as development fallback, but the live scanner should use the batch `resolve-crops` path.

## Release Build Requirements

Do not build a live scanner release unless both values are present:

```text
SCANNER_NATIVE_CONDITION_CAMERA_ANDROID=true
SCANNER_V3_IDENTITY_BASE_ENDPOINT=https://<scanner-identity-host>
```

Do not use:

```text
http://127.0.0.1:8787
```

or a temporary public tunnel for production.

## Current Evidence

Real-device identity-online evidence:

```text
.tmp/scanner_v4_real_device_reports/scanner_v4_native_camera_identity_online_resolve_endpoint_report_v1.json
```

Summary:

```text
identity_started=59
locked=59
last_state=identity_locked
top_candidate=Darumaka me02 015 GV-PK-PFL-015
```

## Hosted Endpoint

DigitalOcean droplet deployment is the chosen production path.

Deployment artifacts now live under:

```text
backend/identity_v3/deploy/
docs/runbooks/SCANNER_V3_DIGITALOCEAN_DROPLET_RUNBOOK.md
```

No Supabase Edge Function currently exposes `scanner-v3/resolve-crops`.

## DigitalOcean Isolation Status

Droplet:

```text
165.227.51.242
```

Scanner runtime is isolated from the existing AI/highway services:

```text
systemd unit: scanner-v3-identity.service
user: grookai-scanner
working directory: /opt/grookai-scanner-identity/app/backend
data/cache: /opt/grookai-scanner-identity/data, /opt/grookai-scanner-identity/hf-cache
bind address: 127.0.0.1:8787
```

Verified local health:

```text
ok=true
service=scanner_v3_identity_service_v1
reference_count=961
reference_view_count=5766
index_source=/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_v1.json
```

Nginx host routing is installed without editing the existing `ai.grookaivault.com` server block.

```text
scanner-identity.grookaivault.com -> 165.227.51.242
HTTPS certificate: /etc/letsencrypt/live/scanner-identity.grookaivault.com/fullchain.pem
certificate expiry: 2026-08-08
```

The scanner service port `8787` is not publicly reachable directly. Nginx exposes only `/health` and `/scanner-v3/resolve-crops` for the scanner host.

Verified:

```text
GET https://scanner-identity.grookaivault.com/health -> ok=true
POST https://scanner-identity.grookaivault.com/scanner-v3/resolve-crops with empty crops -> 400 missing_crops
GET https://scanner-identity.grookaivault.com/scanner-v3/embed -> 404
HTTP /health -> 301 HTTPS redirect
```

## Next Decision

Build and install the scanner app with the hosted endpoint, then run a real-device scanner pass before flipping the mobile release flag.

After the endpoint exists, update the release build pipeline to fail closed when `SCANNER_V3_IDENTITY_BASE_ENDPOINT` is missing.
