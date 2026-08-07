import 'dart:io';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:grookai_vault/services/public/public_card_printing_options_service.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

String _methodBlock(String source, String start, String end) {
  final startIndex = source.lastIndexOf(start);
  final endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, greaterThanOrEqualTo(0), reason: start);
  expect(endIndex, greaterThan(startIndex), reason: end);
  return source.substring(startIndex, endIndex);
}

void main() {
  test('governed printing service sends bounded RPC parameters', () async {
    late http.Request captured;
    final client = SupabaseClient(
      'https://example.supabase.co',
      'public-anon-key',
      httpClient: MockClient((request) async {
        captured = request;
        return http.Response(
          jsonEncode(<Map<String, dynamic>>[
            <String, dynamic>{
              'id': '20000000-0000-4000-8000-000000000001',
              'card_print_id': '10000000-0000-4000-8000-000000000001',
              'printing_gv_id': 'GV-TEST-HOLO',
              'finish_key': 'holo',
              'finish_label': 'Holo',
              'finish_sort_order': 2,
              'finish_is_active': true,
            },
          ]),
          200,
          request: request,
          headers: const <String, String>{'content-type': 'application/json'},
        );
      }),
    );
    addTearDown(client.dispose);

    final rows = await PublicCardPrintingOptionsService.fetch(
      client: client,
      cardPrintIds: const <String>[
        '10000000-0000-4000-8000-000000000001',
        '10000000-0000-4000-8000-000000000001',
      ],
    );

    expect(rows.single['printing_gv_id'], 'GV-TEST-HOLO');
    expect(
      captured.url.path,
      '/rest/v1/rpc/get_public_card_printing_options_v1',
    );
    final params = jsonDecode(captured.body) as Map<String, dynamic>;
    expect(params['p_card_print_ids'], <String>[
      '10000000-0000-4000-8000-000000000001',
    ]);
    expect(params['p_limit'], 1000);
    expect(params['p_offset'], 0);
  });

  test('governed printing service is bounded, paged, and RPC-only', () {
    final service = File(
      'lib/services/public/public_card_printing_options_service.dart',
    ).readAsStringSync();

    expect(service, contains('get_public_card_printing_options_v1'));
    expect(service, contains('_maxIdsPerRequest = 250'));
    expect(service, contains('_pageSize = 1000'));
    expect(service, contains("'p_card_print_ids': chunk"));
    expect(service, contains("'p_offset': offset"));
    expect(service, isNot(contains("from('card_printings')")));
  });

  test('all public selectable-finish consumers use the governed service', () {
    final detail = File('lib/card_detail_screen.dart').readAsStringSync();
    final dex = File(
      'lib/services/grookai_dex/grookai_dex_service.dart',
    ).readAsStringSync();
    final sets = File(
      'lib/services/public/public_sets_service.dart',
    ).readAsStringSync();
    final binders = File(
      'lib/services/binders/binder_repository.dart',
    ).readAsStringSync();

    final blocks = <String>[
      _methodBlock(
        detail,
        'Future<List<_CardDetailPrintingOption>> _fetchPrintingOptions',
        'String? _resolveInitialPrintingSelection',
      ),
      _methodBlock(
        dex,
        'static Future<_CardPrintingReadResult> _fetchCardPrintingData',
        'static bool _isKnownWrongLegendaryTreasuresRc5ChildImage',
      ),
      _methodBlock(
        sets,
        '_fetchPrintingOptions({',
        'static Map<String, dynamic>?',
      ),
      _methodBlock(
        binders,
        'Future<List<BinderFinishOption>> loadCardFinishOptions',
        'Future<String> createBinder',
      ),
    ];

    for (final block in blocks) {
      expect(block, contains('PublicCardPrintingOptionsService.fetch'));
      expect(block, isNot(contains("from('card_printings')")));
    }
  });

  test(
    'card detail refreshes governed printings before a vault write and displays a sole finish',
    () {
      final detail = File('lib/card_detail_screen.dart').readAsStringSync();
      final addBlock = _methodBlock(
        detail,
        'Future<void> _addToVault() async',
        'Map<String, dynamic>? _extractRecord',
      );
      final resolverBlock = _methodBlock(
        detail,
        '_resolvePrintingOptionForVaultAdd() async',
        'String? _resolveInitialPrintingSelection',
      );

      expect(
        resolverBlock,
        contains('_fetchPrintingOptions(cardPrintId, swallowErrors: false)'),
      );
      expect(resolverBlock, contains('Exact printing is unavailable.'));
      expect(
        resolverBlock,
        contains('Choose the exact printing before adding this card.'),
      );
      expect(resolverBlock, contains('_selectedCardPrintingId = resolved.id'));
      expect(
        addBlock,
        contains('late final _CardDetailPrintingOption printingOption'),
      );
      expect(
        addBlock,
        contains('printingOption = await _resolvePrintingOptionForVaultAdd()'),
      );
      expect(
        addBlock.indexOf(
          'printingOption = await _resolvePrintingOptionForVaultAdd()',
        ),
        lessThan(addBlock.indexOf('final userId = supabase.auth.currentUser')),
      );
      expect(addBlock, contains('pendingPrinting: printingOption'));
      expect(addBlock, contains('cardPrintingId: printingOption.id'));
      expect(detail, contains('_printingOptions.length == 1'));
    },
  );

  test('mobile search preserves exact printing identity on vault adds', () {
    final main = File('lib/main.dart').readAsStringSync();
    final addBlock = _methodBlock(
      main,
      'Future<String?> _addToVaultFromSearch',
      'Future<void> _quickAddSearchResultToVault',
    );
    final quickAddBlock = _methodBlock(
      main,
      'Future<void> _quickAddSearchResultToVault',
      '// VIEW_YOUR_COPY_RESOLUTION_V1',
    );

    expect(main, contains('PublicCardPrintingOptionsService.fetch'));
    expect(main, contains('_ensureCatalogPrintingOptions'));
    expect(main, contains(r"return '${options.length} printings';"));
    expect(main, contains("'Choose the exact printing'"));
    expect(main, contains('ChoiceChip('));
    expect(main, contains("'Printing unavailable'"));
    expect(
      main,
      contains('Exact printing is unavailable. Try again before adding.'),
    );
    expect(addBlock, contains('cardPrintingId: cardPrintingId'));
    expect(quickAddBlock, contains('printingOptions.length != 1'));
    expect(quickAddBlock, contains('_openSearchCardActionHub(card)'));
  });
}
