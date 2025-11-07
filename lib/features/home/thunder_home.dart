import 'package:flutter/material.dart';
import 'package:grookai_vault/theme/thunder_palette.dart';
import 'package:grookai_vault/widgets/thunder_divider.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/features/home/home_vm.dart';
import 'package:grookai_vault/core/load_state.dart';
import 'package:grookai_vault/ui/app/route_names.dart';
import 'package:grookai_vault/core/ui_contracts.dart';

class ThunderHome extends StatefulWidget {
  const ThunderHome({super.key});
  @override
  State<ThunderHome> createState() => _ThunderHomeState();
}

class _ThunderHomeState extends State<ThunderHome> {
  late final HomeVm _vm;
  List<Map<String, dynamic>> _activity = const [];
  bool _loadingActivity = false;

  @override
  void initState() {
    super.initState();
    _vm = HomeVm(Supabase.instance.client);
    _vm.load();
    _loadActivity();
  }

  Future<void> _loadActivity() async {
    setState(() => _loadingActivity = true);
    try {
      final data = await Supabase.instance.client
          .from('scan_events')
          .select('ts, meta')
          .order('ts', ascending: false)
          .limit(5);
      setState(() => _activity = List<Map<String, dynamic>>.from((data as List?) ?? const []));
    } catch (_) {
      setState(() => _activity = const []);
    } finally {
      if (mounted) setState(() => _loadingActivity = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Thunder.base,
      child: SafeArea(
        top: true,
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.all(GVSpacing.s16),
        children: [
          const _SectionTitle('Market Movers'),
          const SizedBox(height: GVSpacing.s8),
          ValueListenableBuilder<LoadState<List<PriceMoveView>>>(
            valueListenable: _vm.priceMovers,
            builder: (context, state, _) {
              final rows = state.data ?? const <PriceMoveView>[];
              if (rows.isEmpty) return const _CardRow();
              final top = rows.take(3).toList();
              return Row(
                children: [
                  for (var i = 0; i < top.length; i++) ...[
                    Expanded(child: _MoverCard(m: top[i])),
                    if (i < top.length - 1) const SizedBox(width: GVSpacing.s8),
                  ],
                ],
              );
            },
          ),
          const SizedBox(height: GVSpacing.s16),
          const ThunderDivider(),
          const SizedBox(height: GVSpacing.s16),
          _SectionTitle('Your Activity',
              trailing: TextButton(
                onPressed: () => Navigator.of(context).pushNamed(RouteNames.scanHistory),
                child: const Text('See all', style: TextStyle(color: Thunder.muted)),
              )),
          const SizedBox(height: GVSpacing.s8),
          if (_loadingActivity)
            const _PlaceholderCard()
          else if (_activity.isEmpty)
            const _MutedText('No recent scans')
          else
            Column(
              children: [
                for (final r in _activity)
                  Padding(
                    padding: const EdgeInsets.only(bottom: GVSpacing.s8),
                    child: _ActivityTile(row: r),
                  ),
              ],
            ),
          const SizedBox(height: GVSpacing.s16),
          const ThunderDivider(),
          const SizedBox(height: GVSpacing.s16),
          _SectionTitle('Public Wall Highlights',
              trailing: TextButton(
                onPressed: () => Navigator.of(context).pushNamed(RouteNames.wallFeed),
                child: const Text('See all', style: TextStyle(color: Thunder.muted)),
              )),
          const SizedBox(height: GVSpacing.s8),
          ValueListenableBuilder<LoadState<List<Map<String, dynamic>>>>(
            valueListenable: _vm.wallItems,
            builder: (context, st, _) {
              final list = st.data ?? const <Map<String, dynamic>>[];
              if (list.isEmpty) return const _GridMosaic();
              final items = list.take(6).toList();
              return GridView.count(
                physics: const NeverScrollableScrollPhysics(),
                shrinkWrap: true,
                crossAxisCount: 3,
                crossAxisSpacing: GVSpacing.s8,
                mainAxisSpacing: GVSpacing.s8,
                children: [
                  for (final it in items)
                    InkWell(
                      onTap: () => Navigator.of(context).pushNamed('/wall-post', arguments: {
                        'id': (it['id'] ?? '').toString(),
                      }),
                      child: Container(
                        decoration: BoxDecoration(color: Thunder.surfaceAlt, borderRadius: BorderRadius.circular(10)),
                        padding: const EdgeInsets.all(8),
                        child: Align(
                          alignment: Alignment.bottomLeft,
                          child: Text(
                            (it['title'] ?? 'Post').toString(),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Thunder.muted, fontSize: 11),
                          ),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: GVSpacing.s16),
          Card(
            color: Thunder.surface,
            child: ListTile(
              leading: const Icon(Icons.explore, color: Thunder.accent),
              title: const Text('Discover', style: TextStyle(color: Thunder.onSurface)),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16, color: Thunder.onSurface),
              onTap: () => Navigator.of(context).pushNamed(RouteNames.discover),
            ),
          ),
        ],
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  final Widget? trailing;
  const _SectionTitle(this.text, {this.trailing});
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(text,
              style: const TextStyle(
                  color: Thunder.onSurface,
                  fontWeight: FontWeight.w700,
                  fontSize: 18)),
        ),
        if (trailing != null) trailing!,
      ],
    );
  }
}

class _CardRow extends StatelessWidget {
  const _CardRow();
  @override
  Widget build(BuildContext context) {
    return Row(
      children: const [
        Expanded(child: _PlaceholderCard()),
        SizedBox(width: GVSpacing.s8),
        Expanded(child: _PlaceholderCard()),
        SizedBox(width: GVSpacing.s8),
        Expanded(child: _PlaceholderCard()),
      ],
    );
  }
}

class _PlaceholderCard extends StatelessWidget {
  const _PlaceholderCard();
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(color: Thunder.surface, borderRadius: BorderRadius.circular(12), boxShadow: const [
        BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4)),
      ]),
      padding: const EdgeInsets.all(GVSpacing.s12),
      height: 92,
      child: const Align(
        alignment: Alignment.centerLeft,
        child: Text('Coming soon', style: TextStyle(color: Thunder.muted)),
      ),
    );
  }
}

class _GridMosaic extends StatelessWidget {
  const _GridMosaic();
  @override
  Widget build(BuildContext context) {
    return GridView.count(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      crossAxisCount: 3,
      crossAxisSpacing: GVSpacing.s8,
      mainAxisSpacing: GVSpacing.s8,
      children: List.generate(6, (i) => Container(
        decoration: BoxDecoration(color: Thunder.surfaceAlt, borderRadius: BorderRadius.circular(10)),
      )),
    );
  }
}

class _MoverCard extends StatelessWidget {
  final PriceMoveView m;
  const _MoverCard({required this.m});
  @override
  Widget build(BuildContext context) {
    final up = m.deltaPct >= 0;
    return Container(
      decoration: BoxDecoration(color: Thunder.surface, borderRadius: BorderRadius.circular(12), boxShadow: const [
        BoxShadow(color: Colors.black26, blurRadius: 10, offset: Offset(0, 4)),
      ]),
      padding: const EdgeInsets.all(GVSpacing.s12),
      height: 92,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(m.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Thunder.onSurface)),
          const SizedBox(height: 4),
          Text(m.setCode, style: const TextStyle(color: Thunder.muted, fontSize: 12)),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: Text(
                  '\$${m.current.toStringAsFixed(2)}',
                  style: const TextStyle(color: Thunder.onSurface, fontWeight: FontWeight.w700),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 56),
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Row(
                    children: [
                      Icon(up ? Icons.trending_up : Icons.trending_down, size: 16, color: up ? Colors.greenAccent : Colors.redAccent),
                      const SizedBox(width: 4),
                      Text('${m.deltaPct.toStringAsFixed(1)}%', style: TextStyle(color: up ? Colors.greenAccent : Colors.redAccent)),
                    ],
                  ),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  final Map<String, dynamic> row;
  const _ActivityTile({required this.row});
  @override
  Widget build(BuildContext context) {
    final meta = Map<String, dynamic>.from(row['meta'] ?? {});
    final conf = (meta['best_confidence'] ?? 0).toString();
    final ts = (row['ts'] ?? '').toString();
    return Container(
      decoration: BoxDecoration(color: Thunder.surface, borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.all(GVSpacing.s12),
      child: Row(
        children: [
          const Icon(Icons.camera_alt, color: Thunder.muted),
          const SizedBox(width: GVSpacing.s12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Scan confidence $conf%', style: const TextStyle(color: Thunder.onSurface)),
              const SizedBox(height: 2),
              Text(ts, style: const TextStyle(color: Thunder.muted, fontSize: 12)),
            ]),
          ),
        ],
      ),
    );
  }
}

class _MutedText extends StatelessWidget {
  final String text;
  const _MutedText(this.text);
  @override
  Widget build(BuildContext context) => Text(text, style: const TextStyle(color: Thunder.muted));
}

