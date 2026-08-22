import 'package:supabase_flutter/supabase_flutter.dart';

import '../grookai_objects/sale_listing_service.dart';
import '../identity/canon_image_url_service.dart';
import '../identity/catalog_artwork_resolution.dart';
import '../identity/display_identity.dart';
import '../public/card_surface_pricing_service.dart';
import '../vault/vault_gvvi_service.dart';

enum VendorMarketPosition { below, above, atMarket, unpriced, noExactMarket }

enum VendorCopyDisposition {
  sold('sale'),
  traded('trade');

  const VendorCopyDisposition(this.wireValue);

  final String wireValue;
}

enum VendorTradeCashDirection {
  received('received'),
  paid('paid');

  const VendorTradeCashDirection(this.wireValue);

  final String wireValue;
}

class VendorDispositionSubmission {
  const VendorDispositionSubmission({
    required this.disposition,
    this.salePrice,
    this.counterparty,
    this.tradeReceived,
    this.tradeCashDirection,
    this.tradeCashAmount,
    this.currency = 'USD',
  });

  final VendorCopyDisposition disposition;
  final double? salePrice;
  final String? counterparty;
  final String? tradeReceived;
  final VendorTradeCashDirection? tradeCashDirection;
  final double? tradeCashAmount;
  final String currency;
}

class VendorWorkspaceSection {
  const VendorWorkspaceSection({
    required this.id,
    required this.name,
    required this.position,
  });

  final String id;
  final String name;
  final int position;
}

class VendorPrintingOption {
  const VendorPrintingOption({
    required this.id,
    required this.cardPrintId,
    required this.label,
    required this.sortOrder,
    this.printingGvId,
    this.finishKey,
  });

  final String id;
  final String cardPrintId;
  final String label;
  final int sortOrder;
  final String? printingGvId;
  final String? finishKey;
}

class VendorPricingWorkspaceRow {
  const VendorPricingWorkspaceRow({
    required this.instanceId,
    required this.gvviId,
    required this.vaultItemId,
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.displayName,
    required this.number,
    required this.printingLabel,
    required this.conditionLabel,
    required this.intent,
    required this.isGraded,
    required this.marketPrice,
    required this.askingPrice,
    required this.currency,
    required this.sectionIds,
    this.printingOptions = const [],
    this.cardPrintingId,
    this.setName,
    this.setCode,
    this.imageUrl,
    this.fallbackImageUrl,
    this.gradeCompany,
    this.gradeLabel,
    this.marketObservedAt,
    this.marketProvenanceId,
  });

  final String instanceId;
  final String gvviId;
  final String vaultItemId;
  final String cardPrintId;
  final String? cardPrintingId;
  final String gvId;
  final String name;
  final String displayName;
  final String? setName;
  final String? setCode;
  final String number;
  final String printingLabel;
  final String conditionLabel;
  final String intent;
  final bool isGraded;
  final String? gradeCompany;
  final String? gradeLabel;
  final String? imageUrl;
  final String? fallbackImageUrl;
  final double? marketPrice;
  final DateTime? marketObservedAt;
  final String? marketProvenanceId;
  final double? askingPrice;
  final String currency;
  final Set<String> sectionIds;
  final List<VendorPrintingOption> printingOptions;

  bool get onWall => const {'sell', 'trade', 'showcase'}.contains(intent);

  bool get shareReady =>
      intent == 'sell' && askingPrice != null && askingPrice! > 0;

  double? get varianceAmount => marketPrice == null || askingPrice == null
      ? null
      : askingPrice! - marketPrice!;

  double? get variancePercent {
    final market = marketPrice;
    final variance = varianceAmount;
    return market == null || market <= 0 || variance == null
        ? null
        : (variance / market) * 100;
  }

  VendorMarketPosition get marketPosition {
    if (askingPrice == null) {
      return VendorMarketPosition.unpriced;
    }
    final variance = varianceAmount;
    if (variance == null) {
      return VendorMarketPosition.noExactMarket;
    }
    if (variance.abs() < 0.005) {
      return VendorMarketPosition.atMarket;
    }
    return variance < 0
        ? VendorMarketPosition.below
        : VendorMarketPosition.above;
  }

  VendorPricingWorkspaceRow copyWith({
    double? askingPrice,
    String? conditionLabel,
    String? intent,
    Set<String>? sectionIds,
    String? cardPrintingId,
    String? printingLabel,
    double? marketPrice,
    DateTime? marketObservedAt,
    String? marketProvenanceId,
    bool clearMarketEvidence = false,
  }) {
    return VendorPricingWorkspaceRow(
      instanceId: instanceId,
      gvviId: gvviId,
      vaultItemId: vaultItemId,
      cardPrintId: cardPrintId,
      cardPrintingId: cardPrintingId ?? this.cardPrintingId,
      gvId: gvId,
      name: name,
      displayName: displayName,
      setName: setName,
      setCode: setCode,
      number: number,
      printingLabel: printingLabel ?? this.printingLabel,
      conditionLabel: conditionLabel ?? this.conditionLabel,
      intent: intent ?? this.intent,
      isGraded: isGraded,
      gradeCompany: gradeCompany,
      gradeLabel: gradeLabel,
      imageUrl: imageUrl,
      fallbackImageUrl: fallbackImageUrl,
      marketPrice: clearMarketEvidence
          ? marketPrice
          : marketPrice ?? this.marketPrice,
      marketObservedAt: clearMarketEvidence
          ? marketObservedAt
          : marketObservedAt ?? this.marketObservedAt,
      marketProvenanceId: clearMarketEvidence
          ? marketProvenanceId
          : marketProvenanceId ?? this.marketProvenanceId,
      askingPrice: askingPrice ?? this.askingPrice,
      currency: currency,
      sectionIds: Set.unmodifiable(sectionIds ?? this.sectionIds),
      printingOptions: printingOptions,
    );
  }
}

class VendorPricingWorkspaceData {
  const VendorPricingWorkspaceData({
    required this.rows,
    required this.sections,
  });

  final List<VendorPricingWorkspaceRow> rows;
  final List<VendorWorkspaceSection> sections;
}

class VendorPricingWorkspaceService {
  const VendorPricingWorkspaceService({
    SupabaseClient? client,
    SaleListingService? listingService,
  }) : _client = client,
       _listingService = listingService;

  static const int _pageSize = 1000;
  static const int _readChunkSize = 200;

  final SupabaseClient? _client;
  final SaleListingService? _listingService;

  Future<VendorPricingWorkspaceData> load() async {
    final client = _requiredClient();
    final userId = (client.auth.currentUser?.id ?? '').trim();
    if (userId.isEmpty) {
      throw Exception('Sign in required.');
    }

    final instances = await _loadActiveInstances(client, userId);
    if (instances.isEmpty) {
      return const VendorPricingWorkspaceData(rows: [], sections: []);
    }

    final slabIds = instances
        .map((row) => _text(row['slab_cert_id']))
        .where((value) => value.isNotEmpty)
        .toSet();
    final slabsById = await _loadRowsById(
      client: client,
      table: 'slab_certs',
      columns: 'id,card_print_id,grader,grade,cert_number',
      ids: slabIds,
    );

    final cardPrintIds = instances
        .map((row) {
          final direct = _text(row['card_print_id']);
          if (direct.isNotEmpty) {
            return direct;
          }
          return _text(slabsById[_text(row['slab_cert_id'])]?['card_print_id']);
        })
        .where((value) => value.isNotEmpty)
        .toSet();
    final cardPrintsById = await _loadCardPrints(client, cardPrintIds);

    final printingsByCardPrintId = await _loadPrintingsByCardPrintId(
      client,
      cardPrintIds,
    );
    final printingsById = <String, VendorPrintingOption>{
      for (final options in printingsByCardPrintId.values)
        for (final option in options) option.id: option,
    };
    final printingIds = instances
        .map((row) => _text(row['card_printing_id']))
        .where((value) => value.isNotEmpty)
        .toSet();
    final pricingByPrintingId =
        await CardSurfacePricingService.fetchByCardPrintingIds(
          client: client,
          cardPrintingIds: printingIds,
        );
    final sections = await _loadSections(client, userId);
    final membershipsByInstance = await _loadMemberships(
      client,
      instances.map((row) => _text(row['id'])),
    );

    final rows = <VendorPricingWorkspaceRow>[];
    for (final instance in instances) {
      final instanceId = _text(instance['id']);
      final gvviId = _text(instance['gv_vi_id']);
      final slab = slabsById[_text(instance['slab_cert_id'])];
      final cardPrintId = _text(instance['card_print_id']).isNotEmpty
          ? _text(instance['card_print_id'])
          : _text(slab?['card_print_id']);
      final card = cardPrintsById[cardPrintId];
      if (instanceId.isEmpty ||
          gvviId.isEmpty ||
          cardPrintId.isEmpty ||
          card == null) {
        continue;
      }

      final printingId = _nullable(instance['card_printing_id']);
      final printing = printingId == null ? null : printingsById[printingId];
      final isGraded = slab != null;
      final setRecord = card['set'];
      final set = setRecord is Map ? setRecord : const <String, dynamic>{};
      final identity = resolveDisplayIdentityFromFields(
        name: _nullable(card['name']),
        variantKey: _nullable(card['variant_key']),
        printedIdentityModifier: _nullable(card['printed_identity_modifier']),
        setIdentityModel: _nullable(set['identity_model']),
        setCode: _nullable(card['set_code']),
        number: _nullable(card['number']),
      );
      final artwork = resolveCatalogArtwork(
        gvId: card['gv_id'],
        providerImageUrl: CanonImageUrlService.displayImageUrlFromRow(card),
      );
      final pricing = !isGraded && printingId != null
          ? pricingByPrintingId[printingId]
          : null;

      rows.add(
        VendorPricingWorkspaceRow(
          instanceId: instanceId,
          gvviId: gvviId,
          vaultItemId: _text(instance['legacy_vault_item_id']),
          cardPrintId: cardPrintId,
          cardPrintingId: printingId,
          gvId: _text(card['gv_id']),
          name: identity.baseName,
          displayName: identity.displayName,
          setName: _nullable(set['name']) ?? _nullable(card['set_code']),
          setCode: _nullable(set['code']) ?? _nullable(card['set_code']),
          number: _nullable(card['number']) ?? '—',
          printingLabel: isGraded
              ? 'Slab'
              : printing?.label ??
                    printing?.printingGvId ??
                    (printingId == null
                        ? 'Printing unassigned'
                        : 'Exact printing'),
          conditionLabel: _nullable(instance['condition_label']) ?? 'NM',
          intent: _normalizeIntent(instance['intent']),
          isGraded: isGraded,
          gradeCompany:
              _nullable(slab?['grader']) ??
              _nullable(instance['grade_company']),
          gradeLabel:
              _nullable(slab?['grade']) ??
              _nullable(instance['grade_label']) ??
              _nullable(instance['grade_value']),
          imageUrl: artwork.primaryImageUrl,
          fallbackImageUrl: artwork.fallbackImageUrl,
          marketPrice: pricing?.visibleValue,
          marketObservedAt: pricing?.observedAt,
          marketProvenanceId: pricing?.provenanceId,
          askingPrice: _money(instance['asking_price_amount']),
          currency: _normalizeCurrency(instance['asking_price_currency']),
          sectionIds: Set.unmodifiable(
            membershipsByInstance[instanceId] ?? const <String>{},
          ),
          printingOptions: List.unmodifiable(
            printingsByCardPrintId[cardPrintId] ??
                const <VendorPrintingOption>[],
          ),
        ),
      );
    }

    rows.sort(compareVendorWorkspaceRows);
    return VendorPricingWorkspaceData(
      rows: List.unmodifiable(rows),
      sections: List.unmodifiable(sections),
    );
  }

  Future<VendorPricingWorkspaceRow> savePrice({
    required VendorPricingWorkspaceRow row,
    required double price,
  }) async {
    final saved =
        await (_listingService ?? SaleListingService(client: _requiredClient()))
            .saveSingleCardListing(
              instanceId: row.instanceId,
              gvviId: row.gvviId,
              vaultItemId: row.vaultItemId,
              cardPrintId: row.cardPrintId,
              price: price,
              currency: row.currency,
            );
    return row.copyWith(askingPrice: saved.price, intent: saved.intent);
  }

  Future<VendorPricingWorkspaceRow> saveCondition({
    required VendorPricingWorkspaceRow row,
    required String condition,
  }) async {
    if (row.isGraded) {
      throw Exception('Slab grade cannot be changed as raw condition.');
    }
    const allowed = {'NM', 'LP', 'MP', 'HP', 'DMG'};
    final next = condition.trim().toUpperCase();
    if (!allowed.contains(next)) {
      throw Exception('Choose a supported card condition.');
    }
    final saved = await _updateOwnedInstance(row.instanceId, {
      'condition_label': next,
    }, 'id,condition_label');
    if (_text(saved['condition_label']).toUpperCase() != next) {
      throw Exception('Condition could not be saved.');
    }
    return row.copyWith(conditionLabel: next);
  }

  Future<VendorPricingWorkspaceRow> savePrinting({
    required VendorPricingWorkspaceRow row,
    required String cardPrintingId,
  }) async {
    if (row.isGraded) {
      throw Exception('Slab printing cannot be changed from this control.');
    }
    final selectedId = cardPrintingId.trim();
    VendorPrintingOption? selected;
    for (final option in row.printingOptions) {
      if (option.id == selectedId && option.cardPrintId == row.cardPrintId) {
        selected = option;
        break;
      }
    }
    if (selected == null) {
      throw Exception('Choose a valid exact printing for this card.');
    }

    final authoritative = await _requiredClient()
        .from('card_printings')
        .select('id,card_print_id')
        .eq('id', selected.id)
        .eq('card_print_id', row.cardPrintId)
        .maybeSingle();
    if (authoritative == null) {
      throw Exception('That printing does not belong to this card.');
    }

    final saved = await _updateOwnedInstance(row.instanceId, {
      'card_printing_id': selected.id,
    }, 'id,card_print_id,card_printing_id');
    if (_text(saved['card_print_id']) != row.cardPrintId ||
        _text(saved['card_printing_id']) != selected.id) {
      throw Exception('Exact printing could not be saved.');
    }

    final pricing = await CardSurfacePricingService.fetchByCardPrintingIds(
      client: _requiredClient(),
      cardPrintingIds: [selected.id],
    );
    final exactPrice = pricing[selected.id];
    return row.copyWith(
      cardPrintingId: selected.id,
      printingLabel: selected.label,
      marketPrice: exactPrice?.visibleValue,
      marketObservedAt: exactPrice?.observedAt,
      marketProvenanceId: exactPrice?.provenanceId,
      clearMarketEvidence: true,
    );
  }

  Future<VendorPricingWorkspaceRow> saveWallVisibility({
    required VendorPricingWorkspaceRow row,
    required bool visible,
  }) async {
    if (visible) {
      final price = row.askingPrice;
      if (price == null || price <= 0) {
        throw Exception('Set My price before adding this card to your Wall.');
      }
      return savePrice(row: row, price: price);
    }

    final saved = await _updateOwnedInstance(row.instanceId, const {
      'intent': 'hold',
    }, 'id,intent');
    if (_normalizeIntent(saved['intent']) != 'hold') {
      throw Exception('Wall visibility could not be saved.');
    }
    return row.copyWith(intent: 'hold');
  }

  Future<void> archiveCopy({required VendorPricingWorkspaceRow row}) async {
    final result = await _requiredClient().rpc(
      'vault_archive_exact_instance_v1',
      params: {'p_instance_id': row.instanceId},
    );
    if (result is! Map ||
        _text(result['archived_instance_id']) != row.instanceId ||
        _text(result['gv_vi_id']) != row.gvviId ||
        _text(result['card_print_id']) != row.cardPrintId) {
      throw Exception('This exact copy could not be removed from your Vault.');
    }
  }

  Future<void> disposeCopy({
    required VendorPricingWorkspaceRow row,
    required VendorDispositionSubmission submission,
  }) async {
    final result = await _requiredClient().rpc(
      'vault_record_exact_instance_disposition_v2',
      params: {
        'p_instance_id': row.instanceId,
        'p_disposition_type': submission.disposition.wireValue,
        'p_sale_price_amount': submission.salePrice,
        'p_sale_price_currency': submission.salePrice == null
            ? null
            : submission.currency,
        'p_counterparty_label': submission.counterparty,
        'p_trade_received_description': submission.tradeReceived,
        'p_trade_cash_direction': submission.tradeCashDirection?.wireValue,
        'p_trade_cash_amount': submission.tradeCashAmount,
        'p_trade_cash_currency': submission.tradeCashAmount == null
            ? null
            : submission.currency,
      },
    );
    if (result is! Map ||
        _text(result['archived_instance_id']) != row.instanceId ||
        _text(result['gv_vi_id']) != row.gvviId ||
        _text(result['card_print_id']) != row.cardPrintId ||
        _text(result['disposition_type']) != submission.disposition.wireValue ||
        _text(result['disposition_id']).isEmpty) {
      throw Exception(
        'The ${submission.disposition == VendorCopyDisposition.sold ? 'sale' : 'trade'} '
        'could not be recorded for this exact copy.',
      );
    }
  }

  Future<VendorPricingWorkspaceRow> saveSectionMembership({
    required VendorPricingWorkspaceRow row,
    required String sectionId,
    required bool selected,
  }) async {
    final client = _requiredClient();
    if (selected) {
      await VaultGvviService.assignSectionMembership(
        client: client,
        instanceId: row.instanceId,
        sectionId: sectionId,
      );
    } else {
      await VaultGvviService.removeSectionMembership(
        client: client,
        instanceId: row.instanceId,
        sectionId: sectionId,
      );
    }
    final next = row.sectionIds.toSet();
    selected ? next.add(sectionId) : next.remove(sectionId);
    return row.copyWith(sectionIds: next);
  }

  Future<VendorWorkspaceSection> createSection(String name) async {
    final saved = await VaultGvviService.createSection(
      client: _requiredClient(),
      name: name,
    );
    return VendorWorkspaceSection(
      id: saved.id,
      name: saved.name,
      position: saved.position,
    );
  }

  Future<Map<String, dynamic>> _updateOwnedInstance(
    String instanceId,
    Map<String, dynamic> values,
    String returning,
  ) async {
    final client = _requiredClient();
    final userId = (client.auth.currentUser?.id ?? '').trim();
    if (userId.isEmpty) {
      throw Exception('Sign in required.');
    }
    final row = await client
        .from('vault_item_instances')
        .update(values)
        .eq('id', instanceId)
        .eq('user_id', userId)
        .filter('archived_at', 'is', null)
        .select(returning)
        .maybeSingle();
    if (row == null || _text(row['id']) != instanceId) {
      throw Exception('Card changes could not be saved.');
    }
    return Map<String, dynamic>.from(row as Map);
  }

  Future<List<Map<String, dynamic>>> _loadActiveInstances(
    SupabaseClient client,
    String userId,
  ) async {
    final rows = <Map<String, dynamic>>[];
    for (var offset = 0; ; offset += _pageSize) {
      final response = await client
          .from('vault_item_instances')
          .select(
            'id,gv_vi_id,legacy_vault_item_id,card_print_id,card_printing_id,condition_label,intent,pricing_mode,asking_price_amount,asking_price_currency,slab_cert_id,grade_company,grade_value,grade_label,created_at',
          )
          .eq('user_id', userId)
          .filter('archived_at', 'is', null)
          .order('created_at', ascending: false)
          .range(offset, offset + _pageSize - 1);
      final page = (response as List<dynamic>)
          .map((raw) => Map<String, dynamic>.from(raw as Map))
          .toList(growable: false);
      rows.addAll(page);
      if (page.length < _pageSize) {
        break;
      }
    }
    return rows;
  }

  Future<Map<String, Map<String, dynamic>>> _loadCardPrints(
    SupabaseClient client,
    Set<String> ids,
  ) async {
    final rows = await _loadRowsById(
      client: client,
      table: 'card_prints',
      columns:
          'id,gv_id,name,set_code,number,variant_key,printed_identity_modifier,image_url,image_alt_url,image_path,representative_image_url,set:sets(name,code,identity_model)',
      ids: ids,
    );
    if (rows.isEmpty) {
      return rows;
    }
    final enriched = await CanonImageUrlService.enrichRows(rows.values);
    return {
      for (final row in enriched)
        if (_text(row['id']).isNotEmpty) _text(row['id']): row,
    };
  }

  Future<Map<String, List<VendorPrintingOption>>> _loadPrintingsByCardPrintId(
    SupabaseClient client,
    Set<String> cardPrintIds,
  ) async {
    final result = <String, List<VendorPrintingOption>>{};
    final values = cardPrintIds.toList(growable: false);
    for (var start = 0; start < values.length; start += _readChunkSize) {
      final end = start + _readChunkSize > values.length
          ? values.length
          : start + _readChunkSize;
      var offset = 0;
      while (true) {
        final response = await client
            .from('card_printings')
            .select(
              'id,card_print_id,printing_gv_id,finish_key,finish_keys(label,sort_order,is_active)',
            )
            .inFilter('card_print_id', values.sublist(start, end))
            .range(offset, offset + _pageSize - 1);
        final page = (response as List<dynamic>)
            .map((raw) => Map<String, dynamic>.from(raw as Map))
            .toList(growable: false);
        for (final printing in page) {
          final finish = printing['finish_keys'];
          final finishRecord = finish is Map
              ? Map<String, dynamic>.from(finish)
              : const <String, dynamic>{};
          if (finishRecord['is_active'] == false) {
            continue;
          }
          final id = _text(printing['id']);
          final cardPrintId = _text(printing['card_print_id']);
          if (id.isEmpty || cardPrintId.isEmpty) {
            continue;
          }
          final printingGvId = _nullable(printing['printing_gv_id']);
          final finishKey = _nullable(printing['finish_key']);
          final label =
              _nullable(finishRecord['label']) ??
              printingGvId ??
              finishKey ??
              'Exact printing';
          (result[cardPrintId] ??= <VendorPrintingOption>[]).add(
            VendorPrintingOption(
              id: id,
              cardPrintId: cardPrintId,
              label: label,
              sortOrder: _integer(finishRecord['sort_order']),
              printingGvId: printingGvId,
              finishKey: finishKey,
            ),
          );
        }
        if (page.length < _pageSize) {
          break;
        }
        offset += _pageSize;
      }
    }
    for (final options in result.values) {
      options.sort((left, right) {
        final byOrder = left.sortOrder.compareTo(right.sortOrder);
        return byOrder != 0 ? byOrder : left.label.compareTo(right.label);
      });
    }
    return result;
  }

  Future<Map<String, Map<String, dynamic>>> _loadRowsById({
    required SupabaseClient client,
    required String table,
    required String columns,
    required Set<String> ids,
  }) async {
    final result = <String, Map<String, dynamic>>{};
    final values = ids.toList(growable: false);
    for (var start = 0; start < values.length; start += _readChunkSize) {
      final end = start + _readChunkSize > values.length
          ? values.length
          : start + _readChunkSize;
      final response = await client
          .from(table)
          .select(columns)
          .inFilter('id', values.sublist(start, end));
      for (final raw in response as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final id = _text(row['id']);
        if (id.isNotEmpty) {
          result[id] = row;
        }
      }
    }
    return result;
  }

  Future<List<VendorWorkspaceSection>> _loadSections(
    SupabaseClient client,
    String userId,
  ) async {
    final response = await client
        .from('wall_sections')
        .select('id,name,position,is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('position', ascending: true)
        .order('created_at', ascending: true);
    return (response as List<dynamic>)
        .map((raw) => Map<String, dynamic>.from(raw as Map))
        .where(
          (row) => _text(row['id']).isNotEmpty && _text(row['name']).isNotEmpty,
        )
        .map(
          (row) => VendorWorkspaceSection(
            id: _text(row['id']),
            name: _text(row['name']),
            position: _integer(row['position']),
          ),
        )
        .toList(growable: false);
  }

  Future<Map<String, Set<String>>> _loadMemberships(
    SupabaseClient client,
    Iterable<String> rawInstanceIds,
  ) async {
    final instanceIds = rawInstanceIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toList(growable: false);
    final result = <String, Set<String>>{};
    for (var start = 0; start < instanceIds.length; start += _readChunkSize) {
      final end = start + _readChunkSize > instanceIds.length
          ? instanceIds.length
          : start + _readChunkSize;
      final response = await client
          .from('wall_section_memberships')
          .select('section_id,vault_item_instance_id')
          .inFilter('vault_item_instance_id', instanceIds.sublist(start, end));
      for (final raw in response as List<dynamic>) {
        final row = raw as Map;
        final instanceId = _text(row['vault_item_instance_id']);
        final sectionId = _text(row['section_id']);
        if (instanceId.isNotEmpty && sectionId.isNotEmpty) {
          (result[instanceId] ??= <String>{}).add(sectionId);
        }
      }
    }
    return result;
  }

  SupabaseClient _requiredClient() => _client ?? Supabase.instance.client;
}

int compareVendorWorkspaceRows(
  VendorPricingWorkspaceRow left,
  VendorPricingWorkspaceRow right,
) {
  final byPriceStatus = (left.askingPrice == null ? 1 : 0).compareTo(
    right.askingPrice == null ? 1 : 0,
  );
  if (byPriceStatus != 0) {
    return byPriceStatus;
  }
  int priority(VendorPricingWorkspaceRow row) => switch (row.marketPosition) {
    VendorMarketPosition.below => 0,
    VendorMarketPosition.above => 1,
    VendorMarketPosition.atMarket => 2,
    VendorMarketPosition.noExactMarket => 3,
    VendorMarketPosition.unpriced => 4,
  };
  final byPriority = priority(left).compareTo(priority(right));
  if (byPriority != 0) {
    return byPriority;
  }
  final byDifference = (right.varianceAmount?.abs() ?? 0).compareTo(
    left.varianceAmount?.abs() ?? 0,
  );
  if (byDifference != 0) {
    return byDifference;
  }
  final byName = left.displayName.toLowerCase().compareTo(
    right.displayName.toLowerCase(),
  );
  return byName != 0 ? byName : left.gvviId.compareTo(right.gvviId);
}

String _text(dynamic value) => (value ?? '').toString().trim();

String? _nullable(dynamic value) {
  final normalized = _text(value);
  return normalized.isEmpty ? null : normalized;
}

double? _money(dynamic value) {
  final parsed = value is num
      ? value.toDouble()
      : double.tryParse(_text(value));
  if (parsed == null || !parsed.isFinite || parsed <= 0) {
    return null;
  }
  return double.parse(parsed.toStringAsFixed(2));
}

int _integer(dynamic value) =>
    value is num ? value.toInt() : int.tryParse(_text(value)) ?? 0;

String _normalizeCurrency(dynamic value) {
  final normalized = _text(value).toUpperCase();
  return RegExp(r'^[A-Z]{3}$').hasMatch(normalized) ? normalized : 'USD';
}

String _normalizeIntent(dynamic value) {
  final normalized = _text(value).toLowerCase();
  return const {'hold', 'sell', 'trade', 'showcase'}.contains(normalized)
      ? normalized
      : 'hold';
}
