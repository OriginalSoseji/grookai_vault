import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';

class WallPostComposer extends StatelessWidget {
  final Map<String, dynamic>? initialCard;
  const WallPostComposer({super.key, this.initialCard});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Post')),
      body: Padding(
        padding: const EdgeInsets.all(GVSpacing.s16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Composer (MVP placeholder)'),
            const SizedBox(height: GVSpacing.s16),
            FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Publish')),
          ],
        ),
      ),
    );
  }
}

