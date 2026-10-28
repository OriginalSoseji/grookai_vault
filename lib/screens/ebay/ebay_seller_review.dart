import 'package:flutter/material.dart';
import '../../services/ebay/ebay_seller_controller.dart';

String sellerStateLabel(dynamic state) =>
    const {
      'editing': 'Draft',
      'preparing': 'Preparing',
      'prepared': 'Ready for review',
      'publishing': 'Publishing',
      'live': 'Live on eBay',
      'withdrawn': 'Listing ended',
      'ended': 'Listing ended',
      'sale_reported': 'Sale reported',
      'sold': 'Sale recorded',
      'uncertain': 'Check eBay status',
      'abandoned': 'Discarded',
    }[state] ??
    'New draft';
String sellerMoney(dynamic cents) =>
    cents is num ? 'USD ${(cents / 100).toStringAsFixed(2)}' : 'Unknown';

class EbaySellerReview extends StatefulWidget {
  const EbaySellerReview({
    super.key,
    required this.controller,
    required this.nowMillis,
  });
  final EbaySellerController controller;
  final int nowMillis;
  @override
  State<EbaySellerReview> createState() => _EbaySellerReviewState();
}

class _EbaySellerReviewState extends State<EbaySellerReview> {
  bool _confirmed = false, _saleConfirmed = false;
  final _salePrice = TextEditingController();
  String? _reviewSignature;
  EbaySellerController get model => widget.controller;
  @override
  void initState() {
    super.initState();
    _synchronizeReview();
  }

  void _synchronizeReview() {
    final signature =
        '${model.draft['id']}:${model.draft['revision']}:${model.draft['reviewHash']}:${model.draft['state']}:${model.local?.dirty}';
    if (_reviewSignature != signature) {
      _confirmed = false;
      _saleConfirmed = false;
      _reviewSignature = signature;
    }
    final pending = model.local?.pending;
    if (_salePrice.text.isEmpty &&
        pending?['action'] == 'record_sale' &&
        pending?['salePriceCents'] is num) {
      _salePrice.text = ((pending!['salePriceCents'] as num) / 100)
          .toStringAsFixed(2);
    }
  }

  @override
  void didUpdateWidget(covariant EbaySellerReview oldWidget) {
    super.didUpdateWidget(oldWidget);
    _synchronizeReview();
  }

  @override
  void dispose() {
    _salePrice.dispose();
    super.dispose();
  }

  Widget _line(
    BuildContext context,
    String label,
    String value, {
    bool market = false,
  }) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontSize: 13,
              color: market ? Theme.of(context).colorScheme.tertiary : null,
            ),
          ),
        ),
      ],
    ),
  );
  Widget _button(
    String label,
    VoidCallback? action, {
    bool primary = false,
    IconData? icon,
  }) => Padding(
    padding: const EdgeInsets.only(top: 10),
    child: primary
        ? FilledButton.icon(
            onPressed: action,
            icon: Icon(icon ?? Icons.arrow_outward_rounded, size: 17),
            label: Text(label),
          )
        : OutlinedButton(onPressed: action, child: Text(label)),
  );
  @override
  Widget build(BuildContext context) {
    final draft = model.draft;
    final state = draft['state'];
    final busy = model.busy != null;
    final quote = sellerMap(draft['feeQuote']);
    final requestedAt = quote['requestedAt'];
    final currentQuote =
        requestedAt is num &&
        widget.nowMillis >= requestedAt &&
        widget.nowMillis - requestedAt <= 120000;
    final pendingPreparation = model.operations.where(
      (op) => op['kind'] == 'prepare' && op['status'] == 'running',
    );
    final recorded = sellerMap(draft['recordedSale']);
    final hint = TextStyle(
      fontSize: 13,
      height: 1.5,
      color: Theme.of(context).colorScheme.onSurfaceVariant,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          state == 'sold'
              ? 'Sale recorded'
              : state == 'prepared'
              ? 'Review your listing'
              : 'Listing summary',
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        Text(
          recorded['priceCents'] is num
              ? sellerMoney(recorded['priceCents'])
              : (model.local?.input['priceCents'] as num? ?? 0) > 0
              ? sellerMoney(model.local!.input['priceCents'])
              : 'Set your price',
          style: Theme.of(
            context,
          ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 16),
        _line(context, 'Quantity', '1 exact copy'),
        _line(context, 'Marketplace', 'eBay US'),
        _line(context, 'Format', 'Fixed price'),
        for (final fee in sellerRows(quote['fees']))
          _line(
            context,
            fee['type']?.toString() ?? 'Listing fee',
            '${sellerMoney(sellerMap(fee['amount'])['cents'])}${fee['promotionalDiscount'] is Map ? ' · ${sellerMoney(sellerMap(fee['promotionalDiscount'])['cents'])} discount' : ''}',
            market: true,
          ),
        if (quote.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(
              'eBay’s estimated listing fees. Final selling fees and net proceeds are not included.',
              style: hint,
            ),
          ),
        if (state == 'prepared') ...[
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(
              currentQuote
                  ? 'Fee quote is current.'
                  : 'The fee quote expired. Edit and prepare again to refresh it.',
              style: hint,
            ),
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _confirmed,
            onChanged: busy || !currentQuote
                ? null
                : (v) => setState(() => _confirmed = v == true),
            title: const Text(
              'I reviewed this exact copy, its photos, condition, price and selling policies.',
              style: TextStyle(fontSize: 13),
            ),
          ),
          _button(
            'Publish on eBay',
            !busy &&
                    _confirmed &&
                    currentQuote &&
                    model.account['publicationEnabled'] == true
                ? () => model.operate('publish', confirmed: true)
                : null,
            primary: true,
          ),
          _button('Edit draft', busy ? null : () => model.operate('edit')),
        ],
        if (model.editable) ...[
          _button(
            'Save draft',
            !busy && model.account['preparationEnabled'] == true
                ? model.save
                : null,
          ),
          _button(
            'Prepare listing',
            !busy &&
                    model.account['preparationEnabled'] == true &&
                    model.metadata.isNotEmpty &&
                    sellerRows(draft['photos']).isNotEmpty &&
                    model.local?.pendingPhoto == null
                ? () => model.operate('prepare')
                : null,
            primary: true,
            icon: Icons.fact_check_outlined,
          ),
          const SizedBox(height: 8),
          Text(
            'Preparation creates an unpublished offer for review.',
            style: hint,
          ),
        ],
        if (state == 'preparing' && pendingPreparation.isNotEmpty)
          _button(
            pendingPreparation.first['continuationReady'] == true
                ? 'Continue preparation'
                : 'Check preparation status',
            busy
                ? null
                : () {
                    final op = pendingPreparation.first;
                    model.operate(
                      'prepare',
                      continuation: {
                        'action': 'prepare',
                        'requestId': op['requestId'],
                        'operationId': op['id'],
                        'revision': op['expectedRevision'],
                      },
                    );
                  },
            primary: pendingPreparation.first['continuationReady'] == true,
          ),
        if (['live', 'uncertain'].contains(state))
          _button(
            'End eBay listing',
            busy || draft['listingId'] == null
                ? null
                : () => model.operate('withdraw', confirmed: true),
          ),
        if ([
          'preparing',
          'publishing',
          'live',
          'uncertain',
          'sale_reported',
        ].contains(state))
          _button(
            state == 'sale_reported'
                ? 'Verify ended sale'
                : 'Check eBay status',
            busy ? null : () => model.operate('reconcile'),
          ),
        if (state == 'sale_reported') ...[
          const SizedBox(height: 12),
          Text(
            'Verify the listing ended, then enter the actual completed sale price to record it in your Vault.',
            style: hint,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _salePrice,
            enabled: !busy && model.local?.pending?['action'] != 'record_sale',
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Actual sale price · USD',
            ),
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _saleConfirmed,
            onChanged: busy
                ? null
                : (v) => setState(() => _saleConfirmed = v == true),
            title: const Text(
              'I confirmed this sale completed and entered its actual sale price.',
              style: TextStyle(fontSize: 13),
            ),
          ),
          _button(
            'Record eBay sale',
            busy || !_saleConfirmed
                ? null
                : () {
                    final raw = _salePrice.text.trim();
                    if (!RegExp(r'^\d{1,7}(?:\.\d{1,2})?$').hasMatch(raw)) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Enter the actual sale price in USD.'),
                        ),
                      );
                      return;
                    }
                    final parts = raw.split('.');
                    final cents =
                        int.parse(parts[0]) * 100 +
                        int.parse(
                          (parts.length > 1 ? parts[1] : '').padRight(2, '0'),
                        );
                    model.operate(
                      'record_sale',
                      confirmed: true,
                      salePriceCents: cents,
                    );
                  },
            primary: true,
            icon: Icons.receipt_long_outlined,
          ),
        ],
        if (state == 'sold')
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(
              'Saved in your existing Vault sale history. Actual selling fees and net proceeds are not inferred.',
              style: hint,
            ),
          ),
        if (['withdrawn', 'ended', 'abandoned'].contains(state) &&
            model.copy['isArchived'] != true)
          _button('Start a new listing', busy ? null : model.startNewDraft),
        if (['editing', 'prepared', 'uncertain'].contains(state))
          _button(
            'Discard draft',
            busy ? null : () => model.operate('abandon'),
          ),
        if (['withdrawn', 'ended'].contains(state))
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(
              'eBay confirmed the listing ended. This copy remains in your Vault.',
              style: hint,
            ),
          ),
      ],
    );
  }
}
