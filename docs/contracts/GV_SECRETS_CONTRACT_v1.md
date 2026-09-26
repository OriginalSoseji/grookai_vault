# GV Secrets Contract v1

This contract is the single source of truth for Grookai Vault secrets. Every new secret must be documented here before use, and any rename must update this file plus all consumer locations (.env.local, Supabase Project Secrets, GitHub Actions).

## Current Active Status

As of the current stabilization phase:

- Canonical env names are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `BRIDGE_IMPORT_TOKEN`
- Legacy names such as `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and framework aliases such as `NEXT_PUBLIC_SUPABASE_ANON_KEY` may remain present for compatibility
- Compatibility aliases are not equal-authority contract names for new code

## Current Secrets

| Secret | Purpose | .env.local | Supabase Project Secrets | GitHub Actions |
| --- | --- | --- | --- | --- |
| `SUPABASE_URL` | Base URL for the Supabase project (used by backend workers and Edge functions). | ✅ | ✅ (`SUPABASE_URL`) | ✅ (`SUPABASE_URL`) |
| `SUPABASE_PUBLISHABLE_KEY` | Public anon key for Edge functions and clients (this is the “anon key” in the Supabase dashboard). | ✅ | ✅ (`SUPABASE_PUBLISHABLE_KEY`) | ✅ (`SUPABASE_PUBLISHABLE_KEY`) |
| `SUPABASE_SECRET_KEY` | Canonical service-role secret for backend workers and admin/edge boundaries. | ✅ (`SUPABASE_SECRET_KEY`) | ✅ (`SUPABASE_SECRET_KEY`) | ✅ (`SUPABASE_SECRET_KEY`) |
| `OPENAI_API_KEY` | AI-powered tooling (if enabled; currently optional). | ✅ (optional) | ✅ (optional) | ✅ (optional) |
| `STRIPE_SECRET_KEY` | Server-only Stripe SDK authentication for the existing Grookai account. | Test-mode value only in ignored private env | Not used by this web integration | Not required; future production value belongs in sensitive Vercel storage |
| `STRIPE_BILLING_WEBHOOK_SECRET` | Verify raw Stripe subscription webhook bodies. Separate endpoint secret per environment. | Local/test endpoint only | Not used | Not required; future production value belongs in sensitive Vercel storage |
| `GROOKAI_COMMERCE_ALERT_URL` | Private HTTPS operations webhook destination for commerce alerts; may contain secret routing material. | Synthetic loopback only | Not used | Private worker environment only |
| `GROOKAI_COMMERCE_ALERT_TOKEN` | Bearer credential for the dedicated commerce alert receiver. Never share the payment/operator token. | Synthetic test value only | Not used | Private worker environment only |
| `GVVI_REFERRAL_COOKIE_SECRET` | Server-only encryption for 30-day GVVI/store referral context; at least 32 random characters. Required in the existing Vercel production project for attribution. | Local dummy value only | Not used | Not used; production value stays in Vercel sensitive environment storage |
| `TCGDEX_BASE_URL` | TCGdex API base URL (used by new ingestion). | ✅ | ✅ | (not required) |
| `TCGDEX_LANG` | Active TCGdex language slug (e.g., `en`). | ✅ | ✅ | (not required) |
| `TCGDEX_API_KEY` | Reserved for TCGdex auth (currently unused; keep empty unless provided). | ✅ | ✅ | (not required) |

> NOTE: Supabase project secrets live under Settings → Configuration → Secrets. GitHub Actions secrets must match these names in lowercase (e.g., `SUPABASE_SECRET_KEY`). `SUPABASE_PUBLISHABLE_KEY` maps to the “anon key” in the Supabase dashboard. Older runtime surfaces may still reference `SUPABASE_SERVICE_ROLE_KEY`, but current canonical authority is `SUPABASE_SECRET_KEY`.

## Naming Rules

Stripe credentials must never enter mobile defines, browser bundles, logs or receipts.
`STRIPE_ACCOUNT_ID`, `STRIPE_STORE_APP_PRICE_ID`, `STRIPE_STORE_WEB_PRICE_ID` and
`STRIPE_BILLING_MODE` and `STRIPE_VENDOR_PORTAL_CONFIGURATION_ID` are non-secret
server configuration. The portal ID selects an existing, explicitly verified
configuration; never create a default configuration implicitly. Billing remains
disabled unless `GROOKAI_VENDOR_BILLING_ENABLED=true`. New checkout additionally
requires `GROOKAI_VENDOR_CHECKOUT_ENABLED=true`; pausing checkout must retain
processing, reconciliation and payment management for existing customers.
Private scheduled dispatch also requires `GROOKAI_VENDOR_BILLING_RECONCILIATION_ENABLED=true`.
The worker reuses `SUPABASE_URL`/`SUPABASE_SECRET_KEY`, the shared backend client
and existing Stripe configuration. Its read-only health mode needs only the
database credential and account/mode identifiers, never a Stripe secret.
Private closeout planning reuses the existing database/Stripe credentials and is
read-only even when billing processing is disabled. Apply additionally requires
`GROOKAI_VENDOR_BILLING_CLOSEOUT_ENABLED=true`, processing enabled, and the exact
reviewed plan hash in `GROOKAI_VENDOR_BILLING_CLOSEOUT_ACK`. These are non-secret
operations controls, not credentials. Keep the acknowledgement scoped to one
reviewed invocation and remove it afterward. Raw support tickets/target identifiers
belong in the ignored private request file, never an environment receipt or log.
The private recovery command follows the same read-only plan boundary but uses
its own non-secret `GROOKAI_VENDOR_BILLING_RECOVERY_ENABLED` and invocation-scoped
`GROOKAI_VENDOR_BILLING_RECOVERY_ACK`. It retrieves existing provider resources only.
Raw candidate customer/session IDs belong in the ignored private request file;
recovery artifacts use fingerprints. Closeout acknowledgement cannot authorize it.
Test credentials cannot activate live
billing. Document and verify the existing account and configured price resources
before enabling; configuration is not permission to create duplicate resources.

`GVVI_REFERRAL_COOKIE_SECRET` must never be exposed through a `NEXT_PUBLIC_` alias,
mobile define, telemetry or release artifact. Keep existing configured values when
deploying; rotation invalidates outstanding encrypted referral contexts. Production
and synthetic local environments use separate values. Absence disables attribution
without blocking navigation. See `GVVI_VENDOR_QR_V1.md` and `VENDOR_STOREFRONTS_V1.md`.

1. The legacy `ANON_KEY`/`SERVICE_ROLE_KEY` names are banned in new code. Use the canonical contract names (`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) everywhere.
2. Any new secret must be added to this contract before use, with purpose and required locations filled out.
3. Any rename requires simultaneous updates to this file, `.env.local`, Supabase project secrets, GitHub Actions secrets, and all code references.
4. When configuring Supabase project secrets or GitHub Actions, service-role access must be stored under the canonical name `SUPABASE_SECRET_KEY`. Older `SUPABASE_SERVICE_ROLE_KEY` references are compatibility-only.
