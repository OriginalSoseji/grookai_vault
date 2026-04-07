import 'package:supabase_flutter/supabase_flutter.dart';

import '../public/card_surface_pricing_service.dart';

const List<String> kDiscoverableVaultIntents = <String>[
  'trade',
  'sell',
  'showcase',
];

class NetworkStreamCopy {
  const NetworkStreamCopy({
    required this.instanceId,
    required this.vaultItemId,
    required this.intent,
    this.gvviId,
    this.conditionLabel,
    this.isGraded = false,
    this.gradeCompany,
    this.gradeValue,
    this.gradeLabel,
    this.certNumber,
    this.createdAt,
  });

  final String instanceId;
  final String vaultItemId;
  final String intent;
  final String? gvviId;
  final String? conditionLabel;
  final bool isGraded;
  final String? gradeCompany;
  final String? gradeValue;
  final String? gradeLabel;
  final String? certNumber;
  final String? createdAt;
}

class NetworkStreamRow {
  const NetworkStreamRow({
    required this.vaultItemId,
    required this.ownerUserId,
    required this.ownerSlug,
    required this.ownerDisplayName,
    required this.cardPrintId,
    required this.quantity,
    required this.inPlayCount,
    required this.tradeCount,
    required this.sellCount,
    required this.showcaseCount,
    required this.rawCount,
    required this.slabCount,
    required this.gvId,
    required this.name,
    required this.setCode,
    required this.setName,
    required this.number,
    this.intent,
    this.conditionLabel,
    this.isGraded = false,
    this.gradeCompany,
    this.gradeValue,
    this.gradeLabel,
    this.createdAt,
    this.imageUrl,
    this.inPlayCopies = const <NetworkStreamCopy>[],
    this.pricing,
    this.listingCount,
  });

  final String vaultItemId;
  final String ownerUserId;
  final String ownerSlug;
  final String ownerDisplayName;
  final String cardPrintId;
  final String? intent;
  final int quantity;
  final int inPlayCount;
  final int tradeCount;
  final int sellCount;
  final int showcaseCount;
  final int rawCount;
  final int slabCount;
  final String? conditionLabel;
  final bool isGraded;
  final String? gradeCompany;
  final String? gradeValue;
  final String? gradeLabel;
  final String? createdAt;
  final String gvId;
  final String name;
  final String setCode;
  final String setName;
  final String number;
  final String? imageUrl;
  final List<NetworkStreamCopy> inPlayCopies;
  final CardSurfacePricingData? pricing;
  final int? listingCount;

  NetworkStreamRow copyWith({
    List<NetworkStreamCopy>? inPlayCopies,
    CardSurfacePricingData? pricing,
    int? listingCount,
  }) {
    return NetworkStreamRow(
      vaultItemId: vaultItemId,
      ownerUserId: ownerUserId,
      ownerSlug: ownerSlug,
      ownerDisplayName: ownerDisplayName,
      cardPrintId: cardPrintId,
      intent: intent,
      quantity: quantity,
      inPlayCount: inPlayCount,
      tradeCount: tradeCount,
      sellCount: sellCount,
      showcaseCount: showcaseCount,
      rawCount: rawCount,
      slabCount: slabCount,
      conditionLabel: conditionLabel,
      isGraded: isGraded,
      gradeCompany: gradeCompany,
      gradeValue: gradeValue,
      gradeLabel: gradeLabel,
      createdAt: createdAt,
      gvId: gvId,
      name: name,
      setCode: setCode,
      setName: setName,
      number: number,
      imageUrl: imageUrl,
      inPlayCopies: inPlayCopies ?? this.inPlayCopies,
      pricing: pricing ?? this.pricing,
      listingCount: listingCount ?? this.listingCount,
    );
  }
}

class NetworkStreamService {
  static Future<List<NetworkStreamRow>> fetchRows({
    required SupabaseClient client,
    String? intent,
    String? excludeUserId,
    int limit = 60,
  }) async {
    final normalizedIntent = normalizeDiscoverableVaultIntent(intent);
    final normalizedExcludeUserId = _clean(excludeUserId);
    final normalizedLimit = limit.clamp(1, 120);

    dynamic query = client
        .from('v_card_stream_v1')
        .select(
          'vault_item_id,owner_user_id,owner_slug,owner_display_name,card_print_id,intent,quantity,in_play_count,trade_count,sell_count,showcase_count,raw_count,slab_count,condition_label,is_graded,grade_company,grade_value,grade_label,created_at,gv_id,name,set_code,set_name,number,image_url',
        );

    if (normalizedIntent != null) {
      query = query.gt('${normalizedIntent}_count', 0);
    }

    if (normalizedExcludeUserId.isNotEmpty) {
      query = query.neq('owner_user_id', normalizedExcludeUserId);
    }

    final response = await query
        .order('created_at', ascending: false)
        .order('vault_item_id', ascending: false)
        .limit(normalizedLimit);
    final baseRows = (response as List<dynamic>)
        .map((raw) => _normalizeRow(Map<String, dynamic>.from(raw as Map)))
        .whereType<NetworkStreamRow>()
        .toList();

    if (baseRows.isEmpty) {
      return const <NetworkStreamRow>[];
    }

    final results = await Future.wait<dynamic>([
      _fetchInPlayCopies(client: client, rows: baseRows),
      CardSurfacePricingService.fetchByCardPrintIds(
        client: client,
        cardPrintIds: baseRows.map((row) => row.cardPrintId),
      ),
      _fetchListingCounts(
        client: client,
        cardPrintIds: baseRows.map((row) => row.cardPrintId),
      ),
    ]);

    final copiesByGroup = results[0] as Map<String, List<NetworkStreamCopy>>;
    final pricingById = results[1] as Map<String, CardSurfacePricingData>;
    final listingCountById = results[2] as Map<String, int>;

    final enrichedRows = baseRows
        .map(
          (row) => row.copyWith(
            inPlayCopies:
                copiesByGroup[_groupKey(row.ownerUserId, row.cardPrintId)] ??
                const <NetworkStreamCopy>[],
            pricing: pricingById[row.cardPrintId],
            listingCount: listingCountById[row.cardPrintId],
          ),
        )
        .toList();

    return _rankRows(enrichedRows);
  }

  static String? normalizeDiscoverableVaultIntent(String? value) {
    final normalized = _clean(value).toLowerCase();
    if (normalized == 'trade' ||
        normalized == 'sell' ||
        normalized == 'showcase') {
      return normalized;
    }
    return null;
  }

  static String getVaultIntentLabel(String? intent) {
    switch (normalizeDiscoverableVaultIntent(intent)) {
      case 'trade':
        return 'Trade';
      case 'sell':
        return 'Sell';
      case 'showcase':
        return 'Showcase';
      default:
        return 'Hold';
    }
  }

  static String getOwnershipSummary(NetworkStreamRow row) {
    if (row.inPlayCount > 1) {
      return '${row.inPlayCount} copies in play';
    }

    if (row.isGraded) {
      final gradedLabel = _nullable(row.gradeLabel);
      if (gradedLabel != null) {
        return gradedLabel;
      }

      final gradeParts = <String?>[
        _nullable(row.gradeCompany),
        _nullable(row.gradeValue),
      ].whereType<String>().toList();
      if (gradeParts.isNotEmpty) {
        return gradeParts.join(' ');
      }

      return 'Graded';
    }

    return _nullable(row.conditionLabel) ?? 'Raw';
  }

  static List<String> getIntentSummary(NetworkStreamRow row) {
    return <String>[
      if (row.sellCount > 0) 'Sell ${row.sellCount}',
      if (row.tradeCount > 0) 'Trade ${row.tradeCount}',
      if (row.showcaseCount > 0) 'Showcase ${row.showcaseCount}',
    ];
  }

  static String getPrimaryIntentLabel(NetworkStreamRow row) {
    final selectedIntent = getPrimaryIntent(row);
    final count = switch (selectedIntent) {
      'sell' => row.sellCount,
      'trade' => row.tradeCount,
      'showcase' => row.showcaseCount,
      _ => 0,
    };
    final baseLabel = getVaultIntentLabel(selectedIntent);
    return count > 1 ? '$baseLabel $count' : baseLabel;
  }

  static String getPrimaryIntent(NetworkStreamRow row) {
    return normalizeDiscoverableVaultIntent(row.intent) ??
        _dominantIntentFromCounts(row);
  }

  static String getPrimaryContactLabel(NetworkStreamRow row) {
    final selectedIntent = getPrimaryIntent(row);
    switch (selectedIntent) {
      case 'sell':
        return 'Ask to buy';
      case 'trade':
        return 'Ask to trade';
      case 'showcase':
        return 'Contact owner';
      default:
        return 'Contact owner';
    }
  }

  static String? getListingsLabel(NetworkStreamRow row) {
    final count = row.listingCount;
    if (count == null || count <= 0) {
      return null;
    }
    return '$count listing${count == 1 ? '' : 's'}';
  }

  static String formatCreatedAtShort(String? value) {
    final parsed = DateTime.tryParse(_clean(value));
    if (parsed == null) {
      return 'Recently listed';
    }

    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final local = parsed.toLocal();
    final month = months[local.month - 1];
    return '$month ${local.day}, ${local.year}';
  }

  static Future<Map<String, List<NetworkStreamCopy>>> _fetchInPlayCopies({
    required SupabaseClient client,
    required List<NetworkStreamRow> rows,
  }) async {
    final requestedGroupKeys = rows
        .map((row) => _groupKey(row.ownerUserId, row.cardPrintId))
        .toSet();
    final ownerUserIds = rows
        .map((row) => row.ownerUserId)
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (requestedGroupKeys.isEmpty || ownerUserIds.isEmpty) {
      return const <String, List<NetworkStreamCopy>>{};
    }

    try {
      final instanceRows = await client.rpc(
        'public_discoverable_card_copies_v1',
        params: {
          'p_owner_user_ids': ownerUserIds,
          'p_card_print_ids': rows
              .map((row) => row.cardPrintId)
              .toSet()
              .toList(),
        },
      );

      final copiesByGroupKey = <String, List<NetworkStreamCopy>>{};
      for (final raw in instanceRows as List<dynamic>) {
        final row = Map<String, dynamic>.from(raw as Map);
        final ownerUserId = _nullable(row['owner_user_id']);
        final vaultItemId = _nullable(row['legacy_vault_item_id']);
        final cardPrintId = _nullable(row['card_print_id']);
        final intent = normalizeDiscoverableVaultIntent(_clean(row['intent']));

        if (ownerUserId == null ||
            vaultItemId == null ||
            cardPrintId == null ||
            intent == null) {
          continue;
        }

        final groupKey = _groupKey(ownerUserId, cardPrintId);
        if (!requestedGroupKeys.contains(groupKey)) {
          continue;
        }

        final copies = copiesByGroupKey[groupKey] ?? <NetworkStreamCopy>[];
        copies.add(
          NetworkStreamCopy(
            instanceId: _clean(row['instance_id']),
            gvviId: _nullable(row['gv_vi_id']),
            vaultItemId: vaultItemId,
            intent: intent,
            conditionLabel: _nullable(row['condition_label']),
            isGraded: row['is_graded'] == true,
            gradeCompany: _nullable(row['grade_company']),
            gradeValue: _nullable(row['grade_value']),
            gradeLabel: _nullable(row['grade_label']),
            certNumber: _nullable(row['cert_number']),
            createdAt: _nullable(row['created_at']),
          ),
        );
        copiesByGroupKey[groupKey] = copies;
      }

      for (final entry in copiesByGroupKey.entries) {
        entry.value.sort(
          (left, right) =>
              _compareCreatedAtDescending(left.createdAt, right.createdAt),
        );
      }

      return copiesByGroupKey;
    } catch (_) {
      return const <String, List<NetworkStreamCopy>>{};
    }
  }

  static Future<Map<String, int>> _fetchListingCounts({
    required SupabaseClient client,
    required Iterable<String> cardPrintIds,
  }) async {
    final normalizedIds = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();

    if (normalizedIds.isEmpty) {
      return const <String, int>{};
    }

    try {
      final rows = await client
          .from('v_card_pricing_ui_v1')
          .select('card_print_id,ebay_listing_count')
          .inFilter('card_print_id', normalizedIds);

      final listingCounts = <String, int>{};
      for (final rawRow in rows as List<dynamic>) {
        final row = Map<String, dynamic>.from(rawRow as Map);
        final cardPrintId = _nullable(row['card_print_id']);
        if (cardPrintId == null) {
          continue;
        }
        final listingCount = _positiveCount(row['ebay_listing_count']);
        if (listingCount != null) {
          listingCounts[cardPrintId] = listingCount;
        }
      }
      return listingCounts;
    } catch (_) {
      return const <String, int>{};
    }
  }

  static NetworkStreamRow? _normalizeRow(Map<String, dynamic> row) {
    final vaultItemId = _nullable(row['vault_item_id']);
    final ownerUserId = _nullable(row['owner_user_id']);
    final ownerSlug = _nullable(row['owner_slug']);
    final ownerDisplayName = _nullable(row['owner_display_name']);
    final cardPrintId = _nullable(row['card_print_id']);
    final gvId = _nullable(row['gv_id']);

    if (vaultItemId == null ||
        ownerUserId == null ||
        ownerSlug == null ||
        ownerDisplayName == null ||
        cardPrintId == null ||
        gvId == null) {
      return null;
    }

    final inPlayCount =
        _positiveCount(row['in_play_count']) ??
        _positiveCount(row['quantity']) ??
        1;

    return NetworkStreamRow(
      vaultItemId: vaultItemId,
      ownerUserId: ownerUserId,
      ownerSlug: ownerSlug,
      ownerDisplayName: ownerDisplayName,
      cardPrintId: cardPrintId,
      intent: normalizeDiscoverableVaultIntent(_clean(row['intent'])),
      quantity: inPlayCount,
      inPlayCount: inPlayCount,
      tradeCount: _nonNegativeCount(row['trade_count']),
      sellCount: _nonNegativeCount(row['sell_count']),
      showcaseCount: _nonNegativeCount(row['showcase_count']),
      rawCount: _nonNegativeCount(row['raw_count']),
      slabCount: _nonNegativeCount(row['slab_count']),
      conditionLabel: _nullable(row['condition_label']),
      isGraded: row['is_graded'] == true,
      gradeCompany: _nullable(row['grade_company']),
      gradeValue: _nullable(row['grade_value']),
      gradeLabel: _nullable(row['grade_label']),
      createdAt: _nullable(row['created_at']),
      gvId: gvId,
      name: _nullable(row['name']) ?? 'Unknown card',
      setCode: _nullable(row['set_code']) ?? 'Unknown set',
      setName:
          _nullable(row['set_name']) ??
          _nullable(row['set_code']) ??
          'Unknown set',
      number: _nullable(row['number']) ?? '—',
      imageUrl: _httpUrl(row['image_url']),
    );
  }

  static String _groupKey(String ownerUserId, String cardPrintId) =>
      '$ownerUserId:$cardPrintId';

  static String _clean(dynamic value) => (value ?? '').toString().trim();

  static String? _nullable(dynamic value) {
    final normalized = _clean(value);
    return normalized.isEmpty ? null : normalized;
  }

  static String? _httpUrl(dynamic value) {
    final normalized = _nullable(value);
    if (normalized == null) {
      return null;
    }

    final uri = Uri.tryParse(normalized);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      return null;
    }

    return normalized;
  }

  static int _nonNegativeCount(dynamic value) {
    if (value is num) {
      return value.toInt() < 0 ? 0 : value.toInt();
    }

    final parsed = int.tryParse(_clean(value));
    if (parsed == null) {
      return 0;
    }
    return parsed < 0 ? 0 : parsed;
  }

  static int? _positiveCount(dynamic value) {
    if (value is num) {
      return value.toInt() > 0 ? value.toInt() : null;
    }

    final parsed = int.tryParse(_clean(value));
    if (parsed == null || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  static int _compareCreatedAtDescending(String? left, String? right) {
    final leftTime = DateTime.tryParse(_clean(left));
    final rightTime = DateTime.tryParse(_clean(right));
    final leftMillis = leftTime?.millisecondsSinceEpoch ?? 0;
    final rightMillis = rightTime?.millisecondsSinceEpoch ?? 0;
    return rightMillis.compareTo(leftMillis);
  }

  static List<NetworkStreamRow> _rankRows(List<NetworkStreamRow> rows) {
    if (rows.length < 2) {
      return rows;
    }

    final chronologicalRows = [...rows]
      ..sort(
        (left, right) =>
            _compareCreatedAtDescending(left.createdAt, right.createdAt),
      );

    const windowSize = 10;
    final rankedRows = <NetworkStreamRow>[];
    for (var start = 0; start < chronologicalRows.length; start += windowSize) {
      final end = (start + windowSize) > chronologicalRows.length
          ? chronologicalRows.length
          : start + windowSize;
      final window = chronologicalRows.sublist(start, end);
      window.sort((left, right) {
        final signal = _signalScore(right).compareTo(_signalScore(left));
        if (signal != 0) {
          return signal;
        }

        final createdAt = _compareCreatedAtDescending(
          left.createdAt,
          right.createdAt,
        );
        if (createdAt != 0) {
          return createdAt;
        }

        return left.name.toLowerCase().compareTo(right.name.toLowerCase());
      });
      rankedRows.addAll(_diversifyWindow(window));
    }

    return rankedRows;
  }

  static List<NetworkStreamRow> _diversifyWindow(List<NetworkStreamRow> rows) {
    final pool = [...rows];
    final ordered = <NetworkStreamRow>[];
    final recentNameKeys = <String>[];
    final recentOwnerKeys = <String>[];

    while (pool.isNotEmpty) {
      var bestIndex = 0;
      var bestPenalty = 1 << 20;

      for (var index = 0; index < pool.length; index++) {
        final candidate = pool[index];
        final penalty = _repetitionPenalty(
          candidate,
          recentNameKeys: recentNameKeys,
          recentOwnerKeys: recentOwnerKeys,
        );
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestIndex = index;
          continue;
        }

        if (penalty != bestPenalty) {
          continue;
        }

        final currentBest = pool[bestIndex];
        final signalCompare = _signalScore(
          candidate,
        ).compareTo(_signalScore(currentBest));
        if (signalCompare > 0) {
          bestIndex = index;
          continue;
        }

        if (signalCompare != 0) {
          continue;
        }

        final createdAtCompare = _compareCreatedAtDescending(
          candidate.createdAt,
          currentBest.createdAt,
        );
        if (createdAtCompare < 0) {
          bestIndex = index;
        }
      }

      final nextRow = pool.removeAt(bestIndex);
      ordered.add(nextRow);
      recentNameKeys.add(_nameKey(nextRow));
      recentOwnerKeys.add(_ownerKey(nextRow));
      if (recentNameKeys.length > 2) {
        recentNameKeys.removeAt(0);
      }
      if (recentOwnerKeys.length > 2) {
        recentOwnerKeys.removeAt(0);
      }
    }

    return ordered;
  }

  static int _signalScore(NetworkStreamRow row) {
    var score = 0;

    if (row.pricing?.hasVisibleValue == true) {
      score += 40;
    }

    score += switch (_dominantIntentFromCounts(row)) {
      'sell' => 18,
      'trade' => 12,
      'showcase' => 4,
      _ => 0,
    };

    final listingCount = row.listingCount ?? 0;
    score += listingCount.clamp(0, 12);
    if (listingCount > 0) {
      score += 2;
    }

    final copyCount = row.inPlayCopies.length > 1
        ? row.inPlayCopies.length
        : row.inPlayCount;
    score += copyCount.clamp(1, 5);

    if (row.isGraded) {
      score += 2;
    }

    return score;
  }

  static int _repetitionPenalty(
    NetworkStreamRow row, {
    required List<String> recentNameKeys,
    required List<String> recentOwnerKeys,
  }) {
    var penalty = 0;
    final nameKey = _nameKey(row);
    final ownerKey = _ownerKey(row);

    if (recentNameKeys.isNotEmpty && recentNameKeys.last == nameKey) {
      penalty += 10;
    } else if (recentNameKeys.contains(nameKey)) {
      penalty += 4;
    }

    if (recentOwnerKeys.isNotEmpty && recentOwnerKeys.last == ownerKey) {
      penalty += 8;
    } else if (recentOwnerKeys.contains(ownerKey)) {
      penalty += 3;
    }

    return penalty;
  }

  static String _dominantIntentFromCounts(NetworkStreamRow row) {
    final candidates =
        <({String intent, int count, int priority})>[
          (intent: 'sell', count: row.sellCount, priority: 3),
          (intent: 'trade', count: row.tradeCount, priority: 2),
          (intent: 'showcase', count: row.showcaseCount, priority: 1),
        ]..sort((left, right) {
          final countCompare = right.count.compareTo(left.count);
          if (countCompare != 0) {
            return countCompare;
          }
          return right.priority.compareTo(left.priority);
        });

    final winner = candidates.firstWhere(
      (candidate) => candidate.count > 0,
      orElse: () => (intent: row.intent ?? 'showcase', count: 0, priority: 0),
    );
    return normalizeDiscoverableVaultIntent(winner.intent) ?? 'showcase';
  }

  static String _nameKey(NetworkStreamRow row) {
    return row.name.trim().toLowerCase();
  }

  static String _ownerKey(NetworkStreamRow row) {
    return row.ownerUserId.trim().toLowerCase();
  }
}
