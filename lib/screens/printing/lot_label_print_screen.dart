import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/navigation/grookai_web_route_service.dart';
import '../../services/printing/lot_p21_label.dart';
import '../../services/printing/p21_label.dart';
import '../../services/printing/p21_printer_service.dart';

class LotLabelPrintScreen extends StatefulWidget {
  const LotLabelPrintScreen({
    super.key,
    required this.lotName,
    this.groupName = 'Lot',
    this.price = 1,
    this.condition = 'NM',
    this.quantity = 1,
    this.lotUri,
    this.printer = const P21PrinterService(),
  });

  final String lotName;
  final String groupName;
  final double price;
  final String condition;
  final int quantity;
  final Uri? lotUri;
  final P21PrinterService printer;

  @override
  State<LotLabelPrintScreen> createState() => _LotLabelPrintScreenState();
}

class _LotLabelPrintScreenState extends State<LotLabelPrintScreen> {
  late final TextEditingController _lotName;
  late final TextEditingController _groupName;
  late final TextEditingController _price;
  late final TextEditingController _quantity;
  late String _condition;
  bool _includeLogo = true;
  bool _includeQr = true;
  P21Label? _label;
  List<P21Device> _devices = [];
  P21Device? _selected;
  P21Status? _status;
  String? _error;
  String? _renderError;
  String? _message;
  bool _busy = false;
  bool _printing = false;
  bool _searched = false;
  int _printed = 0;
  String? _lotPublicId;
  String? _lotRecordSlug;

  @override
  void initState() {
    super.initState();
    _lotName = TextEditingController(text: widget.lotName);
    _groupName = TextEditingController(text: widget.groupName);
    _price = TextEditingController(text: widget.price.toStringAsFixed(2));
    _quantity = TextEditingController(text: widget.quantity.toString());
    _condition = widget.condition;
    for (final controller in [_lotName, _groupName, _price, _quantity]) {
      controller.addListener(_scheduleRender);
    }
    unawaited(_render());
  }

  @override
  void dispose() {
    for (final controller in [_lotName, _groupName, _price, _quantity]) {
      controller
        ..removeListener(_scheduleRender)
        ..dispose();
    }
    unawaited(widget.printer.disconnect().catchError((Object _) {}));
    super.dispose();
  }

  void _scheduleRender() {
    if (_lotRecordSlug != null && _lotRecordSlug != _lotSlug()) {
      _lotPublicId = null;
      _lotRecordSlug = null;
    }
    unawaited(_render());
  }

  Uri get _lotUri {
    if (widget.lotUri != null) return widget.lotUri!;
    if ((_lotPublicId ?? '').trim().isNotEmpty) {
      return GrookaiWebRouteService.buildUri('/lots/$_lotPublicId');
    }
    return GrookaiWebRouteService.buildUri('/lots/${_lotSlug()}');
  }

  String _lotSlug() {
    final slug = _lotName.text
        .trim()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    return slug.isEmpty ? 'lot' : slug;
  }

  double get _priceValue => double.tryParse(_price.text.trim()) ?? 0;

  int get _quantityValue {
    final value = int.tryParse(_quantity.text.trim()) ?? 0;
    return value.clamp(1, 999);
  }

  Future<void> _render() async {
    try {
      final label = await LotP21Label.render(
        LotP21LabelContent(
          lotName: _lotName.text.trim(),
          groupName: _groupName.text.trim(),
          price: _priceValue <= 0
              ? r'$0.00'
              : '\$${_priceValue.toStringAsFixed(2)}',
          condition: _condition,
          qrUri: _lotUri,
          includeLogo: _includeLogo,
          includeQr: _includeQr,
        ),
      );
      if (!mounted) return;
      setState(() {
        _label = label;
        _renderError = null;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _label = null;
        _renderError = error.toString().replaceFirst('FormatException: ', '');
      });
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _message = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _printing = false;
        });
      }
    }
  }

  Future<void> _scan() => _run(() async {
    await widget.printer.disconnect();
    if (!mounted) return;
    setState(() {
      _selected = null;
      _status = null;
      _devices = [];
    });
    final devices = await widget.printer.scan();
    if (mounted) {
      setState(() {
        _devices = devices;
        _searched = true;
      });
    }
  });

  Future<void> _connect(P21Device device) => _run(() async {
    final status = await widget.printer.connect(device);
    if (mounted) {
      setState(() {
        _selected = device;
        _status = status;
      });
    }
  });

  Future<void> _refresh() => _run(() async {
    final status = await widget.printer.status();
    if (mounted) setState(() => _status = status);
  });

  Future<void> _print() => _run(() async {
    await _ensureLotRecord();
    final label = await _renderLabel();
    if (label == null) return;
    if (mounted) setState(() => _label = label);
    final quantity = _quantityValue;
    setState(() {
      _printing = true;
      _printed = 0;
    });
    for (var index = 0; index < quantity; index += 1) {
      await widget.printer.printLabel(label);
      if (mounted) setState(() => _printed = index + 1);
    }
    if (mounted) {
      setState(() => _message = 'Printed $quantity lot labels.');
    }
  });

  Future<P21Label?> _renderLabel() async {
    try {
      return await LotP21Label.render(
        LotP21LabelContent(
          lotName: _lotName.text.trim(),
          groupName: _groupName.text.trim(),
          price: _priceValue <= 0
              ? r'$0.00'
              : '\$${_priceValue.toStringAsFixed(2)}',
          condition: _condition,
          qrUri: _lotUri,
          includeLogo: _includeLogo,
          includeQr: _includeQr,
        ),
      );
    } catch (error) {
      if (mounted) {
        setState(
          () => _renderError = error.toString().replaceFirst(
            'FormatException: ',
            '',
          ),
        );
      }
      return null;
    }
  }

  Future<void> _ensureLotRecord() async {
    if (widget.lotUri != null || (_lotPublicId ?? '').trim().isNotEmpty) {
      return;
    }
    final client = Supabase.instance.client;
    final user = client.auth.currentUser;
    if (user == null) {
      throw StateError('Sign in before printing a trackable lot label.');
    }
    final slug = _lotSlug();
    final existing = await client
        .from('lot_label_lots')
        .select('public_id')
        .eq('owner_user_id', user.id)
        .eq('slug', slug)
        .maybeSingle();
    final publicId = (existing?['public_id'] ?? '').toString().trim();
    if (publicId.isNotEmpty) {
      if (mounted) {
        setState(() {
          _lotPublicId = publicId;
          _lotRecordSlug = slug;
        });
      }
      return;
    }
    final row = await client
        .from('lot_label_lots')
        .insert({
          'owner_user_id': user.id,
          'slug': slug,
          'name': _lotName.text.trim().isEmpty
              ? 'Binder lot'
              : _lotName.text.trim(),
        })
        .select('public_id')
        .single();
    final createdId = (row['public_id'] ?? '').toString().trim();
    if (createdId.isEmpty) {
      throw StateError('The lot record did not return a public link.');
    }
    if (mounted) {
      setState(() {
        _lotPublicId = createdId;
        _lotRecordSlug = slug;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final quantity = _quantityValue;
    final canPrint =
        !_busy &&
        _label != null &&
        _selected != null &&
        _status?.problem == null &&
        _priceValue >= 0;
    return PopScope(
      canPop: !_printing,
      child: Scaffold(
        appBar: AppBar(title: const Text('Lot labels')),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 28),
            children: [
              Text('P21 · 14 × 40 mm', style: theme.textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(
                'Lot-linked sticker. Scan the QR to record a sale against the lot without matching a canonical card.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _lotName,
                decoration: const InputDecoration(labelText: 'Lot name'),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextField(
                      controller: _groupName,
                      decoration: const InputDecoration(
                        labelText: 'Group name',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _condition,
                      decoration: const InputDecoration(labelText: 'Condition'),
                      items: const ['NM', 'LP', 'MP', 'HP', 'DMG']
                          .map(
                            (value) => DropdownMenuItem(
                              value: value,
                              child: Text(value),
                            ),
                          )
                          .toList(),
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() => _condition = value);
                        unawaited(_render());
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _price,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Price per label',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _quantity,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Quantity'),
                    ),
                  ),
                ],
              ),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: const Text('Logo'),
                value: _includeLogo,
                onChanged: (value) {
                  setState(() => _includeLogo = value);
                  unawaited(_render());
                },
              ),
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: const Text('Lot QR'),
                subtitle: Text(_lotUri.toString()),
                value: _includeQr,
                onChanged: (value) {
                  setState(() => _includeQr = value);
                  unawaited(_render());
                },
              ),
              const SizedBox(height: 4),
              if (_label != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: theme.dividerColor),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Image.memory(
                    _label!.previewPng,
                    filterQuality: FilterQuality.none,
                    fit: BoxFit.contain,
                    height: 112,
                  ),
                ),
              const SizedBox(height: 8),
              Text(
                'Small-label safe: two short text lines, readable price and condition, larger grookai logo, and a scan-ready lot QR.',
                style: theme.textTheme.bodySmall,
              ),
              const SizedBox(height: 20),
              OutlinedButton.icon(
                onPressed: _busy ? null : _scan,
                icon: const Icon(Icons.bluetooth_searching),
                label: const Text('Find P21'),
              ),
              if (_searched && _devices.isEmpty && !_busy)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text('No P21 found. Turn it on and try again.'),
                ),
              for (final device in _devices)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(device.name),
                  subtitle: Text(
                    _selected?.id == device.id ? 'Connected' : 'Tap to connect',
                  ),
                  trailing: _selected?.id == device.id
                      ? const Icon(Icons.check_circle)
                      : const Icon(Icons.chevron_right),
                  onTap: _busy ? null : () => _connect(device),
                ),
              if (_status != null) ...[
                Text(
                  'Loaded roll: ${_status!.widthMm} × ${_status!.lengthMm} mm',
                ),
                if (_status!.problem != null)
                  Text(
                    _status!.problem!,
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                TextButton(
                  onPressed: _busy ? null : _refresh,
                  child: const Text('Refresh printer status'),
                ),
              ],
              if (_busy) ...[
                const SizedBox(height: 10),
                const LinearProgressIndicator(),
                const SizedBox(height: 6),
                Text(
                  _printing
                      ? 'Sending label $_printed of $quantity…'
                      : 'Checking printer…',
                ),
              ],
              if (_renderError != null || _error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Text(
                    _renderError ?? _error!,
                    style: TextStyle(color: theme.colorScheme.error),
                  ),
                ),
              if (_message != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Text(_message!),
                ),
              const SizedBox(height: 10),
              FilledButton.icon(
                onPressed: canPrint ? _print : null,
                icon: const Icon(Icons.print_outlined),
                label: Text('Print $quantity labels'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
