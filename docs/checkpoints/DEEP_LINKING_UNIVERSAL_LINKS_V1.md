DEEP LINKING UNIVERSAL LINKS V1

Purpose

Enable canonical shared Grookai Vault web URLs to open the installed app directly while preserving website fallback.

Routing Audit
	•	canonical public routes found:
	•	web card route: `/card/[gv_id]`
	•	web public collector route: `/u/[slug]`
	•	web public set route currently implemented as `/sets/[set_code]`
	•	requested singular `/set/[set_code]` route is not currently present on web
	•	flutter route/navigation owners:
	•	app entry/auth gate: `lib/main.dart`
	•	shell navigation owner: `lib/main_shell.dart`
	•	target screens:
	•	`CardDetailScreen`
	•	`PublicCollectorScreen`
	•	`PublicSetDetailScreen`
	•	existing deep-link support:
	•	no active Flutter deep-link/app-link handling found
	•	no current iOS Associated Domains entitlement found
	•	`app_links` package is available in lock/package config but not yet wired into app code
	•	likely app entry integration point:
	•	receive canonical URL in `main.dart`
	•	hand pending route into authenticated `AppShell`
	•	resolve/push target screen from `main_shell.dart`
	•	iOS universal link config status:
	•	no `ios/Runner/Runner.entitlements` present yet
	•	no `com.apple.developer.associated-domains` / `applinks:` config present yet
	•	local Xcode project audit proves:
	•	development team: `DUADT25J5V`
	•	bundle identifier: `com.cesar.grookaivault`
	•	expected appID: `DUADT25J5V.com.cesar.grookaivault`
	•	web association file status:
	•	no Apple App Site Association file present yet under `apps/web/public/.well-known/`
	•	card route nuance:
	•	`/card/{gv_id}` is canonical on web
	•	Flutter `CardDetailScreen` still requires `cardPrintId` as its load key
	•	app-side universal-link routing needs a small `gv_id -> card_print_id` bridge before opening card detail

Canonical Link Contract
	•	route: `/card/{gv_id}`
	•	app target screen: `CardDetailScreen`
	•	required param: `gv_id`
	•	auth expectation: app remains behind current auth gate; authenticated app should resolve and open card detail
	•	existing screen owner: `lib/card_detail_screen.dart`
	•	route: `/u/{slug}`
	•	app target screen: `PublicCollectorScreen`
	•	required param: `slug`
	•	auth expectation: public profile content, opened from authenticated app shell
	•	existing screen owner: `lib/screens/public_collector/public_collector_screen.dart`
	•	route: `/set/{set_code}` compatibility path and `/sets/{set_code}` current web path
	•	app target screen: `PublicSetDetailScreen`
	•	required param: `set_code`
	•	auth expectation: public set content, opened from authenticated app shell
	•	existing screen owner: `lib/screens/sets/public_set_detail_screen.dart`

Website Fallback Contract
	•	app installed + associated domain active:
	•	canonical web URL should open the app directly
	•	app not installed:
	•	same canonical URL should continue opening the website
	•	before App Store release:
	•	only installed internal/tester builds with the matching associated-domain entitlement can benefit from app-open behavior
	•	everyone else still lands on the web experience
