import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/public/public_card_printing_options_service.dart';
import '../../services/identity/display_identity.dart';

class VaultPrintingChoice {
  const VaultPrintingChoice({
    required this.id,
    required this.label,
    this.printingGvId,
    this.finishKey,
  });

  final String id;
  final String label;
  final String? printingGvId;
  final String? finishKey;
}

Future<List<VaultPrintingChoice>> loadVaultPrintingChoices({
  required SupabaseClient client,
  required String cardPrintId,
}) async {
  final normalizedCardPrintId = cardPrintId.trim();
  if (normalizedCardPrintId.isEmpty) {
    return const <VaultPrintingChoice>[];
  }

  final rows = await PublicCardPrintingOptionsService.fetch(
    client: client,
    cardPrintIds: <String>[normalizedCardPrintId],
  );
  return rows
      .map((row) {
        final id = (row['id'] ?? '').toString().trim();
        if (id.isEmpty) return null;
        final finishKey = (row['finish_key'] ?? '').toString().trim();
        final label =
            formatFinishLabel(
              finishKey: finishKey,
              finishLabel: (row['finish_label'] ?? '').toString().trim(),
            ) ??
            'Standard';
        final printingGvId = (row['printing_gv_id'] ?? '').toString().trim();
        return VaultPrintingChoice(
          id: id,
          label: label,
          printingGvId: printingGvId.isEmpty ? null : printingGvId,
          finishKey: finishKey.isEmpty ? null : finishKey,
        );
      })
      .whereType<VaultPrintingChoice>()
      .toList(growable: false);
}

Future<VaultPrintingChoice?> chooseVaultPrinting({
  required BuildContext context,
  required SupabaseClient client,
  required String cardPrintId,
  required String cardName,
  String? preferredPrintingId,
}) async {
  final options = await loadVaultPrintingChoices(
    client: client,
    cardPrintId: cardPrintId,
  );

  if (options.isEmpty) {
    throw StateError(
      'No verified variant is available. Try again before adding this card.',
    );
  }

  final preferred = (preferredPrintingId ?? '').trim();
  if (preferred.isNotEmpty) {
    for (final option in options) {
      if (option.id == preferred || option.printingGvId == preferred) {
        return option;
      }
    }
  }
  if (options.length == 1) return options.single;
  if (!context.mounted) return null;

  return showModalBottomSheet<VaultPrintingChoice>(
    context: context,
    showDragHandle: true,
    useSafeArea: true,
    isScrollControlled: true,
    builder: (sheetContext) => Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        2,
        20,
        20 + MediaQuery.viewPaddingOf(sheetContext).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Which variant is this?',
            style: Theme.of(
              sheetContext,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 5),
          Text(
            '$cardName has ${options.length} collectible versions. Pick the exact one so your Vault stays accurate.',
            style: Theme.of(sheetContext).textTheme.bodyMedium?.copyWith(
              color: Theme.of(
                sheetContext,
              ).colorScheme.onSurface.withValues(alpha: 0.68),
            ),
          ),
          const SizedBox(height: 14),
          Flexible(
            child: ListView.separated(
              shrinkWrap: true,
              itemCount: options.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final option = options[index];
                return ListTile(
                  minTileHeight: 52,
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.layers_outlined),
                  title: Text(option.label),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => Navigator.of(sheetContext).pop(option),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}
