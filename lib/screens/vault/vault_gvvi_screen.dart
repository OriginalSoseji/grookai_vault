import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/identity/display_identity.dart';
import '../../services/navigation/grookai_web_route_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../services/vault/slab_upgrade_service.dart';
import '../../widgets/card_surface_artwork.dart';
import '../gvvi/public_gvvi_screen.dart';
import 'slab_upgrade_screen.dart';
import 'vault_manage_card_screen.dart';

ResolvedDisplayIdentity _gvviDisplayIdentity(VaultGvviData data) {
  return resolveDisplayIdentityFromFields(
    name: data.cardName,
    variantKey: data.variantKey,
    printedIdentityModifier: data.printedIdentityModifier,
    setIdentityModel: data.setIdentityModel,
    setCode: data.setCode,
    number: data.number == '—' ? null : data.number,
  );
}

ResolvedDisplayIdentity _gvviRelatedDisplayIdentity(_GvviRelatedPrint print) {
  return resolveDisplayIdentityFromFields(
    name: print.name,
    variantKey: print.variantKey,
    printedIdentityModifier: print.printedIdentityModifier,
    setIdentityModel: print.setIdentityModel,
    setCode: print.setCode,
    number: print.number.isEmpty ? null : print.number,
  );
}

class VaultGvviScreen extends StatefulWidget {
  const VaultGvviScreen({
    required this.gvviId,
    this.launchedFromSearch = false,
    super.key,
  });

  final String gvviId;
  final bool launchedFromSearch;

  @override
  State<VaultGvviScreen> createState() => _VaultGvviScreenState();
}

class _VaultGvviScreenState extends State<VaultGvviScreen> {
  final SupabaseClient _client = Supabase.instance.client;
  final ImagePicker _imagePicker = ImagePicker();
  final TextEditingController _notesController = TextEditingController();

  VaultGvviData? _data;
  List<_GvviRelatedPrint> _relatedPrints = const [];
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
      final relatedPrints = await _fetchRelatedPrints(data);
      if (!mounted) {
        return;
      }

      _notesController.text = data?.notes ?? '';
      setState(() {
        _data = data;
        _relatedPrints = relatedPrints;
        _loading = false;
        _error = data == null ? 'Exact copy not found.' : null;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _relatedPrints = const [];
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<List<_GvviRelatedPrint>> _fetchRelatedPrints(
    VaultGvviData? data,
  ) async {
    final cardName = _cleanText(data?.cardName);
    final cardPrintId = _cleanText(data?.cardPrintId);
    if (cardName.isEmpty || cardPrintId.isEmpty) {
      return const [];
    }

    try {
      final rows = await _client
          .from('card_prints')
          .select(
            'id,gv_id,name,set_code,number,number_plain,rarity,variant_key,printed_identity_modifier,image_url,image_alt_url,representative_image_url,sets(name,release_date,identity_model)',
          )
          .eq('name', cardName)
          .neq('id', cardPrintId)
          .not('gv_id', 'is', null)
          .order('set_code', ascending: true)
          .order('number_plain', ascending: true, nullsFirst: false)
          .order('number', ascending: true)
          .limit(12);

      return (rows as List<dynamic>)
          .map((row) => Map<String, dynamic>.from(row as Map))
          .map((row) {
            final setRecord = _extractRecord(row['sets']);
            final id = _cleanText(row['id']);
            final gvId = _cleanText(row['gv_id']);
            if (id.isEmpty || gvId.isEmpty) {
              return null;
            }

            return _GvviRelatedPrint(
              cardPrintId: id,
              gvId: gvId,
              name: _cleanText(row['name']).isEmpty
                  ? cardName
                  : _cleanText(row['name']),
              setName: _cleanText(setRecord?['name']),
              setCode: _cleanText(row['set_code']).toUpperCase(),
              number: _cleanText(row['number_plain']).isNotEmpty
                  ? _cleanText(row['number_plain'])
                  : _cleanText(row['number']),
              rarity: _cleanText(row['rarity']),
              variantKey: _cleanText(row['variant_key']).isEmpty
                  ? null
                  : _cleanText(row['variant_key']),
              printedIdentityModifier:
                  _cleanText(row['printed_identity_modifier']).isEmpty
                  ? null
                  : _cleanText(row['printed_identity_modifier']),
              setIdentityModel: _cleanText(setRecord?['identity_model']).isEmpty
                  ? null
                  : _cleanText(setRecord?['identity_model']),
              imageUrl: _displayImageUrl(row),
            );
          })
          .whereType<_GvviRelatedPrint>()
          .toList();
    } catch (_) {
      return const [];
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

  bool _canUpgradeToSlab(VaultGvviData data) {
    return !data.isArchived && !data.isGraded && data.gvId.trim().isNotEmpty;
  }

  Future<void> _openSlabUpgradeFlow() async {
    final data = _data;
    if (data == null || !_canUpgradeToSlab(data)) {
      return;
    }

    // NATIVE_SLAB_UPGRADE_FLOW_V1
    // Raw private copies upgrade to slab through the in-app slab flow, not
    // web handoff.
    final result = await Navigator.of(context).push<SlabUpgradeResult>(
      MaterialPageRoute<SlabUpgradeResult>(
        builder: (_) => SlabUpgradeScreen(
          sourceInstanceId: data.instanceId,
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          cardName: data.cardName,
          setName: data.setName,
          imageUrl: data.primaryImageUrl ?? data.imageUrl,
        ),
      ),
    );
    if (!mounted || result == null) {
      return;
    }

    if (result.gvviId.isNotEmpty) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => VaultGvviScreen(
            gvviId: result.gvviId,
            launchedFromSearch: widget.launchedFromSearch,
          ),
        ),
      );
      return;
    }

    await _load();
  }

  Future<void> _openRelatedPrint(_GvviRelatedPrint print) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: print.cardPrintId,
          gvId: print.gvId,
          name: print.name,
          setName: print.setName,
          setCode: print.setCode,
          number: print.number,
          rarity: print.rarity,
          imageUrl: print.imageUrl,
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

  Future<void> _copyPublicLink() async {
    final data = _data;
    if (data == null || !data.canOpenPublicPage) {
      return;
    }

    final uri = GrookaiWebRouteService.buildUri(
      '/gvvi/${Uri.encodeComponent(data.gvviId)}',
    );
    await Clipboard.setData(ClipboardData(text: uri.toString()));
    if (!mounted) {
      return;
    }

    setState(() {
      _status = 'Public link copied.';
    });
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
        title: const Text('Exact Copy'),
        actions: [
          if (widget.launchedFromSearch)
            IconButton(
              tooltip: 'Add another',
              onPressed: () => Navigator.of(context).maybePop(),
              icon: const Icon(Icons.search_rounded),
            ),
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
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _VaultTopSurface(
                    data: _data!,
                    intentLabel: _intentLabel(_data!.intent),
                    status: _status,
                    wallBusy: _togglingWall,
                    onToggleWall: _toggleWall,
                    onManageCard: _openGroupedCard,
                    onViewCard: _openCard,
                    onOpenPublicPage: _data!.canOpenPublicPage
                        ? _openPublicPage
                        : null,
                    onCopyPublicLink: _data!.canOpenPublicPage
                        ? _copyPublicLink
                        : null,
                    onAddAnother: widget.launchedFromSearch
                        ? () => Navigator.of(context).maybePop()
                        : null,
                    onUpgradeToSlab: _canUpgradeToSlab(_data!)
                        ? _openSlabUpgradeFlow
                        : null,
                  ),
                  const SizedBox(height: 10),
                  _VaultSectionFrame(
                    title: 'Copy',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _NotesSurface(
                          controller: _notesController,
                          enabled: !_data!.isArchived && !_savingNotes,
                          onSave: _saveNotes,
                          saving: _savingNotes,
                          framed: false,
                        ),
                        const SizedBox(height: 12),
                        const _VaultQuietDivider(),
                        const SizedBox(height: 12),
                        _MediaSurface(
                          data: _data!,
                          busyFront: _busyFrontMedia,
                          busyBack: _busyBackMedia,
                          onPickFront: () => _pickMedia(GvviImageSide.front),
                          onPickBack: () => _pickMedia(GvviImageSide.back),
                          onRemoveFront: () =>
                              _removeMedia(GvviImageSide.front),
                          onRemoveBack: () => _removeMedia(GvviImageSide.back),
                          framed: false,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  _VaultSectionFrame(
                    title: 'Details',
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_data!.outcomes.isNotEmpty) ...[
                          Text(
                            'History',
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context).colorScheme.onSurface
                                      .withValues(alpha: 0.60),
                                ),
                          ),
                          const SizedBox(height: 8),
                          _OutcomeSurface(
                            outcomes: _data!.outcomes,
                            framed: false,
                          ),
                          const SizedBox(height: 12),
                          const _VaultQuietDivider(),
                          const SizedBox(height: 12),
                        ],
                        _VaultActionPathRow(
                          leadingLabel: 'Manage',
                          title: 'Manage Card',
                          supporting: _data!.activeCopyCount <= 1
                              ? 'Open grouped controls for this card'
                              : 'Open grouped controls for ${_data!.activeCopyCount} active copies',
                          onTap: _openGroupedCard,
                        ),
                        const SizedBox(height: 12),
                        const _VaultQuietDivider(),
                        const SizedBox(height: 12),
                        _VaultIdentityGrid(data: _data!),
                      ],
                    ),
                  ),
                  if (!_data!.isArchived) ...[
                    const SizedBox(height: 10),
                    _VaultDangerSurface(
                      title: _data!.isGraded
                          ? 'Remove slab from vault'
                          : 'Remove copy from vault',
                      body: '',
                      busy: _removing,
                      buttonLabel: _data!.isGraded
                          ? 'Remove slab'
                          : 'Remove copy',
                      onPressed: _removing ? null : _removeCopy,
                    ),
                  ],
                  if (_relatedPrints.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    _VaultRelatedFamilySection(
                      prints: _relatedPrints,
                      onOpenPrint: _openRelatedPrint,
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

  static Map<String, dynamic>? _extractRecord(dynamic rawValue) {
    if (rawValue is List && rawValue.isNotEmpty && rawValue.first is Map) {
      return Map<String, dynamic>.from(rawValue.first as Map);
    }
    if (rawValue is Map) {
      return Map<String, dynamic>.from(rawValue);
    }
    return null;
  }

  static String _cleanText(dynamic value) {
    return (value ?? '').toString().trim();
  }

  static String? _displayImageUrl(Map<String, dynamic> row) {
    return _normalizeHttpUrl(row['display_image_url']) ??
        _normalizeHttpUrl(row['image_url']) ??
        _normalizeHttpUrl(row['image_alt_url']) ??
        _normalizeHttpUrl(row['representative_image_url']);
  }

  static String? _normalizeHttpUrl(dynamic value) {
    final url = _cleanText(value);
    if (url.isEmpty) {
      return null;
    }

    final parsed = Uri.tryParse(url);
    if (parsed == null ||
        (parsed.scheme != 'http' && parsed.scheme != 'https')) {
      return null;
    }
    return url;
  }
}

class _VaultTopSurface extends StatelessWidget {
  const _VaultTopSurface({
    required this.data,
    required this.intentLabel,
    required this.onManageCard,
    required this.onViewCard,
    required this.status,
    required this.wallBusy,
    required this.onToggleWall,
    this.onOpenPublicPage,
    this.onCopyPublicLink,
    this.onAddAnother,
    this.onUpgradeToSlab,
  });

  final VaultGvviData data;
  final String intentLabel;
  final String? status;
  final bool wallBusy;
  final VoidCallback onToggleWall;
  final VoidCallback onManageCard;
  final VoidCallback onViewCard;
  final VoidCallback? onOpenPublicPage;
  final VoidCallback? onCopyPublicLink;
  final VoidCallback? onAddAnother;
  final VoidCallback? onUpgradeToSlab;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _VaultGvviOverviewSurface(data: data, intentLabel: intentLabel),
          const SizedBox(height: 10),
          _VaultGvviPriceSurface(data: data, framed: false),
          const SizedBox(height: 10),
          _VaultPrimaryActionsSurface(
            wallActionLabel: data.isSharedOnWall
                ? 'Remove from wall'
                : 'Add to Wall',
            wallBusy: wallBusy,
            onToggleWall: onToggleWall,
            onManageCard: onManageCard,
            onViewCard: onViewCard,
            onOpenPublicPage: onOpenPublicPage,
            onCopyPublicLink: onCopyPublicLink,
            onAddAnother: onAddAnother,
            onUpgradeToSlab: onUpgradeToSlab,
            framed: false,
          ),
          if ((status ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            _VaultInlineStatusMessage(message: status!),
          ],
        ],
      ),
    );
  }
}

class _VaultGvviOverviewSurface extends StatelessWidget {
  const _VaultGvviOverviewSurface({
    required this.data,
    required this.intentLabel,
  });

  final VaultGvviData data;
  final String intentLabel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasExactMedia =
        (data.frontImageUrl ?? '').trim().isNotEmpty ||
        (data.backImageUrl ?? '').trim().isNotEmpty;
    final copySummary = data.activeCopyCount <= 1
        ? 'Only active copy in your vault'
        : '1 of ${data.activeCopyCount} active copies in your vault';
    final imageLabel =
        '${data.setName}${data.number == '—' ? '' : ' • #${data.number}'}';

    return LayoutBuilder(
      builder: (context, constraints) {
        final stacked = constraints.maxWidth < 520;
        final displayIdentity = _gvviDisplayIdentity(data);
        final heroArt = Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: stacked ? 220 : 220,
              minWidth: stacked ? 0 : 176,
            ),
            child: AspectRatio(
              aspectRatio: 3 / 4,
              child: CardSurfaceArtwork(
                label: displayIdentity.displayName,
                imageUrl: data.primaryImageUrl ?? data.fallbackImageUrl,
                borderRadius: 24,
                padding: const EdgeInsets.all(6),
                showZoomAffordance:
                    (data.primaryImageUrl ?? data.fallbackImageUrl ?? '')
                        .trim()
                        .isNotEmpty,
              ),
            ),
          ),
        );

        final overview = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'EXACT COPY',
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w700,
                letterSpacing: 0.9,
                color: colorScheme.onSurface.withValues(alpha: 0.46),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              displayIdentity.displayName,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.55,
                height: 1.02,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              imageLabel,
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface.withValues(alpha: 0.76),
              ),
            ),
            const SizedBox(height: 2),
            Text(
              copySummary,
              style: theme.textTheme.labelMedium?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.56),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _VaultGvviChip(label: intentLabel, tone: colorScheme.primary),
                _VaultGvviChip(
                  label: data.isGraded ? 'Graded slab' : 'Raw copy',
                  tone: Colors.deepPurple,
                ),
                _VaultGvviChip(
                  label: data.canOpenPublicPage ? 'Public' : 'Private',
                  tone: data.canOpenPublicPage
                      ? Colors.orange.shade800
                      : colorScheme.secondary,
                ),
                _VaultGvviChip(
                  label:
                      hasExactMedia &&
                          data.imageDisplayMode == GvviImageDisplayMode.uploaded
                      ? 'Uploaded photo'
                      : 'Card art',
                  tone: Colors.blueGrey,
                ),
                if ((_dataLabel(data) ?? '').isNotEmpty)
                  _VaultGvviChip(label: _dataLabel(data)!, tone: Colors.teal),
                _VaultGvviChip(
                  label: data.isSharedOnWall ? 'On wall' : 'Off wall',
                  tone: data.isSharedOnWall
                      ? Colors.green.shade700
                      : colorScheme.onSurface.withValues(alpha: 0.65),
                ),
              ],
            ),
          ],
        );

        if (stacked) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [heroArt, const SizedBox(height: 10), overview],
          );
        }

        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            heroArt,
            const SizedBox(width: 16),
            Expanded(child: overview),
          ],
        );
      },
    );
  }

  String? _dataLabel(VaultGvviData data) {
    if ((data.certNumber ?? '').trim().isNotEmpty) {
      return 'Cert ${data.certNumber}';
    }
    if (!data.isGraded && (data.conditionLabel ?? '').trim().isNotEmpty) {
      return data.conditionLabel!;
    }
    return null;
  }
}

class _VaultPrimaryActionsSurface extends StatelessWidget {
  const _VaultPrimaryActionsSurface({
    required this.wallActionLabel,
    required this.wallBusy,
    required this.onToggleWall,
    required this.onManageCard,
    required this.onViewCard,
    this.framed = true,
    this.onOpenPublicPage,
    this.onCopyPublicLink,
    this.onAddAnother,
    this.onUpgradeToSlab,
  });

  final String wallActionLabel;
  final bool wallBusy;
  final VoidCallback onToggleWall;
  final VoidCallback onManageCard;
  final VoidCallback onViewCard;
  final bool framed;
  final VoidCallback? onOpenPublicPage;
  final VoidCallback? onCopyPublicLink;
  final VoidCallback? onAddAnother;
  final VoidCallback? onUpgradeToSlab;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return LayoutBuilder(
      builder: (context, constraints) {
        final twoAcross = constraints.maxWidth >= 360;
        final itemWidth = twoAcross
            ? (constraints.maxWidth - 6) / 2
            : constraints.maxWidth;
        final content = Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            SizedBox(
              width: itemWidth,
              child: _VaultOverviewActionCard(
                icon: wallActionLabel == 'Add to Wall'
                    ? Icons.push_pin_outlined
                    : Icons.push_pin_rounded,
                label: wallActionLabel,
                onTap: onToggleWall,
                busy: wallBusy,
              ),
            ),
            if (onOpenPublicPage != null)
              SizedBox(
                width: itemWidth,
                child: _VaultOverviewActionCard(
                  icon: Icons.public_outlined,
                  label: 'Open public page',
                  onTap: onOpenPublicPage!,
                ),
              ),
            if (onCopyPublicLink != null)
              SizedBox(
                width: itemWidth,
                child: _VaultOverviewActionCard(
                  icon: Icons.share_outlined,
                  label: 'Copy share link',
                  onTap: onCopyPublicLink!,
                ),
              ),
            if (onAddAnother != null)
              SizedBox(
                width: itemWidth,
                child: _VaultOverviewActionCard(
                  icon: Icons.search_rounded,
                  label: 'Add another',
                  onTap: onAddAnother!,
                ),
              ),
            if (onUpgradeToSlab != null)
              SizedBox(
                width: itemWidth,
                child: _VaultOverviewActionCard(
                  icon: Icons.verified_outlined,
                  label: 'Upgrade to Slab',
                  onTap: onUpgradeToSlab!,
                ),
              ),
            SizedBox(
              width: itemWidth,
              child: _VaultOverviewActionCard(
                icon: Icons.tune_rounded,
                label: 'Manage card',
                onTap: onManageCard,
              ),
            ),
            SizedBox(
              width: itemWidth,
              child: _VaultOverviewActionCard(
                icon: Icons.style_outlined,
                label: 'View card',
                onTap: onViewCard,
              ),
            ),
          ],
        );

        if (!framed) {
          return content;
        }

        return Container(
          padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.06),
            ),
          ),
          child: content,
        );
      },
    );
  }
}

class _VaultOverviewActionCard extends StatelessWidget {
  const _VaultOverviewActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
    this.busy = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: busy ? null : onTap,
        child: Ink(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.06),
            ),
          ),
          child: Row(
            children: [
              busy
                  ? SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colorScheme.primary,
                      ),
                    )
                  : Icon(icon, size: 18, color: colorScheme.primary),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VaultQuietDivider extends StatelessWidget {
  const _VaultQuietDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.08),
    );
  }
}

class _VaultGvviPriceSurface extends StatelessWidget {
  const _VaultGvviPriceSurface({required this.data, this.framed = true});

  final VaultGvviData data;
  final bool framed;

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
        ? (data.askingPriceNote ?? 'Owner-set asking price')
        : _pricingSourceLabel(data.marketReferenceSource);

    final content = Column(
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
            color: colorScheme.onSurface.withValues(alpha: 0.45),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          headline ??
              (data.isGraded
                  ? 'No market reference for this slab yet.'
                  : 'No market reference available.'),
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.45,
            height: 1.0,
          ),
        ),
        if (subtitle.trim().isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.52),
            ),
          ),
        ],
      ],
    );

    if (!framed) {
      return content;
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: content,
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
      spacing: 7,
      runSpacing: 7,
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

class _VaultActionPathRow extends StatelessWidget {
  const _VaultActionPathRow({
    required this.leadingLabel,
    required this.title,
    required this.supporting,
    required this.onTap,
  });

  final String leadingLabel;
  final String title;
  final String supporting;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.045),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.12),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      leadingLabel.toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.75,
                        color: colorScheme.onSurface.withValues(alpha: 0.52),
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: colorScheme.primary,
                      ),
                    ),
                    if (supporting.trim().isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        supporting,
                        style: Theme.of(context).textTheme.labelMedium
                            ?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.62,
                              ),
                            ),
                      ),
                    ],
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: colorScheme.primary,
              ),
            ],
          ),
        ),
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
    this.framed = true,
  });

  final TextEditingController controller;
  final bool enabled;
  final VoidCallback onSave;
  final bool saving;
  final bool framed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Notes',
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          enabled: enabled,
          minLines: 3,
          maxLines: 5,
          maxLength: 2000,
          decoration: const InputDecoration(hintText: 'Private notes'),
        ),
        const SizedBox(height: 6),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.tonal(
            onPressed: enabled && !saving ? onSave : null,
            child: Text(saving ? 'Saving...' : 'Save notes'),
          ),
        ),
      ],
    );

    if (!framed) {
      return content;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: content,
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
    this.framed = true,
  });

  final VaultGvviData data;
  final bool busyFront;
  final bool busyBack;
  final VoidCallback onPickFront;
  final VoidCallback onPickBack;
  final VoidCallback onRemoveFront;
  final VoidCallback onRemoveBack;
  final bool framed;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Photos',
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
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
    );

    if (!framed) {
      return content;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.outline.withValues(alpha: 0.08),
        ),
      ),
      child: content,
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
            color: Theme.of(
              context,
            ).colorScheme.onSurface.withValues(alpha: 0.56),
          ),
        ),
        const SizedBox(height: 6),
        AspectRatio(
          aspectRatio: 3 / 4,
          child: CardSurfaceArtwork(
            label: '$label photo',
            imageUrl: imageUrl,
            borderRadius: 16,
            padding: const EdgeInsets.all(5),
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
  const _OutcomeSurface({required this.outcomes, this.framed = true});

  final List<VaultGvviOutcome> outcomes;
  final bool framed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (var index = 0; index < outcomes.length; index++) ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${_title(outcomes[index])} ${outcomes[index].role == 'source' ? 'away' : 'in'}',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    if (outcomes[index].createdAt != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '${outcomes[index].createdAt!.month}/${outcomes[index].createdAt!.day}/${outcomes[index].createdAt!.year}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.56),
                        ),
                      ),
                    ],
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
                  style: Theme.of(
                    context,
                  ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
            ],
          ),
          if (index < outcomes.length - 1) ...[
            const SizedBox(height: 10),
            const _VaultQuietDivider(),
            const SizedBox(height: 10),
          ],
        ],
      ],
    );

    if (!framed) {
      return content;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: content,
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
      width: 158,
      padding: const EdgeInsets.fromLTRB(11, 9, 11, 9),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.04)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.75,
              color: colorScheme.onSurface.withValues(alpha: 0.38),
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tone.withValues(alpha: 0.10)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _VaultSectionFrame extends StatelessWidget {
  const _VaultSectionFrame({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _VaultInlineStatusMessage extends StatelessWidget {
  const _VaultInlineStatusMessage({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface.withValues(alpha: 0.74),
        ),
      ),
    );
  }
}

class _VaultDangerSurface extends StatelessWidget {
  const _VaultDangerSurface({
    required this.title,
    required this.body,
    required this.buttonLabel,
    required this.onPressed,
    this.busy = false,
  });

  final String title;
  final String body;
  final String buttonLabel;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.error.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
          ),
          if (body.trim().isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(
              body,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
                height: 1.25,
              ),
            ),
          ],
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: onPressed,
            icon: const Icon(Icons.delete_outline),
            label: Text(busy ? 'Removing...' : buttonLabel),
          ),
        ],
      ),
    );
  }
}

class _VaultRelatedFamilySection extends StatelessWidget {
  const _VaultRelatedFamilySection({
    required this.prints,
    required this.onOpenPrint,
  });

  final List<_GvviRelatedPrint> prints;
  final ValueChanged<_GvviRelatedPrint> onOpenPrint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 520
            ? 4
            : constraints.maxWidth >= 380
            ? 4
            : 3;
        const spacing = 8.0;
        final tileWidth =
            (constraints.maxWidth - (spacing * (columns - 1))) / columns;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'More versions',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: spacing,
              runSpacing: 6,
              children: [
                for (final print in prints.take(columns * 2))
                  SizedBox(
                    width: tileWidth,
                    child: _VaultRelatedPrintTile(
                      print: print,
                      onTap: () => onOpenPrint(print),
                    ),
                  ),
              ],
            ),
          ],
        );
      },
    );
  }
}

class _VaultRelatedPrintTile extends StatelessWidget {
  const _VaultRelatedPrintTile({required this.print, required this.onTap});

  final _GvviRelatedPrint print;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final displayIdentity = _gvviRelatedDisplayIdentity(print);
    final secondaryLabel = [
      if (print.setCode.isNotEmpty) print.setCode,
      if (print.number.isNotEmpty) '#${print.number}',
    ].join(' • ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 1),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AspectRatio(
                aspectRatio: 3 / 4,
                child: CardSurfaceArtwork(
                  label: displayIdentity.displayName,
                  imageUrl: print.imageUrl,
                  borderRadius: 16,
                  padding: const EdgeInsets.all(4),
                  showZoomAffordance: false,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                secondaryLabel.isEmpty
                    ? displayIdentity.displayName
                    : secondaryLabel,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface.withValues(alpha: 0.76),
                ),
              ),
              if (print.rarity.isNotEmpty) ...[
                const SizedBox(height: 1),
                Text(
                  print.rarity,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.54),
                  ),
                ),
              ],
            ],
          ),
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

class _GvviRelatedPrint {
  const _GvviRelatedPrint({
    required this.cardPrintId,
    required this.gvId,
    required this.name,
    required this.setName,
    required this.setCode,
    required this.number,
    required this.rarity,
    this.variantKey,
    this.printedIdentityModifier,
    this.setIdentityModel,
    required this.imageUrl,
  });

  final String cardPrintId;
  final String gvId;
  final String name;
  final String setName;
  final String setCode;
  final String number;
  final String rarity;
  final String? variantKey;
  final String? printedIdentityModifier;
  final String? setIdentityModel;
  final String? imageUrl;
}
