import '../../utils/display_image_contract.dart';
import 'image_presentation.dart';

ResolvedImagePresentation resolvePrintingImagePresentation({
  required ResolvedImagePresentation parent,
  Map<String, dynamic>? printing,
  String? printingDisplayImageUrl,
  bool showingParentFace = false,
}) {
  if (printing == null) return parent;

  final status = printing['image_status']?.toString().trim().toLowerCase();
  final note = printing['image_note']?.toString().trim();
  final childImageUrl =
      normalizeDisplayImageUrl(printingDisplayImageUrl) ??
      resolveDisplayImageUrl(
        imageUrl: printing['image_url'],
        imageAltUrl: printing['image_alt_url'],
      );
  final child = resolveImagePresentationFromFields(
    imageUrl: childImageUrl,
    displayImageKind:
        (status == 'representative' ||
            (status?.startsWith('representative_') == true &&
                status?.startsWith('representative_missing_') != true))
        ? 'representative'
        : null,
    imageStatus: status,
    imageNote: note,
  );

  if (child.isBlocked) {
    return resolveImagePresentationFromFields(
      representativeImageUrl: parent.isBlocked ? null : parent.displayImageUrl,
      displayImageKind: 'blocked',
      imageStatus: status,
      imageNote: note,
    );
  }
  if (childImageUrl != null && !showingParentFace) return child;

  if (parent.isBlocked) {
    return resolveImagePresentationFromFields(
      displayImageKind: 'blocked',
      imageStatus: parent.imageStatus,
      imageNote: parent.imageNote,
    );
  }
  final fallback = normalizeDisplayImageUrl(parent.displayImageUrl);
  if (fallback == null) {
    return resolveImagePresentationFromFields(displayImageKind: 'missing');
  }
  return resolveImagePresentationFromFields(
    representativeImageUrl: fallback,
    displayImageKind: 'missing_variant_visual',
    imageStatus: 'representative_missing_variant_visual',
    imageNote: child.isRepresentative && !showingParentFace
        ? child.detailNote
        : 'Correct printing. The displayed image is a base-card image; '
              'the exact finish or stamp image is pending.',
  );
}
