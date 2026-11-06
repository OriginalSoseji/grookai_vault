import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/card_detail_screen.dart';
import 'package:grookai_vault/main.dart' show buildGrookaiTheme;
import 'package:grookai_vault/models/binders/binder_models.dart';
import 'package:grookai_vault/screens/binders/binder_library_screen.dart';
import 'package:grookai_vault/services/binders/binder_feature_flags.dart';
import 'package:grookai_vault/services/binders/binder_repository.dart';
import 'package:grookai_vault/screens/vault/collector_workspace_screen.dart';
import 'package:grookai_vault/screens/vault/vault_gvvi_screen.dart';
import 'package:grookai_vault/screens/vault/vault_manage_card_screen.dart';
import 'package:grookai_vault/screens/scanner_v5/widgets/scanner_result_sheet.dart';
import 'package:grookai_vault/services/scanner_v5/scanner_v5_identity_service.dart';
import 'package:grookai_vault/services/vault/vault_card_service.dart';
import 'package:grookai_vault/services/gvvi/vendor_pricing_workspace_service.dart';
import 'package:grookai_vault/services/intake/intake_models.dart';
import 'package:grookai_vault/services/intake/intake_service.dart';
import 'package:grookai_vault/theme/gv_typography.dart';
import 'package:grookai_vault/widgets/vault/vault_add_review_sheet.dart';
import 'catalog.dart';
import 'binder_library_repository.dart';

const previewPrintingId = '2395183d-ab12-4f9d-9014-9abda113e7d6';
const previewGvviId = 'GVVI-PREVIEW-000001';
const previewCopyConditions = {
  previewGvviId: 'LP',
  'GVVI-PREVIEW-000002': 'NM',
  'GVVI-PREVIEW-000003': 'Unknown',
};

Future<VaultManageCardData> previewGroupedCard() async => VaultManageCardData(
  vaultItemId: 'preview-bucket',
  cardPrintId: previewCatalog.first['id']!,
  gvId: previewCatalog.first['gv_id'],
  name: 'Eevee',
  setName: 'Scarlet & Violet Promos',
  setCode: 'svp',
  number: '173',
  imageUrl: previewImage(previewCatalog.first),
  canonicalImageUrl: previewImage(previewCatalog.first),
  totalCopies: 3,
  rawCount: 3,
  slabCount: 0,
  inPlayCount: 0,
  intent: 'hold',
  isShared: false,
  publicProfileEnabled: false,
  vaultSharingEnabled: false,
  copies: [
    for (final entry in previewCopyConditions.entries)
      VaultManageCardCopy(
        instanceId: 'preview-${entry.key}',
        gvviId: entry.key,
        cardPrintingId: previewPrintingId,
        finishKey: 'holo',
        finishLabel: 'Holo',
        conditionLabel: entry.value,
        intent: 'hold',
      ),
  ],
);
const previewImageOrigin = 'http://127.0.0.1:31873';

/// Local checklist drafts only. All repository operations except these two
/// bounded fixture reads fail; no account or remote Binder is represented.
class PreviewBinderRepository implements BinderRepository {
  @override
  String? get currentUserId => null;

  @override
  Future<List<BinderCatalogCard>> searchCustomCards({
    required String query,
    int limit = 30,
  }) async {
    final terms = query.toLowerCase().trim().split(RegExp(r'\s+'));
    return [
      for (final card in previewCatalog)
        if (terms.every(
          (term) => '${card['name']} ${previewSet(card)} ${card['number']}'
              .toLowerCase()
              .contains(term),
        ))
          BinderCatalogCard(
            cardPrintId: card['id']!,
            name: card['name']!,
            setLabel: previewSet(card),
            number: card['number'],
            hostedImageUrl: previewImage(card),
          ),
    ].take(limit.clamp(1, 30)).toList(growable: false);
  }

  @override
  Future<List<BinderFinishOption>> loadCardFinishOptions(
    String cardPrintId,
  ) async {
    if (!previewCatalog.any((card) => card['id'] == cardPrintId)) {
      throw const BinderException(
        BinderFailureKind.validation,
        'Card is outside the review fixture.',
      );
    }
    return [
      const BinderFinishOption(label: 'Any governed finish'),
      if (cardPrintId == previewCatalog.first['id'])
        const BinderFinishOption(
          label: 'Holofoil',
          cardPrintingId: previewPrintingId,
          finishKey: 'holo',
        ),
    ];
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      throw UnsupportedError('Binder writes are disabled in the review build.');
}

String previewSet(Map card) =>
    card['set_code'] == 'svp' ? 'Scarlet & Violet Promos' : 'Base Set';
String previewImage(Map card) =>
    '$previewImageOrigin/api/canon/cards/${card['gv_id']}/image';

/// No network fallback: all Supabase traffic terminates in this local fixture.
Future<http.Response> previewRequest(http.Request request) async {
  if (request.url.host != '127.0.0.1') {
    throw StateError('Preview target must be LOCAL');
  }
  final path = request.url.path;
  dynamic result;
  if (request.method == 'GET' && path == '/rest/v1/card_prints') {
    if (request.url.queryParameters['id']?.startsWith('neq.') ?? false) {
      result = [];
    } else {
      final cards = previewCatalog
          .map(
            (card) => {
              ...card,
              'sets': {'name': previewSet(card)},
              'image_url': previewImage(card),
            },
          )
          .toList();
      final id = request.url.queryParameters['id'];
      final matching = id == null
          ? cards
          : cards.where((card) => 'eq.${card['id']}' == id).toList();
      result = request.headers['Accept']?.contains('vnd.pgrst.object') == true
          ? matching.firstOrNull
          : matching;
    }
  } else if (request.method == 'GET' &&
      path == '/rest/v1/card_comments' &&
      request.url.queryParameters['card_print_id'] ==
          'eq.${previewCatalog.first['id']}') {
    result = [
      {
        'id': 'preview-comment-1',
        'user_id': 'preview-collector-1',
        'body': 'Sample comment: The promo number on this Eevee is 173.',
        'created_at': '2026-10-26T04:00:00Z',
      },
      {
        'id': 'preview-comment-2',
        'user_id': 'preview-collector-2',
        'body':
            'Sample comment: Keeping the set and number together helps distinguish this promo from other Eevee cards.',
        'created_at': '2026-10-25T18:00:00Z',
      },
    ];
  } else if (request.method == 'POST' &&
      path == '/rest/v1/rpc/vault_mobile_instance_detail_v1' &&
      previewCopyConditions.containsKey(
        jsonDecode(request.body)['p_gv_vi_id'],
      )) {
    result = {
      'id': 'preview-instance',
      'card_print_id': previewCatalog.first['id'],
      'card_gv_id': previewCatalog.first['gv_id'],
      'card_name': 'Eevee',
      'card_set_code': 'svp',
      'card_set_name': 'Scarlet & Violet Promos',
      'card_number': '173',
      'card_image_url': previewImage(previewCatalog.first),
      'active_copy_count': 3,
      'condition_label':
          previewCopyConditions[jsonDecode(request.body)['p_gv_vi_id']],
      'intent': 'hold',
    };
  } else if (request.method == 'POST' &&
      path == '/rest/v1/rpc/vault_mobile_instance_pricing_target_v1' &&
      previewCopyConditions.containsKey(
        jsonDecode(request.body)['p_gv_vi_id'],
      )) {
    result = [
      {
        'card_print_id': previewCatalog.first['id'],
        'card_printing_id': previewPrintingId,
        'is_graded': false,
      },
    ];
  } else if (request.method == 'POST' &&
      path == '/rest/v1/rpc/get_market_pricing_read_model_v1') {
    final ids = jsonDecode(request.body)['p_card_printing_ids'] as List? ?? [];
    result = ids.length == 1 && ids.single == previewPrintingId
        ? [
            {
              'card_print_id': previewCatalog.first['id'],
              'card_printing_id': previewPrintingId,
              'pricing_scope': 'card_printing',
              'market_close': 8.37,
              'primary_source': 'tcgplayer',
              'source_label': 'TCGPlayer Market',
              'source_name': 'tcgplayer',
              'status': 'available',
              'currency': 'USD',
              'freshness': 'fresh',
              'observed_at': '2026-10-26T00:00:00Z',
              'published_at': '2026-10-26T00:00:00Z',
              'provenance_id': 'sample-review-price',
            },
          ]
        : [];
  } else if (request.method == 'POST' &&
      [
        '/rest/v1/rpc/collector_memories_for_gvvi_v1',
        '/rest/v1/rpc/collector_memory_prompt_state_v1',
      ].contains(path) &&
      previewCopyConditions.containsKey(
        jsonDecode(request.body)['p_gv_vi_id'],
      )) {
    result = [];
  } else if (request.method == 'POST' &&
      path == '/rest/v1/rpc/get_jungle_edition_resolution_v1') {
    result = {'version': 1, 'status': 'not_applicable', 'options': []};
  } else if (request.method == 'POST' &&
      path == '/rest/v1/rpc/get_card_print_image_faces_v1') {
    result = [];
  } else if (request.method == 'POST' &&
      path == '/rest/v1/rpc/get_public_card_printing_options_v1') {
    final body = jsonDecode(request.body) as Map;
    result =
        (body['p_card_print_ids'] as List? ?? []).contains(
          previewCatalog.first['id'],
        )
        ? [
            {
              'id': previewPrintingId,
              'card_print_id': previewCatalog.first['id'],
              'finish_key': 'holo',
              'finish_label': 'Holofoil',
              'finish_sort_order': 1,
            },
          ]
        : [];
  } else if (request.method == 'POST' &&
      path == '/functions/v1/card-marketplace-links-v1') {
    final body = jsonDecode(request.body) as Map;
    final valid =
        body['card_print_id'] == previewCatalog.first['id'] &&
        body['card_printing_id'] == previewPrintingId;
    result = {
      'link': valid
          ? {
              'card_print_id': previewCatalog.first['id'],
              'card_printing_id': previewPrintingId,
              'finish': 'Holofoil',
              'language': 'English',
              'conditions': [
                for (final condition in const [
                  ['NM', 'Near Mint'],
                  ['LP', 'Lightly Played'],
                  ['MP', 'Moderately Played'],
                  ['HP', 'Heavily Played'],
                  ['DMG', 'Damaged'],
                ])
                  {
                    'code': condition[0],
                    'label': condition[1],
                    'url': Uri.https('www.tcgplayer.com', '/product/610758', {
                      'Condition': condition[1],
                      'Printing': 'Holofoil',
                      'Language': 'English',
                    }).toString(),
                  },
              ],
            }
          : null,
    };
  } else {
    return http.Response(
      jsonEncode({
        'message': 'Preview only: account and inventory changes are disabled.',
        'code': 'preview_read_only',
      }),
      403,
      request: request,
      headers: {'content-type': 'application/json'},
    );
  }
  return http.Response(
    jsonEncode(result),
    200,
    request: request,
    headers: {'content-type': 'application/json'},
  );
}

class PreviewIntakeService extends IntakeService {
  PreviewIntakeService() : super(Supabase.instance.client);
  @override
  String get userId => 'collector-preview';
  @override
  Future<List<PurchaseLot>> lots() async => [];
  @override
  Future<dynamic> call(
    String action, [
    Map<String, dynamic> payload = const {},
  ]) async =>
      throw StateError('Preview only: collection changes are not saved.');
}

class PreviewWorkspaceService extends VendorPricingWorkspaceService {
  @override
  Future<VendorPricingWorkspaceData> load() async => VendorPricingWorkspaceData(
    rows: [
      for (var index = 0; index < 3; index++)
        VendorPricingWorkspaceRow(
          instanceId: 'preview-copy-$index',
          gvviId: 'GVVI-PREVIEW-00000${index + 1}',
          vaultItemId: 'preview-bucket-$index',
          cardPrintId: previewCatalog[index]['id']!,
          gvId: previewCatalog[index]['gv_id']!,
          name: previewCatalog[index]['name']!,
          displayName: previewCatalog[index]['name']!,
          number: previewCatalog[index]['number']!,
          setName: previewSet(previewCatalog[index]),
          imageUrl: previewImage(previewCatalog[index]),
          printingLabel: index == 0 ? 'Holofoil' : 'Printing not assigned',
          cardPrintingId: index == 0 ? previewPrintingId : null,
          conditionLabel: index == 2 ? 'Unknown' : 'LP',
          intent: 'hold',
          isGraded: false,
          marketPrice: index == 0 ? 8.37 : null,
          askingPrice: null,
          currency: 'USD',
          sectionIds: {},
        ),
    ],
    sections: [],
  );
  @override
  Future<void> disposeCopy({
    required VendorPricingWorkspaceRow row,
    required VendorDispositionSubmission submission,
  }) async => throw StateError('Preview only: outcomes are not saved.');
}

class CollectorPreviewApp extends StatefulWidget {
  const CollectorPreviewApp({super.key, this.initialIndex});
  final int? initialIndex;
  @override
  State<CollectorPreviewApp> createState() => _CollectorPreviewAppState();
}

class _CollectorPreviewAppState extends State<CollectorPreviewApp> {
  bool dark = true;
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    theme: buildGrookaiTheme(Brightness.light),
    darkTheme: buildGrookaiTheme(Brightness.dark),
    themeMode: dark ? ThemeMode.dark : ThemeMode.light,
    builder: (context, child) => ColoredBox(
      key: const ValueKey('collector-preview-background'),
      color: Theme.of(context).colorScheme.surface,
      child: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Material(
                color: Colors.transparent,
                child: Text(
                  'Sample data · Changes stay in this preview',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontFamily: GvTypography.fontFamily,
                    fontSize: 11,
                    color: Theme.of(context).colorScheme.onSurface,
                    decoration: TextDecoration.none,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: MediaQuery.removePadding(
              context: context,
              removeTop: true,
              child: child!,
            ),
          ),
        ],
      ),
    ),
    home: PreviewHome(
      onTheme: () => setState(() => dark = !dark),
      initialIndex: widget.initialIndex,
    ),
  );
}

class PreviewHome extends StatefulWidget {
  const PreviewHome({super.key, required this.onTheme, this.initialIndex});
  final int? initialIndex;
  final VoidCallback onTheme;
  @override
  State<PreviewHome> createState() => _PreviewHomeState();
}

class _PreviewHomeState extends State<PreviewHome> {
  late int index =
      widget.initialIndex ??
      (const bool.fromEnvironment('GROOKAI_COLLECTOR_SCAN_REVIEW')
          ? 0
          : const bool.fromEnvironment('GROOKAI_COLLECTOR_BINDER_REVIEW')
          ? 3
          : const bool.fromEnvironment('GROOKAI_COLLECTOR_COPY_REVIEW')
          ? 4
          : 0);
  bool scanChoices = false;
  bool scanAlternates = false;
  late final binderLibrary = PreviewBinderLibraryRepository(
    catalog: PreviewBinderRepository(),
    initialSlots: slots,
  );
  late final slots = [
    for (final card in previewCatalog)
      BinderCustomSlotDraft(
        card: BinderCatalogCard(
          cardPrintId: card['id']!,
          name: card['name']!,
          setLabel: previewSet(card),
          number: card['number'],
          hostedImageUrl: previewImage(card),
        ),
        finish: const BinderFinishOption(label: 'Any governed finish'),
      ),
  ];
  Future<void> openAdd([ScannerV5Candidate? candidate]) async {
    final card = previewCatalog.firstWhere(
      (card) =>
          card['id'] ==
          (candidate?.vaultCardPrintId ?? previewCatalog.first['id']),
    );
    try {
      await showVaultAddReview(
        context: context,
        service: PreviewIntakeService(),
        cardPrintId: card['id']!,
        gvId: card['gv_id']!,
        name: card['name']!,
        setName: previewSet(card),
        imageUrl: previewImage(card),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
    }
    if (mounted) setState(() => index = 0);
  }

  Widget scanReview() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Wrap(
          spacing: 8,
          children: [
            ChoiceChip(
              label: const Text('Number match'),
              selected: !scanChoices,
              onSelected: (_) => setState(() {
                scanChoices = false;
                scanAlternates = false;
              }),
            ),
            ChoiceChip(
              label: const Text('Choose a match'),
              selected: scanChoices,
              onSelected: (_) => setState(() => scanChoices = true),
            ),
          ],
        ),
      ),
      Expanded(
        child: Stack(
          children: [
            ScannerResultSheet(
              result: ScannerV5IdentifyResult(
                ok: true,
                mode: scanChoices ? 'fused' : 'ocr_exact',
                candidates: [
                  for (final card in previewCatalog.take(3))
                    ScannerV5Candidate(
                      id: card['id']!,
                      cardId: card['id'],
                      gvId: card['gv_id'],
                      name: card['name']!,
                      setCode: card['set_code'],
                      number: card['number'],
                      imageUrl: previewImage(card),
                    ),
                ],
                latencyMs: 0,
              ),
              addingToVault: false,
              showExactAlternates: scanAlternates,
              onAddCandidate: openAdd,
              onDismiss: () => setState(() => scanAlternates = false),
              onRetake: () => setState(() {
                scanChoices = false;
                scanAlternates = false;
              }),
              onShowAlternates: () => setState(() => scanAlternates = true),
            ),
          ],
        ),
      ),
    ],
  );

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const GrookaiBrandText(includeVault: true),
      actions: [
        IconButton(
          tooltip: 'Switch theme',
          onPressed: widget.onTheme,
          icon: const Icon(Icons.contrast),
        ),
      ],
    ),
    body: Column(
      children: [
        Expanded(
          child:
              index == 0 &&
                  const bool.fromEnvironment('GROOKAI_COLLECTOR_SCAN_REVIEW')
              ? scanReview()
              : index == 2
              ? CollectorWorkspaceScreen(service: PreviewWorkspaceService())
              : index == 4
              ? const bool.fromEnvironment('GROOKAI_COLLECTOR_GROUP_REVIEW')
                    ? VaultManageCardScreen(
                        vaultItemId: 'preview-bucket',
                        cardPrintId: previewCatalog.first['id']!,
                        gvId: previewCatalog.first['gv_id'],
                        ownedCount: 3,
                        name: 'Eevee',
                        loadCard: previewGroupedCard,
                      )
                    : const VaultGvviScreen(gvviId: previewGvviId)
              : index == 3
              ? BinderLibraryScreen(
                  repository: binderLibrary,
                  featureFlags: BinderFeatureFlags.production,
                )
              : CardDetailScreen(
                  cardPrintId: previewCatalog.first['id']!,
                  gvId: previewCatalog.first['gv_id'],
                  name: 'Eevee',
                  setName: 'Scarlet & Violet Promos',
                  setCode: 'svp',
                  number: '173',
                  imageUrl: previewImage(previewCatalog.first),
                  selectedFinishLabel: 'Holofoil',
                  condition: 'LP',
                ),
        ),
      ],
    ),
    bottomNavigationBar: NavigationBar(
      selectedIndex: index,
      onDestinationSelected: (value) {
        setState(() => index = value);
        if (value == 1) openAdd();
      },
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.style_outlined),
          label: bool.fromEnvironment('GROOKAI_COLLECTOR_SCAN_REVIEW')
              ? 'Scan result'
              : 'Card',
        ),
        NavigationDestination(
          icon: Icon(Icons.add_box_outlined),
          label: 'Add copy',
        ),
        NavigationDestination(
          icon: Icon(Icons.swap_horiz),
          label: 'Select & trade',
        ),
        NavigationDestination(
          icon: Icon(Icons.grid_on_outlined),
          label: 'Binder',
        ),
        NavigationDestination(icon: Icon(Icons.style_outlined), label: 'Vault'),
      ],
    ),
  );
}
