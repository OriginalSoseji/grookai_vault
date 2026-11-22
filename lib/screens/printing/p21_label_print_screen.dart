import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../services/printing/p21_label.dart';
import '../../services/printing/p21_printer_service.dart';
import '../../services/printing/p21_batch_print_service.dart';

class P21LabelPrintScreen extends StatefulWidget {
  const P21LabelPrintScreen({
    super.key,
    required this.content,
    this.printer = const P21PrinterService(),
    this.additionalContents = const [],
  });
  final P21LabelContent content;
  final P21PrinterService printer;
  final List<P21LabelContent> additionalContents;

  @override
  State<P21LabelPrintScreen> createState() => _P21LabelPrintScreenState();
}

class _P21LabelPrintScreenState extends State<P21LabelPrintScreen> {
  P21Label? _label;
  List<P21Label> _labels = [];
  bool _batchAttempted = false;
  int _sent = 0;
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
      final contents = [widget.content, ...widget.additionalContents];
      if (contents.length > 50 ||
          contents.map((c) => c.qrUri.toString()).toSet().length !=
              contents.length) {
        throw const FormatException(
          'Choose at most 50 distinct physical copies.',
        );
      }
      final labels = <P21Label>[];
      for (final content in contents) {
        labels.add(await P21Label.render(content));
      }
      if (mounted) {
        setState(() {
          _labels = labels;
          _label = labels.first;
        });
      }
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
    if (_labels.length > 1) {
      setState(() => _batchAttempted = true);
      try {
        await P21BatchPrintService.send(
          labels: _labels,
          printer: widget.printer,
          onSent: (count) {
            if (mounted) setState(() => _sent = count);
          },
        );
        if (mounted) {
          setState(
            () => _message =
                '$_sent labels sent to P21. Check the physical output before printing again.',
          );
        }
      } catch (_) {
        if (mounted) {
          setState(
            () => _message =
                'Batch stopped after $_sent confirmed transmissions. The last label may also have printed. Check the physical labels, then select only missing copies in a new batch.',
          );
        }
        rethrow;
      }
      return;
    }
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
        appBar: AppBar(
          title: Text(
            widget.additionalContents.isEmpty ? 'Print label' : 'Print labels',
          ),
        ),
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
            if (widget.additionalContents.isNotEmpty)
              Text(
                '${widget.additionalContents.length + 1} labels selected. Preview shows the first. Each physical copy is sent once; interrupted batches never resume automatically.',
              ),
            const Text(
              'Reusable label with the full card name, set, number, and grookai logo. Scan the QR code for current card details.',
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
                    ? _labels.length > 1
                          ? 'Sending labels… $_sent of ${_labels.length} sent. Keep the printer nearby.'
                          : 'Sending label… Keep the printer nearby.'
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
                      !_batchAttempted &&
                      _label != null &&
                      _selected != null &&
                      _status?.problem == null
                  ? _print
                  : null,
              icon: const Icon(Icons.print_outlined),
              label: Text(
                _labels.length > 1
                    ? 'Print ${_labels.length} labels'
                    : 'Print 1 label',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
