Map<String, String> uniqueOwnedPrintingIdsForVaultArtwork({
  required Iterable<Map<String, dynamic>> vaultRows,
  required Iterable<Map<String, dynamic>> pricingTargets,
}) {
  final targetsByCardPrintId = <String, List<String?>>{};
  for (final target in pricingTargets) {
    final cardPrintId = (target['card_print_id'] ?? '').toString().trim();
    if (cardPrintId.isEmpty) continue;
    final printingId = (target['card_printing_id'] ?? '').toString().trim();
    (targetsByCardPrintId[cardPrintId] ??= <String?>[]).add(
      printingId.isEmpty ? null : printingId,
    );
  }

  final result = <String, String>{};
  for (final row in vaultRows) {
    final cardPrintId = (row['card_id'] ?? '').toString().trim();
    final ownedCount = int.tryParse((row['owned_count'] ?? '').toString());
    final targets = targetsByCardPrintId[cardPrintId];
    if (cardPrintId.isEmpty ||
        ownedCount == null ||
        ownedCount < 1 ||
        targets == null ||
        targets.length != ownedCount ||
        targets.any((printingId) => printingId == null)) {
      continue;
    }

    final printingIds = targets.toSet();
    if (printingIds.length == 1) {
      result[cardPrintId] = printingIds.single!;
    }
  }
  return Map<String, String>.unmodifiable(result);
}

Map<String, Map<String, dynamic>> exactVaultPrintingImageRows({
  required Map<String, String> printingIdByCardPrintId,
  required Iterable<Map<String, dynamic>> printingOptions,
}) {
  final result = <String, Map<String, dynamic>>{};
  for (final option in printingOptions) {
    final cardPrintId = (option['card_print_id'] ?? '').toString().trim();
    final expectedPrintingId = printingIdByCardPrintId[cardPrintId];
    final optionId = (option['id'] ?? '').toString().trim();
    final imageStatus = (option['image_status'] ?? '')
        .toString()
        .trim()
        .toLowerCase();
    if (expectedPrintingId == null ||
        expectedPrintingId != optionId ||
        imageStatus != 'exact') {
      continue;
    }
    result[cardPrintId] = Map<String, dynamic>.from(option);
  }
  return Map<String, Map<String, dynamic>>.unmodifiable(result);
}
