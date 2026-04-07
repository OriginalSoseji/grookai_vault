import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/vault/vault_card_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../gvvi/public_gvvi_screen.dart';
import 'vault_manage_card_screen.dart';

class VaultGvviScreen extends StatefulWidget {
  const VaultGvviScreen({required this.gvviId, super.key});

  final String gvviId;

  @override
  State<VaultGvviScreen> createState() => _VaultGvviScreenState();
}

class _VaultGvviScreenState extends State<VaultGvviScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final ImagePicker _imagePicker = ImagePicker();
  final TextEditingController _notesController = TextEditingController();

  VaultGvviData? _data;
  bool _loading = true;
  bool _savingNotes = false;
  bool _togglingWall = false;
  bool _busyFrontMedia = false;
  bool _busyBackMedia = false;
  bool _removing = false;
  String? _error;
  String? _status;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await VaultGvviService.loadPrivate(
        client: _client,
        gvviId: widget.gvviId,
      );
      if (!mounted) {
        return;
      }

      _notesController.text = data?.notes ?? '';
      setState(() {
        _data = data;
        _loading = false;
        _error = data == null ? 'Exact copy not found.' : null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _openGroupedCard() async {
    final data = _data;
    if (data == null) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VaultManageCardScreen(
          vaultItemId: data.vaultItemId,
          cardPrintId: data.cardPrintId,
          ownedCount: data.activeCopyCount,
          gvId: data.gvId,
          name: data.cardName,
          setName: data.setName,
          number: data.number,
          imageUrl: data.imageUrl,
          condition: data.conditionLabel,
        ),
      ),
    );
  }

  Future<void> _openCard() async {
    final data = _data;
    if (data == null) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.cardName,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          imageUrl: data.imageUrl,
          quantity: data.activeCopyCount,
          condition: data.isGraded ? 'SLAB' : data.conditionLabel,
          exactCopyGvviId: data.gvviId,
          exactCopyOwnerUserId: _client.auth.currentUser?.id,
        ),
      ),
    );
  }

  Future<void> _openPublicPage() async {
    final data = _data;
    if (data == null || !data.canOpenPublicPage) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicGvviScreen(gvviId: data.gvviId),
      ),
    );
  }

  Future<void> _saveNotes() async {
    final data = _data;
    if (data == null || data.isArchived || _savingNotes) {
      return;
    }

    setState(() {
      _savingNotes = true;
      _status = null;
    });

    try {
      final nextNotes = await VaultGvviService.saveNotes(
        client: _client,
        instanceId: data.instanceId,
        notes: _notesController.text,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _data = data.copyWith(notes: nextNotes, clearNotes: nextNotes == null);
        _savingNotes = false;
        _status = 'Notes saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _savingNotes = false;
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _toggleWall() async {
    final data = _data;
    if (data == null || _togglingWall) {
      return;
    }

    setState(() {
      _togglingWall = true;
      _status = null;
    });

    try {
      final nextShared = await VaultCardService.setSharedCardVisibility(
        client: _client,
        cardPrintId: data.cardPrintId,
        gvId: data.gvId,
        nextShared: !data.isSharedOnWall,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _data = data.copyWith(isSharedOnWall: nextShared);
        _togglingWall = false;
        _status = nextShared
            ? 'Card is now on your wall.'
            : 'Removed from wall.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _togglingWall = false;
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _pickMedia(GvviImageSide side) async {
    final data = _data;
    final userId = _client.auth.currentUser?.id;
    if (data == null || userId == null || data.isArchived) {
      return;
    }

    final picked = await _imagePicker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 92,
      maxWidth: 2200,
    );
    if (picked == null || !mounted) {
      return;
    }

    setState(() {
      if (side == GvviImageSide.front) {
        _busyFrontMedia = true;
      } else {
        _busyBackMedia = true;
      }
      _status = null;
    });

    try {
      await VaultGvviService.uploadMedia(
        client: _client,
        userId: userId,
        instanceId: data.instanceId,
        side: side,
        file: picked,
      );
      await _load();
      if (!mounted) {
        return;
      }
      setState(() {
        _status = side == GvviImageSide.front
            ? 'Front photo saved.'
            : 'Back photo saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          if (side == GvviImageSide.front) {
            _busyFrontMedia = false;
          } else {
            _busyBackMedia = false;
          }
        });
      }
    }
  }

  Future<void> _removeMedia(GvviImageSide side) async {
    final data = _data;
    if (data == null || data.isArchived) {
      return;
    }

    setState(() {
      if (side == GvviImageSide.front) {
        _busyFrontMedia = true;
      } else {
        _busyBackMedia = true;
      }
      _status = null;
    });

    try {
      await VaultGvviService.removeMedia(
        client: _client,
        instanceId: data.instanceId,
        side: side,
        currentPath: side == GvviImageSide.front
            ? data.frontImagePath
            : data.backImagePath,
      );
      await _load();
      if (!mounted) {
        return;
      }
      setState(() {
        _status = side == GvviImageSide.front
            ? 'Front photo removed.'
            : 'Back photo removed.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          if (side == GvviImageSide.front) {
            _busyFrontMedia = false;
          } else {
            _busyBackMedia = false;
          }
        });
      }
    }
  }

  Future<void> _removeCopy() async {
    final data = _data;
    if (data == null || data.isArchived || _removing) {
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(data.isGraded ? 'Remove slab?' : 'Remove copy?'),
        content: Text(
          data.isGraded
              ? 'This exact slab will be removed from your active vault.'
              : 'This exact copy will be removed from your active vault.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _removing = true;
      _status = null;
    });

    try {
      await VaultGvviService.archiveExactCopy(
        client: _client,
        instanceId: data.instanceId,
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            data.isGraded
                ? 'Exact slab removed from your active vault.'
                : 'Exact copy removed from your active vault.',
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _removing = false;
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GVVI'),
        actions: [
          IconButton(
            tooltip: 'Reload',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _data == null
          ? _VaultGvviStateCard(
              icon: Icons.style_outlined,
              title: 'Exact copy unavailable',
              body: _error ?? 'This exact copy could not be loaded.',
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 22),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _VaultGvviHero(data: _data!),
                  const SizedBox(height: 14),
                  Text(
                    _data!.cardName,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _VaultGvviChip(
                        label: _intentLabel(_data!.intent),
                        tone: Theme.of(context).colorScheme.primary,
                      ),
                      _VaultGvviChip(
                        label: _data!.isGraded ? 'Graded slab' : 'Raw copy',
                        tone: Colors.deepPurple,
                      ),
                      if (_data!.isSharedOnWall)
                        _VaultGvviChip(
                          label: 'On wall',
                          tone: Colors.orange.shade800,
                        ),
                      if ((_data!.conditionLabel ?? '').trim().isNotEmpty &&
                          !_data!.isGraded)
                        _VaultGvviChip(
                          label: _data!.conditionLabel!,
                          tone: Colors.teal,
                        ),
                      if ((_data!.certNumber ?? '').trim().isNotEmpty)
                        _VaultGvviChip(
                          label: 'Cert ${_data!.certNumber}',
                          tone: Colors.indigo,
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _VaultPathButton(
                        label: 'Manage card',
                        onPressed: _openGroupedCard,
                      ),
                      _VaultPathButton(
                        label: 'View card',
                        onPressed: _openCard,
                      ),
                      if (_data!.canOpenPublicPage)
                        _VaultPathButton(
                          label: 'Open public page',
                          onPressed: _openPublicPage,
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  _VaultGvviPriceSurface(data: _data!),
                  const SizedBox(height: 10),
                  _VaultIdentityGrid(data: _data!),
                  const SizedBox(height: 10),
                  _WallVisibilityRow(
                    data: _data!,
                    busy: _togglingWall,
                    onChanged: (_) => _toggleWall(),
                  ),
                  const SizedBox(height: 10),
                  _NotesSurface(
                    controller: _notesController,
                    enabled: !_data!.isArchived && !_savingNotes,
                    onSave: _saveNotes,
                    saving: _savingNotes,
                  ),
                  const SizedBox(height: 10),
                  _MediaSurface(
                    data: _data!,
                    busyFront: _busyFrontMedia,
                    busyBack: _busyBackMedia,
                    onPickFront: () => _pickMedia(GvviImageSide.front),
                    onPickBack: () => _pickMedia(GvviImageSide.back),
                    onRemoveFront: () => _removeMedia(GvviImageSide.front),
                    onRemoveBack: () => _removeMedia(GvviImageSide.back),
                  ),
                  if (_data!.outcomes.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    _OutcomeSurface(outcomes: _data!.outcomes),
                  ],
                  if ((_status ?? '').trim().isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      _status!,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withValues(alpha: 0.72),
                      ),
                    ),
                  ],
                  if (!_data!.isArchived) ...[
                    const SizedBox(height: 14),
                    OutlinedButton.icon(
                      onPressed: _removing ? null : _removeCopy,
                      icon: const Icon(Icons.delete_outline),
                      label: Text(
                        _removing
                            ? 'Removing...'
                            : (_data!.isGraded ? 'Remove slab' : 'Remove copy'),
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }

  String _intentLabel(String intent) {
    switch (intent) {
      case 'trade':
        return 'Trade';
      case 'sell':
        return 'Sell';
      case 'showcase':
        return 'Showcase';
      default:
        return 'Hold';
    }
  }
}

class _VaultGvviHero extends StatelessWidget {
  const _VaultGvviHero({required this.data});

  final VaultGvviData data;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 250),
        child: AspectRatio(
          aspectRatio: 3 / 4,
          child: CardSurfaceArtwork(
            label: data.cardName,
            imageUrl: data.primaryImageUrl ?? data.fallbackImageUrl,
            borderRadius: 22,
            padding: const EdgeInsets.all(8),
            showZoomAffordance:
                (data.primaryImageUrl ?? data.fallbackImageUrl ?? '')
                    .trim()
                    .isNotEmpty,
          ),
        ),
      ),
    );
  }
}

class _VaultPathButton extends StatelessWidget {
  const _VaultPathButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.arrow_outward_rounded, size: 16),
      label: Text(label),
    );
  }
}

class _VaultGvviPriceSurface extends StatelessWidget {
  const _VaultGvviPriceSurface({required this.data});

  final VaultGvviData data;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final headline = data.pricingMode == GvviPricingMode.asking
        ? VaultGvviService.formatPrice(
            data.askingPriceAmount,
            currency: data.askingPriceCurrency ?? 'USD',
          )
        : VaultGvviService.formatPrice(data.marketReferencePrice);
    final subtitle = data.pricingMode == GvviPricingMode.asking
        ? (data.askingPriceNote ?? 'Owner-set asking price for this copy.')
        : _pricingSourceLabel(data.marketReferenceSource);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            (data.pricingMode == GvviPricingMode.asking
                    ? 'Asking price'
                    : 'Market reference')
                .toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.75,
              color: colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            headline ??
                (data.isGraded
                    ? 'No market reference for this slab yet.'
                    : 'No market reference available.'),
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.45,
            ),
          ),
          if (subtitle.trim().isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(
              subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _pricingSourceLabel(String? source) {
    switch ((source ?? '').trim().toLowerCase()) {
      case 'justtcg':
        return 'JustTCG';
      case 'ebay':
        return 'eBay';
      default:
        return 'Market reference';
    }
  }
}

class _VaultIdentityGrid extends StatelessWidget {
  const _VaultIdentityGrid({required this.data});

  final VaultGvviData data;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _VaultMeta(label: 'GVVI', value: data.gvviId),
        _VaultMeta(label: 'Set', value: data.setCode),
        _VaultMeta(label: 'Number', value: data.number),
        _VaultMeta(
          label: 'Condition',
          value: data.isGraded ? 'SLAB' : (data.conditionLabel ?? 'Unknown'),
        ),
        _VaultMeta(label: 'Grader', value: data.grader ?? '—'),
        _VaultMeta(
          label: 'Grade / Cert',
          value:
              [
                    data.grade,
                    data.certNumber != null ? 'Cert ${data.certNumber}' : null,
                  ]
                  .whereType<String>()
                  .where((value) => value.trim().isNotEmpty)
                  .join(' • ')
                  .trim()
                  .isEmpty
              ? '—'
              : [
                      data.grade,
                      data.certNumber != null
                          ? 'Cert ${data.certNumber}'
                          : null,
                    ]
                    .whereType<String>()
                    .where((value) => value.trim().isNotEmpty)
                    .join(' • '),
        ),
        _VaultMeta(
          label: 'Created',
          value: data.createdAt == null
              ? 'Recently'
              : '${data.createdAt!.month}/${data.createdAt!.day}/${data.createdAt!.year}',
        ),
        _VaultMeta(
          label: 'Status',
          value: data.isArchived ? 'Archived' : 'Active copy',
        ),
      ],
    );
  }
}

class _WallVisibilityRow extends StatelessWidget {
  const _WallVisibilityRow({
    required this.data,
    required this.busy,
    required this.onChanged,
  });

  final VaultGvviData data;
  final bool busy;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'On Wall',
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  'Grouped card visibility',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.66),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: data.isSharedOnWall,
            onChanged: busy ? null : onChanged,
          ),
        ],
      ),
    );
  }
}

class _NotesSurface extends StatelessWidget {
  const _NotesSurface({
    required this.controller,
    required this.enabled,
    required this.onSave,
    required this.saving,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSave;
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Notes',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: controller,
            enabled: enabled,
            minLines: 3,
            maxLines: 5,
            maxLength: 2000,
            decoration: const InputDecoration(
              hintText: 'Private notes for this exact copy',
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: FilledButton(
              onPressed: enabled && !saving ? onSave : null,
              child: Text(saving ? 'Saving...' : 'Save notes'),
            ),
          ),
        ],
      ),
    );
  }
}

class _MediaSurface extends StatelessWidget {
  const _MediaSurface({
    required this.data,
    required this.busyFront,
    required this.busyBack,
    required this.onPickFront,
    required this.onPickBack,
    required this.onRemoveFront,
    required this.onRemoveBack,
  });

  final VaultGvviData data;
  final bool busyFront;
  final bool busyBack;
  final VoidCallback onPickFront;
  final VoidCallback onPickBack;
  final VoidCallback onRemoveFront;
  final VoidCallback onRemoveBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.12),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Photos',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _MediaTile(
                  label: 'Front',
                  imageUrl: data.frontImageUrl,
                  busy: busyFront,
                  enabled: !data.isArchived,
                  onPick: onPickFront,
                  onRemove: onRemoveFront,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MediaTile(
                  label: 'Back',
                  imageUrl: data.backImageUrl,
                  busy: busyBack,
                  enabled: !data.isArchived,
                  onPick: onPickBack,
                  onRemove: onRemoveBack,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MediaTile extends StatelessWidget {
  const _MediaTile({
    required this.label,
    required this.imageUrl,
    required this.busy,
    required this.enabled,
    required this.onPick,
    required this.onRemove,
  });

  final String label;
  final String? imageUrl;
  final bool busy;
  final bool enabled;
  final VoidCallback onPick;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final hasImage = (imageUrl ?? '').trim().isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.75,
          ),
        ),
        const SizedBox(height: 6),
        AspectRatio(
          aspectRatio: 3 / 4,
          child: CardSurfaceArtwork(
            label: '$label photo',
            imageUrl: imageUrl,
            borderRadius: 18,
            padding: const EdgeInsets.all(6),
            showZoomAffordance: hasImage,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            OutlinedButton(
              onPressed: enabled && !busy ? onPick : null,
              child: Text(
                busy ? 'Uploading...' : (hasImage ? 'Replace' : 'Upload'),
              ),
            ),
            if (hasImage)
              TextButton(
                onPressed: enabled && !busy ? onRemove : null,
                child: const Text('Remove'),
              ),
          ],
        ),
      ],
    );
  }
}

class _OutcomeSurface extends StatelessWidget {
  const _OutcomeSurface({required this.outcomes});

  final List<VaultGvviOutcome> outcomes;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'History',
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          for (var index = 0; index < outcomes.length; index++) ...[
            if (index > 0) const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest.withValues(
                  alpha: 0.28,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${_title(outcomes[index])} ${outcomes[index].role == 'source' ? 'away' : 'in'}',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        if (outcomes[index].createdAt != null)
                          Text(
                            '${outcomes[index].createdAt!.month}/${outcomes[index].createdAt!.day}/${outcomes[index].createdAt!.year}',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.66,
                                  ),
                                ),
                          ),
                      ],
                    ),
                  ),
                  if (outcomes[index].priceAmount != null)
                    Text(
                      VaultGvviService.formatPrice(
                            outcomes[index].priceAmount,
                            currency: outcomes[index].priceCurrency ?? 'USD',
                          ) ??
                          '',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _title(VaultGvviOutcome outcome) {
    switch (outcome.outcomeType) {
      case 'sale':
        return outcome.role == 'source' ? 'Sold' : 'Received';
      case 'trade':
        return outcome.role == 'source' ? 'Traded' : 'Received';
      default:
        return 'Moved';
    }
  }
}

class _VaultMeta extends StatelessWidget {
  const _VaultMeta({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: 166,
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.75,
              color: colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _VaultGvviChip extends StatelessWidget {
  const _VaultGvviChip({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: 0.18)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _VaultGvviStateCard extends StatelessWidget {
  const _VaultGvviStateCard({
    required this.icon,
    required this.title,
    required this.body,
  });

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.12),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 28, color: colorScheme.primary),
              const SizedBox(height: 12),
              Text(
                title,
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text(
                body,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.72),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
