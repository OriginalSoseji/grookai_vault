class IntentPresentation {
  const IntentPresentation({
    required this.value,
    required this.label,
    required this.helper,
    required this.discoverable,
    required this.contactable,
    required this.contactCtaLabel,
  });

  final String value;
  final String label;
  final String? helper;
  final bool discoverable;
  final bool contactable;
  final String? contactCtaLabel;
}

const List<String> kVaultIntentValues = <String>[
  'hold',
  'trade',
  'sell',
  'showcase',
];

const List<String> kDiscoverableVaultIntentValues = <String>[
  'trade',
  'sell',
  'showcase',
];

// LOCK: App intent wording must mirror web intent meaning and stay non-technical.
// LOCK: Intent labels and CTA meaning must remain consistent across app discoverability surfaces.
const Map<String, IntentPresentation> kIntentPresentationByValue =
    <String, IntentPresentation>{
      'hold': IntentPresentation(
        value: 'hold',
        label: 'Hold',
        helper: 'Private to your vault.',
        discoverable: false,
        contactable: false,
        contactCtaLabel: null,
      ),
      'trade': IntentPresentation(
        value: 'trade',
        label: 'Trade',
        helper: 'Visible to collectors for trade messages.',
        discoverable: true,
        contactable: true,
        contactCtaLabel: 'Message collector',
      ),
      'sell': IntentPresentation(
        value: 'sell',
        label: 'Sell',
        helper: 'Visible to collectors for sale messages.',
        discoverable: true,
        contactable: true,
        contactCtaLabel: 'Message collector',
      ),
      'showcase': IntentPresentation(
        value: 'showcase',
        label: 'Showcase',
        helper: 'Visible to collectors for questions and interest.',
        discoverable: true,
        contactable: true,
        contactCtaLabel: 'Message collector',
      ),
    };

String normalizeVaultIntentValue(dynamic value) {
  final normalized = (value ?? '').toString().trim().toLowerCase();
  return kVaultIntentValues.contains(normalized) ? normalized : 'hold';
}

String? normalizeDiscoverableVaultIntentValue(dynamic value) {
  final normalized = normalizeVaultIntentValue(value);
  return normalized == 'hold' ? null : normalized;
}

IntentPresentation getIntentPresentation(dynamic intent) {
  return kIntentPresentationByValue[normalizeVaultIntentValue(intent)] ??
      kIntentPresentationByValue['hold']!;
}

String getVaultIntentLabel(dynamic intent) {
  return getIntentPresentation(intent).label;
}

String? getVaultIntentHelper(dynamic intent) {
  return getIntentPresentation(intent).helper;
}

bool isVaultIntentDiscoverable(dynamic intent) {
  return getIntentPresentation(intent).discoverable;
}

bool isVaultIntentContactable(dynamic intent) {
  return getIntentPresentation(intent).contactable;
}

String getVaultIntentActionLabel(dynamic intent) {
  return getIntentPresentation(
        normalizeDiscoverableVaultIntentValue(intent),
      ).contactCtaLabel ??
      'Message collector';
}
