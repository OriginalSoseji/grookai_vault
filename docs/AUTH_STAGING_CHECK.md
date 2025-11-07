**Staging Login Sanity Checklist**

- Verify staging env file
  - Open `.env.staging` and ensure values are correct:
    - `SUPABASE_URL=https://<your-staging>.supabase.co`
    - `SUPABASE_ANON_KEY=<staging anon key>` (Project → API)

- Supabase Dashboard → Authentication → URL Configuration
  - If using magic links, include your app redirect (e.g., `io.supabase.flutter://login-callback/`).
  - Password login does not require redirect tweaks.

- App confirmation
  - Run: `flutter run -d <device> --dart-define=GV_ENV=staging`
  - Profile page shows line like: `ENV: staging URL: https://....supabase.co`.
  - Sign in with an existing hosted user; expect success.

- Optional: sign up flow (hosted)
  - Hosted projects do not have Mailpit. Use a real inbox to confirm email if confirmations are enabled.

