# MEE Timer And Alerting Checkpoint

Date: 2026-07-13
Branch: `main`

## Repo Findings

- `grookai-mee-reference-refresh.timer` is templated for `02:45:00` with
  `Persistent=true` and `RandomizedDelaySec=300`.
- `grookai-mee-nightly.timer` is templated for `03:15:00` with
  `Persistent=true` and `RandomizedDelaySec=900`.
- Both services run from `/opt/grookai_vault_mee_nightly` as `grookai` and use
  `flock` locks to prevent overlap.
- The reference refresh service writes a failed phase ledger entry before
  exiting nonzero.
- No repo template currently proves a human notification route on failure:
  there is no `OnFailure=`, non-`none` `FailureAction=`, webhook env, or mail
  route in the checked service/env templates.

## Added Gate

Added `deploy/scripts/verify-mee-live-ops-readiness.sh` for use on the droplet.
It fails unless both production timers are enabled and active and each service
has a systemd failure route configured. When `OnFailure=` is present, the script
also prints the target unit so the archived output can show the actual human
notification channel.

Run on the deployment host:

```bash
cd /opt/grookai_vault_mee_nightly
bash deploy/scripts/verify-mee-live-ops-readiness.sh
```

Expected passing terminator:

```text
MEE_LIVE_OPS_READY
```

Any `MEE_LIVE_OPS_NOT_READY` result remains launch-blocking.

## Launch Status

Repo-side verification is now explicit, but live ops proof is still open until
the command above is run on the production host and the output is archived with
the alert target visible. Current repo evidence indicates alerting is not
configured yet.
