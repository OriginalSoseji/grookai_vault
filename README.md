# Supabase CLI

[![Coverage Status](https://coveralls.io/repos/github/supabase/cli/badge.svg?branch=main)](https://coveralls.io/github/supabase/cli?branch=main) [![Bitbucket Pipelines](https://img.shields.io/bitbucket/pipelines/supabase-cli/setup-cli/master?style=flat-square&label=Bitbucket%20Canary)](https://bitbucket.org/supabase-cli/setup-cli/pipelines) [![Gitlab Pipeline Status](https://img.shields.io/gitlab/pipeline-status/sweatybridge%2Fsetup-cli?label=Gitlab%20Canary)
](https://gitlab.com/sweatybridge/setup-cli/-/pipelines)

[Supabase](https://supabase.io) is an open source Firebase alternative. We're building the features of Firebase using enterprise-grade open source tools.

This repository contains all the functionality for Supabase CLI.

- [x] Running Supabase locally
- [x] Managing database migrations
- [x] Creating and deploying Supabase Functions
- [x] Generating types directly from your database schema
- [x] Making authenticated HTTP requests to [Management API](https://supabase.com/docs/reference/api/introduction)

## Getting started

### Install the CLI

Available via [NPM](https://www.npmjs.com) as dev dependency. To install:

```bash
npm i supabase --save-dev
```

To install the beta release channel:

```bash
npm i supabase@beta --save-dev
```

When installing with yarn 4, you need to disable experimental fetch with the following nodejs config.

```
NODE_OPTIONS=--no-experimental-fetch yarn add supabase
```

> **Note**
For Bun versions below v1.0.17, you must add `supabase` as a [trusted dependency](https://bun.sh/guides/install/trusted) before running `bun add -D supabase`.

<details>
  <summary><b>macOS</b></summary>

  Available via [Homebrew](https://brew.sh). To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To install the beta release channel:
  
  ```sh
  brew install supabase/tap/supabase-beta
  brew link --overwrite supabase-beta
  ```
  
  To upgrade:

  ```sh
  brew upgrade supabase
  ```
</details>

<details>
  <summary><b>Windows</b></summary>

  Available via [Scoop](https://scoop.sh). To install:

  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  To upgrade:

  ```powershell
  scoop update supabase
  ```
</details>

<details>
  <summary><b>Linux</b></summary>

  Available via [Homebrew](https://brew.sh) and Linux packages.

  #### via Homebrew

  To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To upgrade:

  ```sh
  brew upgrade supabase
  ```

  #### via Linux packages

  Linux packages are provided in [Releases](https://github.com/supabase/cli/releases). To install, download the `.apk`/`.deb`/`.rpm`/`.pkg.tar.zst` file depending on your package manager and run the respective commands.

  ```sh
  sudo apk add --allow-untrusted <...>.apk
  ```

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/bin/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Edge Functions
- Primary reference: `docs/API_SURFACE.md`
- Primary operational functions:
  - `check-sets` — Catalog completeness audit and optional auto-fix via `import-prices`
  - `import-prices` — Set-level importer that writes `price_observations`
  - `check-prices` — Price freshness/coverage audit with optional re-import trigger
- Additional functions:
  - `search_cards`, `hydrate_card`, `keep_alive`
  - `import-all-prices`, `import-cards`, `import-card`
  - `intake-scan`, `price-cron` (provider TODOs)

## CI: Edge Functions Audit
- Workflow: `.github/workflows/edge-functions-audit.yml`
- Validates every function folder under `supabase/functions/` (excluding `_archive/`) has a `config.toml` or `README.md`.
- Enforces auth policy:
  - Public (`search_cards`, `hydrate_card`, `intake-scan`) must NOT set `verify_jwt = false`.
  - Internal (`import-prices`, `import-all-prices`, `import-cards`, `keep_alive`, `check-prices`, `check-sets`) must set `verify_jwt = false`.
- Optional local hook: `.githooks/pre-commit.ps1` (enable once with `git config core.hooksPath .githooks`).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```

## Database: Clean Sync + Resilient Views
- See `docs/DB_MIGRATION_NOTES.md` for details.
- Validation script (no persistent data): `scripts/sql/validate_vault_add_item.sql`
- Lint remote: `supabase db lint --db-url "postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres?sslmode=require"`

## Operations: Price Freshness Audit
- Runbook: `docs/OPERATOR_RUNBOOK.md` (inputs, sample payloads, responses, log locations)
- Primary scheduler: `supabase/functions/check-prices/config.toml` (06:00 UTC daily)
- Manual/override: `.github/workflows/check-prices-nightly.yml` (06:15 UTC daily + on-demand)
- Edge endpoint: `${SUPABASE_URL}/functions/v1/check-prices`

## Google Sign‑In (Supabase OAuth)
- App code: `lib/features/auth/login_page.dart` uses `supabase.auth.signInWithOAuth(OAuthProvider.google, redirectTo: Env.oauthRedirectUrl)`.
- Configure secrets (Supabase Dashboard → Authentication → Providers → Google):
  1) In Google Cloud Console, create OAuth credentials (Web application):
     - Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
     - Copy Client ID/Secret
  2) In Supabase Dashboard, paste Google Client ID/Secret under the Google provider and enable it.
  3) Supabase Dashboard → Authentication → URL Configuration → Additional Redirect URLs:
     - Add: `io.supabase.flutter://login-callback/` (or your custom value)
  4) App `.env` (optional override):
     - `OAUTH_REDIRECT_URL=io.supabase.flutter://login-callback/`

- Android Deep Link (AndroidManifest.xml):
```
<activity android:name="io.flutter.embedding.android.FlutterActivity" ...>
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="io.supabase.flutter" android:host="login-callback" />
  </intent-filter>
</activity>
```

- iOS URL Scheme (Info.plist):
```
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>io.supabase.flutter</string>
    </array>
  </dict>
</array>
```

- Notes:
  - If you customize the scheme/host, set `OAUTH_REDIRECT_URL` accordingly and update both Android and iOS to match.
  - Ensure the Google provider is enabled in Supabase and your redirect URL(s) are authorized. The app will transition from `LoginPage` to the authed shell automatically via `auth.onAuthStateChange`.
