import 'dart:async';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:grookai_vault/services/search_gateway.dart';
import 'package:grookai_vault/services/cards_query_parser.dart';
import 'package:grookai_vault/services/cards_service.dart';
import 'package:grookai_vault/services/prices_repository.dart';
import 'package:grookai_vault/ui/tokens/spacing.dart';
import 'package:grookai_vault/ui/widgets/list_cell.dart';
import 'package:grookai_vault/ui/widgets/price_chip.dart';
import 'package:grookai_vault/widgets/thumb_from_row.dart';

class UnifiedSearchInline extends StatefulWidget {
  const UnifiedSearchInline({super.key});
  @override
  State<UnifiedSearchInline> createState() => _UnifiedSearchInlineState();
}

class _UnifiedSearchInlineState extends State<UnifiedSearchInline> {
  final _gateway = SearchGateway();
  final _q = TextEditingController();
  Timer? _debounce;
  bool _loading = false;
  List<Map<String, dynamic>> _rows = const [];

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  void _onChanged(String s) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () => _issue(s));
  }

  Future<void> _issue(String raw) async {
    final q = raw.trim();
    if (q.isEmpty) {
      setState(() => _rows = const []);
      return;
    }
    setState(() => _loading = true);
    try {
      // Number-aware parsing
      final parsed = parseQuery(q);
      List<Map<String, dynamic>> r;
      if ((parsed.setCode ?? '').isNotEmpty && (parsed.collectorNumber ?? '').isNotEmpty) {
        r = await CardsService().searchBySetAndNumber(parsed.setCode!, parsed.collectorNumber!, total: parsed.totalInSet);
        if (r.isEmpty) {
          r = await _gateway.search(q);
        }
      } else if ((parsed.collectorNumber ?? '').isNotEmpty && (parsed.name ?? '').isNotEmpty) {
        r = await CardsService().searchByNameAndNumber(parsed.name!, parsed.collectorNumber!, total: parsed.totalInSet);
        if (r.isEmpty) {
          // Fallback to legacy gateway if DB returns nothing
          r = await _gateway.search(q);
        }
      } else if ((parsed.collectorNumber ?? '').isNotEmpty) {
        r = await CardsService().searchByNumberOnly(parsed.collectorNumber!, total: parsed.totalInSet);
        if (r.isEmpty) {
          r = await _gateway.search(q);
        }
      } else {
        r = await _gateway.search(q);
      }
      if (!mounted) return;
      setState(() => _rows = r);
      // Attach prices asynchronously (no blocking)
      await _attachPricesAsync();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _attachPricesAsync() async {
    final ids = _rows
        .map((r) => (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString())
        .where((s) => s.isNotEmpty)
        .toList();
    if (ids.isEmpty) return;
    final repo = PricesRepository(Supabase.instance.client);
    const groupSize = 60;
    for (var i = 0; i < ids.length; i += groupSize) {
      final group = ids.sublist(i, i + groupSize > ids.length ? ids.length : i + groupSize);
      final subRows = _rows.where((r) {
        final id = (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString();
        return group.contains(id);
      }).toList();
      final mergedSubset = await repo.attachPricesToRows(subRows);
      if (!mounted) return;
      final byId = {
        for (final r in mergedSubset)
          (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString(): r,
      };
      final merged = _rows.map((r) {
        final id = (r['id'] ?? r['card_id'] ?? r['print_id'] ?? '').toString();
        return byId[id] ?? r;
      }).toList();
      setState(() => _rows = merged);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            GVSpacing.s16,
            GVSpacing.s12,
            GVSpacing.s16,
            GVSpacing.s8,
          ),
          child: TextField(
            controller: _q,
            onChanged: _onChanged,
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.search),
              hintText: 'Search cards or sets',
            ),
          ),
        ),
        if (_loading) const LinearProgressIndicator(minHeight: 2),
        Expanded(
          child: ListView.builder(
            itemCount: _rows.length,
            itemBuilder: (context, i) {
              final r = _rows[i];
              final title = (r['name'] ?? 'Card').toString();
              final setCode = (r['set_code'] ?? '').toString();
              final number = (r['number'] ?? '').toString();
              final priceMid = (r['price_mid'] ?? '').toString();
              final currency = (r['currency'] ?? 'USD').toString();
              final sub = [
                if (setCode.isNotEmpty) setCode,
                if (number.isNotEmpty) number,
              ].join(' • ');
              return Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: GVSpacing.s8,
                  vertical: GVSpacing.s4,
                ),
                child: ListCell(
                  leading: thumbFromRow(r, size: 44),
                  title: Text(title),
                  subtitle: Text(sub),
                  trailing: priceMid.isEmpty
                      ? null
                      : PriceChip(label: (currency == 'USD' ? '\$' : '') + priceMid),
                  onTap: () {
                    Navigator.of(context).pushNamed('/card-detail', arguments: r);
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
