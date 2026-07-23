import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/main.dart';
import 'package:grookai_vault/screens/dex/grookai_dex_species_screen.dart';
import 'package:grookai_vault/screens/network/network_screen.dart';

void main() {
  test(
    'copy and card cross-links return instead of growing the Back stack',
    () {
      final cardDetail = File('lib/card_detail_screen.dart').readAsStringSync();
      final publicCopy = File(
        'lib/screens/gvvi/public_gvvi_screen.dart',
      ).readAsStringSync();
      final manageCopy = File(
        'lib/screens/vault/vault_manage_card_screen.dart',
      ).readAsStringSync();

      expect(
        cardDetail,
        contains('CopyDetailNavigationPolicy.shouldReturnToSource'),
      );
      expect(cardDetail, contains('openedFromCardDetail: true'));
      expect(publicCopy, contains('widget.openedFromCardDetail'));
      expect(publicCopy, contains('openedFromCopyDetail: true'));
      expect(manageCopy, contains('widget.openedFromCardDetail'));
      expect(manageCopy, contains('openedFromCopyDetail: true'));
    },
  );

  test('set cards use lazy slivers and do not eagerly build every artwork', () {
    final source = File(
      'lib/screens/sets/public_set_detail_screen.dart',
    ).readAsStringSync();

    expect(source, contains('CustomScrollView('));
    expect(source, contains('SliverGrid('));
    expect(source, contains('SliverChildBuilderDelegate('));
    expect(source, contains('addAutomaticKeepAlives: false'));
    expect(source, isNot(contains('shrinkWrap: true')));
    expect(source, isNot(contains('NeverScrollableScrollPhysics')));
  });

  test('fullscreen card galleries cap adjacent image decode dimensions', () {
    final source = File('lib/widgets/card_zoom_viewer.dart').readAsStringSync();

    expect(source, contains('ResizeImage.resizeIfNeeded('));
    expect(source, contains('memCacheWidth: cacheWidth'));
    expect(source, contains('maxWidthDiskCache: cacheWidth'));
    expect(source, contains('.clamp(640, 1600)'));
    expect(
      source,
      isNot(contains('precacheImage(CachedNetworkImageProvider(imageUrl)')),
    );
  });

  test('Pulse opens its supplied canonical action before field fallbacks', () {
    final source = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();

    final routeDispatch = source.indexOf('_openPrimaryActionRoute(context)');
    final fieldFallback = source.indexOf(
      'item.gvId.isNotEmpty || item.cardPrintId.isNotEmpty',
      routeDispatch,
    );
    expect(routeDispatch, greaterThanOrEqualTo(0));
    expect(fieldFallback, greaterThan(routeDispatch));
    expect(source, contains('item.primaryActionRoute.trim()'));
    expect(source, contains('case GrookaiCanonicalRouteKind.gvvi:'));
    expect(source, contains('case GrookaiCanonicalRouteKind.dex:'));
    expect(source, contains('buildCanonicalDexPage('));
    expect(source, contains('onOpenScanner: onOpenScanner'));
    expect(source, contains('onOpenVaultSpecies: onOpenVaultSpecies'));
    expect(
      source,
      contains('case GrookaiCanonicalRouteKind.collectorSection:'),
    );
  });

  test('Pulse preserves shell actions through its canonical Dex route', () {
    final shell = File('lib/main_shell.dart').readAsStringSync();
    final network = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();

    final networkPageStart = shell.indexOf('return NetworkScreen(');
    final networkPageEnd = shell.indexOf('\n        );', networkPageStart);
    final networkPage = shell.substring(networkPageStart, networkPageEnd);
    expect(networkPage, contains('onOpenScanner: _startScanFlow'));
    expect(networkPage, contains('onOpenVaultSpecies: _openVaultForSpecies'));

    expect(network, contains('onOpenScanner: widget.onOpenScanner'));
    expect(network, contains('onOpenVaultSpecies: widget.onOpenVaultSpecies'));
    expect(network, contains('onOpenScanner: onOpenScanner'));
    expect(network, contains('onOpenVaultSpecies: onOpenVaultSpecies'));
  });

  test('Pulse and canonical Dex species widgets retain supplied actions', () {
    Future<void> openScanner() async {}
    Future<void> openVaultSpecies({
      required String speciesSlug,
      required String displayName,
    }) async {}

    final network = NetworkScreen(
      onOpenScanner: openScanner,
      onOpenVaultSpecies: openVaultSpecies,
    );
    final page = buildCanonicalDexPage(
      'pikachu',
      onOpenScanner: openScanner,
      onOpenVaultSpecies: openVaultSpecies,
    );

    expect(network.onOpenScanner, same(openScanner));
    expect(network.onOpenVaultSpecies, same(openVaultSpecies));
    expect(page, isA<GrookaiDexSpeciesScreen>());
    final species = page as GrookaiDexSpeciesScreen;
    expect(species.onOpenScanner, same(openScanner));
    expect(species.onOpenVaultSpecies, same(openVaultSpecies));
  });

  test('Android delivers every supported custom-scheme route to Flutter', () {
    final manifest = File(
      'android/app/src/main/AndroidManifest.xml',
    ).readAsStringSync();

    expect(manifest, contains('android:host="login-callback"'));
    expect(manifest, contains('android:scheme="grookai"'));
    expect(manifest, contains('android:scheme="grookaivault"'));
    for (final host in <String>[
      'card',
      'u',
      'collector',
      'set',
      'sets',
      'gvvi',
      'dex',
      'network',
      'feed',
    ]) {
      expect(manifest, contains('android:host="$host"'), reason: host);
    }
  });

  test('root deep-link dispatch opens shared GVVI copies in the app', () {
    final source = File('lib/main_shell.dart').readAsStringSync();

    expect(source, contains('case GrookaiCanonicalRouteKind.gvvi:'));
    expect(source, contains('PublicGvviScreen(gvviId: route.value)'));
  });

  test(
    'root deep-link dispatch opens the exact Dex destination in the app',
    () {
      final source = File('lib/main_shell.dart').readAsStringSync();

      expect(source, contains('case GrookaiCanonicalRouteKind.dex:'));
      expect(source, contains('buildCanonicalDexPage('));
      expect(source, contains('onOpenScanner: _startScanFlow'));
      expect(source, contains('onOpenVaultSpecies: _openVaultForSpecies'));
      expect(source, contains('vaultState.openSpeciesFilter('));
    },
  );

  test('back-to-back deep links do not wait for an earlier page to pop', () {
    final source = File('lib/main_shell.dart').readAsStringSync();

    expect(source, contains('_schedulePendingCanonicalLinkDrain();'));
    expect(source, contains('unawaited(_pushPage<void>(PublicGvviScreen'));
    expect(
      source,
      contains('_pushPage<void>(PublicSetDetailScreen(setCode: route.value))'),
    );
    expect(
      source,
      contains('unawaited(\n      _pushPage<void>(\n        CardDetailScreen('),
    );
    expect(
      source,
      isNot(
        contains(
          'await _pushPage<void>(PublicSetDetailScreen(setCode: route.value))',
        ),
      ),
    );
  });

  testWidgets('warm Card and GVVI routes yield to a Network root link', (
    tester,
  ) async {
    late BuildContext shellContext;
    final navigatorKey = GlobalKey<NavigatorState>();

    await tester.pumpWidget(
      MaterialApp(
        navigatorKey: navigatorKey,
        home: Builder(
          builder: (context) {
            shellContext = context;
            return const Scaffold(body: Text('Pulse root'));
          },
        ),
      ),
    );

    for (final pushedPage in <String>['Card detail', 'GVVI detail']) {
      navigatorKey.currentState!.push<void>(
        MaterialPageRoute<void>(
          builder: (_) => Scaffold(body: Text(pushedPage)),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text(pushedPage), findsOneWidget);

      revealAppShellRoot(shellContext);
      await tester.pumpAndSettle();

      expect(find.text(pushedPage), findsNothing);
      expect(find.text('Pulse root'), findsOneWidget);
    }
  });

  test('feed dispatch reveals the shell before selecting Network', () {
    final source = File('lib/main_shell.dart').readAsStringSync();
    final feedCaseStart = source.indexOf(
      'case GrookaiCanonicalRouteKind.feed:',
    );
    final feedCaseEnd = source.indexOf('\n        break;', feedCaseStart);
    final feedCase = source.substring(feedCaseStart, feedCaseEnd);

    final revealIndex = feedCase.indexOf('revealAppShellRoot(context);');
    final selectIndex = feedCase.indexOf(
      '_selectDestination(_ShellDestination.feed);',
    );
    expect(revealIndex, greaterThanOrEqualTo(0));
    expect(selectIndex, greaterThan(revealIndex));
  });
}
