import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/core/telemetry.dart';

class WallFeedPage extends StatefulWidget {
  const WallFeedPage({super.key});

  @override
  State<WallFeedPage> createState() => _WallFeedPageState();
}

class _WallFeedPageState extends State<WallFeedPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Telemetry.log('wall_view');
    });
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text('Public Wall', style: gv.typography.title)),
      body: ListView.separated(
        padding: const EdgeInsets.all(GVSpacing.s16),
        itemBuilder: (_, i) => const Placeholder(fallbackHeight: 80),
        separatorBuilder: (_, _) => const SizedBox(height: GVSpacing.s12),
        itemCount: 10,
      ),
    );
  }
}
