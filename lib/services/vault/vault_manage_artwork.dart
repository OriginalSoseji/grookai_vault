import '../identity/canon_image_url_service.dart';
import '../identity/catalog_artwork_resolution.dart';
import '../identity/image_presentation.dart';
import '../../utils/display_image_contract.dart';

String? exactManagePrintingImageUrl(Map<String, dynamic> printing) {
  if ((printing['image_status'] ?? '').toString().trim().toLowerCase() !=
      'exact') {
    return null;
  }
  return CanonImageUrlService.displayImageUrlFromRow(printing);
}

ResolvedImagePresentation resolveVaultManageImagePresentation({
  String? exactImageUrl,
  String? representativeImageUrl,
  String? displayImageUrl,
  String? displayImageKind,
  String? imageStatus,
  String? imageNote,
  String? exactPrintingImageUrl,
}) {
  final exactPrintingUrl = normalizeDisplayImageUrl(exactPrintingImageUrl);
  if (exactPrintingUrl != null) {
    return resolveImagePresentationFromFields(
      imageUrl: exactPrintingUrl,
      displayImageUrl: exactPrintingUrl,
      displayImageKind: 'exact',
      imageStatus: 'exact',
    );
  }

  return resolveImagePresentationFromFields(
    imageUrl: exactImageUrl,
    representativeImageUrl: representativeImageUrl,
    displayImageUrl: displayImageUrl,
    displayImageKind: displayImageKind,
    imageStatus: imageStatus,
    imageNote: imageNote,
  );
}

CatalogArtworkResolution resolveVaultManageArtwork({
  required dynamic cardGvId,
  required dynamic parentProviderImageUrl,
  String? exactCopyImageUrl,
  String? exactPrintingImageUrl,
}) {
  final catalogArtwork = resolveCatalogArtwork(
    gvId: cardGvId,
    providerImageUrl: parentProviderImageUrl,
  );
  final uploadedImageUrl = isCollectorUploadedCardImage(exactCopyImageUrl)
      ? normalizeDisplayImageUrl(exactCopyImageUrl)
      : isCollectorUploadedCardImage(parentProviderImageUrl)
      ? normalizeDisplayImageUrl(parentProviderImageUrl)
      : null;

  if (uploadedImageUrl != null) {
    return CatalogArtworkResolution(
      primaryImageUrl: uploadedImageUrl,
      fallbackImageUrl:
          catalogArtwork.primaryImageUrl ?? catalogArtwork.fallbackImageUrl,
    );
  }

  final exactPrintingUrl = normalizeDisplayImageUrl(exactPrintingImageUrl);
  if (exactPrintingUrl != null) {
    return CatalogArtworkResolution(
      primaryImageUrl: exactPrintingUrl,
      fallbackImageUrl:
          catalogArtwork.primaryImageUrl ?? catalogArtwork.fallbackImageUrl,
    );
  }

  return catalogArtwork;
}
