# Physical iPhone Want Match Journey V1

## Purpose

This gate proves the complete exact-card Want Match journey in TestFlight Build
284 and reconciles the visible journey against durable production truth. Device
screenshots alone and database rows alone are insufficient.

## Fixed Release Inputs

- TestFlight build: `1.0.0 (284)`
- App-producing commit: `33d7ff50bda428439c664c7c6db427b7a66abd9a`
- Device: physical iPhone with Build 284 installed from TestFlight
- Provenance:
  `docs/audits/release_completion_v1/testflight_build_284_provenance_v1.json`

## Preconditions

- Use a new account created inside the recorded journey window.
- A distinct owner account must publicly share an exact card copy with an
  eligible intent and current profile/location context.
- Start one continuous screen recording before sign-up.
- Do not place an email, password, token, raw UUID, device serial, or private
  message in the evidence JSON.

## Device Procedure

1. Sign up with the new account.
2. Find the exact card and enable Want.
3. Wait for the governed Want Match engine to create and surface the match.
4. Open the match and confirm the correct owner context and exact card.
5. Send a card-centered message to that owner from the matched copy.
6. Disable Want for the exact card.
7. Refresh/reopen Pulse and confirm the stale match is absent.
8. Confirm no blocking error occurred, then stop the recording.

Do not reuse an existing populated account. Do not manually mutate production
tables to manufacture any stage of the proof.

## Evidence File

Copy `physical_iphone_want_match_journey_v1.example.json` to a private location
outside the repository. Set confirmations to true only after visible proof.
Artifact paths may identify a recording or screenshots; the verifier emits only
ordinal number, byte count, and SHA-256 hash.

## Read-Only Reconciliation

Run from a clean checkout containing the verifier:

```powershell
$env:DOTENV_CONFIG_PATH = "C:\grookai_vault\.env.local"
$env:RELEASE_JOURNEY_SUBJECT_USER_ID = "<new Supabase auth user UUID>"
node scripts/audits/release_want_match_journey_readback_v1.mjs `
  --window-start=<signup-start-UTC> `
  --window-end=<test-end-UTC> `
  --expected-app-commit-sha=33d7ff50bda428439c664c7c6db427b7a66abd9a `
  --expected-testflight-build=284 `
  --device-evidence=<private-evidence-json> `
  --require-pass
```

The verifier opens a read-only transaction and requires one coherent chain:

- exact-card `want_on` followed by a durable generated match;
- distinct owner and exact source instance with matching profile context;
- linked `want_match_available` event;
- card-centered message bound to the same owner, parent card, source Vault item,
  exact instance, and child printing;
- later exact-card `want_off` and current Want false;
- durable match retained as `stale` with reason `canonical_want_removed`;
- stale match absent from Pulse;
- no deliverable or post-opt-out Want Match notification;
- no event-emission failure in the journey window.

Artifacts are written under
`artifacts/release/want_match_journey/<timestamp>/`. They contain no raw user,
owner, match, interaction, device, or message identity.

## Stop Conditions

Stop and preserve evidence if any visible step fails, the exact tuple does not
reconcile, a stale match remains visible, a notification crosses the opt-out
boundary, or the verifier emits any finding. Do not mark Journey C complete
until both device proof and readback pass.
