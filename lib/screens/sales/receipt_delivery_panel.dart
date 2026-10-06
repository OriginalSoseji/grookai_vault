import 'package:flutter/material.dart';
import '../../services/sales/receipt_delivery_service.dart';
import '../../services/sales/sales_cart_service.dart' show newSaleId;

class ReceiptDeliveryPanel extends StatefulWidget {
  const ReceiptDeliveryPanel({
    super.key,
    required this.receiptId,
    this.email = '',
    this.phone = '',
    this.service,
  });
  final String receiptId, email, phone;
  final ReceiptDeliveryService? service;
  @override
  State<ReceiptDeliveryPanel> createState() => _ReceiptDeliveryPanelState();
}

class _ReceiptDeliveryPanelState extends State<ReceiptDeliveryPanel> {
  late final service = widget.service ?? ReceiptDeliveryService();
  late final email = TextEditingController(text: widget.email);
  late final phone = TextEditingController(text: widget.phone);
  final requests = <String, String>{};
  bool loading = true,
      busy = false,
      confirmed = false,
      emailEnabled = false,
      smsEnabled = false;
  String? error;
  List<Map<String, dynamic>> rows = [];
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final capabilities = await service.capabilities();
      final records = await service.read(widget.receiptId);
      if (!mounted) return;
      setState(() {
        emailEnabled = capabilities.email;
        smsEnabled = capabilities.sms;
        rows = records;
      });
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Direct sending is unavailable. Your receipt is saved; you can still Share or copy it.',
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _send(String channel) async {
    if (busy || !confirmed) return;
    final destination = (channel == 'email' ? email.text : phone.text).trim();
    final key = '$channel\n$destination';
    final id = requests.putIfAbsent(key, newSaleId);
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await service.send(
        receiptId: widget.receiptId,
        requestId: id,
        channel: channel,
        destination: destination,
      );
      if (mounted) setState(() => rows = result);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Delivery is unconfirmed. Check the destination and delivery status before trying again.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> _refresh() async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await service.read(widget.receiptId, refresh: true);
      if (mounted) setState(() => rows = result);
    } catch (_) {
      if (mounted) {
        setState(
          () => error =
              'Delivery status could not be refreshed. No message was resent.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    email.dispose();
    phone.dispose();
    if (widget.service == null) service.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Send directly from Grookai',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          if (loading)
            const Padding(
              padding: EdgeInsets.all(12),
              child: LinearProgressIndicator(),
            ),
          if (!loading && (emailEnabled || smsEnabled)) ...[
            const Text('Check the destination before sending this receipt.'),
            if (emailEnabled)
              TextField(
                controller: email,
                enabled: !busy,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Receipt email'),
                onChanged: (_) => setState(() => confirmed = false),
              ),
            if (smsEnabled)
              TextField(
                controller: phone,
                enabled: !busy,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Receipt phone',
                  helperText: 'Include + and country code',
                ),
                onChanged: (_) => setState(() => confirmed = false),
              ),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text(
                'The customer requested this receipt and I checked the destination.',
              ),
              value: confirmed,
              onChanged: busy
                  ? null
                  : (v) => setState(() => confirmed = v == true),
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (emailEnabled)
                  FilledButton(
                    onPressed: busy || !confirmed ? null : () => _send('email'),
                    child: const Text('Send email receipt'),
                  ),
                if (smsEnabled)
                  OutlinedButton(
                    onPressed: busy || !confirmed ? null : () => _send('sms'),
                    child: const Text('Send text receipt'),
                  ),
              ],
            ),
          ],
          if (!loading && !emailEnabled && !smsEnabled && error == null)
            const Text(
              'Direct sending is not available yet. Use Share or copy the receipt.',
            ),
          if (error != null) Semantics(liveRegion: true, child: Text(error!)),
          for (final row in rows)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                '${row['destination']}\n${receiptDeliveryStatus(row['status'] as String)}',
              ),
            ),
          if (!loading)
            TextButton(
              onPressed: busy ? null : _refresh,
              child: const Text('Check delivery status'),
            ),
        ],
      ),
    ),
  );
}
