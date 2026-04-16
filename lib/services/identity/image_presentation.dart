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

  bool get isRepresentative => displayImageKind == 'representative';
  bool get isCollisionRepresentative =>
      imageStatus == 'representative_shared_collision';
}

const String _kDefaultCollisionRepresentativeNote =
    'Identity is confirmed. The displayed image is a shared representative image until the exact variant image is available.';

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
  final normalizedRepresentativeImageUrl =
      _normalizeTextOrNull(representativeImageUrl);
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
        explicitKind == 'missing') {
      return explicitKind!;
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

  if (normalizedDisplayImageKind != 'representative') {
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
    compactBadgeLabel: 'Shared Preview',
    detailBadgeLabel: 'Representative Image',
    detailNote: normalizedImageNote,
  );
}
