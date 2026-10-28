part of 'intake_screens.dart';

class IntakeCostReviewScreen extends StatefulWidget {
  const IntakeCostReviewScreen({super.key, required this.controller, this.lot});
  final IntakeController controller;
  final PurchaseLot? lot;
  @override
  State<IntakeCostReviewScreen> createState() => _IntakeCostReviewState();
}

class _IntakeCostReviewState extends State<IntakeCostReviewScreen> {
  late final reserve = TextEditingController(
    text: intakeAmount(widget.controller.batch.retainedReserveCents),
  );
  bool reviewed = false;
  bool entireLot = false;
  @override
  void dispose() {
    reserve.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = widget.controller;
    final lot = widget.lot;
    IntakeAllocation? allocation;
    String? error;
    try {
      allocation = allocateIntakeCosts(
        items: c.batch.items,
        availableCents: lot?.totalCostCents == null ? null : lot!.reserveCents,
        reserveCents: parseIntakeMoney(reserve.text) ?? 0,
      );
    } catch (e) {
      error = e.toString();
    }
    final knownLot = lot?.totalCostCents != null;
    final spendingAll =
        knownLot &&
        (allocation?.allocatedCents ?? 0) > 0 &&
        allocation?.remainingCents == 0;
    return Scaffold(
      appBar: AppBar(title: const Text('Review intake costs')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (lot != null) ...[
            Text(lot.name, style: Theme.of(context).textTheme.titleLarge),
            Text(
              'Total paid: ${intakeMoney(lot.totalCostCents, lot.currency)}\nAvailable after earlier batches: ${intakeMoney(knownLot ? lot.reserveCents : null, lot.currency)}',
            ),
            const SizedBox(height: 14),
          ],
          if (knownLot) ...[
            TextField(
              controller: reserve,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              decoration: const InputDecoration(
                labelText: 'Keep in reserve for unscanned / unpriced cards',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {
                reviewed = false;
                entireLot = false;
              }),
            ),
            const SizedBox(height: 8),
            const Text(
              'The remaining available cost is split by reference value, counting every copy. Manual row amounts stay locked. Unpriced cards keep unknown cost unless you enter one.',
            ),
            const SizedBox(height: 14),
          ],
          if (!knownLot)
            const Text(
              'No known lot total. Only manual intake amounts are assigned. Blank costs stay unknown.',
            ),
          if (error != null) Text(error),
          for (final issue in allocation?.issues ?? <String>[])
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                issue,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          for (final item in c.batch.items.where(
            (i) => i.isConfirmed && !i.isSaved,
          ))
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text('${item.selected!.name} × ${item.quantity}'),
              subtitle: Text(
                '${item.manualTotalCents == null ? 'Proportional suggestion' : 'Manual row total'} · Reference ${intakeMoney(item.referenceValueCents, c.batch.currency)} per copy\n${(allocation?.costs[item.id] ?? []).map((v) => intakeMoney(v, c.batch.currency)).join(' / ')}',
              ),
              onTap: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => IntakeItemEditor(controller: c, item: item),
                  ),
                );
                if (context.mounted) {
                  setState(() {
                    reviewed = false;
                    entireLot = false;
                  });
                }
              },
            ),
          const Divider(),
          Text(
            'Assign now: ${intakeMoney(allocation?.allocatedCents, c.batch.currency)}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          if (knownLot)
            Text(
              'Cost remaining in lot reserve: ${intakeMoney(allocation?.remainingCents, c.batch.currency)}',
            ),
          if (spendingAll)
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: entireLot,
              onChanged: (v) => setState(() => entireLot = v!),
              title: const Text(
                'These cards should receive all remaining lot cost',
              ),
              subtitle: const Text(
                'If you have more cards to scan, enter a reserve above before saving.',
              ),
            ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: reviewed,
            onChanged: (v) => setState(() => reviewed = v!),
            title: const Text(
              'I reviewed identities, quantities and intake costs',
            ),
            subtitle: const Text(
              'These costs are saved per physical copy. Future market changes do not recalculate them.',
            ),
          ),
          FilledButton(
            onPressed:
                reviewed &&
                    (!spendingAll || entireLot) &&
                    allocation?.valid == true &&
                    error == null
                ? () async {
                    final result = allocation!;
                    for (final item in c.batch.items.where(
                      (i) => i.isConfirmed && !i.isSaved,
                    )) {
                      item.copyCostsCents = result.costs[item.id] ?? [];
                      item.allocation = {
                        'method': item.manualTotalCents == null
                            ? 'proportional_value_v1'
                            : 'manual_row_total_v1',
                        'reference_value_cents': item.referenceValueCents,
                        'reference_currency': c.batch.currency,
                        'reference_source': item.referenceSource,
                        'reference_at': item.referenceAt?.toIso8601String(),
                        'quantity': item.quantity,
                        'lot_revision': lot?.revision,
                        'retained_reserve_cents':
                            parseIntakeMoney(reserve.text) ?? 0,
                        'reviewed_at': DateTime.now().toUtc().toIso8601String(),
                      };
                    }
                    c.batch.retainedReserveCents =
                        parseIntakeMoney(reserve.text) ?? 0;
                    c.batch.allocationReviewed = true;
                    await c.persist();
                    if (context.mounted) Navigator.pop(context, true);
                  }
                : null,
            child: const Text('Save confirmed copies to Vault'),
          ),
        ],
      ),
    );
  }
}
