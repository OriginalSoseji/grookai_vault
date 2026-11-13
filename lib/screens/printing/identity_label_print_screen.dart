import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../services/printing/identity_label_document.dart';
import '../../services/printing/p21_label.dart';
import '../../services/printing/p21_printer_service.dart';
import 'p21_label_print_screen.dart';

class IdentityLabelPrintScreen extends StatefulWidget {
  const IdentityLabelPrintScreen({super.key, required this.labels});
  final List<P21LabelContent> labels;
  @override
  State<IdentityLabelPrintScreen> createState() =>
      _IdentityLabelPrintScreenState();
}

class _IdentityLabelPrintScreenState extends State<IdentityLabelPrintScreen> {
  IdentityLabelFormat _format = IdentityLabelFormat.p21;
  Uint8List? _pdf;
  String? _error, _message;
  bool _busy = false;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final preferences = await SharedPreferences.getInstance();
    final saved = preferences.getString('grookai.identity-label.format.v1');
    if (!mounted) return;
    _format = saved == 'munbyn_102x152'
        ? IdentityLabelFormat.munbyn
        : IdentityLabelFormat.p21;
    await _render();
  }

  Future<void> _render() async {
    final token = ++_generation;
    setState(() {
      _pdf = null;
      _error = null;
      _message = null;
    });
    try {
      final bytes = await buildIdentityLabelDocument(widget.labels, _format);
      if (mounted && token == _generation) setState(() => _pdf = bytes);
    } catch (e) {
      if (mounted && token == _generation) {
        setState(
          () => _error = e is FormatException
              ? e.message
              : 'This full identity cannot fit legibly. Choose the larger label format.',
        );
      }
    }
  }

  Future<void> _print() async {
    if (_busy || _pdf == null) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(
        'grookai.identity-label.last-attempt.v1',
        'started:${DateTime.now().toUtc().toIso8601String()}',
      );
      await Printing.layoutPdf(
        name: 'grookai-card-labels',
        format: _format.page,
        dynamicLayout: false,
        onLayout: (_) => Future.value(_pdf!),
      );
      await preferences.setString(
        'grookai.identity-label.last-attempt.v1',
        'dialog_closed:${DateTime.now().toUtc().toIso8601String()}',
      );
      if (mounted) {
        setState(
          () => _message =
              'Print dialog closed. Check the physical labels before printing again.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => _message =
              'Printing could not be confirmed. Check the physical output before trying again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Card labels')),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    'Card identity and permanent grookai QR. No price is printed.',
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<IdentityLabelFormat>(
                    initialValue: _format,
                    key: ValueKey(_format),
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Label format',
                    ),
                    items: IdentityLabelFormat.values
                        .map(
                          (f) =>
                              DropdownMenuItem(value: f, child: Text(f.label)),
                        )
                        .toList(),
                    onChanged: _busy
                        ? null
                        : (v) async {
                            setState(() => _format = v!);
                            final preferences =
                                await SharedPreferences.getInstance();
                            await preferences.setString(
                              'grookai.identity-label.format.v1',
                              _format == IdentityLabelFormat.munbyn
                                  ? 'munbyn_102x152'
                                  : 'p21_14x40',
                            );
                            if (mounted) await _render();
                          },
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Match the loaded stock and use Actual size / 100% in your printer settings.',
                  ),
                  if (_error != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(
                        _error!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  if (_message != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Semantics(
                        liveRegion: true,
                        child: Text(_message!),
                      ),
                    ),
                  FilledButton(
                    onPressed: _busy || _pdf == null ? null : _print,
                    child: Text(
                      _busy
                          ? 'Opening print dialog…'
                          : widget.labels.length == 1
                          ? 'Print label'
                          : 'Print ${widget.labels.length} labels',
                    ),
                  ),
                  if (P21PrinterService.supported &&
                      _format == IdentityLabelFormat.p21)
                    OutlinedButton(
                      onPressed: _busy || _pdf == null
                          ? null
                          : () => Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => P21LabelPrintScreen(
                                  content: widget.labels.first,
                                  additionalContents: widget.labels
                                      .skip(1)
                                      .toList(),
                                ),
                              ),
                            ),
                      child: const Text('Print directly with P21 Bluetooth'),
                    ),
                ],
              ),
            ),
            Expanded(
              child: _pdf == null
                  ? Center(
                      child: Text(
                        _error == null
                            ? 'Preparing label preview…'
                            : 'Choose another format to preview.',
                      ),
                    )
                  : PdfPreview(
                      build: (_) => Future.value(_pdf!),
                      initialPageFormat: _format.page,
                      canChangePageFormat: false,
                      canChangeOrientation: false,
                      allowPrinting: false,
                      allowSharing: false,
                      useActions: false,
                    ),
            ),
          ],
        ),
      ),
    ),
  );
}
