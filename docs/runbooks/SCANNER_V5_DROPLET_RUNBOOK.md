# Scanner V5 Droplet Runbook

Status: plan only. Do not execute against production until reviewed.

V5 is a new service and route. The existing `/scanner-v3/resolve-crops` route remains untouched for rollback.

## Files

- Service: `backend/identity_v3/scanner_v5/run_scanner_v5_identity_service_v1.mjs`
- Systemd: `backend/identity_v3/deploy/scanner_v5/scanner-v5-identity.service`
- Env example: `backend/identity_v3/deploy/scanner_v5/scanner-v5-identity.env.example`
- Nginx location: `backend/identity_v3/deploy/scanner_v5/nginx-scanner-v5-location.conf`

## Target

```text
127.0.0.1:8795
https://scanner-identity.grookaivault.com/scanner-v5/health
https://scanner-identity.grookaivault.com/scanner-v5/identify
```

Artifact directory:

```text
/opt/grookai-scanner-identity-ann-stage/data/full_candidate_compact_v1
```

## Deploy Commands

```bash
cd /opt/grookai-scanner-identity
git fetch origin
git checkout scanner/work-v1
git pull --ff-only
npm --prefix backend install --omit=dev

sudo mkdir -p /var/log/grookai-scanner-v5/debug
sudo chown -R grookai:grookai /var/log/grookai-scanner-v5

sudo mkdir -p /etc/grookai
sudo cp backend/identity_v3/deploy/scanner_v5/scanner-v5-identity.service /etc/systemd/system/scanner-v5-identity.service
sudo cp backend/identity_v3/deploy/scanner_v5/scanner-v5-identity.env.example /etc/grookai/scanner-v5-identity.env
sudo editor /etc/grookai/scanner-v5-identity.env

sudo systemctl daemon-reload
sudo systemctl enable scanner-v5-identity
sudo systemctl restart scanner-v5-identity
sudo systemctl status scanner-v5-identity --no-pager
curl -s http://127.0.0.1:8795/scanner-v5/health | jq .
```

Nginx:

```bash
sudo cp backend/identity_v3/deploy/scanner_v5/nginx-scanner-v5-location.conf /etc/nginx/snippets/scanner-v5-location.conf
sudo editor /etc/nginx/sites-enabled/scanner-identity.grookaivault.com
# include /etc/nginx/snippets/scanner-v5-location.conf inside the TLS server block.
sudo nginx -t
sudo systemctl reload nginx
curl -s https://scanner-identity.grookaivault.com/scanner-v5/health | jq .
```

## Smoke Test

```bash
curl -s https://scanner-identity.grookaivault.com/scanner-v5/health | jq .
curl -s -X POST \
  --data-binary @.tmp/scanner_fixed_slot_device/latest/latest_fixed_slot_normalized.png \
  -H 'content-type: image/png' \
  https://scanner-identity.grookaivault.com/scanner-v5/identify | jq .
```

Expected:

- `service=scanner_v5_identity_service_v1`
- Amaura fixture returns `GV-PK-ME03-023` in top three.
- `/scanner-v3/resolve-crops` continues to respond exactly as before.

## Rollback

```bash
sudo systemctl stop scanner-v5-identity
sudo systemctl disable scanner-v5-identity
sudo rm -f /etc/nginx/snippets/scanner-v5-location.conf
sudo editor /etc/nginx/sites-enabled/scanner-identity.grookaivault.com
# remove only the scanner-v5 include/location.
sudo nginx -t
sudo systemctl reload nginx
```

Rollback does not touch Scanner V3.
