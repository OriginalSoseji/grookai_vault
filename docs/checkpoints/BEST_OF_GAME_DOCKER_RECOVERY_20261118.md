# Best of Game Docker recovery checkpoint

Date: November18,2026 America/Denver (November19 UTC).
Status: restart authorization requested; no shared restart or production write.

The [transaction rehearsal](BEST_OF_GAME_PRINTING_REHEARSAL_20261118.md) remains
qualified only for its preserved native PostgreSQL16 fixture. All220 focused
tests and the original local transaction receipts remain unchanged. Full
Supabase17 and normal managed release checks still require a usable engine.

Read-only diagnostics independently establish:

- Docker's Windows processes exist, but both normal engine named pipes time out
  on `/_ping`; `docker desktop status` also times out.
- WSL responds and lists `docker-desktop`. Its visible executables are init,
  BusyBox and vpnkit-bridge; the old daemon PID is absent and
  `/run/linuxkit-parent.pid` is absent.
- The historical raw-socket recovery route cannot be freshly attested. No
  consumed transport receipt, stale daemon PID or temporary listener was reused.
- Shared63340/63341 TCP ports accept connections, but actual Auth health and REST
  requests time out. TCP connectivity is not service-health proof.
- The Windows computer-use runtime failed to initialize with a missing kernel
  asset path before any app inspection/input; no Windows UI action occurred.

The retained Docker data VHD exists at125119234048 bytes. Its metadata and four
VHD file records were captured; logs/settings projections were preserved privately.
No full VHD backup is claimed. No file, container, volume, distribution or Docker
setting was removed or altered. The native64240 fixture remains stopped.

Private evidence under
`C:/grookai_vault_operator_artifacts/best_of_game_repair_20261118/`:
`docker-route-diagnostics-v3.json`, `docker-guest-diagnostics-v1.json`,
`docker-namespace-diagnostics-v1.json`, `docker-preservation-route-v1.json` and
`docker-recovery-preparation-v1/RESTART_INTENT_V1.json`. The prior operator
document is retained as `operator-playbook-pre-docker-recovery.md`.

The user was asked whether to restart the installed Docker Desktop application,
retaining all containers/volumes/databases and allowing a temporary shared-service
interruption. No approval record is inferred from a general continuation or
elapsed time. The repository operator guide says not to restart/delete the
daemon, labs or volumes merely to clear verification; this checkpoint does not
override that instruction.

After explicit authorization, restore Docker using its installed application
path, then independently inspect the engine, retained container/volume identities
and actual service health before continuing. Do not factory reset, prune,
relocate data, unregister WSL or reset any populated lab. Any Supabase17 rehearsal
needs its own bounded target/transport and fresh strict511 preflight. The native16
plan and CLI's loopback/database restrictions remain intact; they are not a
production or full-platform execution authority.
