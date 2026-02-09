import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/identity/identity_scan_service.dart';
import '../scanner/condition_camera_screen.dart';

enum _IdentityScanStep { capture, processing, hintReady, results, error }

class IdentityScanScreen extends StatefulWidget {
  final bool autoStart;
  final XFile? initialFrontFile;

  const IdentityScanScreen({super.key, this.autoStart = false, this.initialFrontFile});

  @override
  State<IdentityScanScreen> createState() => _IdentityScanScreenState();
}

class _IdentityScanScreenState extends State<IdentityScanScreen> {
  final _service = IdentityScanService();
  final _picker = ImagePicker();

  XFile? _front;
  _IdentityScanStep _step = _IdentityScanStep.capture;
  bool _submitting = false;
  String? _error;
  String? _eventId;
  String? _snapshotId;
  List<dynamic> _candidates = const [];
  int _selectedIndex = 0;
  Map<String, dynamic>? _signals;
  String _aiName = '';
  String _aiCollectorNumber = '';
  String _aiPrintedTotal = '';
  String _aiHp = '';
  String _aiConfidence = '';

  bool get _hasRealEventId {
    final id = _eventId;
    return id != null && id.isNotEmpty && id != '(not created)';
  }

  void _snack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  void initState() {
    super.initState();
    if (widget.initialFrontFile != null) {
      _front = widget.initialFrontFile;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_submitting) {
          _startScan();
        }
      });
    } else if (widget.autoStart) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_submitting) {
          _captureAndIdentify();
        }
      });
    }
  }

  Future<void> _captureAndIdentify() async {
    final file = await Navigator.of(context).push<XFile?>(
      MaterialPageRoute(
        builder: (_) => const ConditionCameraScreen(
          title: 'Scan Card',
          hintText: 'Align card inside the frame',
        ),
      ),
    );
    if (file != null) {
      setState(() {
        _front = file;
        _error = null;
      });
      await _startScan();
    }
  }

  Future<void> _pickFromGallery() async {
    final file = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
    );
    if (file != null) {
      setState(() {
        _front = file;
        _error = null;
      });
      await _startScan();
    }
  }

  Future<void> _startScan() async {
    if (_front == null) {
      _snack('Capture the front of the card first.');
      return;
    }
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      _snack('Please sign in.');
      return;
    }

    setState(() {
      _submitting = true;
      _step = _IdentityScanStep.processing;
      _error = null;
      _eventId = null;
      _snapshotId = null;
      _candidates = const [];
      _selectedIndex = 0;
      _signals = null;
      _aiName = '';
      _aiCollectorNumber = '';
      _aiPrintedTotal = '';
      _aiHp = '';
      _aiConfidence = '';
    });

    try {
      final start = await _service.startScan(frontFile: _front!);
      _eventId = start.eventId;
      _snapshotId = start.snapshotId;
      await _pollUntilDone(start.eventId);
    } catch (e) {
      final message = e.toString();
      final missingEventId = message.contains('enqueue_missing_event_id') || message.contains('enqueue_bad_shape');
      setState(() {
        _error = message;
        _step = _IdentityScanStep.error;
        if (missingEventId) {
          _eventId = '(not created)';
        }
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  Future<void> _pollUntilDone(String eventId) async {
    const maxAttempts = 30;
    for (var attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (!mounted) return;
      try {
        final res = await _service.pollOnce(eventId);
        final resultStatus = res.status;
        if (resultStatus == 'ai_hint_ready') {
          final ai = res.signals?['ai'];
          final aiMap = ai is Map ? ai : null;
          final name = (aiMap?['name'] ?? '').toString();
          final collectorNumber = (aiMap?['collector_number'] ?? '').toString();
          final printedTotal = aiMap?['printed_total'];
          final hp = aiMap?['hp'];
          final conf = aiMap?['confidence'];
          setState(() {
            _step = _IdentityScanStep.hintReady;
            _candidates = res.candidates;
            _selectedIndex = 0;
            _error = res.error;
            _signals = res.signals;
            _aiName = name;
            _aiCollectorNumber = collectorNumber;
            _aiPrintedTotal = printedTotal == null ? '' : printedTotal.toString();
            _aiHp = hp == null ? '' : hp.toString();
            _aiConfidence = conf is num ? (conf * 100).toStringAsFixed(1) : (conf?.toString() ?? '');
          });
          return;
        }
        if (resultStatus == 'failed') {
          setState(() {
            _step = _IdentityScanStep.error;
            _error = res.error;
            _signals = res.signals;
          });
          return;
        }
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[identity_scan] poll error: $e');
        }
      }
      await Future.delayed(const Duration(seconds: 1));
    }
    setState(() {
      _step = _IdentityScanStep.error;
      _error = 'Timed out waiting for identification.';
    });
  }

  Map<String, dynamic>? get _selectedCandidate {
    if (_candidates.isEmpty) return null;
    if (_selectedIndex < 0 || _selectedIndex >= _candidates.length) return _candidates.first as Map<String, dynamic>?;
    final c = _candidates[_selectedIndex];
    return c is Map<String, dynamic> ? c : null;
  }

  Future<void> _addToVault() async {
    final cand = _selectedCandidate;
    if (cand == null) {
      _snack('No card selected.');
      return;
    }
    final cardId = (cand['card_print_id'] ?? '').toString();
    if (cardId.isEmpty) {
      _snack('Selected card is missing card_print_id.');
      return;
    }
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) {
      _snack('Please sign in.');
      return;
    }
    try {
      await Supabase.instance.client.from('vault_items').insert({
        'user_id': userId,
        'card_id': cardId,
        'name': (cand['name'] ?? '').toString(),
        'set_name': (cand['set_code'] ?? '').toString(),
        'photo_url': (cand['image_url'] ?? '').toString(),
        'qty': 1,
        'condition_label': 'NM',
      });
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => CardDetailScreen(
            cardPrintId: cardId,
            name: (cand['name'] ?? '').toString().isEmpty ? null : (cand['name'] ?? '').toString(),
            setName: (cand['set_code'] ?? '').toString(),
            number: (cand['number'] ?? '').toString(),
            imageUrl: (cand['image_url'] ?? '').toString(),
          ),
        ),
      );
    } catch (e) {
      _snack('Add to Vault failed: $e');
    }
  }

  Widget _buildCaptureCard(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Scan Card',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text('Align the card and capture the front.'),
            const SizedBox(height: 12),
            if (_front != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(
                  File(_front!.path),
                  width: double.infinity,
                  height: 220,
                  fit: BoxFit.cover,
                ),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                FilledButton.icon(
                  onPressed: _submitting ? null : _captureAndIdentify,
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Open Camera'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _submitting ? null : _pickFromGallery,
                  icon: const Icon(Icons.photo_library),
                  label: const Text('Gallery'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProcessingCard() {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(12),
        child: Row(
          children: [
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Processing…'),
          ],
        ),
      ),
    );
  }

  Widget _buildResults(ThemeData theme) {
    if (_step == _IdentityScanStep.hintReady) {
      return _buildAiHintBanner(theme);
    }

    if (_candidates.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Hint ready — awaiting resolver',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              if (_hasRealEventId)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text('Event: $_eventId'),
                ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Matched Card',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _candidates.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final c = _candidates[index] as Map;
                    final name = (c['name'] ?? '').toString();
                    final setCode = (c['set_code'] ?? '').toString();
                    final number = (c['number'] ?? '').toString();
                    final image = (c['image_url'] ?? '').toString();
                    final selected = _selectedIndex == index;
                    return ListTile(
                      leading: image.isNotEmpty
                          ? ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: Image.network(
                                image,
                                width: 44,
                                height: 60,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(Icons.style),
                              ),
                            )
                          : const Icon(Icons.style),
                      title: Text(name.isEmpty ? 'Candidate' : name),
                      subtitle: Text([setCode, number].where((p) => p.isNotEmpty).join(' • ')),
                      trailing: selected ? const Icon(Icons.radio_button_checked) : const Icon(Icons.radio_button_off),
                      onTap: () => setState(() => _selectedIndex = index),
                    );
                  },
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _addToVault,
                  icon: const Icon(Icons.inventory_2),
                  label: const Text('Add to Vault'),
                ),
              ],
            ),
          ),
        ),
        if (_hasRealEventId || (_snapshotId != null && _snapshotId!.isNotEmpty))
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              [
                if (_hasRealEventId) 'Event: $_eventId',
                if (_snapshotId != null && _snapshotId!.isNotEmpty) 'Snapshot: $_snapshotId',
              ].join(' • '),
              style: theme.textTheme.bodySmall,
            ),
          ),
      ],
    );
  }

  Widget _buildAiHintBanner(ThemeData theme) {
    final parts = <String>[];
    if (_aiName.isNotEmpty) parts.add(_aiName);
    if (_aiCollectorNumber.isNotEmpty) parts.add(_aiCollectorNumber);
    if (_aiHp.isNotEmpty) parts.add('HP $_aiHp');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Grookai Vision thinks this is…',
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 4),
                Text(parts.isEmpty ? 'Unknown name' : parts.join(' — ')),
                if (_aiPrintedTotal.isNotEmpty || _aiConfidence.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      [
                        if (_aiPrintedTotal.isNotEmpty) 'Total $_aiPrintedTotal',
                        if (_aiConfidence.isNotEmpty) 'Confidence $_aiConfidence%',
                      ].join(' • '),
                    ),
                  ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: null,
                  child: const Text('Confirm'),
                ),
              ],
            ),
          ),
        ),
        if (_hasRealEventId || (_snapshotId != null && _snapshotId!.isNotEmpty))
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              [
                if (_hasRealEventId) 'Event: $_eventId',
                if (_snapshotId != null && _snapshotId!.isNotEmpty) 'Snapshot: $_snapshotId',
              ].join(' • '),
              style: theme.textTheme.bodySmall,
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Identity Scan'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_error != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    _error!,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.error),
                  ),
                ),
              ),
            if (_step == _IdentityScanStep.capture) _buildCaptureCard(theme),
            if (_step == _IdentityScanStep.processing) _buildProcessingCard(),
            if (_step == _IdentityScanStep.results || _step == _IdentityScanStep.hintReady) _buildResults(theme),
            if (_step == _IdentityScanStep.error && _step != _IdentityScanStep.results)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Scan error',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 6),
                      Text(_error ?? 'Unknown error'),
                      if (_eventId != null && (_hasRealEventId || _eventId == '(not created)'))
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text('Event: $_eventId'),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
