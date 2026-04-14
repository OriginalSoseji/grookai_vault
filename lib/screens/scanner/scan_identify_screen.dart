import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/ownership_state.dart';
import '../../services/vault/ownership_resolver_adapter.dart';
import '../../services/vault/vault_card_service.dart';
import '../../widgets/ownership/ownership_signal.dart';

class ScanIdentifyScreen extends StatefulWidget {
  const ScanIdentifyScreen({super.key});

  @override
  State<ScanIdentifyScreen> createState() => _ScanIdentifyScreenState();
}

class _ScanIdentifyScreenState extends State<ScanIdentifyScreen> {
  final _picker = ImagePicker();
  final supabase = Supabase.instance.client;
  final OwnershipResolverAdapter _ownershipAdapter =
      OwnershipResolverAdapter.instance;
  Map<String, OwnershipState> _ownershipByCardPrintId =
      <String, OwnershipState>{};

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
      _ownershipByCardPrintId = <String, OwnershipState>{};
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
      _ownershipByCardPrintId = <String, OwnershipState>{};
      _selectedIndex = null;
    });

    try {
      final resp = await supabase.functions.invoke(
        'card-identify',
        body: {'note': 'placeholder v1'},
      );
      final data = resp.data;
      List<Map<String, dynamic>> candidates = const [];
      if (data is Map && data['candidates'] is List) {
        candidates = List<Map<String, dynamic>>.from(
          (data['candidates'] as List).whereType<Map>(),
        );
      }
      final ownershipByCardPrintId = await _primeOwnership(
        candidates.map(
          (candidate) => (candidate['card_print_id'] ?? '').toString(),
        ),
      );
      setState(() {
        _candidates = candidates;
        _ownershipByCardPrintId = ownershipByCardPrintId;
      });
      if (candidates.isEmpty) {
        _snack('No matches yet. This feature is not fully implemented.');
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _ownershipByCardPrintId = <String, OwnershipState>{};
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
      final identity = await VaultCardService.resolveCanonicalCard(
        client: supabase,
        cardId: cardPrintId,
      );
      final name = cand['name']?.toString() ?? identity.name;
      final setName = cand['set']?.toString() ?? identity.setName;

      await VaultCardService.addOrIncrementVaultItem(
        client: supabase,
        userId: uid,
        cardId: cardPrintId,
        deltaQty: 1,
        conditionLabel: 'NM',
        fallbackName: name,
        fallbackSetName: setName,
        fallbackImageUrl: cand['image_url']?.toString(),
      );

      _snack('Added to vault.');
      if (!mounted) return;
      Navigator.of(context).pop({
        'card_print_id': cardPrintId,
        'gv_id': identity.gvId,
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

  Future<Map<String, OwnershipState>> _primeOwnership(
    Iterable<String> cardPrintIds,
  ) async {
    final userId = (supabase.auth.currentUser?.id ?? '').trim();
    if (userId.isEmpty) {
      return <String, OwnershipState>{};
    }

    final normalizedIds = cardPrintIds
        .map((value) => value.trim())
        .where((value) => value.isNotEmpty)
        .toSet()
        .toList();
    if (normalizedIds.isEmpty) {
      return <String, OwnershipState>{};
    }

    // PERFORMANCE_P4_SCANNER_SYNC_OWNERSHIP
    // Scanner result ownership is rendered from precomputed snapshot state.
    try {
      await _ownershipAdapter.primeBatch(normalizedIds);
    } catch (error) {
      debugPrint('Scanner ownership prime failed: $error');
    }
    return _ownershipAdapter.snapshotForIds(normalizedIds);
  }

  OwnershipState? _ownershipStateForCandidate(Map<String, dynamic> candidate) {
    final userId = (supabase.auth.currentUser?.id ?? '').trim();
    final cardPrintId = (candidate['card_print_id'] ?? '').toString().trim();
    if (userId.isEmpty || cardPrintId.isEmpty) {
      return null;
    }
    return _ownershipByCardPrintId[cardPrintId] ??
        _ownershipAdapter.peek(cardPrintId);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Card ID Scanner')),
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
                color: theme.colorScheme.surfaceContainerHighest,
              ),
              child: _front == null
                  ? const Icon(Icons.photo_camera, size: 32)
                  : ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(File(_front!.path), fit: BoxFit.cover),
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
        child: Text('No candidates yet.', style: theme.textTheme.bodySmall),
      );
    }

    return ListView.separated(
      itemCount: _candidates.length,
      separatorBuilder: (_, index) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final cand = _candidates[index];
        final selected = _selectedIndex == index;
        final confidence = (cand['confidence'] ?? '').toString();
        final name = (cand['name'] ?? 'Card').toString();
        final setName = (cand['set'] ?? '').toString();
        final imageUrl = (cand['image_url'] ?? '').toString();
        final ownershipState = _ownershipStateForCandidate(cand);

        return Card(
          color: selected
              ? theme.colorScheme.primaryContainer
              : theme.colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.7,
                ),
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
                      errorBuilder: (context, error, stackTrace) =>
                          const CircleAvatar(child: Icon(Icons.broken_image)),
                    ),
                  ),
            title: Text(name),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  setName.isEmpty
                      ? 'Confidence: $confidence'
                      : '$setName • $confidence',
                ),
                const SizedBox(height: 2),
                OwnershipSignal(
                  ownershipState: ownershipState,
                  textStyle: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.60),
                    fontWeight: FontWeight.w700,
                  ),
                  labelBuilder: (state) => state.ownedCount > 1
                      ? '${state.ownedCount} copies in your vault'
                      : 'In your vault',
                ),
              ],
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
