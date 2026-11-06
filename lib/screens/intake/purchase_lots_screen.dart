part of 'intake_screens.dart';

class PurchaseLotsScreen extends StatefulWidget {
  const PurchaseLotsScreen({super.key, required this.service});
  final IntakeService service;
  @override
  State<PurchaseLotsScreen> createState() => _PurchaseLotsState();
}

class _PurchaseLotsState extends State<PurchaseLotsScreen> {
  late Future<List<PurchaseLot>> future = widget.service.lots();
  void refresh() => setState(() => future = widget.service.lots());

  Future<void> _openLabels({PurchaseLot? lot}) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute<void>(
        builder: (_) => LotLabelPrintScreen(
          lotName: lot?.name ?? 'New binder lot',
          groupName: lot?.tags.firstOrNull ?? 'Lot',
          quantity: 1,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Purchase lots'),
      actions: [
        IconButton(
          tooltip: 'Refresh',
          onPressed: refresh,
          icon: const Icon(Icons.refresh),
        ),
        IconButton(
          tooltip: 'Print lot labels',
          onPressed: () => _openLabels(),
          icon: const Icon(Icons.print_outlined),
        ),
      ],
    ),
    body: FutureBuilder<List<PurchaseLot>>(
      future: future,
      builder: (_, s) => ListView(
        padding: const EdgeInsets.all(16),
        children: [
          OutlinedButton.icon(
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) =>
                      IntakeInventoryScreen(service: widget.service),
                ),
              );
              refresh();
            },
            icon: const Icon(Icons.filter_list),
            label: const Text('All copies · filter by date or tag'),
          ),
          FilledButton.icon(
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute<PurchaseLot>(
                  builder: (_) => PurchaseLotEditor(service: widget.service),
                ),
              );
              refresh();
            },
            icon: const Icon(Icons.add),
            label: const Text('New purchase lot'),
          ),
          if (s.connectionState != ConnectionState.done)
            const LinearProgressIndicator(),
          if (s.hasError) Text('Unable to load purchase lots. ${s.error}'),
          if (s.hasData && s.data!.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text(
                'Create a lot to keep a purchase together across scan sessions.',
              ),
            ),
          for (final lot in s.data ?? <PurchaseLot>[])
            ListTile(
              title: Text(lot.name),
              subtitle: Text(
                '${intakeDate(lot.purchasedOn)} · Paid ${intakeMoney(lot.totalCostCents, lot.currency)}\nReserve ${intakeMoney(lot.totalCostCents == null ? null : lot.reserveCents, lot.currency)}${lot.tags.isEmpty ? '' : ' · ${lot.tags.join(', ')}'}',
              ),
              isThreeLine: true,
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    tooltip: 'Print labels for ${lot.name}',
                    onPressed: () => _openLabels(lot: lot),
                    icon: const Icon(Icons.print_outlined),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
              onTap: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => IntakeInventoryScreen(
                      service: widget.service,
                      lot: lot,
                    ),
                  ),
                );
                refresh();
              },
            ),
        ],
      ),
    ),
  );
}
