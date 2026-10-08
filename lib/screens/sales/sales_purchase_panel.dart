import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/sales/purchase_drafts.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_purchase.dart';
import '../../services/sales/sales_payments.dart';
import 'sales_payment_editor.dart';
import 'sales_purchase_dialog.dart';

class SalesPurchasePanel extends StatefulWidget {
  const SalesPurchasePanel({
    super.key,
    required this.draft,
    required this.service,
    required this.edit,
    required this.onReview,
    required this.locked,
    required this.busy,
    required this.pending,
    required this.available,
    required this.customers,
  });
  final Map<String, dynamic> draft;
  final SalesCartService service;
  final Future<void> Function(
    Map<String, dynamic> Function(Map<String, dynamic>),
  )
  edit;
  final VoidCallback onReview;
  final bool locked, busy, pending, available;
  final List<Map<String, dynamic>> customers;
  @override
  State<SalesPurchasePanel> createState() => _SalesPurchasePanelState();
}

class _SalesPurchasePanelState extends State<SalesPurchasePanel> {
  String? _error;
  bool _dialogOpen = false;
  bool get _disabled => widget.locked || !widget.available || _dialogOpen;

  Future<void> _edit(
    Map<String, dynamic> Function(Map<String, dynamic>) update,
  ) async {
    if (_disabled) return;
    try {
      await widget.edit(update);
      if (mounted) setState(() => _error = null);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _item({int? index, bool quick = false}) async {
    if (_disabled) return;
    setState(() => _dialogOpen = true);
    final line = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => SalesPurchaseDialog(
        service: widget.service,
        quick: quick,
        line: index == null
            ? null
            : Map<String, dynamic>.from(
                (widget.draft['items'] as List)[index] as Map,
              ),
        canAdd: () => mounted && !widget.locked && widget.available,
      ),
    );
    if (!mounted) return;
    setState(() => _dialogOpen = false);
    if (line == null || _disabled) return;
    await _edit((draft) {
      if (index == null) return addPurchaseItem(draft, line);
      final items = List<dynamic>.from(draft['items'] as List);
      if (index >= items.length) {
        throw StateError('The purchase changed. Reopen the item.');
      }
      items[index] = line;
      return validatePurchaseDraft({...draft, 'items': items});
    });
  }

  Future<void> _sellerView() async {
    final view = purchaseOfferView(widget.draft);
    await showDialog<void>(
      context: context,
      // A seller-facing view must hide private offer references behind the dialog.
      barrierColor: Theme.of(context).colorScheme.surface,
      builder: (context) => AlertDialog(
        title: Text(view['storeName'] as String),
        content: SizedBox(
          width: 500,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('YOUR OFFER'),
                const SizedBox(height: 16),
                for (final line in view['items'] as List)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(line['description'] as String),
                    subtitle: Text(
                      '${line['quantity']} × USD ${saleMoney(line['unitMinor'] as int)}',
                    ),
                    trailing: Text(
                      'USD ${saleMoney((line['unitMinor'] as int) * (line['quantity'] as int))}',
                    ),
                  ),
                Text(
                  'You receive USD ${saleMoney(view['purchaseMinor'] as int)}',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                const Text('Offer preview · payout not confirmed'),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close seller view'),
          ),
        ],
      ),
    );
  }

  Widget _field(String label, String field, int max, {bool customer = false}) {
    final person = widget.draft['customer'] as Map;
    return TextFormField(
      key: ValueKey(
        '${widget.draft['id']}:${customer ? widget.draft['customerId'] : ''}:$field',
      ),
      initialValue: (customer ? person[field] : widget.draft[field]) as String,
      enabled: !_disabled && (!customer || widget.draft['customerId'] == null),
      maxLength: max,
      decoration: InputDecoration(labelText: label),
      onChanged: (value) => unawaited(
        _edit(
          (draft) => customer
              ? {
                  ...draft,
                  'customer': {...draft['customer'] as Map, field: value},
                }
              : {...draft, field: value},
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final draft = widget.draft, total = purchaseDraftTotal(draft);
    final items = (draft['items'] as List).cast<Map>();
    final person = draft['customer'] as Map,
        customerId = draft['customerId'] as String?;
    final payments = (draft['payments'] as List?)
        ?.map((entry) => Map<String, dynamic>.from(entry as Map))
        .toList();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        if (!widget.available)
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Text(
              'New purchases are unavailable. Your held offer is kept and pending purchases can still be recovered.',
            ),
          ),
        Row(
          children: [
            Expanded(
              child: Text(
                'Your purchase',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            TextButton.icon(
              onPressed: widget.busy ? null : _sellerView,
              icon: const Icon(Icons.visibility_outlined),
              label: const Text('Seller view'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton.icon(
              onPressed: _disabled ? null : () => _item(),
              icon: const Icon(Icons.search),
              label: const Text('Find incoming card'),
            ),
            OutlinedButton.icon(
              onPressed: _disabled ? null : () => _item(quick: true),
              icon: const Icon(Icons.add),
              label: const Text('Quick purchase'),
            ),
          ],
        ),
        if (widget.pending)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'This purchase needs verification. Recover the saved request before starting another.',
            ),
          ),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Text('Add the cards or items you are buying.'),
          ),
        for (var index = 0; index < items.length; index++)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    items[index]['description'] as String,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    '${items[index]['quantity']} × USD ${saleMoney(items[index]['unitMinor'] as int)} · ${items[index]['condition'] ?? 'Quick purchase'}',
                  ),
                  Text(
                    items[index]['addToVault'] == true
                        ? 'Adds one Vault copy on completion'
                        : 'Receipt only',
                  ),
                  if (items[index]['referenceMinor'] != null)
                    Text(
                      'Reference USD ${saleMoney(items[index]['referenceMinor'] as int)} × ${(items[index]['rateBps'] as int) / 100}%${items[index]['unitMinor'] != purchaseOffer(items[index]['referenceMinor'], items[index]['rateBps']) ? ' · Agreed price overridden' : ''}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  Wrap(
                    spacing: 8,
                    children: [
                      TextButton.icon(
                        onPressed: _disabled ? null : () => _item(index: index),
                        icon: const Icon(Icons.edit_outlined),
                        label: const Text('Edit purchase item'),
                      ),
                      TextButton.icon(
                        onPressed: _disabled
                            ? null
                            : () => unawaited(
                                _edit(
                                  (value) => {
                                    ...value,
                                    'items': [
                                      for (
                                        var i = 0;
                                        i < (value['items'] as List).length;
                                        i++
                                      )
                                        if (i != index)
                                          (value['items'] as List)[i],
                                    ],
                                  },
                                ),
                              ),
                        icon: const Icon(Icons.close),
                        label: const Text('Remove item'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ExpansionTile(
          title: Text(
            (person['name'] as String).isEmpty
                ? 'Add seller · optional'
                : person['name'] as String,
          ),
          children: [
            DropdownButtonFormField<String>(
              key: ValueKey('customer:$customerId'),
              initialValue: customerId ?? '',
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Saved contact'),
              items: [
                const DropdownMenuItem(
                  value: '',
                  child: Text('New / walk-up seller'),
                ),
                if (customerId != null &&
                    !widget.customers.any(
                      (customer) => customer['id'] == customerId,
                    ))
                  DropdownMenuItem(
                    value: customerId,
                    child: Text(
                      (person['name'] as String).isEmpty
                          ? 'Saved seller'
                          : person['name'] as String,
                    ),
                  ),
                for (final customer in widget.customers)
                  DropdownMenuItem(
                    value: customer['id'] as String,
                    child: Text(
                      (customer['name'] as String).isEmpty
                          ? customer['email'] as String
                          : customer['name'] as String,
                    ),
                  ),
              ],
              onChanged: _disabled
                  ? null
                  : (id) => unawaited(
                      _edit((value) {
                        final selected = widget.customers
                            .where((customer) => customer['id'] == id)
                            .firstOrNull;
                        return {
                          ...value,
                          'customerId': selected?['id'],
                          'customer': {
                            for (final key in [
                              'name',
                              'email',
                              'phone',
                              'wants',
                              'notes',
                            ])
                              key: selected?[key] ?? '',
                          },
                        };
                      }),
                    ),
            ),
            _field('Seller name', 'name', 120, customer: true),
            _field('Seller email', 'email', 254, customer: true),
            _field('Seller phone', 'phone', 40, customer: true),
          ],
        ),
        ExpansionTile(
          title: const Text('Store & private note'),
          children: [
            _field('Store name', 'storeName', 120),
            _field('Private purchase note', 'note', 500),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          'You pay seller: USD ${saleMoney(total)}',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: const Text('Split payout'),
          value: payments != null,
          onChanged: _disabled
              ? null
              : (enabled) => unawaited(
                  _edit((value) {
                    final next = Map<String, dynamic>.from(value);
                    if (enabled) {
                      final amount = purchaseDraftTotal(value);
                      next['payments'] = [
                        {
                          'method': value['method'],
                          'amountMinor': amount,
                          'tenderedMinor': amount,
                        },
                      ];
                    } else {
                      next.remove('payments');
                    }
                    return next;
                  }),
                ),
        ),
        if (payments != null)
          SalesPaymentEditor(
            entries: payments,
            balance: -total,
            disabled: _disabled,
            payoutRecipient: 'seller',
            onChanged: (entries) =>
                unawaited(_edit((value) => {...value, 'payments': entries})),
          )
        else
          DropdownButtonFormField<String>(
            key: ValueKey('method:${draft['method']}'),
            initialValue: draft['method'] as String,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Payout method'),
            items: salesTenderMethods
                .map(
                  (method) =>
                      DropdownMenuItem(value: method, child: Text(method)),
                )
                .toList(),
            onChanged: _disabled
                ? null
                : (method) => unawaited(
                    _edit((value) => {...value, 'method': method!}),
                  ),
          ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed:
              widget.busy || (!widget.pending && (_disabled || items.isEmpty))
              ? null
              : widget.onReview,
          icon: widget.busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.check),
          label: Text(
            widget.pending ? 'Recover this purchase' : 'Review purchase',
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Held offers stay on this device. Payment is made outside Grookai.',
        ),
      ],
    );
  }
}
