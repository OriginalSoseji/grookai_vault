MOBILE LOGIN GOOGLE REDESIGN V1

Purpose

Redesign the mobile login screen and surface Google auth as the primary sign-in path.

Current Auth Audit
	•	login screen owner:
	•	`LoginPage` in `lib/main_shell.dart`
	•	current auth CTA set:
	•	email field
	•	password field
	•	primary `Sign in`
	•	secondary `Create account`
	•	current Google auth path:
	•	none currently wired in app code
	•	no existing `signInWithOAuth` or `OAuthProvider.google` usage found
	•	no current mobile OAuth callback scheme configured in `Info.plist` or `AndroidManifest.xml`
	•	current visual issues:
	•	default app-bar auth screen
	•	form-first hierarchy
	•	little brand presence
	•	reads as utility auth, not product first impression
	•	likely primary redesign surface:
	•	keep implementation centered in `lib/main_shell.dart`
	•	add contained mobile callback config in platform manifests for Google OAuth return-to-app flow

Auth Hierarchy
	•	primary:
	•	`Continue with Google`
	•	secondary:
	•	`Continue with Email`
	•	fallbacks:
	•	email sign in button
	•	email account creation button
	•	inline auth error text
	•	what is removed/simplified:
	•	remove the default `AppBar(title: Sign in)` shell
	•	hide email/password form behind a cleaner secondary email path instead of making it the whole first impression
