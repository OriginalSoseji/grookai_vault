import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/printing/lot_p21_label.dart';
import 'package:grookai_vault/services/printing/p21_label.dart';

void main() {
  testWidgets('renders a compact lot label with a larger logo', (tester) async {
    await tester.runAsync(() async {
      final label = await LotP21Label.render(
        LotP21LabelContent(
          lotName: 'Yuka Morii',
          groupName: 'Eevee Lot',
          price: r'$1.00',
          condition: 'NM',
          qrUri: Uri.parse(
            'https://grookaivault.com/lots/70112233-4455-6677-8899-aabbccddeeff',
          ),
        ),
      );
      expect(label.bitmap.length, 3408);
      expect(label.bitmap.any((byte) => byte != 255), isTrue);
    });
  });

  testWidgets('can render a label without optional QR or logo', (tester) async {
    await tester.runAsync(() async {
      final label = await LotP21Label.render(
        LotP21LabelContent(
          lotName: 'Binder lot',
          groupName: 'Pikachu',
          price: r'$2.50',
          condition: 'LP',
          qrUri: Uri.parse('https://grookaivault.com/lots/pikachu'),
          includeLogo: false,
          includeQr: false,
        ),
      );
      expect(label.bitmap.length, P21Label.feedDots * P21Label.headDots ~/ 8);
    });
  });
}
