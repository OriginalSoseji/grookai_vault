part of 'intake_screens.dart';

class PurchaseLotEditor extends StatefulWidget {
  const PurchaseLotEditor({super.key, required this.service, this.lot});
  final IntakeService service;
  final PurchaseLot? lot;
  @override
  State<PurchaseLotEditor> createState() => _PurchaseLotEditorState();
}

class _PurchaseLotEditorState extends State<PurchaseLotEditor> {
  late final String _lotId = widget.lot?.id ?? newIntakeId();
  late int _revision = widget.lot?.revision ?? 0;
  PurchaseLot? _pendingSave;
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
        id: _lotId,
        name: name.text.trim(),
        purchasedOn: date,
        currency: currency,
        totalCostCents: cost,
        source: source.text.trim(),
        notes: notes.text.trim(),
        tags: _tags(tags.text),
        isComplete: complete,
        revision: _revision,
      );
      final pending = _pendingSave;
      if (pending != null) {
        // A failed response may follow a committed save. Read that same lot
        // before making another request; never mint another creation identity.
        final current = (await widget.service.lots())
            .where((value) => value.id == _lotId)
            .firstOrNull;
        if (current == null) {
          if (widget.lot != null || _revision > 0) {
            throw StateError(
              'This lot is unavailable. Refresh your purchase history.',
            );
          }
        } else if (_sameValues(current, pending)) {
          _revision = current.revision;
          if (_sameValues(lot, pending)) {
            _pendingSave = null;
            if (mounted) Navigator.pop(context, current);
            return;
          }
        } else if (current.revision != pending.revision) {
          throw StateError(
            'This lot changed on another device. Refresh it before saving.',
          );
        } else {
          _revision = current.revision;
        }
      }
      lot.revision = _revision;
      _pendingSave = PurchaseLot.fromJson(lot.toJson());
      final saved = await widget.service.saveLot(lot);
      if (saved.id != _lotId) {
        throw StateError(
          'The lot save is unconfirmed. Retry to check its saved version.',
        );
      }
      _revision = saved.revision;
      _pendingSave = null;
      if (mounted) Navigator.pop(context, saved);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).removeCurrentSnackBar();
        _error(context, e);
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  bool _sameValues(PurchaseLot left, PurchaseLot right) =>
      left.name == right.name &&
      intakeDate(left.purchasedOn) == intakeDate(right.purchasedOn) &&
      left.currency == right.currency &&
      left.totalCostCents == right.totalCostCents &&
      left.isComplete == right.isComplete &&
      left.source == right.source &&
      left.notes == right.notes &&
      listEquals(left.tags, right.tags);

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
