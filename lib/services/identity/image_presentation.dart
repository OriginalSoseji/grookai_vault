class ResolvedImagePresentation {
  const ResolvedImagePresentation({
    required this.exactImageUrl,
    required this.representativeImageUrl,
    required this.displayImageUrl,
    required this.displayImageKind,
    required this.imageStatus,
    required this.imageNote,
    required this.compactBadgeLabel,
    required this.detailBadgeLabel,
    required this.detailNote,
  });

  final String? exactImageUrl;
  final String? representativeImageUrl;
  final String? displayImageUrl;
  final String displayImageKind;
  final String? imageStatus;
  final String? imageNote;
  final String? compactBadgeLabel;
  final String? detailBadgeLabel;
  final String? detailNote;

  bool get isRepresentative =>
      displayImageKind == 'representative' ||
      displayImageKind == 'missing_variant_visual';
  bool get isMissingVariantVisual =>
      displayImageKind == 'missing_variant_visual';
  bool get isBlocked => displayImageKind == 'blocked';
  bool get isCollisionRepresentative =>
      imageStatus == 'representative_shared_collision';
}

const String _kDefaultCollisionRepresentativeNote =
    'Identity is confirmed. The displayed image is a shared representative image until the exact variant image is available.';
const String _kDefaultRepresentativeNote =
    'Correct printing. Image may not show exact finish, stamp, or parallel.';
const String _kDefaultMissingVariantVisualNote =
    'This is the printing, but not the correct variant image.';
const String _kDefaultBlockedNote =
    'A possible image exists, but it needs verification before Grookai can use it.';

String? _normalizeTextOrNull(String? value) {
  final normalized = (value ?? '').trim();
  return normalized.isEmpty ? null : normalized;
}

String? _normalizeLowerOrNull(String? value) {
  final normalized = _normalizeTextOrNull(value);
  return normalized?.toLowerCase();
}

ResolvedImagePresentation resolveImagePresentationFromFields({
  String? imageUrl,
  String? representativeImageUrl,
  String? displayImageUrl,
  String? displayImageKind,
  String? imageStatus,
  String? imageNote,
}) {
  final normalizedExactImageUrl = _normalizeTextOrNull(imageUrl);
  final normalizedRepresentativeImageUrl = _normalizeTextOrNull(
    representativeImageUrl,
  );
  final normalizedImageStatus = _normalizeLowerOrNull(imageStatus);
  final normalizedImageNote = _normalizeTextOrNull(imageNote);
  final normalizedDisplayImageUrl =
      _normalizeTextOrNull(displayImageUrl) ??
      normalizedExactImageUrl ??
      normalizedRepresentativeImageUrl;

  final String normalizedDisplayImageKind = () {
    final explicitKind = _normalizeLowerOrNull(displayImageKind);
    if (explicitKind == 'exact' ||
        explicitKind == 'representative' ||
        explicitKind == 'missing_variant_visual' ||
        explicitKind == 'blocked' ||
        explicitKind == 'missing') {
      return explicitKind!;
    }
    if (normalizedImageStatus == 'blocked' ||
        (normalizedImageStatus ?? '').startsWith('blocked_')) {
      return 'blocked';
    }
    if (normalizedImageStatus == 'missing_variant_visual' ||
        normalizedImageStatus == 'representative_missing_variant_visual' ||
        (normalizedImageStatus ?? '').startsWith('missing_variant_') ||
        (normalizedImageStatus ?? '').startsWith('representative_missing_')) {
      return 'missing_variant_visual';
    }
    if (normalizedExactImageUrl != null) {
      return 'exact';
    }
    if (normalizedRepresentativeImageUrl != null ||
        (normalizedImageStatus ?? '').startsWith('representative_')) {
      return 'representative';
    }
    return 'missing';
  }();

  if (normalizedDisplayImageKind == 'blocked') {
    return ResolvedImagePresentation(
      exactImageUrl: normalizedExactImageUrl,
      representativeImageUrl: normalizedRepresentativeImageUrl,
      displayImageUrl: normalizedDisplayImageUrl,
      displayImageKind: normalizedDisplayImageKind,
      imageStatus: normalizedImageStatus,
      imageNote: normalizedImageNote,
      compactBadgeLabel: 'Image Under Review',
      detailBadgeLabel: 'Image Under Review',
      detailNote: normalizedImageNote ?? _kDefaultBlockedNote,
    );
  }

  if (normalizedDisplayImageKind != 'representative') {
    if (normalizedDisplayImageKind == 'missing_variant_visual') {
      return ResolvedImagePresentation(
        exactImageUrl: normalizedExactImageUrl,
        representativeImageUrl: normalizedRepresentativeImageUrl,
        displayImageUrl: normalizedDisplayImageUrl,
        displayImageKind: normalizedDisplayImageKind,
        imageStatus: normalizedImageStatus,
        imageNote: normalizedImageNote,
        compactBadgeLabel: 'Variant Image Pending',
        detailBadgeLabel: 'Variant Image Pending',
        detailNote: normalizedImageNote ?? _kDefaultMissingVariantVisualNote,
      );
    }

    return ResolvedImagePresentation(
      exactImageUrl: normalizedExactImageUrl,
      representativeImageUrl: normalizedRepresentativeImageUrl,
      displayImageUrl: normalizedDisplayImageUrl,
      displayImageKind: normalizedDisplayImageKind,
      imageStatus: normalizedImageStatus,
      imageNote: normalizedImageNote,
      compactBadgeLabel: null,
      detailBadgeLabel: null,
      detailNote: null,
    );
  }

  if (normalizedImageStatus == 'representative_shared_collision') {
    return ResolvedImagePresentation(
      exactImageUrl: normalizedExactImageUrl,
      representativeImageUrl: normalizedRepresentativeImageUrl,
      displayImageUrl: normalizedDisplayImageUrl,
      displayImageKind: normalizedDisplayImageKind,
      imageStatus: normalizedImageStatus,
      imageNote: normalizedImageNote,
      compactBadgeLabel: 'Exact Variant Image Pending',
      detailBadgeLabel: 'Exact Variant Image Pending',
      detailNote: normalizedImageNote ?? _kDefaultCollisionRepresentativeNote,
    );
  }

  return ResolvedImagePresentation(
    exactImageUrl: normalizedExactImageUrl,
    representativeImageUrl: normalizedRepresentativeImageUrl,
    displayImageUrl: normalizedDisplayImageUrl,
    displayImageKind: normalizedDisplayImageKind,
    imageStatus: normalizedImageStatus,
    imageNote: normalizedImageNote,
    compactBadgeLabel: 'Representative Image',
    detailBadgeLabel: 'Representative Image',
    detailNote: normalizedImageNote ?? _kDefaultRepresentativeNote,
  );
}
