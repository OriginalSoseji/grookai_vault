import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/screens/sets/mtg_sealed_catalog_screen.dart';
import 'package:grookai_vault/services/sealed/mtg_sealed_client_v1.dart';

class _SearchTransport implements MtgSealedClientTransportV1 {
  final requests = <Map<String, Object?>>[];

  @override
  Future<bool> isAuthenticated() async => true;

  @override
  Future<dynamic> fetchRows({
    required String gameKey,
    required String? query,
    required int limit,
    required int offset,
  }) async {
    requests.add({
      'game': gameKey,
      'query': query,
      'limit': limit,
      'offset': offset,
    });
    return <dynamic>[];
  }

  @override
  Future<String> createSignedImageUrl({
    required String bucket,
    required String objectPath,
    required int expiresInSeconds,
  }) async => throw StateError('Empty fixture must never sign images');
}

void main() {
  for (final game in ['pokemon', 'mtg']) {
    for (final useArrow in [true, false]) {
      testWidgets(
        '$game search dismisses keyboard via ${useArrow ? 'arrow' : 'IME'}',
        (tester) async {
          final transport = _SearchTransport();
          await tester.pumpWidget(
            MaterialApp(
              home: MtgSealedCatalogScreen(
                gameKey: game,
                client: MtgSealedClientV1(
                  transport: transport,
                  gameKey: game,
                  enabled: true,
                ),
              ),
            ),
          );
          await tester.pumpAndSettle();
          final search = find.byKey(const Key('mtg-sealed-search'));
          await tester.enterText(search, ' 151 ');
          expect(tester.testTextInput.isVisible, isTrue);
          if (useArrow) {
            await tester.tap(find.byTooltip('Search'));
          } else {
            await tester.testTextInput.receiveAction(TextInputAction.search);
          }
          await tester.pumpAndSettle();
          expect(
            tester
                .widget<EditableText>(find.byType(EditableText))
                .focusNode
                .hasFocus,
            isFalse,
          );
          expect(tester.testTextInput.isVisible, isFalse);
          expect(transport.requests, [
            {'game': game, 'query': null, 'limit': 24, 'offset': 0},
            {'game': game, 'query': '151', 'limit': 24, 'offset': 0},
          ]);
          expect(find.text('No sealed products found'), findsOneWidget);
        },
      );
    }
  }
}
