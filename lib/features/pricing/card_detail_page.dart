import 'package:flutter/material.dart';
import '../../widgets/big_card_image.dart';
import 'package:grookai_vault/ui/app/theme.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/tokens/radius.dart';
import 'package:grookai_vault/ui/widgets/condition_badge.dart';
import 'package:grookai_vault/services/supa_client.dart';
import 'package:grookai_vault/viewmodels/card_detail_vm.dart';
import 'package:grookai_vault/widgets/condition_chips.dart';
import 'package:grookai_vault/widgets/price_card.dart';

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

    return Scaffold(
      appBar: AppBar(title: Text(title, overflow: TextOverflow.ellipsis)),
      body: ListView(
        padding: const EdgeInsets.all(GVSpacing.s16),
        children: [
          BigCardImage(row: widget.row),
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
            ),

          const SizedBox(height: GVSpacing.s24),
          _InfoTile(label: 'Low / High', value: '${vm?.giLow?.toStringAsFixed(2) ?? '-'} / ${vm?.giHigh?.toStringAsFixed(2) ?? '-'}'),

          const SizedBox(height: GVSpacing.s24),
          FilledButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Add to Vault coming soon')),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Add to Vault'),
          ),
        ],
      ),
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
