**Why Android can’t reach 127.0.0.1**
- On a device/emulator, `127.0.0.1` refers to the device, not your PC.
- The app uses plain HTTP for local (`http://127.0.0.1:54321`), which is blocked by default on Android release and sometimes on debug without cleartext enabled.

**Fix Summary**
- Use ADB reverse port forwarding so the device can reach your PC’s localhost.
- Enable cleartext traffic for debug builds.
- Ensure `.env.local` points at `http://127.0.0.1:54321` and includes the local publishable key.
- Create/confirm a local test user via Mailpit.

**One‑shot script**
- `pwsh scripts/auth/local_login_fix.ps1 -DeviceId R5CY71V9ETR -Email tester@grookai.local -Password Test1234!`
  - Verifies/starts Supabase, syncs `.env.local` from `supabase status`, sets ADB reverse for 54321/54324, and attempts a local signup.

**Manual Steps**
1. Supabase
   - `supabase status` (expect API URL: `http://127.0.0.1:54321`)
   - If stopped: `supabase start`
2. Env
   - `.env.local`: set `SUPABASE_URL=http://127.0.0.1:54321` and `SUPABASE_ANON_KEY=<Publishable key>`
3. Android (debug only)
   - `android/app/src/debug/AndroidManifest.xml` contains `<application android:usesCleartextTraffic="true" />`
4. ADB reverse
   - `adb -s R5CY71V9ETR reverse tcp:54321 tcp:54321`
   - `adb -s R5CY71V9ETR reverse tcp:54324 tcp:54324`
5. Test user
   - Visit Mailpit: `http://127.0.0.1:54324`
   - Sign up: `tester@grookai.local` / `Test1234!` in the app; confirm in Mailpit if required.
6. Run app
   - `flutter run -d R5CY71V9ETR --dart-define=GV_ENV=local`
   - Expect logs: `[ENV] GV_ENV=local file=.env.local initialized=true` and `***** Supabase init completed *****`

**Diagnostics**
- `pwsh scripts/auth/local_connectivity_check.ps1 -DeviceId R5CY71V9ETR`
  - Verifies `adb reverse` for 54321/54324 and basic service reachability.

**Troubleshooting**
- Connection refused:
  - Re‑run ADB reverse commands.
  - Confirm Windows firewall allows Docker/Supabase ports.
  - `supabase status` should show API URL on 127.0.0.1:54321.
- Alternative: LAN‑IP mode
  - Replace `127.0.0.1` with your PC’s LAN IP in `.env.local` and ensure device is on same network; ADB reverse not required, but be mindful of firewalls.

