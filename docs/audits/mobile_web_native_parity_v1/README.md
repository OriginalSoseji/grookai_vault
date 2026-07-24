# Mobile Web Native Parity V1

This directory contains the non-private baseline for
`MOBILE_WEB_NATIVE_VISUAL_PARITY_CONTRACT_V1`.

Artifacts:

- `app_canon_manifest.json` freezes the installed Android reference, device
  geometry, token measurements, private-capture hashes, and the approved dock
  amendment.
- `route_state_matrix.json` assigns each collector route one shell mode, dock
  behavior, auth posture, and minimum state coverage.

Raw Samsung screenshots remain local because they contain owner collection and
account data. The Playwright harness uses sanitized synthetic fixtures instead.

The explicit dock amendment is:

```text
Pulse · Wall · Scan · Vault · Search
```

No file in this directory authorizes a push, deployment, database change, or
production activation.
