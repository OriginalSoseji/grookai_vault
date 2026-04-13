SET ART PRIORITY BACKFILL V1

Purpose

Backfill hero_image_url for the sets most likely to appear in the Start here discovery rail.

Discovery Source Audit
	•	owner file: `lib/screens/sets/public_sets_screen.dart`
	•	source list owner: `PublicSetsService.fetchSets(...)` + `PublicSetsService.filterAndSortSets(...)` in `lib/services/public/public_sets_service.dart`
	•	current ordering logic: empty-query Start here takes `filteredSets.take(6)` after canonical set de-duplication, card-count filtering, and default sort by `release_date desc`, then `name asc`
	•	current visible candidate count: `6` visible default rail slots, with a practical priority buffer of `30`
	•	likely top-priority set codes: `me02.5`, `sv10.5b`, `sv10.5w`, `sv10`, `sv8pt5`, `sv6pt5`

Priority Target List
	•	total priority targets: `30`
	•	already covered: `12`
	•	missing hero_image_url: `18`
	•	target set codes: `me02.5`, `sv10.5b`, `sv10.5w`, `sv8pt5`, `sv6pt5`, `sv4pt5`, `sv02`, `sv01`, `sve`, `swsh12tg`, `svp`, `swsh11tg`, `mcd22`, `pgo`, `swsh10tg`, `swsh9tg`, `swsh45sv`, `mcd21`
	•	why these were selected: they are the missing members of the first 30 sets produced by the exact live Start here source path, so they directly affect the default rail and its immediate scroll buffer

Approved Source Availability
	•	available via tcgdex: `sv10.5b`, `sv10.5w`, `sv02`, `sv01`
	•	available via pokemontcgapi: none verified in this environment for the priority-missing set list
	•	unavailable safely: `me02.5` has no approved upstream id; `svp` has a TCGdex id but no PNG logo
	•	blocked by auth/403: `sv8pt5`, `sv6pt5`, `sv4pt5`, `sve`, `swsh12tg`, `swsh11tg`, `mcd22`, `pgo`, `swsh10tg`, `swsh9tg`, `swsh45sv`, `mcd21` failed against the approved Pokemon TCG API path with `403` or timeout responses
	•	null retained for: all priority targets without a verified approved source after this pass

Priority Coverage Result
	•	before: priority subset coverage `12 / 30`; default visible Start here coverage `1 / 6`
	•	after: priority subset coverage `16 / 30`; default visible Start here coverage `3 / 6`
	•	updated set count: `4`
	•	remaining nulls: `me02.5`, `sv8pt5`, `sv6pt5`, `sv4pt5`, `sve`, `swsh12tg`, `svp`, `swsh11tg`, `mcd22`, `pgo`, `swsh10tg`, `swsh9tg`, `swsh45sv`, `mcd21`
	•	default first-rail quality after pass: `sv10.5b`, `sv10.5w`, and `sv10` are now art-backed in the live first six; `me02.5`, `sv8pt5`, and `sv6pt5` remain honest nulls
