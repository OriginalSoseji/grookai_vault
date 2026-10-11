import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';

class SalesOfferPresets extends StatefulWidget {
  const SalesOfferPresets({
    super.key,
    required this.service,
    required this.select,
    this.disabled = false,
  });
  final SalesCartService service;
  final ValueChanged<int> select;
  final bool disabled;
  @override
  State<SalesOfferPresets> createState() => _SalesOfferPresetsState();
}

class _SalesOfferPresetsState extends State<SalesOfferPresets> {
  Map<String, dynamic>? _book;
  final _name = TextEditingController(), _rate = TextEditingController();
  String? _editing, _error;
  bool _busy = false, _closed = false;
  StreamSubscription<void>? _account;
  @override
  void initState() {
    super.initState();
    _account = widget.service.accountChanges.listen((_) {
      if (mounted) {
        setState(() {
          _closed = true;
          _book = null;
          _name.clear();
          _rate.clear();
        });
      }
    });
    unawaited(_load());
  }

  @override
  void dispose() {
    unawaited(_account?.cancel());
    _name.dispose();
    _rate.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (_closed || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final book = await widget.service.loadOfferPresets();
      if (mounted && !_closed) {
        setState(() {
          _book = book;
          _editing = null;
          _name.clear();
          _rate.clear();
        });
      }
    } catch (_) {
      if (mounted && !_closed) {
        setState(() {
          _book = null;
          _error =
              'Offer presets could not load. Saved data has been kept. You can enter a percentage manually.';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save(List<Map<String, dynamic>> presets) async {
    if (_book == null || _busy || _closed || widget.disabled) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final book = await widget.service.saveOfferPresets(
        _book!['revision'] as int,
        presets,
      );
      if (mounted && !_closed) {
        setState(() {
          _book = book;
          _editing = null;
          _name.clear();
          _rate.clear();
        });
      }
    } catch (_) {
      if (mounted && !_closed) {
        setState(
          () => _error =
              'Offer presets could not save or changed in another screen. Reload presets before retrying.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  List<Map<String, dynamic>> get _presets =>
      (_book?['presets'] as List? ?? []).cast<Map<String, dynamic>>();
  void _submit() {
    final rate = tradeRateInput(_rate.text);
    if (_name.text.trim().isEmpty || rate == null || rate < 1 || rate > 10000) {
      setState(
        () => _error = 'Enter a preset name and percentage from 0.01–100%.',
      );
      return;
    }
    final preset = {
      'id': _editing ?? newSaleId(),
      'name': _name.text,
      'rateBps': rate,
    };
    unawaited(
      _save(
        _editing == null
            ? [..._presets, preset]
            : _presets
                  .map((value) => value['id'] == _editing ? preset : value)
                  .toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_closed) {
      return const Text('Your account changed. Reopen the sales desk.');
    }
    final locked = widget.disabled || _busy;
    return ExpansionTile(
      title: const Text('Offer presets'),
      children: [
        const Padding(
          padding: EdgeInsets.all(8),
          child: Text(
            'Private · saved on this device for this account. Using a preset changes the percentage; your agreed price stays as entered.',
          ),
        ),
        if (_error != null) ...[
          Text(_error!, semanticsLabel: _error),
          TextButton(
            onPressed: locked ? null : _load,
            child: const Text('Reload presets'),
          ),
        ],
        if (_busy) const LinearProgressIndicator(),
        if (_book != null) ...[
          if (_presets.isEmpty) const Text('No saved presets yet.'),
          for (final preset in _presets)
            Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${preset['name']} · ${tradeRate(preset['rateBps'] as int)}%',
                  ),
                  Wrap(
                    children: [
                      TextButton(
                        onPressed: locked
                            ? null
                            : () => widget.select(preset['rateBps'] as int),
                        child: Text('Use ${preset['name']}'),
                      ),
                      TextButton(
                        onPressed: locked
                            ? null
                            : () => setState(() {
                                _editing = preset['id'] as String;
                                _name.text = preset['name'] as String;
                                _rate.text = tradeRate(
                                  preset['rateBps'] as int,
                                );
                              }),
                        child: Text('Edit ${preset['name']}'),
                      ),
                      TextButton(
                        onPressed: locked
                            ? null
                            : () => _save(
                                _presets
                                    .where(
                                      (value) => value['id'] != preset['id'],
                                    )
                                    .toList(),
                              ),
                        child: Text('Delete ${preset['name']}'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          TextField(
            controller: _name,
            enabled: !locked,
            maxLength: 80,
            decoration: const InputDecoration(labelText: 'Preset name'),
          ),
          TextField(
            controller: _rate,
            enabled: !locked,
            maxLength: 6,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Preset percentage',
              suffixText: '%',
            ),
          ),
          TextButton(
            onPressed: locked || (_editing == null && _presets.length >= 20)
                ? null
                : _submit,
            child: Text(
              _editing == null ? 'Save new preset' : 'Save preset changes',
            ),
          ),
          if (_editing != null)
            TextButton(
              onPressed: locked
                  ? null
                  : () => setState(() {
                      _editing = null;
                      _name.clear();
                      _rate.clear();
                    }),
              child: const Text('Cancel preset edit'),
            ),
          Text(
            '${_presets.length}/20 presets. Changes apply only when you choose a preset again.',
          ),
        ],
      ],
    );
  }
}
