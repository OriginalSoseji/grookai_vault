import 'package:flutter/material.dart';
import '../../card_detail_screen.dart';
import '../../services/public/jungle_edition_resolution_service.dart';
import '../../widgets/jungle_edition_choice_sheet.dart';

/// A scan match is not evidence of a physical edition. Navigation only: the
/// collector reviews the exact card page and presses Add there to create a copy.
Future<void> reviewScannedJungleEdition(
  BuildContext context,
  JungleEditionResolution resolution,
) async {
  final option = await showModalBottomSheet<JungleEditionOption>(
    context: context,
    isScrollControlled: true,
    builder: (sheetContext) => JungleEditionChoiceSheet(
      resolution: resolution,
      onSelect: (option) => Navigator.of(sheetContext).pop(option),
    ),
  );
  if (option == null || !context.mounted) return;
  await Navigator.of(context).push<void>(
    MaterialPageRoute(
      builder: (_) => CardDetailScreen(
        cardPrintId: option.cardPrintId,
        gvId: option.gvId,
        selectedPrintingGvId: option.printingGvId,
        selectedFinishLabel: option.finishKey == 'holo' ? 'Holo' : 'Normal',
        entrySurface: 'scan_edition_review',
      ),
    ),
  );
}
