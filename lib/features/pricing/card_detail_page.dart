import 'package:flutter/material.dart';
import '../../widgets/big_card_image.dart';
import 'package:grookai_vault/widgets/fullscreen_image_viewer.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/tokens/radius.dart';
import 'package:grookai_vault/ui/widgets/condition_badge.dart';
import 'package:grookai_vault/services/supa_client.dart';
import 'package:grookai_vault/viewmodels/card_detail_vm.dart';
import 'package:grookai_vault/widgets/condition_chips.dart';
import 'package:grookai_vault/widgets/price_card.dart';
import 'package:grookai_vault/widgets/thunder_divider.dart';
import 'package:grookai_vault/widgets/add_to_vault_sheet.dart';
import 'package:grookai_vault/widgets/recent_sales_list.dart';
import 'package:grookai_vault/features/pricing/recent_sales_sheet.dart';
import 'package:grookai_vault/features/dev/diagnostics/pricing_health_chip.dart';
import 'package:grookai_vault/config/flags.dart';
import 'package:grookai_vault/services/listings_api.dart';

class CardDetailPage extends StatefulWidget {
  final Map row;
  const CardDetailPage({super.key, required this.row});
  @override
  State<CardDetailPage> createState() => _CardDetailPageState();
}

class _CardDetailPageState extends State<CardDetailPage> {
  CardDetailVM? vm;

  @override
  void initState() {
    super.initState();
    final id = (widget.row['id'] ?? widget.row['card_print_id'] ?? '').toString();
    final initialCond = (widget.row['condition_label'] ?? 'NM').toString();
    vm = CardDetailVM(supabase: sb, cardId: id, initialCondition: initialCond);
    vm!.addListener(() { if (mounted) setState(() {}); });
    WidgetsBinding.instance.addPostFrameCallback((_) { vm!.load(); });
  }

  @override
  void dispose() {
    vm?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final title = (widget.row['name'] ?? 'Card Detail').toString();
    final setCode = (widget.row['set_code'] ?? '').toString();
    final number = (widget.row['number'] ?? '').toString();
    final printId = (widget.row['card_print_id'] ?? widget.row['id'] ?? '').toString();
    final heroTag = 'card-img-$printId';
    final imageUrl = (widget.row['image_url'] ?? '').toString();

    return Scaffold(
      appBar: AppBar(
        title: Text(title, overflow: TextOverflow.ellipsis),
        actions: [
          if (gvEnvStage != 'prod')
            Padding(
              padding: const EdgeInsets.only(right: GVSpacing.s8),
              child: PricesAsOfChip(supabase: sb),
            ),
          // Quick Post-to-Wall (only shown if row has a vault_item_id)
          if ((widget.row['vault_item_id'] ?? '').toString().isNotEmpty)
            IconButton(
              tooltip: 'Post to Wall',
              icon: const Icon(Icons.campaign_outlined),
              onPressed: () => _showPostToWallSheet(context),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(GVSpacing.s16),
        children: [
          GestureDetector(
            onTap: imageUrl.isEmpty
                ? null
                : () {
                    Navigator.of(context).push(
                      PageRouteBuilder(
                        opaque: false,
                        pageBuilder: (_, __, ___) => FullScreenImageViewer(
                          imageUrl: imageUrl,
                          heroTag: heroTag,
                        ),
                      ),
                    );
                  },
            child: Hero(tag: heroTag, child: BigCardImage(row: widget.row)),
          ),
          const SizedBox(height: GVSpacing.s16),

          Builder(
            builder: (context) {
              final gv = GVTheme.of(context);
              return Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: gv.typography.title.copyWith(
                        fontWeight: FontWeight.w700,
                        color: gv.colors.textPrimary,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: GVSpacing.s8),
                  if ((widget.row['condition_label'] ?? '').toString().isNotEmpty)
                    ConditionBadge(
                      condition: (widget.row['condition_label'] ?? '').toString(),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: GVSpacing.s8),
          Text('$setCode - $number', style: Theme.of(context).textTheme.bodyMedium),

          const SizedBox(height: GVSpacing.s16),
          if (vm != null)
            ConditionChips(value: vm!.condition, onChanged: (c) { vm!.setCondition(c); }),

          const SizedBox(height: GVSpacing.s12),
          if (vm?.isLoading == true)
            const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
          else if (vm?.error != null)
            Text(vm!.error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
          else
            PriceCard(
              gi: vm?.giMid,
              ts: vm?.observedAt,
              retailFloor: vm?.retailFloor,
              marketFloor: vm?.marketFloor,
              gv: vm?.gvBaseline,
              trend: vm?.trend,
              pct7d: vm?.pct7d,
              age: vm?.age,
              sources: vm?.sources ?? const [],
            ),

          const SizedBox(height: GVSpacing.s12),
          const ThunderDivider(),
          const SizedBox(height: GVSpacing.s8),
          Text('Price by Condition', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: GVSpacing.s8),
          _PricesByCondition(vm: vm),

          const SizedBox(height: GVSpacing.s8),
          const ThunderDivider(),

          if ((vm?.age?.inHours ?? 0) > 24) ...[
            const SizedBox(height: GVSpacing.s8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.withValues(alpha: 0.25)),
              ),
              child: Row(children: [
                Icon(Icons.warning_amber_rounded, color: Theme.of(context).colorScheme.error, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text('Pricing is stale (>24h). Data will refresh automatically or when you reopen.', style: Theme.of(context).textTheme.bodySmall)),
              ]),
            ),
          ],

          const SizedBox(height: GVSpacing.s16),
          Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              tilePadding: EdgeInsets.zero,
              initiallyExpanded: false,
              title: Row(
                children: [
                  const Icon(Icons.history, size: 18),
                  const SizedBox(width: 6),
                  Text('Recent Sales (eBay)', style: Theme.of(context).textTheme.titleMedium),
                  const Spacer(),
                  TextButton(
                    onPressed: () {
                      final id = (widget.row['card_print_id'] ?? widget.row['id'] ?? '').toString();
                      final cond = vm?.condition ?? (widget.row['condition_label'] ?? 'NM').toString();
                      if (id.isEmpty) return;
                      RecentSalesSheet.show(context, cardId: id, condition: cond);
                    },
                    child: const Text('View all'),
                  ),
                ],
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: RecentSalesList(sales: vm?.sold5 ?? const []),
                ),
              ],
            ),
          ),

          const SizedBox(height: GVSpacing.s24),
          _InfoTile(label: 'Low / High', value: '${vm?.giLow?.toStringAsFixed(2) ?? '-'} / ${vm?.giHigh?.toStringAsFixed(2) ?? '-'}'),

          const SizedBox(height: GVSpacing.s24),
          FilledButton.icon(
            onPressed: () async {
              final user = sb.auth.currentUser;
              if (user == null) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sign in required')));
                return;
              }
              final res = await showAddToVaultSheet(context);
              if (res == null) return;
              try {
                await sb.from('user_vault').insert({
                  'user_id': user.id,
                  'card_id': (widget.row['card_print_id'] ?? widget.row['id'] ?? '').toString(),
                  'set_code': (widget.row['set_code'] ?? '').toString().toLowerCase(),
                  'number': (widget.row['number'] ?? '').toString(),
                  'qty': res.qty,
                  'condition_label': res.conditionLabel,
                  'notes': res.notes,
                  'acquired_price': vm?.giMid,
                  'source': 'app',
                });
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Added to Vault')));
              } catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Add failed: $e')));
              }
            },
            icon: const Icon(Icons.add),
            label: const Text('Add to Vault'),
          ),
        ],
      ),
    );
  }

  void _showPostToWallSheet(BuildContext context) {
    final vaultItemId = (widget.row['vault_item_id'] ?? '').toString();
    if (vaultItemId.isEmpty) return;
    final cond = (widget.row['condition_label'] ?? vm?.condition ?? 'NM').toString();
    final qtyCtl = TextEditingController(text: '1');
    final priceCtl = TextEditingController(text: ((vm?.giMid ?? 0.0) * 100).toInt().toString());
    final noteCtl = TextEditingController();
    bool useVaultImage = true;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Post to Public Wall', style: Theme.of(ctx).textTheme.titleMedium),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: TextField(controller: priceCtl, decoration: const InputDecoration(labelText: 'Price (cents)'), keyboardType: TextInputType.number)),
                const SizedBox(width: 12),
                SizedBox(width: 96, child: TextField(controller: qtyCtl, decoration: const InputDecoration(labelText: 'Qty'), keyboardType: TextInputType.number)),
              ]),
              const SizedBox(height: 8),
              Text('Condition: $cond'),
              const SizedBox(height: 8),
              TextField(controller: noteCtl, decoration: const InputDecoration(labelText: 'Note (optional)')),
              const SizedBox(height: 8),
              StatefulBuilder(builder: (ctx2, setSt) {
                return CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: useVaultImage,
                  onChanged: (v) => setSt(() => useVaultImage = v ?? true),
                  title: const Text('Use vault image'),
                );
              }),
              const SizedBox(height: 8),
              Row(
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(ctx).pop(),
                    child: const Text('Cancel'),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () async {
                      final qty = int.tryParse(qtyCtl.text.trim());
                      final price = int.tryParse(priceCtl.text.trim());
                      if (qty == null || qty <= 0 || price == null || price < 0) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid price and quantity')));
                        return;
                      }
                      try {
                        final api = GVListingsApi();
                        await api.postFromVault(
                          vaultItemId,
                          priceCents: price,
                          quantity: qty,
                          condition: cond,
                          note: noteCtl.text,
                          useVaultImage: useVaultImage,
                        );
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Posted to Wall')));
                        Navigator.of(ctx).pop();
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Post failed: $e')));
                      }
                    },
                    child: const Text('Post'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _InfoTile extends StatelessWidget {
  final String label;
  final String value;
  const _InfoTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final gv = GVTheme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: GVSpacing.s12,
        vertical: GVSpacing.s12,
      ),
      decoration: BoxDecoration(
        borderRadius: GVRadius.br12,
        color: Theme.of(
          context,
        ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: gv.typography.body.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          Text(value),
        ],
      ),
    );
  }
}

class _PricesByCondition extends StatelessWidget {
  final CardDetailVM? vm;
  const _PricesByCondition({required this.vm});
  @override
  Widget build(BuildContext context) {
    if (vm == null) return const SizedBox.shrink();
    final list = vm!.conditionsWithPrices();
    if (list.isEmpty) return const Text('No condition prices yet');
    return Column(
      children: list
          .map((e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    SizedBox(width: 64, child: Text(e.label, style: Theme.of(context).textTheme.bodyMedium)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(e.price, style: Theme.of(context).textTheme.bodyMedium),
                    ),
                    const SizedBox(width: 8),
                    Text(e.updated, style: Theme.of(context).textTheme.labelSmall),
                  ],
                ),
              ))
          .toList(),
    );
  }
}
