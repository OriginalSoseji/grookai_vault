import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/sales/sales_scanner.dart';

class SalesScannerInput extends StatefulWidget {
  const SalesScannerInput({
    super.key,
    required this.disabled,
    required this.target,
    required this.add,
    required this.pending,
  });
  final bool disabled;
  final String target;
  final Future<String> Function(String id, bool Function() current) add;
  final ValueChanged<int> pending;
  @override
  State<SalesScannerInput> createState() => _SalesScannerInputState();
}

class _SalesScannerInputState extends State<SalesScannerInput> {
  final _input = TextEditingController();
  final _focus = FocusNode();
  var _active = false, _sequence = 0, _count = 0;
  var _status = '';
  Future<void> _queue = Future.value();
  @override
  void initState() {
    super.initState();
    _focus.addListener(_focusChanged);
  }

  @override
  void didUpdateWidget(covariant SalesScannerInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if ((!oldWidget.disabled && widget.disabled) ||
        oldWidget.target != widget.target) {
      _sequence++;
      _active = false;
      _input.clear();
      _status = '';
      _focus.unfocus();
    }
  }

  void _focusChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _sequence++;
    _input.dispose();
    _focus.dispose();
    super.dispose();
  }

  void _submit(String raw) {
    _input.clear();
    if (!_active || widget.disabled) return;
    final id = scannedCopyId(raw);
    if (id == null) {
      setState(
        () => _status =
            'Scan a Grookai copy QR label (GVVI). Catalog codes cannot identify an individual copy.',
      );
      return;
    }
    if (_count >= 50) {
      setState(
        () => _status = 'Scan queue is full. Wait for the current cards.',
      );
      return;
    }
    final sequence = _sequence, target = widget.target;
    bool current() =>
        mounted &&
        _active &&
        sequence == _sequence &&
        !widget.disabled &&
        widget.target == target;
    _count++;
    widget.pending(1);
    setState(() => _status = 'Reading card…');
    _queue = _queue
        .then((_) async {
          if (!current()) return;
          try {
            final message = await widget.add(id, current);
            if (current()) setState(() => _status = message);
          } catch (error) {
            if (current()) {
              setState(
                () =>
                    _status = error.toString().replaceFirst('Bad state: ', ''),
              );
              _sequence++;
            }
          }
        })
        .whenComplete(() {
          _count--;
          widget.pending(-1);
        });
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const Icon(Icons.qr_code_scanner),
            const Text('Scan to cart'),
            OutlinedButton(
              onPressed: widget.disabled
                  ? null
                  : () {
                      setState(() {
                        _active = !_active;
                        _sequence++;
                        _input.clear();
                        _status = '';
                      });
                      if (_active) {
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (mounted && _active && !widget.disabled) {
                            _focus.requestFocus();
                          }
                        });
                      }
                    },
              child: Text(_active ? 'Stop scanning' : 'Scan cards'),
            ),
          ],
        ),
        if (_active) ...[
          const SizedBox(height: 8),
          TextField(
            controller: _input,
            focusNode: _focus,
            enabled: !widget.disabled,
            maxLength: 1024,
            autocorrect: false,
            enableSuggestions: false,
            textInputAction: TextInputAction.done,
            // Keep a keyboard scanner ready after Enter; do not steal focus from other fields.
            onEditingComplete: () {},
            onSubmitted: _submit,
            decoration: const InputDecoration(
              labelText: 'Scanner input',
              counterText: '',
              hintText: 'Ready for your next card',
              border: OutlineInputBorder(),
            ),
          ),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              TextButton(
                onPressed: widget.disabled ? null : () => _submit(_input.text),
                child: const Text('Add scan'),
              ),
              if (!_focus.hasFocus)
                TextButton(
                  onPressed: widget.disabled ? null : _focus.requestFocus,
                  child: const Text('Resume scanning'),
                ),
            ],
          ),
          const Text(
            'Pair your scanner in device settings. Use keyboard mode with Enter after each scan.',
            style: TextStyle(fontSize: 12),
          ),
        ],
        if (_status.isNotEmpty)
          Semantics(
            liveRegion: true,
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_status),
            ),
          ),
      ],
    ),
  );
}
