import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/onboarding/onboarding_ladder_service.dart';

void main() {
  test('onboarding catalog rows retain their GV-ID and provider image', () {
    final card = OnboardingSearchCard.fromJson(<String, dynamic>{
      'id': 'card-1',
      'gv_id': 'GV-PK-TEST-1',
      'name': 'Pikachu',
      'set_code': 'TEST',
      'number': '1',
      'image_url': 'https://provider.test/card.webp',
    });

    expect(card.cardPrintId, 'card-1');
    expect(card.gvId, 'GV-PK-TEST-1');
    expect(card.imageUrl, 'https://provider.test/card.webp');
  });

  test('scanner candidate surfaces use hosted-first artwork rendering', () {
    const paths = <String>[
      'lib/screens/scanner_v5/widgets/scanner_candidate_row.dart',
      'lib/screens/scanner_v5/widgets/scanner_result_sheet.dart',
      'lib/screens/scanner/widgets/scanner_primary_card_tile.dart',
      'lib/screens/scanner/widgets/scanner_v3_camera_overlay.dart',
      'lib/screens/scanner/scan_identify_screen.dart',
      'lib/screens/scanner/scan_capture_screen.dart',
      'lib/screens/identity_scan/identity_scan_screen.dart',
      'lib/widgets/scanner/identity_scanner_bottom_panel.dart',
    ];

    for (final path in paths) {
      final source = File(path).readAsStringSync();
      expect(source, contains('resolveCatalogArtwork('), reason: path);
      expect(source, contains('CardSurfaceArtwork('), reason: path);
      expect(source, contains('fallbackImageUrl:'), reason: path);
      expect(source, isNot(contains('Image.network(')), reason: path);
    }
  });

  test('scanner flows propagate GV-IDs into thumbnails when available', () {
    final overlay = File(
      'lib/screens/scanner/widgets/scanner_v3_camera_overlay.dart',
    ).readAsStringSync();
    final conditionCamera = File(
      'lib/screens/scanner/condition_camera_screen.dart',
    ).readAsStringSync();
    final conditionService = File(
      'lib/services/scanner/condition_scan_service.dart',
    ).readAsStringSync();
    final nativeScanner = File(
      'lib/screens/scanner/native_scanner_phase0_screen.dart',
    ).readAsStringSync();

    expect(overlay, contains('gvId: candidate?.gvId'));
    expect(conditionCamera, contains('gvId: candidate?.gvId'));
    expect(conditionService, contains(".select('gv_id')"));
    expect(conditionService, contains("match['best_candidate_gv_id']"));
    expect(nativeScanner, contains("'id,gv_id,name,set_code"));
    expect(nativeScanner, contains("'gv_id': (card['gv_id']"));
  });

  test(
    'onboarding card thumbnails use hosted primary and provider fallback',
    () {
      final service = File(
        'lib/services/onboarding/onboarding_ladder_service.dart',
      ).readAsStringSync();
      final sheet = File(
        'lib/widgets/onboarding/onboarding_ladder_sheet.dart',
      ).readAsStringSync();

      expect(service, contains('id,gv_id,name,set_code'));
      expect(service, contains("gvId: _optionalText(json['gv_id'])"));
      expect(sheet, contains('gvId: card?.gvId'));
      expect(sheet, contains('imageUrl: artwork.primaryImageUrl'));
      expect(sheet, contains('fallbackImageUrl: artwork.fallbackImageUrl'));
      expect(sheet, isNot(contains('Image.network(')));
    },
  );

  test('captured photos and collector avatars remain on their own sources', () {
    final scanCapture = File(
      'lib/screens/scanner/scan_capture_screen.dart',
    ).readAsStringSync();
    final scanIdentify = File(
      'lib/screens/scanner/scan_identify_screen.dart',
    ).readAsStringSync();
    final identityScan = File(
      'lib/screens/identity_scan/identity_scan_screen.dart',
    ).readAsStringSync();
    final quadAdjust = File(
      'lib/screens/scanner/quad_adjust_screen.dart',
    ).readAsStringSync();
    final onboardingSheet = File(
      'lib/widgets/onboarding/onboarding_ladder_sheet.dart',
    ).readAsStringSync();

    expect(scanCapture, contains('Image.file(File(file.path)'));
    expect(scanIdentify, contains('Image.file(File(_front!.path)'));
    expect(identityScan, contains('Image.file('));
    expect(quadAdjust, contains('Image.network('));
    expect(quadAdjust, contains('widget.imageUrl'));
    expect(quadAdjust, isNot(contains('resolveCatalogArtwork(')));
    expect(onboardingSheet, contains('NetworkImage(url)'));
  });
}
