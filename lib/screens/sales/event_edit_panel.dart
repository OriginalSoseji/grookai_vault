import 'package:flutter/material.dart';
import '../../services/sales/vendor_events.dart';

const eventOperationLabels = {
  'event_create': 'Create event',
  'event_update': 'Edit event details',
  'event_close': 'Close event',
  'event_reopen': 'Reopen event',
  'expense_create': 'Add expense',
  'expense_update': 'Amend expense',
  'expense_void': 'Void expense',
  'receipts_assign': 'Change receipt assignments',
};

class EventEditDraft {
  EventEditDraft({
    required this.type,
    required this.values,
    required this.serverRevision,
    required this.localRevision,
  });
  final String type, serverRevision;
  final String? localRevision;
  final Map<String, String> values;
  Map<String, dynamic> operation() {
    final v = values;
    if (type == 'event_create' || type == 'event_update') {
      return validateEventOperation({
        'type': type,
        'eventId': v['eventId'],
        'name': v['name'],
        'startDate': v['startDate'],
        'endDate': v['endDate'],
        'timeZone': v['timeZone'],
        'currency': 'USD',
        'notes': v['notes'] ?? '',
      });
    }
    if (type == 'expense_create' || type == 'expense_update') {
      final amount = eventMoneyInput(v['amount'] ?? '');
      if (amount == null) {
        throw const FormatException(
          'Enter a USD amount with up to two decimal places. Zero is allowed.',
        );
      }
      return validateEventOperation({
        'type': type,
        'eventId': v['eventId'],
        'expenseId': v['expenseId'],
        'category': v['category'],
        'description': v['description'],
        'amountMinor': amount,
        'currency': 'USD',
        'incurredOn': v['incurredOn'],
        if (type == 'expense_update') 'reason': v['reason'],
      });
    }
    return validateEventOperation({
      'type': type,
      'eventId': v['eventId'],
      if (type == 'expense_void') 'expenseId': v['expenseId'],
      'reason': v['reason'],
    });
  }
}

class EventEditPanel extends StatefulWidget {
  const EventEditPanel({
    super.key,
    required this.draft,
    required this.disabled,
    required this.busy,
    required this.save,
    required this.close,
  });
  final EventEditDraft draft;
  final bool disabled, busy;
  final VoidCallback save, close;
  @override
  State<EventEditPanel> createState() => _EventEditPanelState();
}

class _EventEditPanelState extends State<EventEditPanel> {
  late final Map<String, TextEditingController> _controllers = {
    for (final entry in widget.draft.values.entries)
      entry.key: TextEditingController(text: entry.value),
  };
  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Widget _field(
    String key,
    String label, {
    bool multiline = false,
    bool money = false,
    String? hint,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: TextField(
      controller: _controllers.putIfAbsent(key, () => TextEditingController()),
      enabled: !widget.disabled,
      decoration: InputDecoration(
        labelText: label,
        helperText: hint,
        helperMaxLines: 3,
        border: const OutlineInputBorder(),
      ),
      maxLines: multiline ? 3 : 1,
      keyboardType: money
          ? const TextInputType.numberWithOptions(decimal: true)
          : multiline
          ? TextInputType.multiline
          : TextInputType.text,
      onChanged: (value) => widget.draft.values[key] = value,
      textInputAction: multiline
          ? TextInputAction.newline
          : TextInputAction.next,
    ),
  );
  @override
  Widget build(BuildContext context) {
    final type = widget.draft.type,
        metadata = type == 'event_create' || type == 'event_update',
        expense = type == 'expense_create' || type == 'expense_update';
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              eventOperationLabels[type]!,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            if (metadata) ...[
              _field('name', 'Event name'),
              _field(
                'timeZone',
                'Event time zone',
                hint:
                    'Use an IANA name, such as America/Denver. Receipt dates use this time zone.',
              ),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children:
                    [
                          'America/Denver',
                          'America/Los_Angeles',
                          'America/Chicago',
                          'America/New_York',
                          'America/Phoenix',
                          'UTC',
                        ]
                        .map(
                          (zone) => ActionChip(
                            label: Text(zone),
                            onPressed: widget.disabled
                                ? null
                                : () {
                                    widget.draft.values['timeZone'] = zone;
                                    _controllers['timeZone']!.text = zone;
                                  },
                          ),
                        )
                        .toList(),
              ),
              const SizedBox(height: 12),
              _field('startDate', 'Start date', hint: 'YYYY-MM-DD'),
              _field('endDate', 'End date', hint: 'YYYY-MM-DD'),
              _field('notes', 'Private notes', multiline: true),
            ] else if (expense) ...[
              _field('description', 'Expense description'),
              DropdownButtonFormField<String>(
                initialValue: widget.draft.values['category'] ?? 'booth',
                decoration: const InputDecoration(
                  labelText: 'Category',
                  border: OutlineInputBorder(),
                ),
                items: eventExpenseCategories
                    .map(
                      (category) => DropdownMenuItem(
                        value: category,
                        child: Text(
                          '${category[0].toUpperCase()}${category.substring(1)}',
                        ),
                      ),
                    )
                    .toList(),
                onChanged: widget.disabled
                    ? null
                    : (value) {
                        if (value != null) {
                          widget.draft.values['category'] = value;
                        }
                      },
              ),
              const SizedBox(height: 12),
              _field('amount', 'Amount (USD)', money: true),
              _field('incurredOn', 'Incurred on', hint: 'YYYY-MM-DD'),
            ] else
              Text(
                type == 'expense_void'
                    ? 'Void this expense to remove it from totals. Its change history remains available.'
                    : type == 'event_close'
                    ? 'A closed event remains available for reports. Reopen it before changing its details, receipts or expenses.'
                    : 'Reopen this event to correct its details, receipts or expenses.',
              ),
            if (type == 'expense_update' || (!metadata && !expense)) ...[
              const SizedBox(height: 12),
              _field('reason', 'Reason for this change'),
            ],
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton(
                  onPressed: widget.disabled ? null : widget.save,
                  child: Text(eventOperationLabels[type]!),
                ),
                OutlinedButton(
                  onPressed: widget.busy ? null : widget.close,
                  child: const Text('Close editor'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
