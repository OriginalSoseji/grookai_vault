import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'unified_search_sheet.dart';

class UnifiedSearchPage extends StatelessWidget {
  const UnifiedSearchPage({super.key});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Scaffold(
      backgroundColor: gv.colors.bg,
      appBar: AppBar(
        title: Text(
          'Search',
          style: gv.typography.title.copyWith(color: gv.colors.textPrimary),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(GVSpacing.s16),
          child: FilledButton.icon(
            icon: const Icon(Icons.search),
            label: const Text('Open Search'),
            onPressed: () => UnifiedSearchSheet.show(context),
          ),
        ),
      ),
    );
  }
}
