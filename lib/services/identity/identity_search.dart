import '../../models/card_print.dart';
import 'display_identity.dart';

class IdentityFilterOption {
  const IdentityFilterOption({required this.key, required this.label});

  final String key;
  final String label;
}

const String kIdentityFilterAll = 'all';
const String kIdentityFilterAlternateArt = 'alternate_art';
const String kIdentityFilterClassicCollection = 'classic_collection';
const String kIdentityFilterPokemonTogetherStamp = 'pokemon_together_stamp';
const String kIdentityFilterTrainerGallery = 'trainer_gallery';
const String kIdentityFilterRadiantCollection = 'radiant_collection';
const String kIdentityFilterPrerelease = 'prerelease';
const String kIdentityFilterStaff = 'staff';

const List<IdentityFilterOption> kIdentityFilterOptions =
    <IdentityFilterOption>[
      IdentityFilterOption(key: kIdentityFilterAll, label: 'All'),
      IdentityFilterOption(
        key: kIdentityFilterAlternateArt,
        label: 'Alternate Art',
      ),
      IdentityFilterOption(
        key: kIdentityFilterClassicCollection,
        label: 'Classic Collection',
      ),
      IdentityFilterOption(
        key: kIdentityFilterPokemonTogetherStamp,
        label: 'Pokémon Together Stamp',
      ),
      IdentityFilterOption(
        key: kIdentityFilterTrainerGallery,
        label: 'Trainer Gallery',
      ),
      IdentityFilterOption(
        key: kIdentityFilterRadiantCollection,
        label: 'Radiant Collection',
      ),
      IdentityFilterOption(key: kIdentityFilterPrerelease, label: 'Prerelease'),
      IdentityFilterOption(key: kIdentityFilterStaff, label: 'Staff'),
    ];

const Map<String, List<String>> _variantKeyTokenMap = <String, List<String>>{
  'alt': <String>['alt', 'alt art', 'alternate art'],
  'cc': <String>['cc', 'classic collection', 'celebrations classic collection'],
  'pokemon_together_stamp': <String>[
    'pokemon together',
    'together',
    'stamp',
    'pokemon together stamp',
  ],
  'prerelease': <String>['prerelease'],
  'rc': <String>['rc', 'radiant collection'],
  'staff': <String>['staff'],
  'tg': <String>['tg', 'trainer gallery'],
};

const Map<String, List<String>> _printedIdentityTokenMap =
    <String, List<String>>{
      'delta_species': <String>['delta', 'delta species'],
    };

String _normalizeVariantToken(String? value) {
  return (value ?? '').trim().toLowerCase().replaceAll(RegExp(r'[\s-]+'), '_');
}

String normalizeIdentitySearchText(String? value) {
  return (value ?? '')
      .replaceAll('é', 'e')
      .replaceAll('É', 'e')
      .trim()
      .toLowerCase()
      .replaceAll(RegExp(r'[_/-]+'), ' ')
      .replaceAll(RegExp(r'[^a-z0-9★☆]+'), ' ')
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim();
}

String normalizeIdentityFilterKey(String? value) {
  final normalized = normalizeIdentitySearchText(
    value,
  ).replaceAll(RegExp(r'\s+'), '_');
  const validKeys = <String>{
    kIdentityFilterAll,
    kIdentityFilterAlternateArt,
    kIdentityFilterClassicCollection,
    kIdentityFilterPokemonTogetherStamp,
    kIdentityFilterTrainerGallery,
    kIdentityFilterRadiantCollection,
    kIdentityFilterPrerelease,
    kIdentityFilterStaff,
  };
  return validKeys.contains(normalized) ? normalized : kIdentityFilterAll;
}

bool isIdentityFilterActive(String? value) {
  return normalizeIdentityFilterKey(value) != kIdentityFilterAll;
}

void _appendPhrase(Set<String> target, String? value) {
  final normalized = normalizeIdentitySearchText(value);
  if (normalized.isEmpty) {
    return;
  }

  target.add(normalized);
  for (final token in normalized.split(' ')) {
    if (token.isEmpty) {
      continue;
    }
    target.add(token);
  }
}

bool _isSingleLetterIdentity(String? value) {
  final normalized = (value ?? '').trim();
  return RegExp(r'^[A-Za-z0-9★☆]$').hasMatch(normalized);
}

List<String> getCardIdentityFilterKeys(CardPrint card) {
  final variantKey = _normalizeVariantToken(card.variantKey);
  final setIdentityModel = _normalizeVariantToken(card.setIdentityModel);
  final keys = <String>{};

  if (variantKey == 'alt') {
    keys.add(kIdentityFilterAlternateArt);
  }
  if (variantKey == 'cc' || setIdentityModel == 'reprint_anthology') {
    keys.add(kIdentityFilterClassicCollection);
  }
  if (variantKey == 'pokemon_together_stamp') {
    keys.add(kIdentityFilterPokemonTogetherStamp);
  }
  if (variantKey == 'tg') {
    keys.add(kIdentityFilterTrainerGallery);
  }
  if (variantKey == 'rc') {
    keys.add(kIdentityFilterRadiantCollection);
  }
  if (variantKey == 'prerelease') {
    keys.add(kIdentityFilterPrerelease);
  }
  if (variantKey == 'staff') {
    keys.add(kIdentityFilterStaff);
  }

  return keys.toList(growable: false);
}

bool matchesIdentityFilter(CardPrint card, String? filterKey) {
  final normalized = normalizeIdentityFilterKey(filterKey);
  if (normalized == kIdentityFilterAll) {
    return true;
  }
  return getCardIdentityFilterKeys(card).contains(normalized);
}

Map<String, int> buildIdentityFilterCounts(Iterable<CardPrint> cards) {
  final counts = <String, int>{
    kIdentityFilterAll: 0,
    kIdentityFilterAlternateArt: 0,
    kIdentityFilterClassicCollection: 0,
    kIdentityFilterPokemonTogetherStamp: 0,
    kIdentityFilterTrainerGallery: 0,
    kIdentityFilterRadiantCollection: 0,
    kIdentityFilterPrerelease: 0,
    kIdentityFilterStaff: 0,
  };

  for (final card in cards) {
    counts[kIdentityFilterAll] = (counts[kIdentityFilterAll] ?? 0) + 1;
    for (final key in getCardIdentityFilterKeys(card)) {
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }

  return counts;
}

List<String> getIdentitySearchTokens(CardPrint card) {
  final variantKey = _normalizeVariantToken(card.variantKey);
  final printedIdentityModifier = _normalizeVariantToken(
    card.printedIdentityModifier,
  );
  final phrases = <String>{};
  final displayIdentity = resolveCardPrintDisplayIdentity(card);

  _appendPhrase(phrases, displayIdentity.suffix);
  _appendPhrase(phrases, formatVariantKey(card.variantKey));
  _appendPhrase(
    phrases,
    formatPrintedIdentityModifier(card.printedIdentityModifier),
  );

  for (final alias in _variantKeyTokenMap[variantKey] ?? const <String>[]) {
    _appendPhrase(phrases, alias);
  }

  for (final alias
      in _printedIdentityTokenMap[printedIdentityModifier] ??
          const <String>[]) {
    _appendPhrase(phrases, alias);
  }

  if (_normalizeVariantToken(card.setIdentityModel) == 'reprint_anthology') {
    _appendPhrase(phrases, 'classic collection');
    _appendPhrase(phrases, 'celebrations classic collection');
  }

  if (_isSingleLetterIdentity(card.variantKey)) {
    _appendPhrase(phrases, card.variantKey);
  }

  if (_isSingleLetterIdentity(card.printedIdentityModifier)) {
    _appendPhrase(phrases, card.printedIdentityModifier);
  }

  return phrases.toList(growable: false);
}

String buildIdentitySearchText(CardPrint card) {
  return getIdentitySearchTokens(card).join(' ');
}
