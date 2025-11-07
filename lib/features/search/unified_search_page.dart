import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'unified_search_inline.dart';

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
      body: const UnifiedSearchInline(),
    );
  }
}

