import 'package:flutter/material.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_payments.dart';

class SalesPaymentEditor extends StatelessWidget {
  const SalesPaymentEditor({
    super.key,
    required this.entries,
    required this.balance,
    required this.disabled,
    required this.onChanged,
  });
  final List<Map<String, dynamic>> entries;
  final int balance;
  final bool disabled;
  final ValueChanged<List<Map<String, dynamic>>> onChanged;

  @override
  Widget build(BuildContext context) {
    final remaining =
        balance.abs() -
        entries.fold<int>(0, (n, e) => n + (e['amountMinor'] as int));
    String? error;
    var change = 0;
    try {
      change = salesPaymentSnapshot(entries, balance)['changeMinor'] as int;
    } catch (_) {
      error =
          'Payments must cover the exact balance. Only incoming cash can include change.';
    }
    void update(int i, Map<String, dynamic> patch) => onChanged([
      for (var n = 0; n < entries.length; n++)
        n == i ? {...entries[n], ...patch} : entries[n],
    ]);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          balance < 0
              ? 'Record how you paid the customer.'
              : balance == 0
              ? 'Even trade — no money exchanged.'
              : 'Record amounts collected outside Grookai.',
        ),
        for (var i = 0; i < entries.length; i++)
          Card(
            key: ValueKey(entries[i]['method']),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: entries[i]['method'] as String,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: 'Payment ${i + 1} method',
                    ),
                    items: salesTenderMethods
                        .where(
                          (m) =>
                              m == entries[i]['method'] ||
                              !entries.any((e) => e['method'] == m),
                        )
                        .map((m) => DropdownMenuItem(value: m, child: Text(m)))
                        .toList(),
                    onChanged: disabled
                        ? null
                        : (method) => update(i, {
                            'method': method!,
                            'tenderedMinor': entries[i]['amountMinor'],
                          }),
                  ),
                  TextFormField(
                    initialValue: saleMoney(entries[i]['amountMinor'] as int),
                    enabled: !disabled,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: InputDecoration(
                      labelText: balance < 0
                          ? 'Amount paid (USD)'
                          : 'Amount applied (USD)',
                    ),
                    onChanged: (value) {
                      final n = saleMoneyInput(value) ?? 0, e = entries[i];
                      update(i, {
                        'amountMinor': n,
                        'tenderedMinor':
                            e['tenderedMinor'] == e['amountMinor'] ||
                                e['method'] != 'Cash' ||
                                balance <= 0
                            ? n
                            : (e['tenderedMinor'] as int) < n
                            ? n
                            : e['tenderedMinor'],
                      });
                    },
                  ),
                  if (entries[i]['method'] == 'Cash' && balance > 0)
                    TextFormField(
                      key: ValueKey(entries[i]['amountMinor']),
                      initialValue: saleMoney(
                        entries[i]['tenderedMinor'] as int,
                      ),
                      enabled: !disabled,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Cash handed to you (USD)',
                      ),
                      onChanged: (value) => update(i, {
                        'tenderedMinor': saleMoneyInput(value) ?? 0,
                      }),
                    ),
                  TextButton(
                    onPressed: disabled
                        ? null
                        : () => onChanged([
                            for (var n = 0; n < entries.length; n++)
                              if (n != i) entries[n],
                          ]),
                    child: const Text('Remove payment'),
                  ),
                ],
              ),
            ),
          ),
        if (entries.length < 4 && balance != 0)
          OutlinedButton.icon(
            onPressed: disabled
                ? null
                : () {
                    final amount = remaining > 0 ? remaining : 0;
                    onChanged([
                      ...entries,
                      {
                        'method': salesTenderMethods.firstWhere(
                          (m) => !entries.any((e) => e['method'] == m),
                        ),
                        'amountMinor': amount,
                        'tenderedMinor': amount,
                      },
                    ]);
                  },
            icon: const Icon(Icons.add),
            label: const Text('Add payment method'),
          ),
        Text(
          remaining > 0
              ? 'Still to allocate: USD ${saleMoney(remaining)}'
              : remaining < 0
              ? 'Overallocated: USD ${saleMoney(-remaining)}'
              : 'Balance covered',
        ),
        if (change > 0)
          Text(
            'Give USD ${saleMoney(change)} cash change',
            style: Theme.of(context).textTheme.titleMedium,
          ),
        if (error != null)
          Text(
            error,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
      ],
    );
  }
}
