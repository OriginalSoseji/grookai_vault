import "package:flutter/material.dart";
import "package:intl/intl.dart";
import "../data/pricing_api.dart";
import "../models/price_option.dart";

class PriceTiersSheet extends StatefulWidget {
  final PricingApi api;
  final String vaultItemId;
  final String cardId;
  const PriceTiersSheet({super.key, required this.api, required this.vaultItemId, required this.cardId});

  @override
  State<PriceTiersSheet> createState() => _PriceTiersSheetState();
}

class _PriceTiersSheetState extends State<PriceTiersSheet> {
  late Future<(bool, List<PriceOption>)> _future;
  final _fmt = NumberFormat.currency(locale: "en_US", symbol: r"$");

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<(bool, List<PriceOption>)> _load() async {
    final flag = await widget.api.allowClientConditionEdits();
    final tiers = await widget.api.getAllPricesForCard(widget.cardId);
    tiers.sort((a, b) {
      const rank = {"graded": 0, "condition": 1, "derived": 2, "base": 3};
      return (rank[a.type] ?? 9).compareTo((rank[b.type] ?? 9));
    });
    return (flag, tiers);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<(bool, List<PriceOption>)>(
      future: _future,
      builder: (context, snap) {
        if (!snap.hasData) {
          return const SizedBox(height: 280, child: Center(child: CircularProgressIndicator()));
        }
        final (flag, tiers) = snap.data!;
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(height: 4, width: 40, decoration: BoxDecoration(color: Colors.grey[400], borderRadius: BorderRadius.circular(999))),
                const SizedBox(height: 12),
                Text("Price tiers", style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: tiers.length,
                    separatorBuilder: (context, _) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final t = tiers[i];
                      final price = t.price != null ? _fmt.format(t.price) : "—";
                      return ListTile(
                        dense: true,
                        title: Text("${t.type}${t.detail != null ? " - ${t.detail}" : ""}"),
                        subtitle: Text("source: ${t.source ?? "—"}"),
                        trailing: Text(price, style: const TextStyle(fontWeight: FontWeight.w600)),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
                flag ? _ConditionChanger(
                  onPick: (label, maybePrice) async {
                    await widget.api.setItemCondition(
                      vaultItemId: widget.vaultItemId,
                      conditionLabel: label,
                      cardId: widget.cardId,
                      marketPrice: maybePrice,
                    );
                    if (!context.mounted) return;
                    Navigator.pop(context, true);
                  },
                ) : const Text("Manual condition edits are disabled", style: TextStyle(color: Colors.grey)),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _ConditionChanger extends StatefulWidget {
  final Future<void> Function(String label, double? price) onPick;
  const _ConditionChanger({required this.onPick});

  @override
  State<_ConditionChanger> createState() => _ConditionChangerState();
}

class _ConditionChangerState extends State<_ConditionChanger> {
  String _label = "LP";
  final _priceCtrl = TextEditingController();

  @override
  void dispose() { _priceCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 6),
        Row(
          children: [
            const Text("Set condition:"),
            const SizedBox(width: 10),
            DropdownButton<String>(
              value: _label,
              items: const ["NM", "LP", "MP", "HP", "DMG"]
                  .map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => _label = v!),
            ),
            const Spacer(),
            SizedBox(
              width: 120,
              child: TextField(
                controller: _priceCtrl,
                decoration: const InputDecoration(hintText: "price (opt)", isDense: true),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            onPressed: () async {
              final text = _priceCtrl.text.trim();
              final p = text.isEmpty ? null : double.tryParse(text);
              await widget.onPick(_label, p);
            },
            child: const Text("Save"),
          ),
        ),
      ],
    );
  }
}



