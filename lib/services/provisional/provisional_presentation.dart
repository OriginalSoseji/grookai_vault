const String provisionalUnconfirmedLabel = 'Unconfirmed';
const String provisionalUnderReviewLabel = 'Under Review';
const String provisionalTrustCopy = 'Visible while under review.';
const String provisionalNotCanonCopy = 'Not part of the canonical catalog yet.';

// LOCK: Provisional product language must stay short, calm, and non-technical.
String provisionalDisplayLabel(String? rawLabel) {
  final normalized = (rawLabel ?? '').trim().toUpperCase();
  return normalized == 'UNCONFIRMED'
      ? provisionalUnconfirmedLabel
      : provisionalUnderReviewLabel;
}
