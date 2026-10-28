part of 'intake_screens.dart';

class PurchaseLotEditor extends StatefulWidget {
  const PurchaseLotEditor({super.key, required this.service, this.lot});
  final IntakeService service;
  final PurchaseLot? lot;
  @override
  State<PurchaseLotEditor> createState() => _PurchaseLotEditorState();
}

class _PurchaseLotEditorState extends State<PurchaseLotEditor> {
  late final name = TextEditingController(
    text: widget.lot?.name ?? 'Purchase ${intakeDate(DateTime.now())}',
  );
  late final total = TextEditingController(
    text: intakeAmount(widget.lot?.totalCostCents),
  );
  late final source = TextEditingController(text: widget.lot?.source ?? '');
  late final notes = TextEditingController(text: widget.lot?.notes ?? '');
  late final tags = TextEditingController(
    text: widget.lot?.tags.join(', ') ?? '',
  );
  late DateTime date = widget.lot?.purchasedOn ?? DateTime.now();
  late String currency = widget.lot?.currency ?? 'USD';
  late bool complete = widget.lot?.isComplete ?? false;
  bool busy = false;
  @override
  void dispose() {
    for (final c in [name, total, source, notes, tags]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    if (busy) return;
    try {
      final cost = parseIntakeMoney(total.text);
      if (name.text.trim().isEmpty) throw StateError('Enter a lot name.');
      setState(() => busy = true);
      final lot = PurchaseLot(
        id: widget.lot?.id,
        name: name.text.trim(),
        purchasedOn: date,
        currency: currency,
        totalCostCents: cost,
        source: source.text.trim(),
        notes: notes.text.trim(),
        tags: _tags(tags.text),
        isComplete: complete,
        revision: widget.lot?.revision ?? 0,
      );
      final saved = await widget.service.saveLot(lot);
      if (mounted) Navigator.pop(context, saved);
    } catch (e) {
      if (mounted) _error(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.lot == null ? 'New purchase lot' : 'Edit purchase lot',
      ),
    ),
    body: AbsorbPointer(
      absorbing: busy,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _field(name, 'Lot name'),
          _field(total, 'Total paid for this lot (optional)', money: true),
          const Text(
            'Blank means unknown. 0.00 means the lot was free. Unallocated cost stays in reserve for later scans.',
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: currency,
            decoration: const InputDecoration(labelText: 'Currency'),
            items: intakeCurrencies
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => currency = v!),
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Purchase date'),
            subtitle: Text(intakeDate(date)),
            trailing: const Icon(Icons.calendar_month),
            onTap: () async {
              final d = await showDatePicker(
                context: context,
                initialDate: date,
                firstDate: DateTime(1900),
                lastDate: DateTime.now().add(const Duration(days: 1)),
              );
              if (d != null) setState(() => date = d);
            },
          ),
          _field(source, 'Purchased from (private)'),
          _field(tags, 'Private tags, separated by commas'),
          _field(notes, 'Notes (private)', lines: 3),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: complete,
            onChanged: (v) => setState(() => complete = v),
            title: const Text('Intake complete'),
            subtitle: const Text(
              'Hide this lot from the new-batch picker. Remaining reserve stays visible.',
            ),
          ),
          FilledButton(
            onPressed: save,
            child: Text(busy ? 'Saving…' : 'Save purchase lot'),
          ),
        ],
      ),
    ),
  );
}
