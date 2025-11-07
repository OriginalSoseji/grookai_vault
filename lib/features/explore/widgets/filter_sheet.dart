import 'package:flutter/material.dart';

class ExploreFilters {
  final List<String> conditions;
  final int? minPriceCents;
  final int? maxPriceCents;
  final String? q;
  const ExploreFilters({this.conditions = const [], this.minPriceCents, this.maxPriceCents, this.q});
}

class FilterSheet extends StatefulWidget {
  final ExploreFilters initial;
  final void Function(ExploreFilters) onApply;
  const FilterSheet({super.key, required this.initial, required this.onApply});

  static Future<void> show(BuildContext context, {required ExploreFilters initial, required void Function(ExploreFilters) onApply}) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
        child: FilterSheet(initial: initial, onApply: onApply),
      ),
    );
  }

  @override
  State<FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<FilterSheet> {
  late List<String> _conds;
  RangeValues _range = const RangeValues(0, 500);
  late TextEditingController _q;

  static const _condOptions = ['NM','LP','MP','HP','DMG','PSA','BGS','CGC'];

  @override
  void initState() {
    super.initState();
    _conds = List<String>.from(widget.initial.conditions);
    final min = (widget.initial.minPriceCents ?? 0) / 100.0;
    final max = (widget.initial.maxPriceCents ?? 50000) / 100.0;
    _range = RangeValues(min.clamp(0, 500), (max / 100.0).clamp(0, 500));
    _q = TextEditingController(text: widget.initial.q ?? '');
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('Filters', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const Spacer(),
                TextButton(onPressed: () => Navigator.of(context).maybePop(), child: const Text('Close')),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in _condOptions)
                  FilterChip(
                    label: Text(c),
                    selected: _conds.contains(c),
                    onSelected: (v) => setState(() {
                      if (v) { _conds.add(c); } else { _conds.remove(c); }
                    }),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            const Text('Price range (USD)'),
            RangeSlider(
              values: _range,
              max: 500,
              divisions: 100,
              onChanged: (v) => setState(() => _range = v),
            ),
            TextField(
              controller: _q,
              decoration: const InputDecoration(
                labelText: 'Search',
                hintText: 'Name, set code, number',
              ),
            ),
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(
                onPressed: () {
                  widget.onApply(ExploreFilters(
                    conditions: _conds,
                    minPriceCents: (_range.start * 100).round(),
                    maxPriceCents: (_range.end * 100).round(),
                    q: _q.text.trim().isEmpty ? null : _q.text.trim(),
                  ));
                  Navigator.of(context).maybePop();
                },
                child: const Text('Apply'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

