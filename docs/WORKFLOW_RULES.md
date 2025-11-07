**Workflow Rules**

- Default: Develop on Local; Staging mirrors main; Prod ships on tagged release.
- Never point day‑to‑day dev builds at Prod.
- All migrations must succeed on Local and Staging before release.
- Local runs use `--dart-define=GV_ENV=local`; Staging uses `--dart-define=GV_ENV=staging`.
- The “Ensure Local Ready” guard resets + seeds automatically when migrations changed or schema is missing.

