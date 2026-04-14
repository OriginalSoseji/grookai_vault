LOGIN BRAND POLISH V1

Purpose

Replace the placeholder login icon with the official Grookai logo and remove the remaining layout overflow so the mobile auth screen feels ready.

Audit
	•	login hero owner:
	•	`_LoginPageState` plus helper widgets in `lib/main_shell.dart`
	•	current placeholder icon owner:
	•	`_LoginBrandMark` currently renders `Icons.auto_awesome_motion_rounded`
	•	official logo asset path:
	•	`ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png`
	•	overflow owner:
	•	`_LoginPreviewSurface` used a fixed-height promo panel with an internal `Column` and `Spacer`
	•	the promo copy plus preview stack exceeded the available vertical space on the tested iPhone viewport
	•	likely safe simplification path:
	•	use the official Grookai mark via `Image.asset`
	•	remove the fixed-height promo panel and let it size to content naturally
	•	trim the promo copy slightly and keep the stacked mini-surface as a quieter accent
