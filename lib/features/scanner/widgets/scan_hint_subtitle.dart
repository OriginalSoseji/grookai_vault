import 'package:flutter/widgets.dart';
import 'package:grookai_vault/ui/app/theme.dart';

class ScanHintSubtitle extends StatelessWidget {
  final String setCode;
  final String collectorNumber;
  final String language;
  const ScanHintSubtitle({super.key, required this.setCode, required this.collectorNumber, required this.language});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Text(
      '$setCode #$collectorNumber · $language',
      style: gv.typography.caption.copyWith(color: gv.colors.textSecondary),
    );
  }
}

