# GOOGLE OAUTH E2E DEBUG V1

## Purpose
Prove and fix the exact failing checkpoint in Grookai Vault mobile Google sign-in.

## Dashboard Verification
- Google provider enabled: likely yes, proven indirectly by `GET /auth/v1/authorize?provider=google...` returning `302` to Google Accounts
- redirect allowlist contains `grookaivault://login-callback`: still unverified from dashboard access
- Google client config confirmed: partially yes, because Supabase redirected with a concrete Google `client_id`
- notes:
  - local app redirect string is `grookaivault://login-callback`
  - iOS and Android URL scheme config for `grookaivault://login-callback` is present locally
  - Supabase Dashboard itself has not been directly inspected in this pass
  - public auth edge proved project ref `ycdxbpibncqcchqiihfz` and Google provider routing are live

## Google Page Interaction
- simulator behavior:
  - the real Google sign-in page loads for the project inside the simulator
  - sign-in UI renders with email/phone field and `Next` CTA
- real device behavior: not verified in this pass
- likely simulator-only issue?: no evidence of that so far

## Callback Arrival
- callback prompt shown: previously observed in simulator for `grookaivault://login-callback`
- callback URI received by app: yes
- URI shape:
  - `grookaivault://login-callback?error=access_denied&error_description=debug-simulated-cancel`
- mismatch with expected scheme/path?: no

## Session Creation
- `getSessionFromUrl` called: yes
- result:
  - for simulated error callback, `AuthException(code: access_denied)` was thrown as expected
- auth state changed:
  - initial logged-out state observed
  - real signed-in callback not yet proven in this pass
- final UI state:
  - app remained on login after simulated cancelled/error callback, which is expected
