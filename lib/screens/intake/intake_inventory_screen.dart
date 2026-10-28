part of 'intake_screens.dart';

class IntakeInventoryScreen extends StatefulWidget {
  const IntakeInventoryScreen({super.key, required this.service, this.lot});
  final IntakeService service;
  final PurchaseLot? lot;
  @override
  State<IntakeInventoryScreen> createState() => _IntakeInventoryState();
}

class _IntakeInventoryState extends State<IntakeInventoryScreen> {
  final tag = TextEditingController();
  DateTimeRange? dates;
  bool purchaseDates = false;
  PurchaseLot? lot;
  List<Map<String, dynamic>> copies = [];
  Map<String, CardSurfacePricingData> market = {};
  bool busy = true;
  String? error;
  @override
  void initState() {
    super.initState();
    lot = widget.lot;
    unawaited(load());
  }

  @override
  void dispose() {
    tag.dispose();
    super.dispose();
  }

  Future<void> load() async {
    setState(() => busy = true);
    try {
      final result = await widget.service.copies({
        if (lot != null) 'lot_id': lot!.id,
        if (tag.text.trim().isNotEmpty) 'tag': tag.text.trim(),
        if (dates != null) ...{
          if (purchaseDates) 'purchased_from': intakeDate(dates!.start),
          if (purchaseDates) 'purchased_to': intakeDate(dates!.end),
          if (!purchaseDates)
            'added_from': dates!.start.toUtc().toIso8601String(),
          if (!purchaseDates)
            'added_to': DateTime(
              dates!.end.year,
              dates!.end.month,
              dates!.end.day + 1,
            ).toUtc().toIso8601String(),
        },
      });
      copies = (result['copies'] as List)
          .map((r) => Map<String, dynamic>.from(r as Map))
          .toList();
      if (result['lot'] != null) {
        lot = PurchaseLot.fromJson(
          Map<String, dynamic>.from(result['lot'] as Map),
        );
      }
      error = null;
      try {
        market = await CardSurfacePricingService.fetchByCardPrintIds(
          client: widget.service.client,
          cardPrintIds: copies
              .where((c) => c['archived_at'] == null)
              .map((c) => c['card_print_id'] as String),
        );
      } catch (_) {
        market = {};
      }
    } catch (e) {
      error = e.toString();
    }
    if (context.mounted) setState(() => busy = false);
  }

  Widget metrics() {
    final currency = lot?.currency ?? 'USD';
    final sold = copies.where((c) => c['sale_price_amount'] != null).toList();
    final comparable = sold
        .where(
          (c) =>
              c['sale_price_currency'] == currency &&
              c['acquisition_currency'] == currency &&
              c['acquisition_cost'] != null,
        )
        .toList();
    double sum(Iterable<Map<String, dynamic>> rows, String key) =>
        rows.fold<double>(0, (n, c) => n + ((c[key] as num?)?.toDouble() ?? 0));
    final proceeds = sum(
      sold.where((c) => c['sale_price_currency'] == currency),
      'sale_price_amount',
    );
    final fees = sum(
      sold.where((c) => c['sale_price_currency'] == currency),
      'selling_expenses_amount',
    );
    final realized =
        sum(comparable, 'sale_price_amount') -
        sum(comparable, 'selling_expenses_amount') -
        sum(comparable, 'acquisition_cost');
    final unsold = copies.where((c) => c['archived_at'] == null).toList();
    final valued = unsold
        .where((c) => market[c['card_print_id']]?.visibleValue != null)
        .toList();
    final estimate = valued.fold<double>(
      0,
      (n, c) => n + market[c['card_print_id']]!.visibleValue!,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (lot != null) ...[
          Text(
            'Paid ${intakeMoney(lot!.totalCostCents, currency)} · Reserve ${intakeMoney(lot!.totalCostCents == null ? null : lot!.reserveCents, currency)}',
          ),
          Text(
            'Purchased ${intakeDate(lot!.purchasedOn)}${lot!.source.isEmpty ? '' : ' · ${lot!.source}'}',
          ),
          if (lot!.notes.isNotEmpty) Text(lot!.notes),
        ],
        Text(
          '${copies.length} copies · ${unsold.length} active · ${sold.length} sold',
        ),
        Text(
          'Recorded sale proceeds: $currency ${proceeds.toStringAsFixed(2)} · Expenses ${fees.toStringAsFixed(2)}',
        ),
        Text(
          'Realized profit: $currency ${realized.toStringAsFixed(2)} on ${comparable.length} sold copies with known, matching-currency costs',
        ),
        if (comparable.length < sold.length)
          Text(
            '${sold.length - comparable.length} sold copies excluded from profit: missing costs or different currencies.',
          ),
        Text(
          'Unsold market estimate: USD ${estimate.toStringAsFixed(2)} · ${valued.length}/${unsold.length} copies valued (parent reference; finish and condition may differ)',
        ),
        if (copies.length == 10000)
          const Text(
            'Showing the first 10,000 copies. Narrow your date/tag filter.',
          ),
      ],
    );
  }

  Future<void> action(Map<String, dynamic> copy) async {
    final kind = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(title: Text(copy['name'] as String)),
            ListTile(
              title: const Text('Revise intake cost'),
              subtitle: const Text(
                'Requires a reason; sold copy costs are locked.',
              ),
              onTap: () => Navigator.pop(ctx, 'cost'),
            ),
            ListTile(
              title: const Text('Record sale & selling expenses'),
              onTap: () => Navigator.pop(ctx, 'sale'),
            ),
          ],
        ),
      ),
    );
    if (kind == null || !mounted) return;
    final amount = TextEditingController(
      text: kind == 'cost'
          ? ((copy['acquisition_cost'] as num?)?.toStringAsFixed(2) ?? '')
          : '',
    );
    final expenses = TextEditingController(text: '0.00');
    final reason = TextEditingController();
    var currency =
        copy['acquisition_currency'] as String? ?? lot?.currency ?? 'USD';
    DateTime soldOn = DateTime.now();
    final requestId = newIntakeId();
    bool saving = false;
    await showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => PopScope(
          canPop: !saving,
          child: AlertDialog(
            title: Text(
              kind == 'cost' ? 'Revise intake cost' : 'Record actual sale',
            ),
            content: SizedBox(
              width: 400,
              child: SingleChildScrollView(
                child: AbsorbPointer(
                  absorbing: saving,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('${copy['name']} · ${copy['gv_vi_id']}'),
                      const SizedBox(height: 12),
                      _field(
                        amount,
                        kind == 'cost'
                            ? 'New intake cost (blank = unknown)'
                            : 'Actual sale amount',
                        money: true,
                      ),
                      if (kind == 'sale') ...[
                        _field(
                          expenses,
                          'Selling fees / shipping expense',
                          money: true,
                        ),
                        DropdownButtonFormField<String>(
                          initialValue: currency,
                          items: intakeCurrencies
                              .map(
                                (c) =>
                                    DropdownMenuItem(value: c, child: Text(c)),
                              )
                              .toList(),
                          onChanged: (v) => currency = v!,
                        ),
                        ListTile(
                          title: Text('Sold ${intakeDate(soldOn)}'),
                          onTap: () async {
                            final d = await showDatePicker(
                              context: ctx,
                              initialDate: soldOn,
                              firstDate: DateTime(1900),
                              lastDate: DateTime.now().add(
                                const Duration(days: 1),
                              ),
                            );
                            if (d != null) set(() => soldOn = d);
                          },
                        ),
                      ],
                      _field(
                        reason,
                        kind == 'cost'
                            ? 'Reason for cost revision'
                            : 'Buyer / reference (optional)',
                      ),
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: saving ? null : () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: saving
                    ? null
                    : () async {
                        try {
                          final cents = parseIntakeMoney(amount.text);
                          if (kind == 'cost' && reason.text.trim().isEmpty) {
                            throw StateError(
                              'Enter the reason for this revision.',
                            );
                          }
                          if (kind == 'sale' && (cents == null || cents <= 0)) {
                            throw StateError(
                              'Enter a sale amount greater than zero.',
                            );
                          }
                          set(() => saving = true);
                          await widget.service.call(
                            kind == 'cost'
                                ? 'allocation.revise'
                                : 'sale.record',
                            kind == 'cost'
                                ? {
                                    'instance_id': copy['id'],
                                    'cost_cents': cents,
                                    'reason': reason.text.trim(),
                                  }
                                : {
                                    'request_id': requestId,
                                    'instance_id': copy['id'],
                                    'amount': cents! / 100,
                                    'expenses':
                                        (parseIntakeMoney(expenses.text) ?? 0) /
                                        100,
                                    'currency': currency,
                                    'buyer': reason.text.trim(),
                                    'sold_on': intakeDate(soldOn),
                                  },
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                        } catch (e) {
                          if (ctx.mounted) {
                            set(() => saving = false);
                            _error(ctx, e);
                          }
                        }
                      },
                child: Text(saving ? 'Saving…' : 'Save'),
              ),
            ],
          ),
        ),
      ),
    );
    amount.dispose();
    expenses.dispose();
    reason.dispose();
    await load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(lot?.name ?? 'Intake history'),
      actions: [
        if (lot != null)
          IconButton(
            tooltip: 'Edit purchase lot',
            onPressed: () async {
              final saved = await Navigator.of(context).push<PurchaseLot>(
                MaterialPageRoute(
                  builder: (_) =>
                      PurchaseLotEditor(service: widget.service, lot: lot),
                ),
              );
              if (saved != null) {
                lot = saved;
                await load();
              }
            },
            icon: const Icon(Icons.edit_outlined),
          ),
        IconButton(
          tooltip: 'Refresh',
          onPressed: load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: tag,
          decoration: InputDecoration(
            labelText: 'Private tag',
            suffixIcon: IconButton(
              tooltip: 'Apply tag filter',
              onPressed: load,
              icon: const Icon(Icons.search),
            ),
          ),
          onSubmitted: (_) => load(),
        ),
        Wrap(
          spacing: 8,
          children: [
            TextButton.icon(
              onPressed: () async {
                final range = await showDateRangePicker(
                  context: context,
                  firstDate: DateTime(1900),
                  lastDate: DateTime.now().add(const Duration(days: 1)),
                  initialDateRange: dates,
                );
                if (range != null) {
                  dates = range;
                  await load();
                }
              },
              icon: const Icon(Icons.date_range),
              label: Text(
                dates == null
                    ? 'Filter dates'
                    : '${intakeDate(dates!.start)} – ${intakeDate(dates!.end)}',
              ),
            ),
            FilterChip(
              label: const Text('Purchase date'),
              selected: purchaseDates,
              onSelected: (v) {
                purchaseDates = v;
                load();
              },
            ),
            if (dates != null)
              TextButton(
                onPressed: () {
                  dates = null;
                  load();
                },
                child: const Text('Clear dates'),
              ),
          ],
        ),
        if (!purchaseDates)
          const Text(
            'Date filter uses the automatic date each copy was added.',
          ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) Text(error!),
        const SizedBox(height: 16),
        metrics(),
        const Divider(),
        for (final copy in copies)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(copy['name'] as String),
            subtitle: Text(
              '${copy['gv_vi_id']} · ${copy['condition_label'] ?? 'Condition unspecified'}\nIntake ${copy['acquisition_cost'] == null ? 'Unknown' : '${copy['acquisition_currency'] ?? ''} ${(copy['acquisition_cost'] as num).toStringAsFixed(2)}'} · Acquired ${copy['acquired_on'] ?? 'Unknown'}\nAdded ${DateTime.parse(copy['created_at'] as String).toLocal().toString().split('.').first}${copy['sale_price_amount'] == null ? '' : ' · Sold ${copy['sale_price_currency']} ${copy['sale_price_amount']}'}',
            ),
            isThreeLine: true,
            trailing: copy['archived_at'] == null
                ? const Icon(Icons.more_vert)
                : const Icon(Icons.archive_outlined),
            onTap: copy['archived_at'] == null ? () => action(copy) : null,
          ),
      ],
    ),
  );
}
