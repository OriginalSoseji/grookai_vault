part of 'intake_screens.dart';

class IntakeHomeScreen extends StatefulWidget {
  const IntakeHomeScreen({super.key});
  @override
  State<IntakeHomeScreen> createState() => _IntakeHomeState();
}

class _IntakeHomeState extends State<IntakeHomeScreen> {
  late final service = IntakeService(Supabase.instance.client);
  IntakeDraftStore? store;
  List<IntakeBatch> local = [];
  List<Map<String, dynamic>> remote = [];
  List<PurchaseLot> lots = [];
  bool loading = true;
  String? error;
  @override
  void initState() {
    super.initState();
    unawaited(load());
  }

  Future<void> load() async {
    if (service.client.auth.currentUser == null) {
      setState(() {
        loading = false;
        error = 'Sign in to scan into your Vault.';
      });
      return;
    }
    try {
      store = await IntakeDraftStore.open(service.userId);
      local = await store!.list();
      if (context.mounted) setState(() => loading = false);
      final results = await Future.wait<dynamic>([
        service.drafts(),
        service.lots(),
      ]);
      remote = results[0] as List<Map<String, dynamic>>;
      lots = results[1] as List<PurchaseLot>;
      error = null;
    } catch (e) {
      error = 'Cloud sync unavailable. Local drafts are still available. $e';
    }
    if (context.mounted) setState(() => loading = false);
  }

  Future<void> open(IntakeBatch batch) async {
    if (store == null) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => IntakeBatchScreen(
          controller: IntakeController(
            batch: batch,
            store: store!,
            service: service,
          ),
        ),
      ),
    );
    await load();
  }

  Future<void> newBatch() async {
    if (store == null) return;
    final title = TextEditingController(
      text: 'Intake ${intakeDate(DateTime.now())}',
    );
    PurchaseLot? chosen;
    var currency = 'USD';
    DateTime acquired = DateTime.now();
    final tag = TextEditingController();
    final batch = await showDialog<IntakeBatch>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, set) => AlertDialog(
          title: const Text('Start a scan batch'),
          content: SizedBox(
            width: 440,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _field(title, 'Batch name'),
                  DropdownButtonFormField<String>(
                    initialValue: '',
                    decoration: const InputDecoration(
                      labelText: 'Purchase lot',
                    ),
                    isExpanded: true,
                    items: [
                      const DropdownMenuItem(
                        value: '',
                        child: Text('No lot / individual intake'),
                      ),
                      ...lots
                          .where((l) => !l.isComplete)
                          .map(
                            (l) => DropdownMenuItem(
                              value: l.id,
                              child: Text(
                                l.name,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                    ],
                    onChanged: (id) => set(() {
                      chosen = lots.where((l) => l.id == id).firstOrNull;
                      currency = chosen?.currency ?? 'USD';
                      acquired = chosen?.purchasedOn ?? DateTime.now();
                    }),
                  ),
                  TextButton.icon(
                    onPressed: () async {
                      final created = await Navigator.of(ctx).push<PurchaseLot>(
                        MaterialPageRoute(
                          builder: (_) => PurchaseLotEditor(service: service),
                        ),
                      );
                      if (created != null && ctx.mounted) {
                        set(() {
                          lots.insert(0, created);
                          chosen = created;
                          currency = created.currency;
                          acquired = created.purchasedOn;
                        });
                      }
                    },
                    icon: const Icon(Icons.add),
                    label: const Text('Create a purchase lot'),
                  ),
                  if (chosen != null)
                    Text(
                      '${chosen!.name} · Remaining intake cost ${intakeMoney(chosen!.totalCostCents == null ? null : chosen!.reserveCents, currency)}',
                    ),
                  if (chosen == null)
                    DropdownButtonFormField<String>(
                      initialValue: currency,
                      decoration: const InputDecoration(
                        labelText: 'Cost currency',
                      ),
                      items: intakeCurrencies
                          .map(
                            (c) => DropdownMenuItem(value: c, child: Text(c)),
                          )
                          .toList(),
                      onChanged: (v) => set(() => currency = v!),
                    ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Purchase / acquisition date'),
                    subtitle: Text(intakeDate(acquired)),
                    trailing: const Icon(Icons.calendar_month),
                    onTap: () async {
                      final date = await showDatePicker(
                        context: ctx,
                        initialDate: acquired,
                        firstDate: DateTime(1900),
                        lastDate: DateTime.now().add(const Duration(days: 1)),
                      );
                      if (date != null) set(() => acquired = date);
                    },
                  ),
                  _field(tag, 'Private tags, separated by commas'),
                  const Text(
                    'Date added is recorded automatically for each copy. Costs are optional and reviewed before saving.',
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                if (title.text.trim().isEmpty) return;
                Navigator.pop(
                  ctx,
                  IntakeBatch(
                    title: title.text.trim(),
                    userId: service.userId,
                    lotId: chosen?.id,
                    currency: currency,
                    acquiredOn: acquired,
                    tags: _tags(tag.text),
                  ),
                );
              },
              child: const Text('Start'),
            ),
          ],
        ),
      ),
    );
    title.dispose();
    tag.dispose();
    if (batch != null) {
      await store!.save(batch);
      if (context.mounted) await open(batch);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Batch intake'),
        actions: [
          IconButton(
            tooltip: 'Refresh drafts',
            onPressed: load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  'Scan a purchase, keep its history',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Scan continuously or import a photo of several separated cards. Review identities and intake costs together before adding copies to your Vault.',
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: store == null ? null : newBatch,
                  icon: const Icon(Icons.add_a_photo),
                  label: const Text('New scan batch'),
                ),
                OutlinedButton.icon(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => PurchaseLotsScreen(service: service),
                    ),
                  ),
                  icon: const Icon(Icons.inventory_2_outlined),
                  label: const Text('Purchase lots & intake history'),
                ),
                if (error != null)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Text(error!),
                  ),
                const SizedBox(height: 18),
                const Text(
                  'Saved on this device',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                for (final batch in local)
                  ListTile(
                    leading: Icon(
                      batch.state == 'saved'
                          ? Icons.check_circle_outline
                          : Icons.playlist_add,
                    ),
                    title: Text(batch.title),
                    subtitle: Text(
                      '${batch.copyCount} copies · ${batch.reviewCount} to review · ${batch.state}',
                    ),
                    onTap: () => open(batch),
                  ),
                if (local.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Your scan drafts will appear here.'),
                  ),
                const Text(
                  'Account drafts · open the cloud version',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                for (final row in remote)
                  ListTile(
                    leading: const Icon(Icons.cloud_outlined),
                    title: Text(row['title'] as String),
                    subtitle: const Text('Cloud draft · tap to resume'),
                    onTap: () async {
                      try {
                        final result = await service.getBatch(
                          row['id'] as String,
                        );
                        final batch = IntakeBatch.fromJson(
                          Map<String, dynamic>.from(result['snapshot'] as Map),
                        );
                        batch.revision = (result['revision'] as num).toInt();
                        batch.state = result['state'] as String;
                        for (final saved
                            in result['saved_items'] as List? ?? []) {
                          final item = batch.items
                              .where((i) => i.id == saved['item_id'])
                              .firstOrNull;
                          if (item != null) {
                            item.savedInstanceIds = List<String>.from(
                              saved['instance_ids'],
                            );
                            item.state = 'saved';
                          }
                        }
                        await store!.preserveRecovery(batch.id);
                        await store!.save(batch);
                        if (context.mounted) await open(batch);
                      } catch (e) {
                        if (context.mounted) _error(context, e);
                      }
                    },
                  ),
              ],
            ),
    );
  }
}
