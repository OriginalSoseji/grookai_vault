import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/identity/catalog_artwork_resolution.dart';
import 'package:grookai_vault/services/network/card_interaction_service.dart';
import 'package:grookai_vault/services/network/network_stream_service.dart';
import 'package:grookai_vault/widgets/card_surface_artwork.dart';
import 'package:grookai_vault/widgets/network/network_interaction_card.dart';

void main() {
  test('catalog artwork uses the hosted GV-ID route before provider art', () {
    final artwork = resolveCatalogArtwork(
      gvId: 'gv-pk-cri-120',
      providerImageUrl: 'https://assets.tcgdex.net/en/me/me04/120',
    );

    expect(
      artwork.primaryImageUrl,
      'https://grookaivault.com/api/canon/cards/GV-PK-CRI-120/image',
    );
    expect(
      artwork.fallbackImageUrl,
      contains(
        Uri.encodeQueryComponent(
          'https://assets.tcgdex.net/en/me/me04/120/high.webp',
        ),
      ),
    );
  });

  test('provider remains primary only when no canonical GV-ID is valid', () {
    final artwork = resolveCatalogArtwork(
      gvId: 'not-a-gv-id',
      providerImageUrl: 'https://example.test/card.webp',
    );

    expect(artwork.primaryImageUrl, 'https://example.test/card.webp');
    expect(artwork.fallbackImageUrl, isNull);
  });

  test(
    'collector-uploaded copy photos are identified before catalog repair',
    () {
      expect(
        isCollectorUploadedCardImage(
          'owner/vault-instances/copy-1/front/current',
        ),
        isTrue,
      );
      expect(
        isCollectorUploadedCardImage(
          'https://project.supabase.co/storage/v1/object/sign/'
          'user-card-images/owner/vault-instances/copy-1/front/current?token=x',
        ),
        isTrue,
      );
      expect(
        isCollectorUploadedCardImage('https://provider.test/card.webp'),
        isFalse,
      );
    },
  );

  test('network and message models retain their provider fallback', () {
    final networkRow = _networkRow().copyWith(rankingScore: 4);
    final thread = _thread().copyWith(hasUnread: true);

    expect(networkRow.fallbackImageUrl, 'https://provider.test/card.webp');
    expect(networkRow.hasCollectorUploadedImage, isTrue);
    expect(thread.fallbackImageUrl, 'https://provider.test/card.webp');
  });

  testWidgets('Discover card forwards hosted and provider artwork URLs', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 260,
            child: NetworkInteractionCard(
              title: 'Pikachu',
              imageLabel: 'Pikachu',
              imageUrl:
                  'https://grookaivault.com/api/canon/cards/GV-PK-TEST-1/image',
              fallbackImageUrl: 'https://provider.test/card.webp',
              onPressed: () {},
            ),
          ),
        ),
      ),
    );

    final artwork = tester.widget<CardSurfaceArtwork>(
      find.byType(CardSurfaceArtwork),
    );
    expect(
      artwork.imageUrl,
      'https://grookaivault.com/api/canon/cards/GV-PK-TEST-1/image',
    );
    expect(artwork.fallbackImageUrl, 'https://provider.test/card.webp');
  });

  test('network surfaces preserve copy photos and wire fallback rendering', () {
    final streamSource = File(
      'lib/services/network/network_stream_service.dart',
    ).readAsStringSync();
    final interactionCardSource = File(
      'lib/widgets/network/network_interaction_card.dart',
    ).readAsStringSync();
    final networkScreenSource = File(
      'lib/screens/network/network_screen.dart',
    ).readAsStringSync();
    final inboxSource = File(
      'lib/screens/network/network_inbox_screen.dart',
    ).readAsStringSync();
    final threadSource = File(
      'lib/screens/network/network_thread_screen.dart',
    ).readAsStringSync();

    expect(streamSource, contains('isCollectorUploadedCardImage'));
    expect(streamSource, contains('? sourceImageUrl'));
    expect(streamSource, contains('catalogArtwork.primaryImageUrl'));
    expect(streamSource, contains('fallbackImageUrl: providerImageUrl'));
    expect(
      interactionCardSource,
      contains('fallbackImageUrl: resolvedFallbackImageUrl'),
    );
    expect(networkScreenSource, contains('row.fallbackImageUrl'));
    expect(
      networkScreenSource,
      contains("'fallbackImageUrl': row.fallbackImageUrl"),
    );
    expect(networkScreenSource, contains('hasCollectorUploadedImage'));
    expect(inboxSource, contains('group.fallbackImageUrl'));
    expect(threadSource, contains('_thread.fallbackImageUrl'));
  });
}

NetworkStreamRow _networkRow() {
  return const NetworkStreamRow(
    sourceType: NetworkStreamSourceType.collectorInPlay,
    vaultItemId: 'vault-1',
    ownerUserId: 'owner-1',
    ownerSlug: 'collector',
    ownerDisplayName: 'Collector',
    cardPrintId: 'card-1',
    quantity: 1,
    inPlayCount: 1,
    tradeCount: 1,
    sellCount: 0,
    showcaseCount: 0,
    rawCount: 1,
    slabCount: 0,
    gvId: 'GV-PK-TEST-1',
    name: 'Pikachu',
    setCode: 'TEST',
    setName: 'Test Set',
    number: '1',
    imageUrl: 'https://storage.test/copy.webp',
    fallbackImageUrl: 'https://provider.test/card.webp',
    hasCollectorUploadedImage: true,
  );
}

CardInteractionThreadSummary _thread() {
  return CardInteractionThreadSummary(
    groupKey: 'card-1:owner-1',
    cardPrintId: 'card-1',
    gvId: 'GV-PK-TEST-1',
    cardName: 'Pikachu',
    setName: 'Test Set',
    number: '1',
    latestMessage: 'Hello',
    messageCount: 1,
    counterpartDisplayName: 'Collector',
    counterpartUserId: 'owner-1',
    startedByCurrentUser: true,
    hasUnread: false,
    isClosed: false,
    isArchived: false,
    imageUrl: 'https://grookaivault.com/api/canon/cards/GV-PK-TEST-1/image',
    fallbackImageUrl: 'https://provider.test/card.webp',
  );
}
