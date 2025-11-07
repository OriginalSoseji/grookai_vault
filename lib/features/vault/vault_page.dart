import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/core/telemetry.dart';
import 'package:grookai_vault/features/vault/vault_vm.dart';
import 'package:grookai_vault/core/load_state.dart';
import 'package:grookai_vault/core/ui_contracts.dart';
import 'package:grookai_vault/core/event_bus.dart';
import 'package:grookai_vault/widgets/gv_image.dart';

class VaultPage extends StatefulWidget {
  const VaultPage({super.key});
  @override
  State<VaultPage> createState() => _VaultPageState();
}

class _VaultPageState extends State<VaultPage> {
  late final VaultVm _vm;
  VoidCallback? _busSub;

  @override
  void initState() {
    super.initState();
    _vm = VaultVm(Supabase.instance.client);
    _vm.load();
    Telemetry.log('vault_view');
    _busSub = () => _vm.reload();
    EventBus.vaultReloadTick.addListener(_busSub!);
  }

  @override
  void dispose() {
    if (_busSub != null) {
      EventBus.vaultReloadTick.removeListener(_busSub!);
      _busSub = null;
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(GVSpacing.s12),
          child: ValueListenableBuilder<LoadState<List<VaultItemView>>>(
            valueListenable: _vm.items,
            builder: (context, state, _) {
              if (state.loading) {
                return const LinearProgressIndicator(minHeight: 2);
              }
              final progress = _vm.progress;
              if (progress.isEmpty) {
                return Text(
                  'Master-set progress',
                  style: gv.typography.caption.copyWith(
                    color: gv.colors.textSecondary,
                  ),
                );
              }
              return SizedBox(
                height: 44,
                child: ListView.separated(
                  padding: const EdgeInsets.symmetric(
                    horizontal: GVSpacing.s12,
                  ),
                  scrollDirection: Axis.horizontal,
                  itemBuilder: (_, i) {
                    final m = progress[i];
                    final set = (m['setCode'] as String);
                    final pct = (m['percent'] as double).round();
                    final have = m['have'] as int;
                    final total = m['total'] as int;
                    return InputChip(
                      label: Text('$set • $pct% ($have/$total)'),
                      onPressed: () async {
                        Telemetry.log('vault_set_chip', {'set': set});
                        final supabase = Supabase.instance.client;
                        final navigator = Navigator.of(context);
                        final messenger = ScaffoldMessenger.of(context);
                        try {
                          final rows = await supabase
                              .from('master_sets')
                              .select('id,name')
                              .ilike('name', '$set%')
                              .limit(1);
                          final list = List<Map<String, dynamic>>.from(
                              (rows as List?) ?? const []);
                          if (list.isNotEmpty) {
                            final id = (list.first['id'] ?? '').toString();
                            final name = (list.first['name'] ?? set).toString();
                            if (!mounted) return;
                            navigator.pushNamed(
                              '/goal-detail',
                              arguments: {'id': id, 'name': name},
                            );
                          } else {
                            Telemetry.log('vault_set_chip_no_goal', {'set': set});
                            if (!mounted) return;
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('No goal found for this set yet'),
                              ),
                            );
                          }
                        } catch (_) {
                          if (!mounted) return;
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Unable to open goal'),
                            ),
                          );
                        }
                      },
                    );
                  },
                  separatorBuilder: (_, __) => const SizedBox(width: GVSpacing.s8),
                  itemCount: progress.length,
                ),
              );
            },
          ),
        ),
        Expanded(
          child: ValueListenableBuilder<LoadState<List<VaultItemView>>>(
            valueListenable: _vm.items,
            builder: (context, state, _) {
              if (state.loading) {
                return const Center(child: CircularProgressIndicator());
              }
              if (state.hasError) {
                return Center(child: Text(state.error ?? 'Error'));
              }
              final rows = state.data ?? const <VaultItemView>[];
              if (rows.isEmpty) {
                return const Center(child: Text('Your vault is empty.'));
              }
              return GridView.builder(
                padding: const EdgeInsets.all(GVSpacing.s8),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: GVSpacing.s8,
                  crossAxisSpacing: GVSpacing.s8,
                  childAspectRatio: 3 / 4,
                ),
                itemCount: rows.length,
                itemBuilder: (context, i) {
                  final v = rows[i];
                  return Card(
                    color: gv.colors.card,
                    child: InkWell(
                      onTap: () => Navigator.of(context).pushNamed(
                        '/card-detail',
                        arguments: {
                          'id': v.cardId,
                          'set_code': v.setCode,
                          'name': v.name,
                          'image_url': v.imageUrl,
                        },
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(GVSpacing.s8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: SizedBox.expand(
                                  child: GVImage(
                                    url: v.imageUrl,
                                    width: double.infinity,
                                    height: double.infinity,
                                    radius: BorderRadius.circular(8),
                                    fit: BoxFit.cover,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: GVSpacing.s8),
                            Text(
                              v.name,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: GVSpacing.s4),
                            Text(
                              v.setCode,
                              style: gv.typography.caption.copyWith(
                                color: gv.colors.textSecondary,
                              ),
                            ),
                            if (v.lastPrice != null)
                              Text(
                                '\$${v.lastPrice!.toStringAsFixed(2)}',
                                style: gv.typography.caption,
                              ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

