import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/features/search/search_vm.dart';
import 'package:grookai_vault/core/load_state.dart';
import 'package:grookai_vault/core/ui_contracts.dart';
import 'package:grookai_vault/widgets/gv_image.dart';

class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends State<SearchPage> {
  late final SearchVm _vm;
  final _q = TextEditingController();
  SearchMode _mode = SearchMode.all;
  final Set<String> _busy = <String>{};

  @override
  void initState() {
    super.initState();
    _vm = SearchVm(Supabase.instance.client);
    // ignore: avoid_print
    print('telemetry: search_open');
  }

  @override
  void dispose() {
    _vm.dispose();
    _q.dispose();
    super.dispose();
  }

  Widget _buildList(List<CardPrintView> rows, GVTheme gv) {
    if (rows.isEmpty) {
      return const Center(child: Text('Start searching…'));
    }
    return ListView.separated(
      itemCount: rows.length,
      separatorBuilder: (_, i) => const SizedBox(height: GVSpacing.s8),
      itemBuilder: (context, i) {
        final r = rows[i];
        final busy = _busy.contains(r.id);
        return Card(
          child: ListTile(
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            leading: SizedBox(
              width: 56,
              height: 56,
              child: GVImage(
                url: r.imageUrl,
                width: 56,
                height: 56,
                radius: BorderRadius.circular(8),
                fit: BoxFit.cover,
              ),
            ),
            title: Text(r.name),
            subtitle: Text('${r.setCode} · #${r.number}'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (r.lastPrice != null)
                  Text('4${r.lastPrice!.toStringAsFixed(2)}',
                      style: gv.typography.caption),
                const SizedBox(width: GVSpacing.s8),
                FilledButton(
                  onPressed: busy
                      ? null
                      : () async {
                          setState(() => _busy.add(r.id));
                          final ok = await _vm.importCard(r);
                          if (!mounted || !(context.mounted)) return;
                          setState(() => _busy.remove(r.id));
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(ok ? 'Added' : 'Failed')),
                          );
                        },
                  child: busy
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Add'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

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
      body: Padding(
        padding: const EdgeInsets.all(GVSpacing.s16),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _q,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(Icons.search),
                      hintText: 'Search cards or sets',
                    ),
                    onChanged: (s) => _vm.search(s, _mode),
                  ),
                ),
              ],
            ),
            const SizedBox(height: GVSpacing.s8),
            Align(
              alignment: Alignment.centerLeft,
              child: SegmentedButton<SearchMode>(
                segments: const [
                  ButtonSegment(
                    value: SearchMode.all,
                    icon: Icon(Icons.filter_alt),
                    label: Text('All'),
                  ),
                  ButtonSegment(
                    value: SearchMode.sets,
                    icon: Icon(Icons.view_module_outlined),
                    label: Text('Sets'),
                  ),
                  ButtonSegment(
                    value: SearchMode.prints,
                    icon: Icon(Icons.style_outlined),
                    label: Text('Prints'),
                  ),
                ],
                selected: {_mode},
                onSelectionChanged: (s) {
                  setState(() => _mode = s.first);
                  _vm.search(_q.text, _mode);
                },
              ),
            ),
            const SizedBox(height: GVSpacing.s16),
            Expanded(
              child: ValueListenableBuilder<LoadState<List<CardPrintView>>>(
                valueListenable: _vm.items,
                builder: (context, state, _) {
                  if (state.loading) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (state.hasError) {
                    return Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(state.error ?? 'Error'),
                          const SizedBox(height: GVSpacing.s8),
                          OutlinedButton(
                            onPressed: () => _vm.search(_q.text, _mode),
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    );
                  }
                  final rows = state.data ?? const <CardPrintView>[];
                  return _buildList(rows, gv);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

