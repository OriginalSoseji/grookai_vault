import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('signed-out mobile entry exposes public card exploration', () {
    final main = File('lib/main.dart').readAsStringSync();
    final shell = File('lib/main_shell.dart').readAsStringSync();

    expect(shell, contains("label: const Text('Explore cards')"));
    expect(shell, contains('const _SignedOutCatalogScreen()'));
    expect(main, contains('class _SignedOutCatalogScreen'));
    expect(main, contains('HomePage(signedOutBrowse: true)'));
    expect(main, contains("entrySurface: 'public_card_link'"));
    expect(main, contains("_signedIn ? 'Continue' : 'Sign in'"));
    expect(main, contains('popUntil((route) => route.isFirst)'));
  });

  test('guest catalog excludes personalized and mutating behavior', () {
    final main = File('lib/main.dart').readAsStringSync();

    expect(main, contains('if (widget.signedOutBrowse)'));
    expect(
      main,
      contains('!widget.signedOutBrowse && !(ownershipState?.owned ?? false)'),
    );
    expect(main, contains("? const <String, OwnershipState>{}"));
    expect(main, contains('? _openCardDetail(card)'));
  });

  test(
    'signed-out card links resolve publicly and personal actions resume',
    () {
      final main = File('lib/main.dart').readAsStringSync();
      final cardDetail = File('lib/card_detail_screen.dart').readAsStringSync();
      final continuation = File(
        'lib/screens/auth/sign_in_continuation_screen.dart',
      ).readAsStringSync();

      expect(main, contains('class _PublicCardRouteScreen'));
      expect(main, contains('CardPrintRepository.getCardPrintByGvId'));
      expect(main, contains('first_route_public_card_link'));
      expect(cardDetail, contains('SignInContinuationScreen'));
      expect(cardDetail, contains('if (signedIn == true &&'));
      expect(cardDetail, contains('await onSignedIn();'));
      expect(
        cardDetail,
        contains('MediaQuery.viewPaddingOf(sheetContext).bottom'),
      );
      expect(continuation, contains('onAuthStateChange.listen'));
      expect(continuation, contains('Navigator.of(context).pop(true)'));
      expect(
        continuation,
        contains('You will return to this card when sign in completes.'),
      );
    },
  );
}
