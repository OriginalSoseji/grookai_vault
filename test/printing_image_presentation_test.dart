import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/identity/image_presentation.dart';
import 'package:grookai_vault/services/identity/printing_image_presentation.dart';

void main() {
  final parent = resolveImagePresentationFromFields(
    imageUrl: 'https://example.com/base.png',
  );

  test('a parent without a selected finish keeps its image confidence', () {
    expect(resolvePrintingImagePresentation(parent: parent), same(parent));
  });

  test(
    'a reverse without finish artwork cannot inherit an exact parent claim',
    () {
      final result = resolvePrintingImagePresentation(
        parent: parent,
        printing: {'finish_key': 'reverse', 'image_status': null},
      );
      expect(result.displayImageKind, 'missing_variant_visual');
      expect(result.displayImageUrl, parent.displayImageUrl);
      expect(result.exactImageUrl, isNull);
      expect(result.compactBadgeLabel, 'Variant Image Pending');
      expect(result.detailNote, contains('finish or stamp'));
    },
  );

  test('an exact child image replaces the parent presentation', () {
    final result = resolvePrintingImagePresentation(
      parent: parent,
      printing: {
        'image_url': 'https://example.com/reverse.png',
        'image_status': 'exact',
      },
    );
    expect(result.displayImageKind, 'exact');
    expect(result.displayImageUrl, 'https://example.com/reverse.png');
    expect(result.compactBadgeLabel, isNull);
  });

  test('a signed child display image retains its reviewed metadata', () {
    final result = resolvePrintingImagePresentation(
      parent: parent,
      printing: {'image_status': 'exact', 'image_path': 'reviewed/child.png'},
      printingDisplayImageUrl: 'https://example.com/signed-child.png',
    );
    expect(result.displayImageKind, 'exact');
    expect(result.displayImageUrl, 'https://example.com/signed-child.png');
  });

  test('a representative child image keeps its specific visual warning', () {
    final result = resolvePrintingImagePresentation(
      parent: parent,
      printing: {
        'image_url': 'https://example.com/representative.png',
        'image_status': 'representative_missing_variant_visual',
        'image_note': 'The League stamp image remains pending.',
      },
    );
    expect(result.isMissingVariantVisual, isTrue);
    expect(result.detailNote, 'The League stamp image remains pending.');
  });

  test('a blocked child source never becomes an exact displayed image', () {
    final result = resolvePrintingImagePresentation(
      parent: parent,
      printing: {
        'image_url': 'https://example.com/unreviewed.png',
        'image_status': 'blocked_source_identity_conflict',
      },
    );
    expect(result.isBlocked, isTrue);
    expect(result.exactImageUrl, isNull);
    expect(result.displayImageUrl, parent.displayImageUrl);
    expect(result.compactBadgeLabel, 'Image Under Review');
  });

  test('a shared child image cannot gain exact confidence from its URL', () {
    final result = resolvePrintingImagePresentation(
      parent: parent,
      printing: {
        'image_url': 'https://example.com/shared.png',
        'image_status': 'representative_shared_collision',
      },
    );
    expect(result.displayImageKind, 'representative');
    expect(result.isCollisionRepresentative, isTrue);
    expect(result.compactBadgeLabel, 'Exact Variant Image Pending');
  });

  test(
    'legacy representative status casing cannot turn a fallback into exact art',
    () {
      final result = resolvePrintingImagePresentation(
        parent: parent,
        printing: {
          'image_url': 'https://example.com/shared.png',
          'image_status': ' REPRESENTATIVE ',
        },
      );
      expect(result.displayImageKind, 'representative');
      expect(result.exactImageUrl, 'https://example.com/shared.png');
      expect(result.isRepresentative, isTrue);
    },
  );

  test('a missing child never borrows blocked parent artwork', () {
    final blocked = resolveImagePresentationFromFields(
      imageUrl: 'https://example.com/blocked.png',
      imageStatus: 'blocked_source_identity_conflict',
    );
    final result = resolvePrintingImagePresentation(
      parent: blocked,
      printing: {'finish_key': 'reverse'},
    );
    expect(result.isBlocked, isTrue);
    expect(result.displayImageUrl, isNull);
  });

  test('a selected finish with no usable art stays missing', () {
    final result = resolvePrintingImagePresentation(
      parent: resolveImagePresentationFromFields(),
      printing: {'finish_key': 'reverse'},
    );
    expect(result.displayImageKind, 'missing');
    expect(result.displayImageUrl, isNull);
  });

  test('a parent face cannot certify the selected child finish', () {
    final result = resolvePrintingImagePresentation(
      parent: parent,
      printing: {'image_url': 'https://example.com/reverse.png'},
      showingParentFace: true,
    );
    expect(result.displayImageKind, 'missing_variant_visual');
    expect(result.displayImageUrl, parent.displayImageUrl);
  });

  test('switching to a reviewed child clears the earlier fallback warning', () {
    final missing = resolvePrintingImagePresentation(
      parent: parent,
      printing: {},
    );
    final exact = resolvePrintingImagePresentation(
      parent: parent,
      printing: {'image_alt_url': 'https://example.com/normal.png'},
    );
    expect(missing.isRepresentative, isTrue);
    expect(exact.displayImageKind, 'exact');
    expect(exact.isRepresentative, isFalse);
    expect(exact.displayImageUrl, 'https://example.com/normal.png');
  });
}
