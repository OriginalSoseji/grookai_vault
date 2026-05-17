# Scanner V3 DigitalOcean Droplet Runbook

Date: 2026-05-09

This runbook hosts the existing Scanner V3 identity service on a DigitalOcean Ubuntu droplet. It preserves the live app contract:

```text
GET  /health
POST /scanner-v3/resolve-crops
```

The mobile release should point at the HTTPS base URL:

```text
SCANNER_V3_IDENTITY_BASE_ENDPOINT=https://scanner-identity.example.com
```

## Required Inputs

- Droplet SSH host or IP.
- SSH user with sudo access.
- DNS name pointed at the droplet, for example `scanner-identity.example.com`.
- Local index file:

```text
.tmp/scanner_v3_embedding_index_v7_plus_me_sets_v1.json
```

## 1. Prepare Droplet Runtime

Run on the droplet:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl nginx certbot python3-certbot-nginx

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo useradd --system --create-home --home-dir /var/lib/grookai-scanner --shell /usr/sbin/nologin grookai-scanner || true
sudo mkdir -p /opt/grookai-scanner-identity/app
sudo mkdir -p /opt/grookai-scanner-identity/data
sudo mkdir -p /opt/grookai-scanner-identity/hf-cache
sudo mkdir -p /etc/grookai
sudo chown -R grookai-scanner:grookai-scanner /opt/grookai-scanner-identity/data /opt/grookai-scanner-identity/hf-cache
```

## 2. Upload Backend Identity Files

From the repo root on the workstation:

```powershell
$hostName = "<droplet-ip-or-host>"
$user = "<ssh-user>"

ssh "$user@$hostName" "sudo mkdir -p /opt/grookai-scanner-identity/app /opt/grookai-scanner-identity/data /opt/grookai-scanner-identity/hf-cache && sudo chown -R $user /opt/grookai-scanner-identity/app /opt/grookai-scanner-identity/data /opt/grookai-scanner-identity/hf-cache"

scp backend/package.json "$user@$hostName:/opt/grookai-scanner-identity/app/backend/package.json"
scp backend/package-lock.json "$user@$hostName:/opt/grookai-scanner-identity/app/backend/package-lock.json"
scp backend/env.mjs "$user@$hostName:/opt/grookai-scanner-identity/app/backend/env.mjs"
scp -r backend/identity_v3 "$user@$hostName:/opt/grookai-scanner-identity/app/backend/"
scp .tmp/scanner_v3_embedding_index_v7_plus_me_sets_v1.json "$user@$hostName:/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_v1.json"
```

Then on the droplet:

```bash
cd /opt/grookai-scanner-identity/app/backend
npm ci --omit=dev
sudo mkdir -p /opt/grookai-scanner-identity/app/backend/.tmp
sudo chown -R root:root /opt/grookai-scanner-identity/app
sudo chown -R grookai-scanner:grookai-scanner /opt/grookai-scanner-identity/app/backend/.tmp /opt/grookai-scanner-identity/data /opt/grookai-scanner-identity/hf-cache
```

## 3. Install Service Env

On the droplet:

```bash
sudo cp /opt/grookai-scanner-identity/app/backend/identity_v3/deploy/scanner-v3-identity.env.example /etc/grookai/scanner-v3-identity.env
sudo editor /etc/grookai/scanner-v3-identity.env
sudo chown root:root /etc/grookai/scanner-v3-identity.env
sudo chmod 0640 /etc/grookai/scanner-v3-identity.env
```

Keep these production values:

```text
SCANNER_V3_IDENTITY_HOST=127.0.0.1
SCANNER_V3_IDENTITY_PORT=8787
SCANNER_V3_IDENTITY_INDEX_CACHE=/opt/grookai-scanner-identity/data/scanner_v3_embedding_index_v7_plus_me_sets_v1.json
```

## 4. Install systemd Unit

On the droplet:

```bash
sudo cp /opt/grookai-scanner-identity/app/backend/identity_v3/deploy/scanner-v3-identity.service /etc/systemd/system/scanner-v3-identity.service
sudo systemctl daemon-reload
sudo systemctl enable --now scanner-v3-identity
sudo journalctl -u scanner-v3-identity -f
```

Expected startup log includes:

```text
scanner_v3_identity_service_started
reference_count
reference_view_count
```

## 5. Install Nginx Host

On the droplet:

```bash
sudo cp /opt/grookai-scanner-identity/app/backend/identity_v3/deploy/nginx.scanner-v3-identity.example /etc/nginx/sites-available/scanner-identity.grookaivault.com
sudo ln -s /etc/nginx/sites-available/scanner-identity.grookaivault.com /etc/nginx/sites-enabled/scanner-identity.grookaivault.com
sudo nginx -t
sudo systemctl reload nginx
```

If using a different DNS name, replace `scanner-identity.grookaivault.com` in the Nginx file before enabling it.

The Nginx config intentionally exposes only:

```text
/health
/scanner-v3/resolve-crops
```

The development-only `/scanner-v3/embed` and `/scanner-v3/candidates` endpoints stay private behind Nginx's `404`.

After DNS points to the droplet, install the HTTPS certificate:

```bash
sudo certbot --nginx -d scanner-identity.grookaivault.com
sudo nginx -t
sudo systemctl reload nginx
```

Do not edit or replace the existing `ai.grookaivault.com` Nginx file while installing the scanner host.

## 6. Verify Hosted Endpoint

From the workstation:

```powershell
curl https://scanner-identity.example.com/health
```

Expected:

```json
{
  "ok": true,
  "service": "scanner_v3_identity_service_v1"
}
```

## 7. Build Live Scanner

Do not ship a live build without both flags:

```powershell
flutter build apk --release `
  --dart-define=SCANNER_NATIVE_CONDITION_CAMERA_ANDROID=true `
  --dart-define=SCANNER_V3_IDENTITY_BASE_ENDPOINT=https://scanner-identity.example.com
```

The old USB-only value must not be used for live:

```text
http://127.0.0.1:8787
```

## Rollback

On the droplet:

```bash
sudo systemctl stop scanner-v3-identity
sudo systemctl disable scanner-v3-identity
```

Then rebuild the app without the hosted endpoint or return to the last committed scanner baseline.
