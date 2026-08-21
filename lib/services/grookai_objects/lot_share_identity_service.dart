import 'package:supabase_flutter/supabase_flutter.dart';

import '../identity/display_identity.dart';

class LotShareIdentityService {
  const LotShareIdentityService._();

  static Future<Map<String, String>> fetchMeaningfulFinishLabels({
    required SupabaseClient client,
    required Iterable<Map<String, dynamic>> vaultRows,
  }) async {
    final gvviIds = vaultRows
        .map((row) => (row['gv_vi_id'] ?? '').toString().trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    final cardPrintIds = vaultRows
        .map((row) => (row['card_id'] ?? '').toString().trim())
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList(growable: false);
    if (gvviIds.isEmpty || cardPrintIds.isEmpty) {
      return const <String, String>{};
    }

    final rawInstances = await client
        .from('vault_item_instances')
        .select('gv_vi_id,card_print_id,card_printing_id')
        .inFilter('gv_vi_id', gvviIds);
    final instanceRows = <Map<String, dynamic>>[];
    for (final raw in rawInstances as List<dynamic>) {
      if (raw is! Map) {
        continue;
      }
      instanceRows.add(Map<String, dynamic>.from(raw));
    }
    if (instanceRows.every(
      (row) => (row['card_printing_id'] ?? '').toString().trim().isEmpty,
    )) {
      return const <String, String>{};
    }

    final rawPrintings = await client
        .from('card_printings')
        .select('id,card_print_id,finish_key,finish_keys(label)')
        .inFilter('card_print_id', cardPrintIds);
    final printingRows = <Map<String, dynamic>>[];
    for (final raw in rawPrintings as List<dynamic>) {
      if (raw is! Map) {
        continue;
      }
      printingRows.add(Map<String, dynamic>.from(raw));
    }
    return deriveMeaningfulFinishLabels(
      instanceRows: instanceRows,
      printingRows: printingRows,
    );
  }

  static Map<String, String> deriveMeaningfulFinishLabels({
    required Iterable<Map<String, dynamic>> instanceRows,
    required Iterable<Map<String, dynamic>> printingRows,
  }) {
    final selectedPrintingByCardPrintId = <String, String>{};
    for (final row in instanceRows) {
      final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
      final cardPrintingId = (row['card_printing_id'] ?? '').toString().trim();
      if (cardPrintId.isNotEmpty && cardPrintingId.isNotEmpty) {
        selectedPrintingByCardPrintId[cardPrintId] = cardPrintingId;
      }
    }
    final printingsByCardPrintId = <String, List<Map<String, dynamic>>>{};
    for (final row in printingRows) {
      final cardPrintId = (row['card_print_id'] ?? '').toString().trim();
      if (cardPrintId.isNotEmpty) {
        printingsByCardPrintId.putIfAbsent(cardPrintId, () => []).add(row);
      }
    }

    final result = <String, String>{};
    for (final entry in selectedPrintingByCardPrintId.entries) {
      final siblings = printingsByCardPrintId[entry.key] ?? const [];
      if (siblings.length <= 1) {
        continue;
      }
      final selected = siblings.cast<Map<String, dynamic>?>().firstWhere(
        (row) => (row?['id'] ?? '').toString().trim() == entry.value,
        orElse: () => null,
      );
      if (selected == null) {
        continue;
      }
      final finishRecord = _record(selected['finish_keys']);
      final label = formatFinishLabel(
        finishKey: selected['finish_key']?.toString(),
        finishLabel: finishRecord?['label']?.toString(),
      );
      if (label != null && label.trim().isNotEmpty) {
        result[entry.key] = label.trim();
      }
    }
    return result;
  }
}

Map<String, dynamic>? _record(dynamic value) {
  if (value is Map) {
    return Map<String, dynamic>.from(value);
  }
  if (value is List && value.isNotEmpty && value.first is Map) {
    return Map<String, dynamic>.from(value.first as Map);
  }
  return null;
}
