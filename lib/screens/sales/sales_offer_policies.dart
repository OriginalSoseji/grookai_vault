import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/sales/offer_policies.dart';
import '../../services/sales/sales_cart_service.dart';
import '../../services/sales/sales_trade.dart';

class SalesOfferPolicies extends StatefulWidget {
  const SalesOfferPolicies({
    super.key,
    required this.service,
    required this.select,
    this.intent = 'cash',
    this.applyDefault = true,
    this.disabled = false,
  });
  final SalesCartService service;
  final ValueChanged<Map<String, dynamic>> select;
  final String intent;
  final bool applyDefault, disabled;
  @override
  State<SalesOfferPolicies> createState() => _SalesOfferPoliciesState();
}

class _SalesOfferPoliciesState extends State<SalesOfferPolicies> {
  Map<String, dynamic>? _book;
  final _name = TextEditingController(), _rate = TextEditingController();
  final _ceiling = TextEditingController(), _tierRate = TextEditingController();
  String? _editing, _error;
  String _intent = 'cash',
      _source = 'manual',
      _basis = 'selected',
      _mode = 'nearest';
  int _increment = 1;
  bool _tier = false, _busy = false, _closed = false, _initialized = false;
  StreamSubscription<void>? _account;
  @override
  void initState() {
    super.initState();
    _intent = widget.intent;
    _account = widget.service.accountChanges.listen((_) {
      if (mounted) {
        setState(() {
          _closed = true;
          _book = null;
          _reset();
        });
      }
    });
    unawaited(_load());
  }

  @override
  void dispose() {
    unawaited(_account?.cancel());
    for (final controller in [_name, _rate, _ceiling, _tierRate]) {
      controller.dispose();
    }
    super.dispose();
  }

  List<Map<String, dynamic>> get _policies =>
      (_book?['presets'] as List? ?? []).cast<Map<String, dynamic>>();
  Map<String, dynamic> get _defaults =>
      Map<String, dynamic>.from(_book!['defaults'] as Map);
  void _reset() {
    _editing = null;
    _name.clear();
    _rate.clear();
    _ceiling.clear();
    _tierRate.clear();
    _intent = widget.intent;
    _source = 'manual';
    _basis = 'selected';
    _mode = 'nearest';
    _increment = 1;
    _tier = false;
  }

  Future<void> _load() async {
    if (_closed || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final book = await widget.service.loadOfferPolicies();
      if (!mounted || _closed) return;
      setState(() {
        _book = book;
        _reset();
      });
      if (!_initialized) {
        _initialized = true;
        if (widget.applyDefault) {
          final matches = _policies.where(
            (value) => value['id'] == _defaults[widget.intent],
          );
          if (matches.isNotEmpty) widget.select(matches.single);
        }
      }
    } catch (_) {
      if (mounted && !_closed) {
        setState(() {
          _book = null;
          _error =
              'Offer policies could not load. Saved data has been kept. You can calculate an offer manually.';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _save(
    List<Map<String, dynamic>> policies,
    Map<String, dynamic> defaults,
  ) async {
    if (_book == null || _busy || _closed || widget.disabled) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final book = await widget.service.saveOfferPolicies(
        _book!['revision'] as int,
        policies,
        defaults,
      );
      if (mounted && !_closed) {
        setState(() {
          _book = book;
          _reset();
        });
      }
    } catch (_) {
      if (mounted && !_closed) {
        setState(
          () => _error =
              'Offer policies could not save or changed in another screen. Reload policies before retrying.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _submit() {
    if (_book == null || _closed || _busy || widget.disabled) return;
    try {
      final policy = validateOfferPolicy({
        'id': _editing ?? newSaleId(),
        'name': _name.text,
        'intent': _intent,
        'rateBps': tradeRateInput(_rate.text),
        'source': _source,
        'conditionBasis': _basis,
        'rounding': {'incrementMinor': _increment, 'mode': _mode},
        'lowValueTier': _tier
            ? {
                'ceilingMinor': saleMoneyInput(_ceiling.text),
                'rateBps': tradeRateInput(_tierRate.text),
              }
            : null,
      });
      final defaults = _defaults;
      for (final intent in ['cash', 'trade']) {
        if (defaults[intent] == policy['id'] && policy['intent'] != intent) {
          defaults[intent] = null;
        }
      }
      unawaited(
        _save(
          _editing == null
              ? [..._policies, policy]
              : _policies
                    .map((value) => value['id'] == _editing ? policy : value)
                    .toList(),
          defaults,
        ),
      );
    } catch (_) {
      setState(
        () => _error =
            'Enter a policy name, percentages from 0.01–100%, and a positive tier ceiling when enabled.',
      );
    }
  }

  void _edit(Map<String, dynamic> policy) {
    setState(() {
      _editing = policy['id'] as String;
      _name.text = policy['name'] as String;
      _rate.text = tradeRate(policy['rateBps'] as int);
      _intent = policy['intent'] as String;
      _source = policy['source'] as String;
      _basis = policy['conditionBasis'] as String;
      _mode = policy['rounding']['mode'] as String;
      _increment = policy['rounding']['incrementMinor'] as int;
      final tier = policy['lowValueTier'] as Map?;
      _tier = tier != null;
      _ceiling.text = tier == null
          ? ''
          : saleMoney(tier['ceilingMinor'] as int);
      _tierRate.text = tier == null ? '' : tradeRate(tier['rateBps'] as int);
    });
  }

  Widget _choice(
    String label,
    String value,
    Map<String, String> options,
    ValueChanged<String> change,
    bool locked,
  ) => DropdownButtonFormField<String>(
    key: ValueKey('$label:$value'),
    initialValue: value,
    isExpanded: true,
    decoration: InputDecoration(labelText: label),
    items: options.entries
        .map(
          (entry) =>
              DropdownMenuItem(value: entry.key, child: Text(entry.value)),
        )
        .toList(),
    onChanged: locked
        ? null
        : (next) {
            if (next != null) change(next);
          },
  );
  Widget _number(String label, TextEditingController controller, bool locked) =>
      TextField(
        controller: controller,
        enabled: !locked,
        maxLength: 10,
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(labelText: label),
      );
  @override
  Widget build(BuildContext context) {
    if (_closed) {
      return const Text('Your account changed. Reopen the sales desk.');
    }
    final locked = widget.disabled || _busy;
    return ExpansionTile(
      title: const Text('Offer policies'),
      childrenPadding: const EdgeInsets.all(8),
      children: [
        const Text(
          'Private · saved on this device for this account. Policies calculate a proposal; your agreed price stays as entered.',
        ),
        if (_error != null) ...[
          Text(_error!),
          TextButton(
            onPressed: locked ? null : _load,
            child: const Text('Reload policies'),
          ),
        ],
        if (_busy) const LinearProgressIndicator(),
        if (_book != null) ...[
          for (final intent in ['cash', 'trade'])
            _choice(
              'Default $intent policy',
              _defaults[intent] as String? ?? '',
              {
                '': 'No default',
                for (final policy in _policies.where(
                  (value) => value['intent'] == intent,
                ))
                  policy['id'] as String: policy['name'] as String,
              },
              (value) => unawaited(
                _save(_policies, {
                  ..._defaults,
                  intent: value.isEmpty ? null : value,
                }),
              ),
              locked,
            ),
          const Text(
            'Defaults apply to new items. Held deals and this item keep their current terms.',
          ),
          if (_policies.isEmpty) const Text('No saved policies yet.'),
          for (final policy in _policies)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${policy['name']} · ${policy['intent']} · ${tradeRate(policy['rateBps'] as int)}% · ${policy['source'] == 'manual' ? 'Entered reference' : 'TCGPlayer Market'}',
                  ),
                  Wrap(
                    children: [
                      if (policy['intent'] == widget.intent)
                        TextButton(
                          onPressed: locked
                              ? null
                              : () => widget.select(policy),
                          child: Text('Use ${policy['name']}'),
                        ),
                      TextButton(
                        onPressed: locked ? null : () => _edit(policy),
                        child: Text('Edit ${policy['name']}'),
                      ),
                      TextButton(
                        onPressed: locked
                            ? null
                            : () {
                                final next = removeOfferPolicy(
                                  _book!,
                                  policy['id'] as String,
                                );
                                unawaited(
                                  _save(
                                    (next['presets'] as List)
                                        .cast<Map<String, dynamic>>(),
                                    Map<String, dynamic>.from(
                                      next['defaults'] as Map,
                                    ),
                                  ),
                                );
                              },
                        child: Text('Delete ${policy['name']}'),
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
            decoration: const InputDecoration(labelText: 'Policy name'),
          ),
          _choice(
            'Policy intent',
            _intent,
            {'cash': 'Cash purchase', 'trade': 'Trade credit'},
            (value) => setState(() => _intent = value),
            locked,
          ),
          _number('Policy percentage', _rate, locked),
          _choice(
            'Reference source',
            _source,
            {
              'manual': 'Entered reference',
              'tcgplayer_market': 'TCGPlayer Market · exact printing',
            },
            (value) => setState(() => _source = value),
            locked,
          ),
          _choice(
            'Reference condition basis',
            _basis,
            {
              'selected': 'Selected item condition',
              'unspecified': 'Condition unspecified',
              for (final condition in ['NM', 'LP', 'MP', 'HP', 'DMG'])
                condition: condition,
            },
            (value) => setState(() => _basis = value),
            locked,
          ),
          if (_source == 'tcgplayer_market')
            const Text(
              'Market references have no condition adjustment. Choose condition unspecified and review it when applying the offer.',
            ),
          _choice(
            'Round to',
            '$_increment',
            {
              for (final value in [1, 5, 10, 25, 50, 100])
                '$value': 'USD ${saleMoney(value)}',
            },
            (value) => setState(() => _increment = int.parse(value)),
            locked,
          ),
          _choice(
            'Rounding rule',
            _mode,
            {'nearest': 'Nearest · halves up', 'down': 'Down'},
            (value) => setState(() => _mode = value),
            locked,
          ),
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            value: _tier,
            onChanged: locked
                ? null
                : (value) => setState(() => _tier = value!),
            title: const Text('Use a low-value tier'),
          ),
          if (_tier) ...[
            _number('Tier reference ceiling per item (USD)', _ceiling, locked),
            _number('Tier percentage', _tierRate, locked),
            const Text(
              'Applies at or below the ceiling, before multiplying quantity.',
            ),
          ],
          TextButton(
            onPressed: locked || _editing == null && _policies.length >= 20
                ? null
                : _submit,
            child: Text(
              _editing == null ? 'Save new policy' : 'Save policy changes',
            ),
          ),
          if (_editing != null)
            TextButton(
              onPressed: locked ? null : () => setState(_reset),
              child: const Text('Cancel policy edit'),
            ),
          Text(
            '${_policies.length}/20 policies. Editing or deleting a policy does not change an offer already selected.',
          ),
        ],
      ],
    );
  }
}
