import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/utils/vault_printing_identity.dart';

void main() {
  group('Vault printing identity presentation', () {
    test('shows an exact finish when the read model proves one printing', () {
      final presentation = resolveVaultPrintingIdentityPresentation({
        'printing_identity_status': 'exact',
        'finish_label': 'Reverse Holo',
        'printing_gv_id': 'GV-PK-TEST-001-RH',
      });

      expect(presentation.status, VaultPrintingIdentityStatus.exact);
      expect(presentation.label, 'Printing: Reverse Holo');
      expect(presentation.isExact, isTrue);
    });

    test('falls back to the exact child public ID when finish is absent', () {
      final presentation = resolveVaultPrintingIdentityPresentation({
        'printing_identity_status': 'exact',
        'printing_gv_id': 'GV-PK-TEST-001-RH',
      });

      expect(presentation.label, 'Printing: GV-PK-TEST-001-RH');
    });

    test('never invents a finish for unassigned ownership', () {
      final presentation = resolveVaultPrintingIdentityPresentation({
        'printing_identity_status': 'unassigned',
        'finish_label': 'Holo',
      });

      expect(presentation.status, VaultPrintingIdentityStatus.unassigned);
      expect(presentation.label, 'Printing unassigned');
      expect(presentation.isExact, isFalse);
    });

    test('makes mixed and partial parent groups explicit', () {
      expect(
        resolveVaultPrintingIdentityPresentation({
          'printing_identity_status': 'mixed',
        }).label,
        'Mixed printings',
      );
      expect(
        resolveVaultPrintingIdentityPresentation({
          'printing_identity_status': 'partially_unassigned',
        }).label,
        'Printing partially unassigned',
      );
    });

    test('makes an older or unavailable server contract explicit', () {
      expect(
        resolveVaultPrintingIdentityPresentation(const {}).label,
        'Printing status unavailable',
      );
    });

    test('artwork labels always preserve the governed printing status', () {
      expect(
        vaultCardArtworkLabel(
          'Pikachu ex',
          resolveVaultPrintingIdentityPresentation({
            'printing_identity_status': 'exact',
            'finish_label': 'Holo',
          }),
        ),
        'Pikachu ex · Printing: Holo',
      );
      expect(
        vaultCardArtworkLabel(
          'Pikachu',
          resolveVaultPrintingIdentityPresentation({
            'printing_identity_status': 'unassigned',
          }),
        ),
        'Pikachu · Printing unassigned',
      );
    });
  });
}
