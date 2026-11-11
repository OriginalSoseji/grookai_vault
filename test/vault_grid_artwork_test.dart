import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/vault/vault_grid_artwork.dart';

void main() {
  group('Vault grid exact printing artwork', () {
    test('selects an exact printing only when all owned copies agree', () {
      final selected = uniqueOwnedPrintingIdsForVaultArtwork(
        vaultRows: const [
          {'card_id': 'print-a', 'owned_count': 2},
          {'card_id': 'print-b', 'owned_count': 1},
        ],
        pricingTargets: const [
          {'card_print_id': 'print-a', 'card_printing_id': 'holo-a'},
          {'card_print_id': 'print-a', 'card_printing_id': 'holo-a'},
          {'card_print_id': 'print-b', 'card_printing_id': 'normal-b'},
        ],
      );

      expect(selected, {'print-a': 'holo-a', 'print-b': 'normal-b'});
    });

    test('rejects mixed, unassigned, and incomplete printing identities', () {
      final selected = uniqueOwnedPrintingIdsForVaultArtwork(
        vaultRows: const [
          {'card_id': 'mixed', 'owned_count': 2},
          {'card_id': 'unassigned', 'owned_count': 1},
          {'card_id': 'incomplete', 'owned_count': 2},
        ],
        pricingTargets: const [
          {'card_print_id': 'mixed', 'card_printing_id': 'normal'},
          {'card_print_id': 'mixed', 'card_printing_id': 'holo'},
          {'card_print_id': 'unassigned', 'card_printing_id': null},
          {'card_print_id': 'incomplete', 'card_printing_id': 'holo'},
        ],
      );

      expect(selected, isEmpty);
    });

    test('matches exact image to its parent and requested printing id', () {
      final selected = exactVaultPrintingImageRows(
        printingIdByCardPrintId: const {'print-a': 'holo-a'},
        printingOptions: const [
          {
            'card_print_id': 'print-a',
            'id': 'normal-a',
            'image_status': 'exact',
          },
          {'card_print_id': 'print-a', 'id': 'holo-a', 'image_status': 'exact'},
          {'card_print_id': 'print-b', 'id': 'holo-a', 'image_status': 'exact'},
          {
            'card_print_id': 'print-a',
            'id': 'holo-a',
            'image_status': 'missing_variant_visual',
          },
        ],
      );

      expect(selected.keys, {'print-a'});
      expect(selected['print-a']?['id'], 'holo-a');
    });
  });
}
