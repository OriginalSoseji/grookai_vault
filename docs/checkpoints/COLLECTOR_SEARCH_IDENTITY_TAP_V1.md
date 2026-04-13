COLLECTOR SEARCH IDENTITY TAP V1

Purpose

Make collector identity tappable after search so the full public collector profile can be opened directly.

Audit
	•	search surface owner:
	•	collector-facing result surface audited in `lib/screens/network/network_screen.dart`
	•	dedicated collector discovery list in `lib/screens/network/network_discover_screen.dart` already has full-row tap navigation
	•	result row owner:
	•	passive collector identity header `_NetworkCollectorContext` in `lib/screens/network/network_screen.dart`
	•	rendered through `topContext` in `lib/widgets/network/network_interaction_card.dart`
	•	current identity widget:
	•	initial badge + display name + timestamp + intent marker
	•	visual only, no gesture/navigation attached
	•	existing route helper:
	•	existing app route reuse is `Navigator.push(... PublicCollectorScreen(slug: ...))`
	•	already used across network thread, following, relationship, and public surfaces
	•	likely tap target fix:
	•	make the full collector identity block tappable when `ownerSlug` is present
	•	route to `PublicCollectorScreen(slug: ownerSlug)`
	•	keep card body tap behavior intact for card-detail navigation
