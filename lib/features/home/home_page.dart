import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'home_vm.dart';
import 'package:grookai_vault/core/load_state.dart';
import 'package:grookai_vault/core/ui_contracts.dart';
import 'package:grookai_vault/features/wall/public_wall_feed.dart';
// import 'package:grookai_vault/core/telemetry.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final HomeVm _vm;

  @override
  void initState() {
    super.initState();
    _vm = HomeVm(Supabase.instance.client);
    _vm.load();
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return ListView(
      padding: const EdgeInsets.all(GVSpacing.s16),
      children: [
        // Public Wall
        Text('Community',
            style: gv.typography.title.copyWith(color: gv.colors.textPrimary)),
        const SizedBox(height: GVSpacing.s8),
        ValueListenableBuilder<LoadState<List<Map<String, dynamic>>>>(
          valueListenable: _vm.wallItems,
          builder: (context, state, _) {
            if (state.loading) return const LinearProgressIndicator(minHeight: 2);
            final list = state.data ?? const <Map<String, dynamic>>[];
            if (list.isEmpty) return const PublicWallFeed();
            // Simple preview of first few posts
            return Column(
              children: [
                for (final r in list.take(5))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text((r['title'] ?? 'Post').toString()),
                    subtitle: Text((r['summary'] ?? '').toString()),
                    onTap: () => Navigator.of(context).pushNamed(
                      '/wall-post',
                      arguments: {'id': (r['id'] ?? '').toString()},
                    ),
                  ),
              ],
            );
          },
        ),
        const SizedBox(height: GVSpacing.s16),
        const Divider(),
        const SizedBox(height: GVSpacing.s16),
        // Price Movers
        Text('Price Movers',
            style: gv.typography.title.copyWith(color: gv.colors.textPrimary)),
        const SizedBox(height: GVSpacing.s8),
        ValueListenableBuilder<LoadState<List<PriceMoveView>>>(
          valueListenable: _vm.priceMovers,
          builder: (context, state, _) {
            if (state.loading) return const LinearProgressIndicator(minHeight: 2);
            final rows = state.data ?? const <PriceMoveView>[];
            if (rows.isEmpty) return const Text('No movers yet.');
            return Column(
              children: [
                for (final m in rows)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(m.name),
                    subtitle: Text(m.setCode),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('\$${m.current.toStringAsFixed(2)}'),
                        const SizedBox(width: GVSpacing.s8),
                        Icon(
                          m.deltaPct >= 0 ? Icons.trending_up : Icons.trending_down,
                          color: m.deltaPct >= 0 ? Colors.green : Colors.red,
                        ),
                        const SizedBox(width: 4),
                        Text('${m.deltaPct.toStringAsFixed(1)}%'),
                      ],
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}
