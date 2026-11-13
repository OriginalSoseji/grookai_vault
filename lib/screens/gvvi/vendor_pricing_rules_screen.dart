import 'package:flutter/material.dart';
import '../../services/gvvi/vendor_pricing_rules_service.dart';

class VendorPricingRulesScreen extends StatefulWidget {
  const VendorPricingRulesScreen({super.key, this.service});
  final VendorPricingRulesService? service;
  @override
  State<VendorPricingRulesScreen> createState() =>
      _VendorPricingRulesScreenState();
}

class _VendorPricingRulesScreenState extends State<VendorPricingRulesScreen> {
  late final _service = widget.service ?? VendorPricingRulesService();
  Map<String, dynamic>? _workspace, _editing;
  final _name = TextEditingController(),
      _percent = TextEditingController(text: '0'),
      _flat = TextEditingController(text: '0.00'),
      _step = TextEditingController(text: '1.00'),
      _min = TextEditingController(),
      _max = TextEditingController(),
      _sample = TextEditingController(text: '10.00');
  String _rounding = 'up';
  String? _defaultId, _message, _example;
  bool _auto = false, _busy = false, _error = false;
  List<Map<String, dynamic>> get _rules =>
      ((_workspace?['rules'] as List?) ?? [])
          .map((r) => Map<String, dynamic>.from(r as Map))
          .toList();
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_name, _percent, _flat, _step, _min, _max, _sample]) {
      c.dispose();
    }
    super.dispose();
  }

  void _accept(Map<String, dynamic> w) {
    _workspace = w;
    final s = w['settings'] as Map;
    _defaultId = s['default_rule_id'] as String?;
    _auto = s['auto_for_new'] == true;
  }

  Future<void> _load() => _run(() async {
    _accept(await _service.workspace());
  });
  Future<void> _run(Future<void> Function() operation) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _message = null;
      _error = false;
    });
    try {
      await operation();
    } catch (e) {
      if (mounted) {
        _error = true;
        _message = e is FormatException
            ? e.message
            : 'Pricing could not be loaded or saved. Reload before retrying.';
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  int? _minor(String raw, {bool optional = false}) {
    raw = raw.trim();
    if (optional && raw.isEmpty) return null;
    if (!RegExp(r'^-?\d+(?:\.\d{1,2})?$').hasMatch(raw)) {
      throw const FormatException('Use amounts with up to two decimal places.');
    }
    final negative = raw.startsWith('-');
    final parts = raw.replaceFirst('-', '').split('.');
    final value =
        int.parse(parts[0]) * 100 +
        int.parse(parts.length == 1 ? '0' : parts[1].padRight(2, '0'));
    return negative ? -value : value;
  }

  Map<String, dynamic> _definition() {
    final definition = <String, dynamic>{
      'markupBps': _minor(_percent.text),
      'flatMinor': _minor(_flat.text),
      'rounding': _rounding,
      'stepMinor': _minor(_step.text),
      'minMinor': _minor(_min.text, optional: true),
      'maxMinor': _minor(_max.text, optional: true),
    };
    final percent = definition['markupBps'] as int,
        step = definition['stepMinor'] as int;
    final minimum = definition['minMinor'] as int?,
        maximum = definition['maxMinor'] as int?;
    if (percent < -9999 || percent > 100000) {
      throw const FormatException(
        'Choose a percentage between −99.99% and 1,000%.',
      );
    }
    if (step < 1 || step > 1000000) {
      throw const FormatException(
        'Choose a rounding increment from \$0.01 to \$10,000.',
      );
    }
    for (final limit in [minimum, maximum]) {
      if (limit != null && (limit < 1 || limit > 9999999999)) {
        throw const FormatException(
          'Minimum and maximum must be positive USD amounts.',
        );
      }
    }
    if (minimum != null && maximum != null && minimum > maximum) {
      throw const FormatException('Minimum must not exceed maximum.');
    }
    return definition;
  }

  void _edit(Map<String, dynamic>? rule) {
    setState(() {
      _editing = rule;
      final d = rule?['definition'] as Map?;
      String amount(String key, String fallback) => d?[key] == null
          ? fallback
          : ((d![key] as num) / 100).toStringAsFixed(2);
      _name.text = rule?['name'] as String? ?? '';
      _percent.text = amount('markupBps', '0');
      _flat.text = amount('flatMinor', '0.00');
      _step.text = amount('stepMinor', '1.00');
      _min.text = amount('minMinor', '');
      _max.text = amount('maxMinor', '');
      _rounding = d?['rounding'] as String? ?? 'up';
      _example = null;
    });
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    String? helper,
    bool name = false,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: TextField(
      controller: controller,
      maxLength: name ? 60 : 20,
      enabled: !_busy,
      keyboardType: name
          ? TextInputType.text
          : const TextInputType.numberWithOptions(decimal: true, signed: true),
      decoration: InputDecoration(
        counterText: '',
        labelText: label,
        helperText: helper,
        helperMaxLines: 3,
      ),
      onChanged: (_) => setState(() => _example = null),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Pricing rules'),
      actions: [
        IconButton(
          tooltip: 'Reload pricing settings',
          onPressed: _busy ? null : _load,
          icon: const Icon(Icons.refresh),
        ),
      ],
    ),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Set your default once. Automatic prices follow fresh market updates, including in Square. My price stays fixed until you choose a rule again.',
          ),
          if (_busy)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: LinearProgressIndicator(),
            ),
          if (_message != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Semantics(
                liveRegion: true,
                child: Text(
                  _message!,
                  style: TextStyle(
                    color: _error ? Theme.of(context).colorScheme.error : null,
                  ),
                ),
              ),
            ),
          if (_workspace != null) ...[
            if (_workspace!['enabled'] != true)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Text(
                  'Automatic repricing is paused. You can prepare presets. Existing prices are retained.',
                ),
              ),
            const SizedBox(height: 20),
            Text('Your default', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              key: ValueKey(_defaultId),
              initialValue: _defaultId ?? '',
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'Default pricing preset',
              ),
              items: [
                const DropdownMenuItem(
                  value: '',
                  child: Text('Choose a preset'),
                ),
                ..._rules.map(
                  (r) => DropdownMenuItem(
                    value: r['id'] as String,
                    child: Text(r['name'] as String),
                  ),
                ),
              ],
              onChanged: _busy
                  ? null
                  : (v) => setState(() => _defaultId = v == '' ? null : v),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Use my default for new, unpriced cards'),
              subtitle: const Text(
                'New cards remain private until you choose For sale.',
              ),
              value: _auto,
              onChanged: _busy || _defaultId == null
                  ? null
                  : (v) => setState(() => _auto = v),
            ),
            FilledButton(
              onPressed: _busy || (_auto && _defaultId == null)
                  ? null
                  : () => _run(() async {
                      _accept(
                        await _service.saveSettings(
                          defaultId: _defaultId,
                          autoForNew: _auto,
                          revision:
                              (_workspace!['settings'] as Map)['revision']
                                  as int,
                        ),
                      );
                      _message =
                          'Default saved. Existing My price cards keep their price.';
                    }),
              child: const Text('Save default'),
            ),
            const SizedBox(height: 28),
            Text('Presets', style: Theme.of(context).textTheme.titleLarge),
            if (_rules.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text('Create your first pricing preset below.'),
              ),
            ..._rules.map(
              (r) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(r['name'] as String),
                trailing: TextButton(
                  onPressed: _busy ? null : () => _edit(r),
                  child: const Text('Edit'),
                ),
              ),
            ),
            const Divider(height: 32),
            Row(
              children: [
                Expanded(
                  child: Text(
                    _editing == null ? 'New preset' : 'Edit preset',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                if (_editing != null)
                  TextButton(
                    onPressed: _busy ? null : () => _edit(null),
                    child: const Text('Cancel edit'),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            _field('Preset name', _name, name: true),
            _field(
              'Percent above market',
              _percent,
              helper: 'Use a negative percentage for below market.',
            ),
            _field(
              'USD adjustment',
              _flat,
              helper: 'Added after the percentage. Negative amounts subtract.',
            ),
            DropdownButtonFormField<String>(
              key: ValueKey(_rounding),
              initialValue: _rounding,
              decoration: const InputDecoration(labelText: 'Rounding'),
              items: const [
                DropdownMenuItem(value: 'none', child: Text('No rounding')),
                DropdownMenuItem(value: 'up', child: Text('Round up')),
                DropdownMenuItem(value: 'down', child: Text('Round down')),
                DropdownMenuItem(value: 'nearest', child: Text('Nearest')),
              ],
              onChanged: _busy ? null : (v) => setState(() => _rounding = v!),
            ),
            const SizedBox(height: 16),
            _field(
              'Round to USD',
              _step,
              helper: 'For example: 0.25, 0.50 or 1.00.',
            ),
            _field('Minimum USD (optional)', _min),
            _field('Maximum USD (optional)', _max),
            const Text(
              'Fresh exact market → percentage → USD adjustment → rounding → minimum / maximum. Missing or stale references retain the last confirmed price. Only exact raw-card USD references are eligible.',
            ),
            const SizedBox(height: 16),
            _field('Example market USD', _sample),
            OutlinedButton(
              onPressed: _busy
                  ? null
                  : () => _run(() async {
                      final value = await _service.invoke('calculate', {
                        'definition': _definition(),
                        'marketAmount': _sample.text.trim(),
                      });
                      _example =
                          'Example price: \$${((value['amountMinor'] as num) / 100).toStringAsFixed(2)}';
                    }),
              child: const Text('Preview rule'),
            ),
            if (_example != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(_example!),
              ),
            FilledButton(
              onPressed: _busy
                  ? null
                  : () => _run(() async {
                      _accept(
                        await _service.saveRule(
                          name: _name.text.trim(),
                          definition: _definition(),
                          ruleId: _editing?['id'] as String?,
                          revision: _editing?['revision'] as int?,
                        ),
                      );
                      _edit(null);
                      _message =
                          'Preset saved. Rule-based cards update automatically.';
                    }),
              child: const Text('Save preset'),
            ),
          ],
        ],
      ),
    ),
  );
}
