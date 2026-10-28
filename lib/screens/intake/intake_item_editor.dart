part of 'intake_screens.dart';

class IntakeItemEditor extends StatefulWidget {
  const IntakeItemEditor({
    super.key,
    required this.controller,
    required this.item,
  });
  final IntakeController controller;
  final IntakeItem item;
  @override
  State<IntakeItemEditor> createState() => _IntakeItemEditorState();
}

class _IntakeItemEditorState extends State<IntakeItemEditor> {
  IntakeItem get item => widget.item;
  IntakeController get c => widget.controller;
  late final qty = TextEditingController(text: '${item.quantity}');
  late final cost = TextEditingController(
    text: intakeAmount(item.manualTotalCents),
  );
  late final notes = TextEditingController(text: item.notes);
  List<Map<String, dynamic>> finishes = [];
  bool loading = false;
  String? error;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    unawaited(load());
  }

  @override
  void dispose() {
    qty.dispose();
    cost.dispose();
    notes.dispose();
    super.dispose();
  }

  Future<void> load() async {
    final selected = item.selected;
    if (selected == null) return;
    final generation = ++_generation;
    setState(() => loading = true);
    try {
      final rows = await PublicCardPrintingOptionsService.fetch(
        client: c.service.client,
        cardPrintIds: [selected.cardId!],
      );
      if (!mounted || generation != _generation) return;
      finishes = rows;
      await c.reference(item);
      error = null;
    } catch (e) {
      error =
          'Reference pricing / finish options unavailable. You can still enter intake cost manually.';
    }
    if (mounted && generation == _generation) setState(() => loading = false);
  }

  Future<void> select(ScannerV5Candidate candidate) async {
    item.selected = candidate;
    item.cardPrintingId = null;
    item.finishLabel = null;
    item.referenceValueCents = null;
    item.state = 'needs_review';
    await c.changed();
    if (mounted) await load();
  }

  Future<void> confirm() async {
    try {
      final count = int.tryParse(qty.text);
      if (count == null || count < 1 || count > 100) {
        throw StateError('Quantity must be between 1 and 100.');
      }
      if (item.selected == null) throw StateError('Choose the card first.');
      if (c.batch.copyCount - item.quantity + count > 500) {
        throw StateError('A batch supports up to 500 copies.');
      }
      item.quantity = count;
      item.manualTotalCents = parseIntakeMoney(cost.text);
      item.notes = notes.text.trim();
      item.state = 'confirmed';
      await c.changed();
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) _error(context, e);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Review card')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (item.imagePath.isNotEmpty || item.selected?.imageUrl != null)
          SizedBox(
            height: 250,
            child: Row(
              children: [
                if (item.imagePath.isNotEmpty)
                  Expanded(
                    child: Column(
                      children: [
                        const Text('Your photo'),
                        const SizedBox(height: 6),
                        Expanded(
                          child: FutureBuilder<Uint8List>(
                            future: c.imageBytes(
                              item.imagePath,
                              item.remotePath,
                            ),
                            builder: (_, s) => s.hasData
                                ? Image.memory(s.data!, fit: BoxFit.contain)
                                : const Center(
                                    child: Icon(Icons.photo_outlined),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                if (item.selected?.imageUrl != null)
                  Expanded(
                    child: Column(
                      children: [
                        const Text('Catalog reference'),
                        const SizedBox(height: 6),
                        Expanded(
                          child: Image.network(
                            item.selected!.imageUrl!,
                            fit: BoxFit.contain,
                            errorBuilder: (_, error, stack) => const Center(
                              child: Text('Reference image unavailable'),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        const SizedBox(height: 12),
        Text(
          item.selected?.name ?? 'Unidentified card',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        Text(
          '${item.selected?.setCode ?? ''} · ${item.selected?.number ?? ''}',
        ),
        TextButton.icon(
          onPressed: () async {
            final result = await Navigator.of(context).push<ScannerV5Candidate>(
              MaterialPageRoute(builder: (_) => const IntakeCardSearch()),
            );
            if (result != null && mounted) await select(result);
          },
          icon: const Icon(Icons.search),
          label: const Text('Search / correct identity'),
        ),
        if (item.candidates.length > 1)
          ExpansionTile(
            title: const Text('Other scanner matches'),
            children: item.candidates
                .map(
                  (v) => ListTile(
                    title: Text(v.name),
                    subtitle: Text('${v.setCode} · ${v.number ?? ''}'),
                    onTap: () => select(v),
                  ),
                )
                .toList(),
          ),
        if (loading) const LinearProgressIndicator(),
        if (error != null) Text(error!),
        const SizedBox(height: 14),
        _field(qty, 'Quantity (each copy keeps its own cost)'),
        DropdownButtonFormField<String>(
          initialValue: item.condition,
          decoration: const InputDecoration(labelText: 'Condition'),
          items: [
            'Unspecified',
            'NM',
            'LP',
            'MP',
            'HP',
            'DMG',
          ].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
          onChanged: (v) => setState(() => item.condition = v!),
        ),
        const SizedBox(height: 14),
        DropdownButtonFormField<String>(
          key: ValueKey(
            '${item.selected?.cardId}:${finishes.length}:${item.cardPrintingId}',
          ),
          initialValue: finishes.any((r) => r['id'] == item.cardPrintingId)
              ? item.cardPrintingId
              : '',
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Finish / printing'),
          items: [
            const DropdownMenuItem(value: '', child: Text('Unspecified')),
            for (final row in finishes)
              DropdownMenuItem(
                value: row['id'] as String,
                child: Text(
                  '${row['finish_label'] ?? row['finish_key'] ?? 'Printing'} ${row['printing_gv_id'] ?? ''}',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
          ],
          onChanged: (v) async {
            setState(() {
              item.cardPrintingId = v == '' ? null : v;
              item.finishLabel =
                  finishes
                          .where((r) => r['id'] == v)
                          .firstOrNull?['finish_label']
                      as String?;
            });
            try {
              await c.reference(item);
            } catch (e) {
              if (context.mounted) _error(context, e);
            }
            if (context.mounted) setState(() {});
          },
        ),
        const SizedBox(height: 14),
        Text(
          'Allocation reference per copy: ${intakeMoney(item.referenceValueCents, c.batch.currency)}${item.referenceSource == null ? '' : ' · ${item.referenceSource}'}',
        ),
        if (item.referenceAt != null)
          Text(
            'Reference observed ${intakeDate(item.referenceAt!)}. This snapshot will not change saved intake costs.',
          ),
        const SizedBox(height: 14),
        _field(
          cost,
          'Amount paid for this row, all copies (optional)',
          money: true,
        ),
        const Text(
          'Leave blank to use the proportional lot suggestion. Entering an amount locks this row total; it will be divided across its copies.',
        ),
        const SizedBox(height: 14),
        _field(notes, 'Copy notes (private)', lines: 3),
        FilledButton(
          onPressed: loading ? null : confirm,
          child: const Text('Confirm card'),
        ),
        TextButton(
          onPressed: () async {
            item.state = 'removed';
            await c.changed();
            if (context.mounted) Navigator.pop(context);
          },
          child: const Text('Remove from this batch'),
        ),
      ],
    ),
  );
}

class IntakeCardSearch extends StatefulWidget {
  const IntakeCardSearch({super.key});
  @override
  State<IntakeCardSearch> createState() => _IntakeCardSearchState();
}

class _IntakeCardSearchState extends State<IntakeCardSearch> {
  final query = TextEditingController();
  List<CardPrint> rows = [];
  bool busy = false;
  String? error;
  @override
  void dispose() {
    query.dispose();
    super.dispose();
  }

  Future<void> search() async {
    if (query.text.trim().isEmpty) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await CardPrintRepository.searchCardPrintsResolved(
        client: Supabase.instance.client,
        options: CardSearchOptions(query: query.text.trim(), limit: 50),
      );
      rows = result.rows;
    } catch (e) {
      error = e.toString();
    }
    if (context.mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Find a card')),
    body: Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextField(
            controller: query,
            autofocus: true,
            onSubmitted: (_) => search(),
            decoration: InputDecoration(
              labelText: 'Name, set or card number',
              suffixIcon: IconButton(
                onPressed: search,
                icon: const Icon(Icons.search),
              ),
            ),
          ),
        ),
        if (busy) const LinearProgressIndicator(),
        if (error != null) Text(error!),
        Expanded(
          child: ListView.builder(
            itemCount: rows.length,
            itemBuilder: (_, i) {
              final row = rows[i];
              return ListTile(
                title: Text(row.name),
                subtitle: Text('${row.setCode} · ${row.number ?? ''}'),
                onTap: () => Navigator.pop(
                  context,
                  ScannerV5Candidate.fromJson({
                    'card_id': row.id,
                    'gv_id': row.gvId,
                    'name': row.name,
                    'set_code': row.setCode,
                    'number': row.number,
                    'image_url': row.imageUrl,
                  }),
                ),
              );
            },
          ),
        ),
      ],
    ),
  );
}
