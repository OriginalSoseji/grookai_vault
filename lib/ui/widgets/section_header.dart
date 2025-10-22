// lib/ui/widgets/section_header.dart
import 'package:flutter/widgets.dart';
import '../app/theme.dart';
import '../tokens/spacing.dart';

class SectionHeader extends StatelessWidget {
  final String text;
  const SectionHeader(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        GVSpacing.s16,
        GVSpacing.s16,
        GVSpacing.s16,
        GVSpacing.s8,
      ),
      child: Text(
        text,
        style: gv.typography.title.copyWith(color: gv.colors.textPrimary),
      ),
    );
  }
}
