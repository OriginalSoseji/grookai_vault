import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class ScanIdentifyScreen extends StatefulWidget {
  const ScanIdentifyScreen({super.key});

  @override
  State<ScanIdentifyScreen> createState() => _ScanIdentifyScreenState();
}

class _ScanIdentifyScreenState extends State<ScanIdentifyScreen> {
  final _picker = ImagePicker();
  final supabase = Supabase.instance.client;

  XFile? _front;
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _candidates = const [];
  int? _selectedIndex;
  bool _adding = false;

  Future<void> _pickImage() async {
    final picked = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.rear,
      imageQuality: 92,
    );
    if (picked == null) return;
    setState(() {
      _front = picked;
      _candidates = const [];
      _selectedIndex = null;
      _error = null;
    });
  }

  Future<void> _identify() async {
    if (_front == null) {
      _snack('Capture a card front photo first.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
      _candidates = const [];
      _selectedIndex = null;
    });

    try {
      final resp = await supabase.functions.invoke(
        'card-identify',
        body: {
          'note': 'placeholder v1',
        },
      );
      final data = resp.data;
      List<Map<String, dynamic>> candidates = const [];
      if (data is Map && data['candidates'] is List) {
        candidates = List<Map<String, dynamic>>.from(
          (data['candidates'] as List).whereType<Map>(),
        );
      }
      setState(() {
        _candidates = candidates;
      });
      if (candidates.isEmpty) {
        _snack('No matches yet. This feature is not fully implemented.');
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
      _snack('Identify failed: $e');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _addToVault(Map<String, dynamic> cand) async {
    if (_adding) return;
    setState(() => _adding = true);
    try {
      final uid = supabase.auth.currentUser?.id;
      if (uid == null) {
        throw Exception('Not signed in');
      }
      final cardPrintId = cand['card_print_id']?.toString() ?? '';
      if (cardPrintId.isEmpty) {
        throw Exception('Missing card_print_id');
      }
      final name = cand['name']?.toString() ?? 'Card';
      final setName = cand['set']?.toString() ?? '';

      await supabase.from('vault_items').insert({
        'user_id': uid,
        'card_id': cardPrintId,
        'name': name,
        'set_name': setName,
        'photo_url': cand['image_url'],
        'qty': 1,
        'condition_label': 'NM',
      });

      _snack('Added to vault.');
      if (!mounted) return;
      Navigator.of(context).pop({
        'card_print_id': cardPrintId,
        'name': name,
        'set': setName,
        'image_url': cand['image_url'],
      });
    } catch (e) {
      _snack('Add failed: $e');
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  void _snack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Card ID Scanner'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Capture the card front to identify the print. No condition scan or credits required.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              _captureTile(theme),
              const SizedBox(height: 12),
              if (_error != null)
                Text(
                  _error!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              FilledButton(
                onPressed: _loading ? null : _identify,
                child: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Identify'),
              ),
              const SizedBox(height: 12),
              Expanded(child: _buildCandidates(theme)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _captureTile(ThemeData theme) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: theme.colorScheme.surfaceVariant,
              ),
              child: _front == null
                  ? const Icon(Icons.photo_camera, size: 32)
                  : ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(
                        File(_front!.path),
                        fit: BoxFit.cover,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                _front == null ? 'Front photo required' : 'Captured',
                style: theme.textTheme.titleMedium,
              ),
            ),
            FilledButton.tonal(
              onPressed: _loading ? null : _pickImage,
              child: Text(_front == null ? 'Capture' : 'Retake'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCandidates(ThemeData theme) {
    if (_candidates.isEmpty) {
      return Center(
        child: Text(
          'No candidates yet.',
          style: theme.textTheme.bodySmall,
        ),
      );
    }

    return ListView.separated(
      itemCount: _candidates.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final cand = _candidates[index];
        final selected = _selectedIndex == index;
        final confidence = (cand['confidence'] ?? '').toString();
        final name = (cand['name'] ?? 'Card').toString();
        final setName = (cand['set'] ?? '').toString();
        final imageUrl = (cand['image_url'] ?? '').toString();

        return Card(
          color: selected
              ? theme.colorScheme.primaryContainer
              : theme.colorScheme.surfaceVariant.withOpacity(0.7),
          child: ListTile(
            leading: imageUrl.isEmpty
                ? const CircleAvatar(child: Icon(Icons.style))
                : ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      imageUrl,
                      width: 48,
                      height: 48,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          const CircleAvatar(child: Icon(Icons.broken_image)),
                    ),
                  ),
            title: Text(name),
            subtitle: Text(
              setName.isEmpty ? 'Confidence: $confidence' : '$setName • $confidence',
            ),
            trailing: selected
                ? const Icon(Icons.check_circle, color: Colors.green)
                : null,
            onTap: _adding
                ? null
                : () {
                    setState(() {
                      _selectedIndex = index;
                    });
                    _addToVault(cand);
                  },
          ),
        );
      },
    );
  }
}
