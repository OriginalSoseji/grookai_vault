const String provisionalUnconfirmedLabel = 'Needs Review';
const String provisionalUnderReviewLabel = 'Reviewing';
const String provisionalTrustCopy =
    'Review this possible match before adding it.';
const String provisionalNotCanonCopy = 'It is not in your saved card list yet.';

// LOCK: Provisional product language must stay short, calm, and non-technical.
String provisionalDisplayLabel(String? rawLabel) {
  final normalized = (rawLabel ?? '').trim().toUpperCase();
  return normalized == 'UNCONFIRMED'
      ? provisionalUnconfirmedLabel
      : provisionalUnderReviewLabel;
}
