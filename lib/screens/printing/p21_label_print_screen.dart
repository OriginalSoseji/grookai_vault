import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../services/printing/p21_label.dart';
import '../../services/printing/p21_printer_service.dart';

class P21LabelPrintScreen extends StatefulWidget {
  const P21LabelPrintScreen({
    super.key,
    required this.content,
    this.printer = const P21PrinterService(),
  });
  final P21LabelContent content;
  final P21PrinterService printer;

  @override
  State<P21LabelPrintScreen> createState() => _P21LabelPrintScreenState();
}

class _P21LabelPrintScreenState extends State<P21LabelPrintScreen> {
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

  @override
  void initState() {
    super.initState();
    _render();
  }

  Future<void> _render() async {
    try {
      final label = await P21Label.render(widget.content);
      if (mounted) setState(() => _label = label);
    } catch (error) {
      if (mounted) setState(() => _renderError = _explain(error));
    }
  }

  String _explain(Object error) => error is PlatformException
      ? error.message ?? 'The printer could not complete the request.'
      : error is FormatException
      ? error.message
      : 'The operation could not finish. Check the printer and try again.';

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
      if (mounted) setState(() => _error = _explain(error));
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
    setState(() {
      _selected = null;
      _status = null;
    });
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
    setState(() => _printing = true);
    await widget.printer.printLabel(_label!);
    if (mounted) {
      setState(
        () => _message =
            'Label sent to P21. Check the printed label before printing another.',
      );
    }
  });

  @override
  void dispose() {
    unawaited(widget.printer.disconnect().catchError((Object _) {}));
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return PopScope(
      canPop: !_printing,
      child: Scaffold(
        appBar: AppBar(title: const Text('Print label')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Nelko P21 · 14 × 40 mm', style: theme.textTheme.titleLarge),
            const SizedBox(height: 16),
            if (_label != null)
              Semantics(
                label:
                    'Label preview: ${widget.content.title}, ${widget.content.setName}, #${widget.content.number}',
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: Colors.grey),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Image.memory(
                    _label!.previewPng,
                    filterQuality: FilterQuality.none,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            const SizedBox(height: 12),
            const Text(
              'Reusable label with the full card name, set, number, and Grookai logo. Scan the QR code for current card details.',
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: _busy ? null : _scan,
              icon: const Icon(Icons.bluetooth_searching),
              label: const Text('Find P21'),
            ),
            if (_searched && _devices.isEmpty && !_busy)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  'No P21 found. Turn it on and disconnect it in Nelko or nRF Connect, then try again.',
                ),
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
              const SizedBox(height: 12),
              const LinearProgressIndicator(),
              const SizedBox(height: 8),
              Text(
                _printing
                    ? 'Sending label… Keep the printer nearby.'
                    : 'Checking printer…',
              ),
            ],
            if (_renderError != null || _error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  _renderError ?? _error!,
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ),
            if (_message != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(_message!),
              ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed:
                  !_busy &&
                      _label != null &&
                      _selected != null &&
                      _status?.problem == null
                  ? _print
                  : null,
              icon: const Icon(Icons.print_outlined),
              label: const Text('Print 1 label'),
            ),
          ],
        ),
      ),
    );
  }
}
