import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/identity/display_identity.dart';
import '../../services/identity/image_presentation.dart';
import '../../services/navigation/grookai_web_route_service.dart';
import '../../services/vault/collector_memory_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../services/vault/slab_upgrade_service.dart';
import '../../utils/display_image_contract.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/gv_chip.dart';
import '../gvvi/public_gvvi_screen.dart';
import '../public_collector/public_collector_screen.dart';
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
  final CollectorMemoryService _memoryService = CollectorMemoryService();
  final TextEditingController _notesController = TextEditingController();

  VaultGvviData? _data;
  List<_GvviRelatedPrint> _relatedPrints = const [];
  List<CollectorMemory> _memories = const <CollectorMemory>[];
  List<CollectorMemoryPrompt> _memoryPrompts = const <CollectorMemoryPrompt>[];
  List<VaultGvviSectionMembership> _sectionMemberships =
      const <VaultGvviSectionMembership>[];
  Map<String, String> _memoryPhotoUrls = const <String, String>{};
  final Set<String> _pendingMemoryArchiveIds = <String>{};
  final Map<String, Timer> _pendingMemoryArchiveTimers = <String, Timer>{};
  final Map<String, CollectorMemory> _pendingMemoryArchives =
      <String, CollectorMemory>{};
  bool _loading = true;
  bool _loadingMemories = false;
  bool _savingNotes = false;
  bool _savingIntent = false;
  bool _savingMemory = false;
  bool _creatingSection = false;
  String? _busySectionId;
  bool _busyFrontMedia = false;
  bool _busyBackMedia = false;
  bool _removing = false;
  String? _error;
  String? _status;
  String? _memoryError;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final timer in _pendingMemoryArchiveTimers.values) {
      timer.cancel();
    }
    for (final memory in _pendingMemoryArchives.values) {
      unawaited(
        _memoryService
            .archive(memoryId: memory.id, photoPath: memory.photoPath)
            .catchError((_) {}),
      );
    }
    _pendingMemoryArchiveTimers.clear();
    _pendingMemoryArchives.clear();
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
      final results = await Future.wait<dynamic>([
        _fetchRelatedPrints(data),
        data == null
            ? Future<List<VaultGvviSectionMembership>>.value(
                const <VaultGvviSectionMembership>[],
              )
            : VaultGvviService.loadSectionMemberships(
                client: _client,
                instanceId: data.instanceId,
              ),
      ]);
      final relatedPrints = results[0] as List<_GvviRelatedPrint>;
      final sectionMemberships = results[1] as List<VaultGvviSectionMembership>;
      if (!mounted) {
        return;
      }

      _notesController.text = data?.notes ?? '';
      setState(() {
        _data = data;
        _relatedPrints = relatedPrints;
        _sectionMemberships = sectionMemberships;
        _memories = const <CollectorMemory>[];
        _memoryPrompts = const <CollectorMemoryPrompt>[];
        _memoryPhotoUrls = const <String, String>{};
        _loadingMemories = kCollectorMemoriesEnabled && data != null;
        _memoryError = null;
        _loading = false;
        _error = data == null ? 'Exact copy not found.' : null;
      });
      if (kCollectorMemoriesEnabled && data != null) {
        unawaited(_loadMemoriesFor(data.gvviId));
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _loading = false;
        _relatedPrints = const [];
        _memories = const <CollectorMemory>[];
        _memoryPrompts = const <CollectorMemoryPrompt>[];
        _memoryPhotoUrls = const <String, String>{};
        _loadingMemories = false;
        _sectionMemberships = const <VaultGvviSectionMembership>[];
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _loadMemoriesFor(String gvviId) async {
    if (!kCollectorMemoriesEnabled) {
      return;
    }
    setState(() {
      _loadingMemories = true;
      _memoryError = null;
    });

    try {
      final results = await Future.wait<dynamic>([
        _memoryService.loadForGvvi(gvviId: gvviId),
        _memoryService.loadPrompts(gvviId: gvviId),
      ]);
      final memories = results[0] as List<CollectorMemory>;
      final prompts = results[1] as List<CollectorMemoryPrompt>;
      final photoUrls = await _signedMemoryPhotoUrls(memories);
      if (!mounted || _data?.gvviId != gvviId) {
        return;
      }
      setState(() {
        _memories = memories;
        _memoryPrompts = prompts;
        _memoryPhotoUrls = photoUrls;
        _loadingMemories = false;
        _memoryError = null;
      });
    } catch (error) {
      if (!mounted || _data?.gvviId != gvviId) {
        return;
      }
      setState(() {
        _loadingMemories = false;
        _memoryError = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<Map<String, String>> _signedMemoryPhotoUrls(
    List<CollectorMemory> memories,
  ) async {
    final entries = <MapEntry<String, String>>[];
    for (final memory in memories) {
      final url = await _memoryService.createSignedPhotoUrl(memory.photoPath);
      if (url != null) {
        entries.add(MapEntry<String, String>(memory.id, url));
      }
    }
    return Map<String, String>.fromEntries(entries);
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

  Future<void> _sharePublicLink() async {
    final data = _data;
    if (data == null || !data.canOpenPublicPage) {
      return;
    }

    final uri = GrookaiWebRouteService.buildUri(_publicGvviPath(data.gvviId));
    await SharePlus.instance.share(
      ShareParams(uri: uri, subject: data.cardName),
    );
  }

  Future<void> _openPublicWall() async {
    final slug = (_data?.publicSlug ?? '').trim();
    if (slug.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: slug),
      ),
    );
  }

  Future<void> _openPublicSection(VaultGvviSectionMembership section) async {
    final slug = (_data?.publicSlug ?? '').trim();
    if (slug.isEmpty || !section.isMember) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) =>
            PublicCollectorScreen(slug: slug, initialSectionId: section.id),
      ),
    );
  }

  Future<void> _copyPublicPreviewLink(String path, String label) async {
    final uri = GrookaiWebRouteService.buildUri(path);
    await Clipboard.setData(ClipboardData(text: uri.toString()));
    if (!mounted) {
      return;
    }

    setState(() {
      _status = '$label link copied.';
    });
  }

  static String _publicGvviPath(String gvviId) {
    return '/gvvi/${Uri.encodeComponent(gvviId)}';
  }

  static String _publicWallPath(String slug) {
    return '/u/${Uri.encodeComponent(slug.trim().toLowerCase())}';
  }

  static String _publicSectionPath({
    required String slug,
    required String sectionId,
  }) {
    return '${_publicWallPath(slug)}/section/${Uri.encodeComponent(sectionId)}';
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

  Future<void> _saveIntent(String nextIntent) async {
    final data = _data;
    if (data == null ||
        data.isArchived ||
        _savingIntent ||
        nextIntent == data.intent) {
      return;
    }

    setState(() {
      _savingIntent = true;
      _status = null;
    });

    try {
      final savedIntent = await VaultGvviService.saveIntent(
        client: _client,
        instanceId: data.instanceId,
        intent: nextIntent,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _data = data.copyWith(
          intent: savedIntent,
          isSharedOnWall: savedIntent != 'hold',
        );
        _savingIntent = false;
        _status = savedIntent == 'hold'
            ? 'Copy is private.'
            : 'Copy is public on your Wall.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _savingIntent = false;
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _toggleSectionMembership(
    VaultGvviSectionMembership section,
  ) async {
    final data = _data;
    if (data == null || _busySectionId != null) {
      return;
    }

    setState(() {
      _busySectionId = section.id;
      _status = null;
    });

    try {
      if (section.isMember) {
        await VaultGvviService.removeSectionMembership(
          client: _client,
          instanceId: data.instanceId,
          sectionId: section.id,
        );
      } else {
        await VaultGvviService.assignSectionMembership(
          client: _client,
          instanceId: data.instanceId,
          sectionId: section.id,
        );
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _sectionMemberships = _sectionMemberships
            .map(
              (current) => current.id == section.id
                  ? current.copyWith(isMember: !section.isMember)
                  : current,
            )
            .toList();
        _busySectionId = null;
        _status = section.isMember
            ? 'Removed from section.'
            : 'Added to section.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _busySectionId = null;
        _status = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<void> _createAndAssignSection() async {
    final data = _data;
    if (data == null ||
        data.isArchived ||
        _creatingSection ||
        _busySectionId != null) {
      return;
    }

    final controller = TextEditingController();
    final name = await showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Create section'),
        content: TextField(
          controller: controller,
          autofocus: true,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(hintText: 'Section name'),
          onSubmitted: (value) => Navigator.of(dialogContext).pop(value),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(dialogContext).pop(controller.text.trim()),
            child: const Text('Create section'),
          ),
        ],
      ),
    );
    controller.dispose();

    final normalizedName = (name ?? '').trim();
    if (normalizedName.isEmpty || !mounted) {
      return;
    }

    setState(() {
      _creatingSection = true;
      _status = null;
    });

    try {
      final section = await VaultGvviService.createSection(
        client: _client,
        name: normalizedName,
      );
      await VaultGvviService.assignSectionMembership(
        client: _client,
        instanceId: data.instanceId,
        sectionId: section.id,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _sectionMemberships =
            [
              ..._sectionMemberships.where(
                (current) => current.id != section.id,
              ),
              section.copyWith(isMember: true),
            ]..sort((left, right) {
              final byPosition = left.position.compareTo(right.position);
              return byPosition != 0
                  ? byPosition
                  : left.name.compareTo(right.name);
            });
        _creatingSection = false;
        _status = 'Section created and copy added.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _creatingSection = false;
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

  List<CollectorMemory> get _visibleMemories {
    if (_pendingMemoryArchiveIds.isEmpty) {
      return _memories;
    }

    return _memories
        .where((memory) => !_pendingMemoryArchiveIds.contains(memory.id))
        .toList(growable: false);
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

  Future<void> _openMemoryComposer({
    CollectorMemory? memory,
    CollectorMemoryPrompt? prompt,
  }) async {
    final data = _data;
    if (data == null || data.isArchived || _savingMemory) {
      return;
    }

    final draft = await showModalBottomSheet<_CollectorMemoryDraft>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CollectorMemoryEditorSheet(
        memory: memory,
        prompt: prompt,
        saving: _savingMemory,
      ),
    );
    if (draft == null || !mounted) {
      return;
    }

    await _saveMemoryDraft(draft, existing: memory);
  }

  Future<void> _saveMemoryDraft(
    _CollectorMemoryDraft draft, {
    CollectorMemory? existing,
  }) async {
    final data = _data;
    if (data == null || _savingMemory) {
      return;
    }

    setState(() {
      _savingMemory = true;
      _status = null;
      _memoryError = null;
    });

    try {
      CollectorMemory saved;
      final pickedPhoto = draft.photo;
      if (existing == null) {
        saved = await _memoryService.create(
          gvviId: data.gvviId,
          memoryType: draft.memoryType,
          note: draft.note,
          placeLabel: draft.placeLabel,
          occasionLabel: draft.occasionLabel,
          memoryDate: draft.memoryDate,
          promptKey: draft.promptKey,
        );
      } else {
        saved = existing;
      }

      var photoPath = existing?.photoPath;
      if (pickedPhoto != null) {
        final userId = _client.auth.currentUser?.id;
        if (userId == null) {
          throw StateError('Sign in to attach a memory photo.');
        }
        photoPath = await _memoryService.uploadPhoto(
          userId: userId,
          memoryId: saved.id,
          file: pickedPhoto,
        );
      }

      if (existing != null || pickedPhoto != null) {
        saved = await _memoryService.update(
          memoryId: saved.id,
          note: draft.note,
          photoPath: photoPath,
          placeLabel: draft.placeLabel,
          occasionLabel: draft.occasionLabel,
          memoryDate: draft.memoryDate,
        );
      }

      await _loadMemoriesFor(data.gvviId);
      if (!mounted) {
        return;
      }
      setState(() {
        _status = existing == null ? 'Memory saved.' : 'Memory updated.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _memoryError = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _savingMemory = false;
        });
      }
    }
  }

  Future<void> _dismissMemoryPrompt(CollectorMemoryPrompt prompt) async {
    final data = _data;
    if (data == null || _savingMemory) {
      return;
    }
    setState(() {
      _savingMemory = true;
      _memoryError = null;
    });
    try {
      await _memoryService.dismissPrompt(promptKey: prompt.promptKey);
      await _loadMemoriesFor(data.gvviId);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _memoryError = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _savingMemory = false;
        });
      }
    }
  }

  Future<void> _archiveMemory(CollectorMemory memory) async {
    final data = _data;
    if (data == null || _savingMemory) {
      return;
    }
    if (_pendingMemoryArchiveIds.contains(memory.id)) {
      return;
    }

    setState(() {
      _memoryError = null;
      _status = null;
      _pendingMemoryArchiveIds.add(memory.id);
      _pendingMemoryArchives[memory.id] = memory;
    });

    void cancelPendingArchive() {
      final timer = _pendingMemoryArchiveTimers.remove(memory.id);
      if (timer == null) {
        return;
      }
      timer.cancel();
      if (!mounted) {
        return;
      }
      setState(() {
        _pendingMemoryArchiveIds.remove(memory.id);
        _pendingMemoryArchives.remove(memory.id);
        _status = 'Memory restored.';
      });
    }

    _pendingMemoryArchiveTimers[memory.id] = Timer(
      const Duration(seconds: 5),
      () {
        unawaited(_commitPendingMemoryArchive(memory, data.gvviId));
      },
    );

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 5),
          content: const Text('Memory archived.'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: cancelPendingArchive,
          ),
        ),
      );
  }

  Future<void> _commitPendingMemoryArchive(
    CollectorMemory memory,
    String gvviId,
  ) async {
    _pendingMemoryArchiveTimers.remove(memory.id);
    _pendingMemoryArchives.remove(memory.id);
    try {
      await _memoryService.archive(
        memoryId: memory.id,
        photoPath: memory.photoPath,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _pendingMemoryArchiveIds.remove(memory.id);
        _status = 'Memory archived.';
      });
      await _loadMemoriesFor(gvviId);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _pendingMemoryArchiveIds.remove(memory.id);
        _memoryError = error.toString().replaceFirst('Exception: ', '');
      });
      await _loadMemoriesFor(gvviId);
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
                    savingIntent: _savingIntent,
                    onManageCard: _openGroupedCard,
                    onViewCard: _openCard,
                    onSaveIntent: _saveIntent,
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
                    title: 'Add to',
                    child: _VaultSectionMembershipSurface(
                      sections: _sectionMemberships,
                      busySectionId: _busySectionId,
                      creatingSection: _creatingSection,
                      onToggleSection: _toggleSectionMembership,
                      onCreateSection: _createAndAssignSection,
                    ),
                  ),
                  const SizedBox(height: 10),
                  _VaultPublicPreviewSurface(
                    data: _data!,
                    sections: _sectionMemberships,
                    onOpenWall: _openPublicWall,
                    onOpenPublicCopy: _openPublicPage,
                    onSharePublicCopy: _sharePublicLink,
                    onCopyPublicCopyLink: () => _copyPublicPreviewLink(
                      _publicGvviPath(_data!.gvviId),
                      'Public copy',
                    ),
                    onOpenSection: _openPublicSection,
                    onCopySectionLink: (section) => _copyPublicPreviewLink(
                      _publicSectionPath(
                        slug: _data!.publicSlug ?? '',
                        sectionId: section.id,
                      ),
                      section.name,
                    ),
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
                  if (kCollectorMemoriesEnabled) ...[
                    const SizedBox(height: 10),
                    _VaultSectionFrame(
                      title: 'Memories',
                      child: _CollectorMemoriesSurface(
                        memories: _visibleMemories,
                        prompts: _memoryPrompts,
                        photoUrls: _memoryPhotoUrls,
                        loading: _loadingMemories,
                        saving: _savingMemory,
                        error: _memoryError,
                        isArchived: _data!.isArchived,
                        onAdd: () => _openMemoryComposer(),
                        onEdit: (memory) => _openMemoryComposer(memory: memory),
                        onArchive: _archiveMemory,
                        onAcceptPrompt: (prompt) =>
                            _openMemoryComposer(prompt: prompt),
                        onDismissPrompt: _dismissMemoryPrompt,
                      ),
                    ),
                  ],
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
    return resolveDisplayImageUrlFromRow(row);
  }
}

class _VaultTopSurface extends StatelessWidget {
  const _VaultTopSurface({
    required this.data,
    required this.intentLabel,
    required this.onManageCard,
    required this.onViewCard,
    required this.onSaveIntent,
    required this.savingIntent,
    required this.status,
    this.onOpenPublicPage,
    this.onCopyPublicLink,
    this.onAddAnother,
    this.onUpgradeToSlab,
  });

  final VaultGvviData data;
  final String intentLabel;
  final String? status;
  final bool savingIntent;
  final VoidCallback onManageCard;
  final VoidCallback onViewCard;
  final ValueChanged<String> onSaveIntent;
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
            onManageCard: onManageCard,
            onViewCard: onViewCard,
            onOpenPublicPage: onOpenPublicPage,
            onCopyPublicLink: onCopyPublicLink,
            onAddAnother: onAddAnother,
            onUpgradeToSlab: onUpgradeToSlab,
            framed: false,
          ),
          const SizedBox(height: 10),
          _VaultIntentQuickSurface(
            intent: data.intent,
            isArchived: data.isArchived,
            saving: savingIntent,
            onSaveIntent: onSaveIntent,
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
    final imagePresentation = _vaultGvviImagePresentation(data);

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
              child: Stack(
                children: [
                  Positioned.fill(
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
                  if (imagePresentation.compactBadgeLabel != null)
                    Positioned(
                      left: 8,
                      right: 8,
                      bottom: 8,
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: _VaultImageStatusBadge(
                          label: imagePresentation.compactBadgeLabel!,
                          strong: imagePresentation.isCollisionRepresentative,
                        ),
                      ),
                    ),
                ],
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
                letterSpacing: 0,
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
            if (imagePresentation.detailNote != null) ...[
              const SizedBox(height: 8),
              _VaultImageTruthNote(note: imagePresentation.detailNote!),
            ],
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                GvChip(label: intentLabel, tone: colorScheme.primary),
                GvChip(
                  label: data.isGraded ? 'Graded slab' : 'Raw copy',
                  tone: Colors.deepPurple,
                ),
                GvChip(
                  label: data.canOpenPublicPage ? 'Public' : 'Private',
                  tone: data.canOpenPublicPage
                      ? Colors.orange.shade800
                      : colorScheme.secondary,
                ),
                GvChip(
                  label:
                      hasExactMedia &&
                          data.imageDisplayMode == GvviImageDisplayMode.uploaded
                      ? 'Uploaded photo'
                      : 'Card art',
                  tone: Colors.blueGrey,
                ),
                if ((_dataLabel(data) ?? '').isNotEmpty)
                  GvChip(label: _dataLabel(data)!, tone: Colors.teal),
                GvChip(
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

ResolvedImagePresentation _vaultGvviImagePresentation(VaultGvviData data) {
  final uploadedFront = (data.frontImageUrl ?? '').trim();
  if (data.imageDisplayMode == GvviImageDisplayMode.uploaded &&
      uploadedFront.isNotEmpty) {
    return resolveImagePresentationFromFields(
      imageUrl: uploadedFront,
      displayImageKind: 'exact',
    );
  }

  final normalizedStatus = (data.imageStatus ?? '').trim().toLowerCase();
  return resolveImagePresentationFromFields(
    imageUrl: data.canonicalImageUrl,
    representativeImageUrl: data.representativeImageUrl,
    displayImageUrl: data.imageUrl,
    displayImageKind: normalizedStatus.startsWith('representative_')
        ? 'representative'
        : null,
    imageStatus: data.imageStatus,
    imageNote: data.imageNote,
  );
}

class _VaultImageStatusBadge extends StatelessWidget {
  const _VaultImageStatusBadge({required this.label, this.strong = false});

  final String label;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final backgroundColor = strong
        ? colorScheme.tertiaryContainer.withValues(alpha: 0.92)
        : colorScheme.surface.withValues(alpha: 0.94);
    final borderColor = strong
        ? colorScheme.tertiary.withValues(alpha: 0.22)
        : colorScheme.outline.withValues(alpha: 0.12);
    final textColor = strong
        ? colorScheme.onTertiaryContainer
        : colorScheme.onSurface.withValues(alpha: 0.78);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.labelSmall?.copyWith(
            color: textColor,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }
}

class _VaultImageTruthNote extends StatelessWidget {
  const _VaultImageTruthNote({required this.note});

  final String note;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.tertiaryContainer.withValues(alpha: 0.38),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.tertiary.withValues(alpha: 0.14)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
        child: Text(
          note,
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onTertiaryContainer,
            height: 1.32,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _VaultPrimaryActionsSurface extends StatelessWidget {
  const _VaultPrimaryActionsSurface({
    required this.onManageCard,
    required this.onViewCard,
    this.framed = true,
    this.onOpenPublicPage,
    this.onCopyPublicLink,
    this.onAddAnother,
    this.onUpgradeToSlab,
  });

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

class _VaultIntentQuickSurface extends StatelessWidget {
  const _VaultIntentQuickSurface({
    required this.intent,
    required this.isArchived,
    required this.saving,
    required this.onSaveIntent,
  });

  final String intent;
  final bool isArchived;
  final bool saving;
  final ValueChanged<String> onSaveIntent;

  static const _options = <({String value, String label})>[
    (value: 'hold', label: 'Private'),
    (value: 'showcase', label: 'Showcase'),
    (value: 'trade', label: 'Trade'),
    (value: 'sell', label: 'Sell'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isPublic = intent != 'hold';

    return DecoratedBox(
      decoration: BoxDecoration(
        color: isPublic
            ? colorScheme.primaryContainer.withValues(alpha: 0.32)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    isPublic ? 'Public on your Wall' : 'Make this copy public',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                if (saving)
                  SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: colorScheme.primary,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              isPublic
                  ? 'Change how collectors see this exact copy.'
                  : 'Choose Showcase, Trade, or Sell to add this exact copy to your public Wall.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.62),
                height: 1.28,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final option in _options)
                  GvChip(
                    label: option.label,
                    selected: intent == option.value,
                    onSelected: isArchived || saving
                        ? null
                        : (_) => onSaveIntent(option.value),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _VaultPublicPreviewSurface extends StatelessWidget {
  const _VaultPublicPreviewSurface({
    required this.data,
    required this.sections,
    required this.onOpenWall,
    required this.onOpenPublicCopy,
    required this.onSharePublicCopy,
    required this.onCopyPublicCopyLink,
    required this.onOpenSection,
    required this.onCopySectionLink,
  });

  final VaultGvviData data;
  final List<VaultGvviSectionMembership> sections;
  final VoidCallback onOpenWall;
  final VoidCallback onOpenPublicCopy;
  final VoidCallback onSharePublicCopy;
  final VoidCallback onCopyPublicCopyLink;
  final ValueChanged<VaultGvviSectionMembership> onOpenSection;
  final ValueChanged<VaultGvviSectionMembership> onCopySectionLink;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final slug = (data.publicSlug ?? '').trim();
    final visibleOnWall = !data.isArchived && data.intent != 'hold';
    final canPreviewWall =
        visibleOnWall &&
        slug.isNotEmpty &&
        data.publicProfileEnabled &&
        data.vaultSharingEnabled;
    final assignedSections = sections
        .where((section) => section.isMember)
        .toList(growable: false);

    // LOCK: Mobile owner preview links are derived from exact-copy public read
    // surfaces only.
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.visibility_outlined,
                  size: 20,
                  color: canPreviewWall
                      ? colorScheme.primary
                      : colorScheme.onSurface.withValues(alpha: 0.44),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Public Preview',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        canPreviewWall
                            ? 'Check where this exact copy appears publicly.'
                            : visibleOnWall
                            ? 'Enable your public profile and vault sharing to preview this copy.'
                            : 'Set this copy to Showcase, Trade, or Sell to activate public preview links.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.62),
                          height: 1.28,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (canPreviewWall) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _VaultPreviewActionChip(
                    icon: Icons.public_outlined,
                    label: 'View Wall',
                    onPressed: onOpenWall,
                  ),
                  _VaultPreviewActionChip(
                    icon: Icons.style_outlined,
                    label: 'View public copy',
                    onPressed: onOpenPublicCopy,
                  ),
                  _VaultPreviewActionChip(
                    icon: Icons.ios_share_outlined,
                    label: 'Share copy',
                    onPressed: onSharePublicCopy,
                  ),
                  _VaultPreviewActionChip(
                    icon: Icons.link_rounded,
                    label: 'Copy link',
                    onPressed: onCopyPublicCopyLink,
                  ),
                ],
              ),
              if (assignedSections.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  'Assigned sections',
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.18,
                    color: colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final section in assignedSections)
                      _VaultPreviewSectionChip(
                        label: section.name,
                        onOpen: () => onOpenSection(section),
                        onCopy: () => onCopySectionLink(section),
                      ),
                  ],
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

class _VaultPreviewActionChip extends StatelessWidget {
  const _VaultPreviewActionChip({
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 16),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 36),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}

class _VaultPreviewSectionChip extends StatelessWidget {
  const _VaultPreviewSectionChip({
    required this.label,
    required this.onOpen,
    required this.onCopy,
  });

  final String label;
  final VoidCallback onOpen;
  final VoidCallback onCopy;

  @override
  Widget build(BuildContext context) {
    return InputChip(
      label: Text(label),
      avatar: const Icon(Icons.folder_open_outlined, size: 16),
      onPressed: onOpen,
      deleteIcon: const Icon(Icons.link_rounded, size: 16),
      onDeleted: onCopy,
    );
  }
}

class _VaultSectionMembershipSurface extends StatelessWidget {
  const _VaultSectionMembershipSurface({
    required this.sections,
    required this.busySectionId,
    required this.creatingSection,
    required this.onToggleSection,
    required this.onCreateSection,
  });

  final List<VaultGvviSectionMembership> sections;
  final String? busySectionId;
  final bool creatingSection;
  final Future<void> Function(VaultGvviSectionMembership section)
  onToggleSection;
  final VoidCallback onCreateSection;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (sections.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Not in any sections yet.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.62),
              height: 1.35,
            ),
          ),
          const SizedBox(height: 10),
          FilledButton.icon(
            onPressed: creatingSection ? null : onCreateSection,
            icon: creatingSection
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: colorScheme.onPrimary,
                    ),
                  )
                : const Icon(Icons.add),
            label: Text(creatingSection ? 'Creating...' : 'Create section'),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final section in sections)
              FilterChip(
                label: Text(section.name),
                selected: section.isMember,
                avatar: busySectionId == section.id
                    ? SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colorScheme.primary,
                        ),
                      )
                    : null,
                onSelected: busySectionId == null && !creatingSection
                    ? (_) => unawaited(onToggleSection(section))
                    : null,
              ),
          ],
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: creatingSection || busySectionId != null
              ? null
              : onCreateSection,
          icon: creatingSection
              ? SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: colorScheme.primary,
                  ),
                )
              : const Icon(Icons.add),
          label: Text(creatingSection ? 'Creating...' : 'Create section'),
        ),
      ],
    );
  }
}

class _VaultOverviewActionCard extends StatelessWidget {
  const _VaultOverviewActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
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
              Icon(icon, size: 18, color: colorScheme.primary),
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
            letterSpacing: 0,
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
        _VaultMeta(label: 'Copy ID', value: data.gvviId),
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

class _CollectorMemoriesSurface extends StatelessWidget {
  const _CollectorMemoriesSurface({
    required this.memories,
    required this.prompts,
    required this.photoUrls,
    required this.loading,
    required this.saving,
    required this.isArchived,
    required this.onAdd,
    required this.onEdit,
    required this.onArchive,
    required this.onAcceptPrompt,
    required this.onDismissPrompt,
    this.error,
  });

  final List<CollectorMemory> memories;
  final List<CollectorMemoryPrompt> prompts;
  final Map<String, String> photoUrls;
  final bool loading;
  final bool saving;
  final bool isArchived;
  final String? error;
  final VoidCallback onAdd;
  final ValueChanged<CollectorMemory> onEdit;
  final ValueChanged<CollectorMemory> onArchive;
  final ValueChanged<CollectorMemoryPrompt> onAcceptPrompt;
  final ValueChanged<CollectorMemoryPrompt> onDismissPrompt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                'Private notes, places, and moments for this exact copy only.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                  height: 1.32,
                ),
              ),
            ),
            const SizedBox(width: 10),
            OutlinedButton.icon(
              onPressed: isArchived || saving ? null : onAdd,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Add'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 38),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 9,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
        if (loading) ...[
          const SizedBox(height: 12),
          const LinearProgressIndicator(minHeight: 2),
        ],
        if ((error ?? '').trim().isNotEmpty) ...[
          const SizedBox(height: 10),
          _VaultInlineStatusMessage(message: error!),
        ],
        if (prompts.isNotEmpty && !isArchived) ...[
          const SizedBox(height: 12),
          for (final prompt in prompts) ...[
            _CollectorMemoryPromptCard(
              prompt: prompt,
              saving: saving,
              onAccept: () => onAcceptPrompt(prompt),
              onDismiss: () => onDismissPrompt(prompt),
            ),
            const SizedBox(height: 8),
          ],
        ],
        const SizedBox(height: 10),
        if (!loading && memories.isEmpty)
          _CollectorMemoryEmptyState(isArchived: isArchived)
        else
          for (final memory in memories) ...[
            _CollectorMemoryRow(
              memory: memory,
              photoUrl: photoUrls[memory.id],
              saving: saving,
              onEdit: () => onEdit(memory),
              onArchive: () => onArchive(memory),
            ),
            if (memory != memories.last) ...[
              const SizedBox(height: 10),
              const _VaultQuietDivider(),
              const SizedBox(height: 10),
            ],
          ],
      ],
    );
  }
}

class _CollectorMemoryPromptCard extends StatelessWidget {
  const _CollectorMemoryPromptCard({
    required this.prompt,
    required this.saving,
    required this.onAccept,
    required this.onDismiss,
  });

  final CollectorMemoryPrompt prompt;
  final bool saving;
  final VoidCallback onAccept;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.primaryContainer.withValues(alpha: 0.20),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.primary.withValues(alpha: 0.12)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 11, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.auto_awesome_outlined,
                  size: 18,
                  color: colorScheme.primary,
                ),
                const SizedBox(width: 7),
                Expanded(
                  child: Text(
                    prompt.promptTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              prompt.promptBody,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.66),
                height: 1.32,
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.tonal(
                  onPressed: saving ? null : onAccept,
                  child: const Text('Save memory'),
                ),
                TextButton(
                  onPressed: saving ? null : onDismiss,
                  child: const Text('Dismiss'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CollectorMemoryEmptyState extends StatelessWidget {
  const _CollectorMemoryEmptyState({required this.isArchived});

  final bool isArchived;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.52),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.06)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 14),
        child: Row(
          children: [
            Icon(
              Icons.lock_outline_rounded,
              size: 18,
              color: colorScheme.onSurface.withValues(alpha: 0.42),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isArchived
                    ? 'Archived copies keep existing private memories hidden.'
                    : 'No private memories saved for this copy yet.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CollectorMemoryRow extends StatelessWidget {
  const _CollectorMemoryRow({
    required this.memory,
    required this.saving,
    required this.onEdit,
    required this.onArchive,
    this.photoUrl,
  });

  final CollectorMemory memory;
  final String? photoUrl;
  final bool saving;
  final VoidCallback onEdit;
  final VoidCallback onArchive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final meta = _memoryMeta(memory);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _CollectorMemoryPhotoThumb(photoUrl: photoUrl),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _memoryIcon(memory.memoryType),
                    size: 16,
                    color: colorScheme.primary.withValues(alpha: 0.80),
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      _memoryTypeLabel(memory.memoryType),
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.4,
                      ),
                    ),
                  ),
                  PopupMenuButton<String>(
                    tooltip: 'Memory actions',
                    enabled: !saving,
                    onSelected: (value) {
                      if (value == 'edit') onEdit();
                      if (value == 'archive') onArchive();
                    },
                    itemBuilder: (context) => const [
                      PopupMenuItem<String>(value: 'edit', child: Text('Edit')),
                      PopupMenuItem<String>(
                        value: 'archive',
                        child: Text('Archive'),
                      ),
                    ],
                    icon: const Icon(Icons.more_horiz_rounded),
                  ),
                ],
              ),
              if ((memory.note ?? '').trim().isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  memory.note!.trim(),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.84),
                    height: 1.30,
                  ),
                ),
              ],
              if (meta.isNotEmpty) ...[
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final item in meta)
                      GvChip(
                        label: item,
                        tone: colorScheme.onSurface.withValues(alpha: 0.70),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  static List<String> _memoryMeta(CollectorMemory memory) {
    return <String>[
      if ((memory.placeLabel ?? '').trim().isNotEmpty)
        memory.placeLabel!.trim(),
      if ((memory.occasionLabel ?? '').trim().isNotEmpty)
        memory.occasionLabel!.trim(),
      if (memory.memoryDate != null) _formatDate(memory.memoryDate!),
      if ((memory.photoPath ?? '').trim().isNotEmpty) 'Photo attached',
    ];
  }
}

class _CollectorMemoryPhotoThumb extends StatelessWidget {
  const _CollectorMemoryPhotoThumb({this.photoUrl});

  final String? photoUrl;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final url = (photoUrl ?? '').trim();
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 58,
        height: 58,
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.24),
        child: url.isEmpty
            ? Icon(
                Icons.photo_outlined,
                size: 22,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              )
            : Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Icon(
                  Icons.photo_outlined,
                  size: 22,
                  color: colorScheme.onSurface.withValues(alpha: 0.38),
                ),
              ),
      ),
    );
  }
}

class _CollectorMemoryEditorSheet extends StatefulWidget {
  const _CollectorMemoryEditorSheet({
    required this.saving,
    this.memory,
    this.prompt,
  });

  final CollectorMemory? memory;
  final CollectorMemoryPrompt? prompt;
  final bool saving;

  @override
  State<_CollectorMemoryEditorSheet> createState() =>
      _CollectorMemoryEditorSheetState();
}

class _CollectorMemoryEditorSheetState
    extends State<_CollectorMemoryEditorSheet> {
  late CollectorMemoryType _type;
  late final TextEditingController _noteController;
  late final TextEditingController _placeController;
  late final TextEditingController _occasionController;
  late final TextEditingController _dateController;
  XFile? _photo;
  String? _dateError;

  @override
  void initState() {
    super.initState();
    final memory = widget.memory;
    final prompt = widget.prompt;
    _type =
        memory?.memoryType ?? prompt?.promptType ?? CollectorMemoryType.note;
    _noteController = TextEditingController(text: memory?.note ?? '');
    _placeController = TextEditingController(
      text: memory?.placeLabel ?? prompt?.suggestedPlaceLabel ?? '',
    );
    _occasionController = TextEditingController(
      text: memory?.occasionLabel ?? prompt?.suggestedOccasionLabel ?? '',
    );
    _dateController = TextEditingController(
      text: memory?.memoryDate != null
          ? _formatDate(memory!.memoryDate!)
          : prompt?.suggestedMemoryDate != null
          ? _formatDate(prompt!.suggestedMemoryDate!)
          : '',
    );
  }

  @override
  void dispose() {
    _noteController.dispose();
    _placeController.dispose();
    _occasionController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      imageQuality: 88,
      maxWidth: 1600,
    );
    if (picked == null || !mounted) {
      return;
    }
    setState(() {
      _photo = picked;
    });
  }

  void _save() {
    final parsedDate = _parseDate(_dateController.text);
    if (_dateController.text.trim().isNotEmpty && parsedDate == null) {
      setState(() {
        _dateError = 'Use YYYY-MM-DD.';
      });
      return;
    }
    Navigator.of(context).pop(
      _CollectorMemoryDraft(
        memoryType: _type,
        note: _blankToNull(_noteController.text),
        placeLabel: _blankToNull(_placeController.text),
        occasionLabel: _blankToNull(_occasionController.text),
        memoryDate: parsedDate,
        promptKey: widget.prompt?.promptKey ?? widget.memory?.promptKey,
        photo: _photo,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(
            color: colorScheme.outline.withValues(alpha: 0.08),
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colorScheme.onSurface.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                widget.memory == null ? 'Save private memory' : 'Edit memory',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (widget.prompt != null) ...[
                const SizedBox(height: 4),
                Text(
                  widget.prompt!.promptBody,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.60),
                    height: 1.30,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final type in CollectorMemoryType.values)
                    GvChip(
                      label: _memoryTypeLabel(type),
                      selected: _type == type,
                      onSelected: (_) => setState(() => _type = type),
                    ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _noteController,
                minLines: 3,
                maxLines: 5,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  labelText: 'Memory note',
                  hintText: 'Where it came from, who was there, why it matters',
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _placeController,
                decoration: const InputDecoration(labelText: 'Place'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _occasionController,
                decoration: const InputDecoration(labelText: 'Occasion'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _dateController,
                keyboardType: TextInputType.datetime,
                decoration: InputDecoration(
                  labelText: 'Date',
                  hintText: 'YYYY-MM-DD',
                  errorText: _dateError,
                ),
                onChanged: (_) {
                  if (_dateError != null) {
                    setState(() => _dateError = null);
                  }
                },
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _pickPhoto,
                icon: const Icon(Icons.add_photo_alternate_outlined),
                label: Text(
                  _photo == null ? 'Attach one photo' : 'Photo ready',
                ),
              ),
              const SizedBox(height: 14),
              FilledButton(
                onPressed: widget.saving ? null : _save,
                child: Text(widget.memory == null ? 'Save memory' : 'Update'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CollectorMemoryDraft {
  const _CollectorMemoryDraft({
    required this.memoryType,
    this.note,
    this.placeLabel,
    this.occasionLabel,
    this.memoryDate,
    this.promptKey,
    this.photo,
  });

  final CollectorMemoryType memoryType;
  final String? note;
  final String? placeLabel;
  final String? occasionLabel;
  final DateTime? memoryDate;
  final String? promptKey;
  final XFile? photo;
}

IconData _memoryIcon(CollectorMemoryType type) {
  switch (type) {
    case CollectorMemoryType.addedPlace:
      return Icons.place_outlined;
    case CollectorMemoryType.occasion:
      return Icons.event_outlined;
    case CollectorMemoryType.first:
      return Icons.flag_outlined;
    case CollectorMemoryType.note:
      return Icons.edit_note_outlined;
  }
}

String _memoryTypeLabel(CollectorMemoryType type) {
  switch (type) {
    case CollectorMemoryType.addedPlace:
      return 'Place';
    case CollectorMemoryType.occasion:
      return 'Occasion';
    case CollectorMemoryType.first:
      return 'First';
    case CollectorMemoryType.note:
      return 'Note';
  }
}

String _formatDate(DateTime value) {
  final local = value.toLocal();
  final month = local.month.toString().padLeft(2, '0');
  final day = local.day.toString().padLeft(2, '0');
  return '${local.year}-$month-$day';
}

DateTime? _parseDate(String value) {
  final normalized = value.trim();
  if (normalized.isEmpty) return null;
  final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(normalized);
  if (match == null) return null;
  return DateTime.tryParse(normalized);
}

String? _blankToNull(String value) {
  final normalized = value.trim();
  return normalized.isEmpty ? null : normalized;
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
