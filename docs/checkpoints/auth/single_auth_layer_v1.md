# SINGLE_AUTH_LAYER_V1

Status: ACTIVE  
Type: Architecture Checkpoint  
Scope: Web + Flutter auth alignment on Supabase Auth

## Context

Grookai already used Supabase Auth in both the Next.js web app and the Flutter app, but the implementation had drift:

- web SSR auth existed without a single middleware guard layer
- protected pages mixed middleware-free redirects and page-local checks
- Flutter included a manual web token handoff helper shape that bypassed the intended Supabase session boundary

This pass aligns both apps to one auth authority.

## Precheck Findings

1. Both apps already point at the same Supabase project:
   - web derives public env from root `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`
   - Flutter reads the same root env contract via `lib/secrets.dart`

2. Canonical user identity already exists in Supabase Auth:
   - `auth.users.id` is the real user id

3. No parallel custom auth server was present:
   - web uses `@supabase/ssr` / Supabase JS
   - Flutter uses `supabase_flutter`
   - backend/user-owned rows already rely on `auth.uid()` and `auth.users(id)`

4. Profile enrichment already exists and remains lawful:
   - `public.public_profiles.user_id` is the PK and FK to `auth.users(id)`
   - no new duplicate user identity table is required

## Decision

Single Auth Layer V1 means:

1. User identity is `auth.users.id`
2. Supabase Auth is the only session authority on web and Flutter
3. Web protected routes are guarded centrally in Next middleware
4. Page-level protected routes reuse one shared server auth helper
5. Flutter does not hand tokens to the web manually
6. `public_profiles` remains optional profile enrichment, not a second identity source

## Web Surfaces

Implemented:

- shared Supabase config resolution:
  - `apps/web/src/lib/supabase/config.ts`
- shared server auth helper:
  - `apps/web/src/lib/auth/requireServerUser.ts`
- shared protected-route contract:
  - `apps/web/src/lib/auth/routeAccess.ts`
- Next middleware guard:
  - `apps/web/middleware.ts`

Protected route matcher V1:

- `/account/:path*`
- `/following/:path*`
- `/founder/:path*`
- `/network/inbox/:path*`
- `/submit/:path*`
- `/vault/:path*`
- `/wall/:path*`

## Flutter Surfaces

Retained:

- Supabase SDK session authority
- `currentSession` / `onAuthStateChange` auth gate
- OAuth callback completion via `getSessionFromUrl`

Removed drift:

- manual `/auth/mobile-handoff` token handoff path in `GrookaiWebRouteService`

## Invariants

1. Canonical user id is always `auth.users.id`
2. `public_profiles` may enrich identity but may not replace it
3. Web cookies are managed by Supabase SSR, not custom token code
4. Flutter session storage remains owned by `supabase_flutter`
5. Protected routes must redirect through `/login?next=...`
6. No auth flow may depend on passing access/refresh tokens through app-built URLs

## Result

Grookai now has one auth layer:

- same Supabase project on web and Flutter
- same canonical user id on both platforms
- shared web guard contract
- no secondary auth system
- no manual token handoff hack
