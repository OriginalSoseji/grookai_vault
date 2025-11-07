import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';
import 'package:grookai_vault/ui/widgets/async_image.dart';

class ScanResultSheet extends StatelessWidget {
  final String name;
  final String setCode;
  final String number;
  final String? imageUrl;
  final String? conditionLabel;
  final String? priceDisplay;
  final VoidCallback onAdd;
  final VoidCallback onScanAgain;

  const ScanResultSheet({
    super.key,
    required this.name,
    required this.setCode,
    required this.number,
    this.imageUrl,
    this.conditionLabel,
    this.priceDisplay,
    required this.onAdd,
    required this.onScanAgain,
  });

  static Future<void> show(
    BuildContext context, {
    required String name,
    required String setCode,
    required String number,
    String? imageUrl,
    String? conditionLabel,
    String? priceDisplay,
    required VoidCallback onAdd,
    required VoidCallback onScanAgain,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: ScanResultSheet(
          name: name,
          setCode: setCode,
          number: number,
          imageUrl: imageUrl,
          conditionLabel: conditionLabel,
          priceDisplay: priceDisplay,
          onAdd: onAdd,
          onScanAgain: onScanAgain,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.all(GVSpacing.s16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if ((imageUrl ?? '').isNotEmpty)
                  AsyncImage(imageUrl!, width: 56, height: 56),
                if ((imageUrl ?? '').isNotEmpty)
                  const SizedBox(width: GVSpacing.s12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: gv.typography.title),
                      const SizedBox(height: GVSpacing.s4),
                      Text('$setCode #$number', style: gv.typography.caption.copyWith(color: gv.colors.textSecondary)),
                      if ((conditionLabel ?? '').isNotEmpty)
                        Text('Condition: $conditionLabel', style: gv.typography.caption),
                      if ((priceDisplay ?? '').isNotEmpty)
                        Text('Market: $priceDisplay', style: gv.typography.caption.copyWith(color: Thunder.accent)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: GVSpacing.s12),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: () {
                    Navigator.of(context).maybePop();
                    onAdd();
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Add to Vault'),
                ),
                const SizedBox(width: GVSpacing.s8),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).maybePop();
                    onScanAgain();
                  },
                  child: const Text('Scan again'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

