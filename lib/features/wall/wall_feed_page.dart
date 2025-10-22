import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/app/theme.dart';

class WallFeedPage extends StatelessWidget {
  const WallFeedPage({super.key});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text('Public Wall', style: gv.typography.title)),
      body: ListView.separated(
        padding: const EdgeInsets.all(GVSpacing.s16),
        itemBuilder: (_, i) => Placeholder(fallbackHeight: 80),
        separatorBuilder: (_, __) => const SizedBox(height: GVSpacing.s12),
        itemCount: 10,
      ),
    );
  }
}

