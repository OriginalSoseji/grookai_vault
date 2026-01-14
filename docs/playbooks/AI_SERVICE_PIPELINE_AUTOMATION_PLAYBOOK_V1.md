````md
# AI SERVICE PIPELINE AUTOMATION PLAYBOOK V1 (Windows → Droplet → systemd → HTTP)

Status: ACTIVE PLAYBOOK  
Purpose: Rebuild the automated AI service pipeline end-to-end without questions  
Applies to: Grookai AI services running on a VPS (DigitalOcean droplet) behind systemd  
Primary example: AI Border Service (FastAPI + Uvicorn) at `http://165.227.51.242:7788`

Non-goals:
- Do not redesign model logic
- Do not introduce DB writes inside AI service
- Do not add new infrastructure patterns unless required
- Do not add payment systems or marketplace logic

---

## 0) Canonical Ground Truth (Locked)

### Droplet
- IP: `165.227.51.242`
- Service URL: `http://165.227.51.242:7788`
- Docs: `http://165.227.51.242:7788/docs`
- Port: `7788`
- Remote service directory: `/opt/grookai-ai`
- Remote repo directory (FYI): `/opt/grookai_vault`
- Service user: `grookai`
- systemd unit name: `grookai-ai-border.service`

### Repo files (must exist)
- `backend/ai_border_service/app.py`
- `backend/ai_border_service/requirements.txt`
- `backend/ai_border_service/systemd/grookai-ai-border.service`
- `scripts/deploy_ai_border_service.ps1`

### Golden property
Once deployed, the AI service runs independently of any PowerShell/SSH session:
- systemd keeps it alive
- it survives terminal closes
- it can be called from backend workers anytime

---

## 1) Architecture Contract (Do Not Violate)

### 1.1 Stateless AI Service
AI service:
- accepts image bytes (or JSON base64)
- returns JSON (and/or warped image bytes)
- MUST NOT write to Supabase / DB
- MUST NOT mutate storage
All side effects (DB writes, storage uploads) happen in backend workers.

### 1.2 Deterministic Deploy Pipeline
Deploy must:
- SCP upload code + requirements + unit
- pip install in the existing venv
- systemd daemon-reload
- systemd enable + restart
- verify port listening
- verify HTTP health
- fail loudly with diagnostics

### 1.3 Fail Closed
If deploy health check fails:
- exit non-zero
- print `systemctl status` and `journalctl` logs
- do not claim success

### 1.4 Windows Compatibility
PowerShell is the control plane. Avoid Linux-style quoting traps:
- Don’t assume GNU curl exists (`curl` is alias for `Invoke-WebRequest`)
- Avoid bash-style `\` line continuations in PowerShell
- Prefer simple SSH one-liners and PowerShell-native checks

---

## 2) Full Rebuild: Droplet (from zero)

> Use this if the droplet is new, wiped, or you are rebuilding from scratch.

### 2.1 SSH into droplet (interactive)
From Windows:
```powershell
ssh grookai@165.227.51.242
````

### 2.2 Ensure directory exists

```bash
sudo mkdir -p /opt/grookai-ai
sudo chown -R grookai:grookai /opt/grookai-ai
```

### 2.3 Install system packages (Ubuntu)

```bash
sudo apt-get update
sudo apt-get install -y python3 python3-venv python3-pip
sudo apt-get install -y curl
```

### 2.4 Create venv in canonical location

```bash
cd /opt/grookai-ai
python3 -m venv venv
source venv/bin/activate
python -V
pip -V
```

Expected:

* Python 3.x
* pip available

If venv fails:

* ensure `python3-venv` installed
* rerun create step

### 2.5 (Optional) confirm `grookai` user exists

```bash
id grookai
```

If missing, create it:

```bash
sudo adduser --disabled-password --gecos "" grookai
sudo usermod -aG sudo grookai
sudo chown -R grookai:grookai /opt/grookai-ai
```

---

## 3) systemd Unit (Canonical)

File in repo:
`backend/ai_border_service/systemd/grookai-ai-border.service`

It MUST match this intent:

* WorkingDirectory: `/opt/grookai-ai`
* ExecStart: `/opt/grookai-ai/venv/bin/uvicorn app:app --host 0.0.0.0 --port 7788 --log-level info`
* Restart=always
* User/Group: grookai

On droplet, the unit lives here:
`/etc/systemd/system/grookai-ai-border.service`

### 3.1 Manual install (only if not using deploy script yet)

```bash
sudo cp /opt/grookai-ai/grookai-ai-border.service /etc/systemd/system/grookai-ai-border.service
sudo systemctl daemon-reload
sudo systemctl enable grookai-ai-border.service
sudo systemctl restart grookai-ai-border.service
```

### 3.2 Verify listening

```bash
ss -lntp | grep :7788
```

### 3.3 Verify docs locally (droplet)

```bash
curl -I http://127.0.0.1:7788/docs
```

PASS:

* HTTP 200 or 301/302

---

## 4) Sudoers Constraint (Required for Non-Interactive Deploy)

Automation via PowerShell SSH is non-interactive. If `sudo` prompts, deploy fails.

We must allow `grookai` to run ONLY a constrained set of commands without a password.

### 4.1 One-time sudoers install (run once, interactive)

From Windows:

```powershell
ssh -t grookai@165.227.51.242 "sudo bash -lc 'cat >/etc/sudoers.d/grookai-ai-border <<EOF
grookai ALL=(root) NOPASSWD: /bin/mv /tmp/grookai-ai-border.service /etc/systemd/system/grookai-ai-border.service
grookai ALL=(root) NOPASSWD: /bin/systemctl daemon-reload
grookai ALL=(root) NOPASSWD: /bin/systemctl enable grookai-ai-border.service
grookai ALL=(root) NOPASSWD: /bin/systemctl restart grookai-ai-border.service
grookai ALL=(root) NOPASSWD: /bin/systemctl status grookai-ai-border.service
grookai ALL=(root) NOPASSWD: /bin/journalctl -u grookai-ai-border.service
EOF
chmod 440 /etc/sudoers.d/grookai-ai-border
visudo -cf /etc/sudoers.d/grookai-ai-border
echo SUDOERS_OK
'"
```

PASS:

* `parsed OK`
* `SUDOERS_OK`

NOTE:
SSH prints “Connection closed” after command finishes. That is normal.

### 4.2 Prove sudo non-interactive works

From Windows:

```powershell
ssh grookai@165.227.51.242 "sudo -n /bin/systemctl status grookai-ai-border.service"
```

PASS:

* prints status without prompting

FAIL:

* if it prompts, sudoers is not installed correctly; re-run 4.1

---

## 5) Repo Setup (Windows)

Ensure these exist in repo:

* `backend/ai_border_service/app.py`
* `backend/ai_border_service/requirements.txt`
* `backend/ai_border_service/systemd/grookai-ai-border.service`
* `scripts/deploy_ai_border_service.ps1`

Also ensure `requirements.txt` DOES NOT include invalid packages.
Known removed blocker:

* `annotated-docs==0.0.4` (invalid on droplet) must NOT be present.

---

## 6) Automated Deploy (Windows) — Canonical

### 6.1 One command deploy

From repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy_ai_border_service.ps1
```

Expected actions:

1. SCP:

* upload `app.py` → `/opt/grookai-ai/app.py`
* upload `requirements.txt` → `/opt/grookai-ai/requirements.txt`
* upload systemd unit → `/tmp/grookai-ai-border.service`

2. SSH:

* `pip install -r requirements.txt` inside `/opt/grookai-ai/venv`
* `sudo mv` unit into `/etc/systemd/system/`
* `sudo systemctl daemon-reload`
* `sudo systemctl enable ...` (idempotent)
* `sudo systemctl restart ...`

3. PowerShell checks:

* wait for port 7788 (via SSH)
* HTTP check `/docs` from Windows
* prints `DEPLOY_OK`

### 6.2 Health proof (no SSH required)

PowerShell-native check:

```powershell
Invoke-WebRequest http://165.227.51.242:7788/docs -Method Head
```

PASS:

* `StatusCode : 200` (or 301/302)

---

## 7) Common Failure Modes & Deterministic Fixes

### 7.1 Deploy fails: pip install error

Symptoms:

* pip can’t install some package
  Fix:
* Remove invalid dependency from `requirements.txt` (after auditing code imports)
  Audit imports:

```powershell
Select-String -Path backend\ai_border_service\*.py -Pattern 'PACKAGE_NAME' -List
```

Then re-deploy.

### 7.2 Deploy fails: sudo prompts / “terminal required”

Symptoms:

* `sudo: a password is required`
  Fix:
* Install sudoers rule (Section 4). Re-run deploy.

### 7.3 Wait-for-port quoting errors (EOF)

Symptoms:

* `unexpected EOF while looking for matching '"'`
  Fix:
* Ensure deploy script uses simple SSH one-liners for port checks:

  * `ssh ... "ss -lntp | grep -q :7788"`
    and NOT nested bash strings.

### 7.4 Port not listening

Symptoms:

* “ERROR: port 7788 is not listening”
  Fix sequence:

1. Check service status:

```powershell
ssh grookai@165.227.51.242 "sudo /bin/systemctl status grookai-ai-border.service"
```

2. Check logs:

```powershell
ssh grookai@165.227.51.242 "sudo /bin/journalctl -u grookai-ai-border.service"
```

Common causes:

* app.py syntax error
* missing dependency
* wrong ExecStart path
* venv missing

### 7.5 PowerShell `/docs` prompt about scripts

Cause:

* Swagger UI returns HTML + scripts; PowerShell warns.
  Resolution:
* Press `A` (Yes to All), or use:

```powershell
Invoke-WebRequest http://165.227.51.242:7788/docs -Method Head -UseBasicParsing
```

### 7.6 “sudo/systemctl doesn’t work on Windows”

Cause:

* `systemctl` is Linux-only; local Windows cannot run it.
  Correct pattern:

```powershell
ssh grookai@165.227.51.242 "sudo /bin/systemctl restart grookai-ai-border.service"
```

Or prefer deploy script.

---

## 8) Rollback Strategy

If deploy breaks production behavior:

1. SSH to droplet:

```powershell
ssh grookai@165.227.51.242
```

2. View last logs:

```bash
sudo journalctl -u grookai-ai-border.service
```

3. Restart:

```bash
sudo systemctl restart grookai-ai-border.service
```

If you must revert app.py:

* SCP the last known-good `app.py` from a prior git commit:

```powershell
git show <GOOD_COMMIT>:backend/ai_border_service/app.py > C:\temp\app.py
scp C:\temp\app.py grookai@165.227.51.242:/opt/grookai-ai/app.py
ssh grookai@165.227.51.242 "sudo systemctl restart grookai-ai-border.service"
```

---

## 9) Extending the Pipeline for New AI Features (Same Service)

To add a new AI feature, do NOT build a new pipeline. Reuse:

* same droplet
* same service
* new FastAPI endpoint in `app.py`

Example pattern:

* add endpoint `/glare-score`
* add endpoint `/detect-scratches`
* deploy with the same command

Deploy again:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\deploy_ai_border_service.ps1
```

---

## 10) Stop Condition / Hard Stop Gate

Stop and audit if any occurs:

* deploy claims success without `/docs` 200/301/302
* service restarts but port not listening
* sudo prompts appear during deploy (sudoers drift)
* a dependency is added that cannot be installed on droplet
* AI service starts writing to DB or storage (contract violation)

---

## 11) Suggested Checkpoint Names

* CHECKPOINT — AI Service Pipeline Automation V1 (systemd + one-command deploy, verified)
* CHECKPOINT — AI Service Pipeline V1 Extended (new endpoint deployed + health verified)

---

```

---

If you want, the next “single step” is: **commit this playbook** (so it’s real, not chat).
```
