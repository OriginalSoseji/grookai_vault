import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/gvvi/vendor_pricing_workspace_service.dart';
import '../../services/vault/copy_cost_review_service.dart';

enum _ReviewFilter {
  attention,
  missingAmount,
  missingCurrency,
  known,
  unavailable,
  all,
}

class CopyCostReviewScreen extends StatefulWidget {
  const CopyCostReviewScreen({
    super.key,
    required this.service,
    required this.copies,
    required this.onEdit,
  });
  final CopyCostReviewService service;
  final List<VendorPricingWorkspaceRow> copies;
  final Future<void> Function(VendorPricingWorkspaceRow) onEdit;
  @override
  State<CopyCostReviewScreen> createState() => _CopyCostReviewScreenState();
}

class _CopyCostReviewScreenState extends State<CopyCostReviewScreen> {
  late final List<VendorPricingWorkspaceRow> _copies;
  late final StreamSubscription<void> _account;
  final _search = TextEditingController();
  List<CopyCostReviewRow>? _result;
  _ReviewFilter _filter = _ReviewFilter.attention;
  int _generation = 0;
  bool _closed = false, _loading = true, _editing = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _copies = List.unmodifiable(widget.copies);
    _account = widget.service.accountChanges.listen((_) {
      if (!mounted) return;
      _generation++;
      setState(() {
        _closed = true;
        _result = null;
      });
      _search.clear();
    });
    unawaited(_load());
  }

  @override
  void dispose() {
    _generation++;
    unawaited(_account.cancel());
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_closed) return;
    final request = ++_generation;
    setState(() {
      _loading = true;
      _result = null;
      _error = null;
    });
    try {
      final result = await widget.service.read(
        _copies.map((copy) => copy.instanceId),
        isCurrent: () => mounted && !_closed && request == _generation,
      );
      if (!mounted || _closed || request != _generation) return;
      setState(() {
        _result = result;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || _closed || request != _generation) return;
      setState(() {
        _loading = false;
        _error = 'Costs could not load. Your copies are unchanged. Try again.';
      });
    }
  }

  Future<void> _edit(VendorPricingWorkspaceRow copy) async {
    if (_closed || _editing) return;
    try {
      widget.service.checkOwner();
      setState(() {
        _editing = true;
      });
      await widget.onEdit(copy);
      if (mounted && !_closed) await _load();
    } catch (_) {
      if (mounted && !_closed) {
        setState(() {
          _result = null;
          _error = 'Cost review could not continue. Refresh to try again.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _editing = false;
        });
      }
    }
  }

  bool _matches(CopyCostReviewRow row) => switch (_filter) {
    _ReviewFilter.attention => row.needsAttention,
    _ReviewFilter.missingAmount =>
      row.state == CopyCostReviewState.missingAmount,
    _ReviewFilter.missingCurrency =>
      row.state == CopyCostReviewState.missingCurrency,
    _ReviewFilter.known => row.state == CopyCostReviewState.known,
    _ReviewFilter.unavailable => row.state == CopyCostReviewState.unavailable,
    _ReviewFilter.all => true,
  };
  @override
  Widget build(BuildContext context) {
    final byId = {
      for (final copy in _copies) copy.instanceId.toLowerCase(): copy,
    };
    final query = _search.text.trim().toLowerCase();
    final result = _result;
    final shown =
        result?.where((row) {
          final copy = byId[row.instanceId]!;
          return _matches(row) &&
              (query.isEmpty ||
                  [
                    copy.displayName,
                    copy.gvviId,
                    copy.setName ?? '',
                    copy.number,
                    copy.printingLabel,
                  ].any((value) => value.toLowerCase().contains(query)));
        }).toList() ??
        <CopyCostReviewRow>[];
    final known =
        result?.where((row) => row.state == CopyCostReviewState.known).length ??
        0;
    final attention = result?.where((row) => row.needsAttention).length ?? 0;
    final unavailable =
        result
            ?.where((row) => row.state == CopyCostReviewState.unavailable)
            .length ??
        0;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Review private costs'),
        actions: [
          if (!_closed)
            IconButton(
              tooltip: 'Refresh cost review',
              onPressed: _loading || _editing ? null : _load,
              icon: const Icon(Icons.refresh),
            ),
        ],
      ),
      body: _closed
          ? const Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Your account changed. Reopen Inventory to review private costs.',
                ),
              ),
            )
          : CustomScrollView(
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Review the card copies included by your Inventory search and filters. Sealed products are separate.',
                        ),
                        const SizedBox(height: 12),
                        if (_loading) const LinearProgressIndicator(),
                        if (_error != null) ...[
                          Text(_error!, key: const Key('cost_review_error')),
                          TextButton(
                            onPressed: _load,
                            child: const Text('Try again'),
                          ),
                        ],
                        if (result != null) ...[
                          Text(
                            '$known of ${result.length} ${result.length == 1 ? 'included copy has' : 'included copies have'} a recorded cost and currency.',
                            key: const Key('cost_review_coverage'),
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Needs cost review: $attention · Unavailable: $unavailable',
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Zero is a known cost. Currencies stay as recorded. Editing a copy does not change earlier sale profit.',
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _search,
                            onChanged: (_) => setState(() {}),
                            decoration: const InputDecoration(
                              labelText: 'Find an included copy',
                              prefixIcon: Icon(Icons.search),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              for (final filter in _ReviewFilter.values)
                                ChoiceChip(
                                  key: Key('cost_review_filter_${filter.name}'),
                                  label: Text(switch (filter) {
                                    _ReviewFilter.attention =>
                                      'Needs attention',
                                    _ReviewFilter.missingAmount =>
                                      'Cost unknown',
                                    _ReviewFilter.missingCurrency =>
                                      'Currency needed',
                                    _ReviewFilter.known => 'Recorded',
                                    _ReviewFilter.unavailable => 'Unavailable',
                                    _ReviewFilter.all => 'All included',
                                  }),
                                  selected: _filter == filter,
                                  onSelected: (_) => setState(() {
                                    _filter = filter;
                                  }),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (shown.isEmpty)
                            Text(
                              result.isEmpty
                                  ? 'No copies were included. Return to Inventory and choose copies to review.'
                                  : 'No included copies match this filter.',
                            ),
                        ],
                      ],
                    ),
                  ),
                ),
                SliverList.builder(
                  itemCount: shown.length,
                  itemBuilder: (context, index) {
                    final row = shown[index],
                        copy = byId[shown[index].instanceId]!;
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                copy.displayName,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Text(
                                [
                                  copy.setName,
                                  copy.number,
                                  copy.printingLabel,
                                  copy.conditionLabel,
                                ].whereType<String>().join(' · '),
                              ),
                              Text(copy.gvviId),
                              const SizedBox(height: 8),
                              Text(
                                row.label,
                                key: Key('cost_review_state_${row.instanceId}'),
                              ),
                              if (row.state ==
                                      CopyCostReviewState.missingCurrency &&
                                  row.cost?.amount != null)
                                Text('Recorded amount: ${row.cost!.amount}'),
                              if (row.state != CopyCostReviewState.unavailable)
                                TextButton.icon(
                                  key: Key(
                                    'cost_review_edit_${row.instanceId}',
                                  ),
                                  onPressed: _editing
                                      ? null
                                      : () => _edit(copy),
                                  icon: const Icon(Icons.edit_outlined),
                                  label: const Text('Review cost'),
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
    );
  }
}
