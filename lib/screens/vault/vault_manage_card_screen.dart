import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/identity/display_identity.dart';
import '../../services/identity/image_presentation.dart';
import '../../services/navigation/grookai_web_route_service.dart';
import '../../services/public/card_surface_pricing_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../../services/vault/vault_gvvi_service.dart';
import '../../services/vault/slab_upgrade_service.dart';
import '../../utils/display_image_contract.dart';
import '../../widgets/card_surface_price.dart';
import '../../widgets/gv_chip.dart';
import '../gvvi/public_gvvi_screen.dart';
import '../public_collector/public_collector_screen.dart';
import 'slab_upgrade_screen.dart';
import 'vault_gvvi_screen.dart';

ResolvedDisplayIdentity _manageCardDisplayIdentity(VaultManageCardData data) {
  return resolveDisplayIdentityFromFields(
    name: data.name,
    variantKey: data.variantKey,
    printedIdentityModifier: data.printedIdentityModifier,
    setIdentityModel: data.setIdentityModel,
    setCode: data.setCode,
    number: data.number,
  );
}

enum _ManageCardTab { overview, copies }

class VaultManageCardScreen extends StatefulWidget {
  const VaultManageCardScreen({
    super.key,
    required this.vaultItemId,
    required this.cardPrintId,
    required this.ownedCount,
    this.gvviId,
    this.gvId,
    this.name,
    this.setName,
    this.number,
    this.imageUrl,
    this.condition,
  });

  final String vaultItemId;
  final String cardPrintId;
  final int ownedCount;
  final String? gvviId;
  final String? gvId;
  final String? name;
  final String? setName;
  final String? number;
  final String? imageUrl;
  final String? condition;

  @override
  State<VaultManageCardScreen> createState() => _VaultManageCardScreenState();
}

class _VaultManageCardScreenState extends State<VaultManageCardScreen>
    with SingleTickerProviderStateMixin {
  final SupabaseClient _client = Supabase.instance.client;
  late final TabController _tabController;

  VaultManageCardData? _data;
  CardSurfacePricingData? _pricing;
  Map<String, List<VaultManageCopySectionMembership>> _copySectionMemberships =
      const <String, List<VaultManageCopySectionMembership>>{};
  Set<String> _selectedCopyIds = const <String>{};
  String? _bulkSectionId;
  bool _loading = true;
  bool _bulkCopySaving = false;
  String? _copyIntentSavingId;
  String? _copySectionSavingKey;
  String? _error;
  String? _statusMessage;

  void _dismissKeyboard() {
    final focusScope = FocusScope.of(context);
    if (!focusScope.hasPrimaryFocus || focusScope.focusedChild != null) {
      focusScope.unfocus();
    }
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(
      length: _ManageCardTab.values.length,
      vsync: this,
    );
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
        _statusMessage = null;
      });
    }

    try {
      final data = await VaultCardService.loadManageCard(
        client: _client,
        vaultItemId: widget.vaultItemId,
        cardPrintId: widget.cardPrintId,
        fallbackOwnedCount: widget.ownedCount,
        fallbackGvviId: widget.gvviId,
        fallbackGvId: widget.gvId,
        fallbackName: widget.name,
        fallbackSetName: widget.setName,
        fallbackNumber: widget.number,
        fallbackImageUrl: widget.imageUrl,
      );
      final pricingById = await CardSurfacePricingService.fetchByCardPrintIds(
        client: _client,
        cardPrintIds: <String>[widget.cardPrintId],
      );
      final pricing = pricingById[widget.cardPrintId];
      var copySectionMemberships =
          const <String, List<VaultManageCopySectionMembership>>{};
      try {
        copySectionMemberships =
            await VaultCardService.loadCopySectionMemberships(
              client: _client,
              instanceIds: data.copies.map((copy) => copy.instanceId),
            );
      } catch (_) {}

      if (!mounted) {
        return;
      }

      _applyLoadedState(data, pricing);
      setState(() {
        _data = data;
        _pricing = pricing;
        _copySectionMemberships = copySectionMemberships;
        _selectedCopyIds = const <String>{};
        _bulkSectionId = _firstBulkSectionId(copySectionMemberships);
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _error = error is Error
            ? error.toString()
            : 'Unable to load this card.';
        _copySectionMemberships =
            const <String, List<VaultManageCopySectionMembership>>{};
        _selectedCopyIds = const <String>{};
        _bulkSectionId = null;
        _loading = false;
      });
    }
  }

  void _applyLoadedState(
    VaultManageCardData data,
    CardSurfacePricingData? pricing,
  ) {
    _pricing = pricing;
  }

  Future<void> _saveCopyIntent(
    VaultManageCardCopy copy,
    String nextIntent,
  ) async {
    final data = _data;
    final normalizedNextIntent = normalizeVaultIntentValue(nextIntent);
    if (data == null ||
        _copyIntentSavingId != null ||
        normalizedNextIntent == copy.intent) {
      return;
    }

    setState(() {
      _copyIntentSavingId = copy.instanceId;
      _statusMessage = null;
    });

    try {
      final savedIntent = await VaultCardService.saveVaultItemInstanceIntent(
        client: _client,
        instanceId: copy.instanceId,
        intent: normalizedNextIntent,
      );

      if (!mounted) {
        return;
      }

      final updatedCopies = data.copies
          .map(
            (current) => current.instanceId == copy.instanceId
                ? current.copyWith(intent: savedIntent)
                : current,
          )
          .toList(growable: false);

      setState(() {
        _data = VaultManageCardData(
          vaultItemId: data.vaultItemId,
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.name,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          rarity: data.rarity,
          imageUrl: data.imageUrl,
          canonicalImageUrl: data.canonicalImageUrl,
          representativeImageUrl: data.representativeImageUrl,
          imageStatus: data.imageStatus,
          imageNote: data.imageNote,
          variantKey: data.variantKey,
          printedIdentityModifier: data.printedIdentityModifier,
          setIdentityModel: data.setIdentityModel,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: updatedCopies
              .where((current) => current.intent != 'hold')
              .length,
          intent: _deriveCardIntent(updatedCopies),
          isShared: data.isShared,
          wallCategory: data.wallCategory,
          publicNote: data.publicNote,
          publicSlug: data.publicSlug,
          priceDisplayMode: data.priceDisplayMode,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: data.askingPriceAmount,
          askingPriceCurrency: data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: updatedCopies,
        );
        _copyIntentSavingId = null;
        _statusMessage = 'Copy intent saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _copyIntentSavingId = null;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _toggleCopySectionMembership(
    VaultManageCardCopy copy,
    VaultManageCopySectionMembership section,
  ) async {
    final sectionKey = '${copy.instanceId}:${section.id}';
    if (_copySectionSavingKey != null) {
      return;
    }

    setState(() {
      _copySectionSavingKey = sectionKey;
      _statusMessage = null;
    });

    try {
      if (section.isMember) {
        await VaultCardService.removeCopySectionMembership(
          client: _client,
          instanceId: copy.instanceId,
          sectionId: section.id,
        );
      } else {
        await VaultCardService.assignCopySectionMembership(
          client: _client,
          instanceId: copy.instanceId,
          sectionId: section.id,
        );
      }

      if (!mounted) {
        return;
      }

      setState(() {
        final currentSections =
            _copySectionMemberships[copy.instanceId] ??
            const <VaultManageCopySectionMembership>[];
        _copySectionMemberships = {
          ..._copySectionMemberships,
          copy.instanceId: currentSections
              .map(
                (current) => current.id == section.id
                    ? current.copyWith(isMember: !section.isMember)
                    : current,
              )
              .toList(growable: false),
        };
        _copySectionSavingKey = null;
        _statusMessage = section.isMember
            ? 'Copy removed from section.'
            : 'Copy added to section.';
      });
      if (section.isMember) {
        _showCopySectionRemovalUndo(copy: copy, section: section);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _copySectionSavingKey = null;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _showCopySectionRemovalUndo({
    required VaultManageCardCopy copy,
    required VaultManageCopySectionMembership section,
  }) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 5),
          content: Text('Removed copy from ${section.name}.'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () {
              unawaited(
                _restoreCopySectionMembership(copy: copy, section: section),
              );
            },
          ),
        ),
      );
  }

  Future<void> _restoreCopySectionMembership({
    required VaultManageCardCopy copy,
    required VaultManageCopySectionMembership section,
  }) async {
    final sectionKey = '${copy.instanceId}:${section.id}';
    if (_copySectionSavingKey != null) {
      return;
    }

    setState(() {
      _copySectionSavingKey = sectionKey;
      _statusMessage = null;
    });

    try {
      await VaultCardService.assignCopySectionMembership(
        client: _client,
        instanceId: copy.instanceId,
        sectionId: section.id,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        final currentSections =
            _copySectionMemberships[copy.instanceId] ??
            const <VaultManageCopySectionMembership>[];
        _copySectionMemberships = {
          ..._copySectionMemberships,
          copy.instanceId: currentSections
              .map(
                (current) => current.id == section.id
                    ? current.copyWith(isMember: true)
                    : current,
              )
              .toList(growable: false),
        };
        _copySectionSavingKey = null;
        _statusMessage = 'Copy restored to section.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _copySectionSavingKey = null;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _toggleCopySelection(VaultManageCardCopy copy, bool selected) {
    setState(() {
      final next = {..._selectedCopyIds};
      if (selected) {
        next.add(copy.instanceId);
      } else {
        next.remove(copy.instanceId);
      }
      _selectedCopyIds = next;
      _statusMessage = null;
    });
  }

  void _toggleAllCopySelection(VaultManageCardData data, bool selected) {
    setState(() {
      _selectedCopyIds = selected
          ? data.copies.map((copy) => copy.instanceId).toSet()
          : const <String>{};
      _statusMessage = null;
    });
  }

  void _openCopiesTab({Iterable<String>? selectedCopyIds}) {
    final nextSelection = selectedCopyIds
        ?.map((id) => id.trim())
        .where((id) => id.isNotEmpty)
        .toSet();
    setState(() {
      if (nextSelection != null) {
        _selectedCopyIds = nextSelection;
      }
      _statusMessage = null;
    });
    _tabController.animateTo(_ManageCardTab.copies.index);
  }

  Future<void> _saveSelectedCopyIntent(String nextIntent) async {
    final data = _data;
    final selectedIds = _selectedCopyIds.toSet();
    if (data == null || selectedIds.isEmpty || _bulkCopySaving) {
      return;
    }

    setState(() {
      _bulkCopySaving = true;
      _statusMessage = null;
    });

    try {
      final savedIntent =
          await VaultCardService.saveVaultItemInstancesIntentBulk(
            client: _client,
            instanceIds: selectedIds,
            intent: nextIntent,
          );

      if (!mounted) {
        return;
      }

      final updatedCopies = data.copies
          .map(
            (copy) => selectedIds.contains(copy.instanceId)
                ? copy.copyWith(intent: savedIntent)
                : copy,
          )
          .toList(growable: false);

      setState(() {
        _data = _copyDataWithCopies(data, updatedCopies);
        _bulkCopySaving = false;
        _statusMessage =
            '${selectedIds.length} ${selectedIds.length == 1 ? 'copy' : 'copies'} updated.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _bulkCopySaving = false;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _bulkCopySectionMembership({required bool add}) async {
    final selectedIds = _selectedCopyIds.toSet();
    final sectionId = (_bulkSectionId ?? '').trim();
    if (selectedIds.isEmpty || sectionId.isEmpty || _bulkCopySaving) {
      return;
    }

    setState(() {
      _bulkCopySaving = true;
      _statusMessage = null;
    });

    try {
      await VaultCardService.bulkCopySectionMembership(
        client: _client,
        instanceIds: selectedIds,
        sectionId: sectionId,
        add: add,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _copySectionMemberships = {
          for (final entry in _copySectionMemberships.entries)
            entry.key: selectedIds.contains(entry.key)
                ? entry.value
                      .map(
                        (section) => section.id == sectionId
                            ? section.copyWith(isMember: add)
                            : section,
                      )
                      .toList(growable: false)
                : entry.value,
        };
        _bulkCopySaving = false;
        _statusMessage = add
            ? '${selectedIds.length} ${selectedIds.length == 1 ? 'copy' : 'copies'} added to section.'
            : '${selectedIds.length} ${selectedIds.length == 1 ? 'copy' : 'copies'} removed from section.';
      });
      if (!add) {
        final sectionName = _bulkSectionOptions
            .where((section) => section.id == sectionId)
            .map((section) => section.name)
            .firstOrNull;
        _showBulkSectionRemovalUndo(
          instanceIds: selectedIds,
          sectionId: sectionId,
          sectionName: sectionName,
        );
      }
    } catch (error) {
      if (!mounted) {
        return;
      }

      setState(() {
        _bulkCopySaving = false;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _removeExactCopy(VaultManageCardCopy copy) async {
    if (_bulkCopySaving) {
      return;
    }

    final gvviId = (copy.gvviId ?? '').trim();
    final label = gvviId.isEmpty ? 'this exact copy' : gvviId;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove this copy?'),
        content: Text(
          'This removes $label from your vault. Other copies of this card stay in your vault.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Remove copy'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _bulkCopySaving = true;
      _statusMessage = null;
    });

    try {
      await VaultGvviService.archiveExactCopy(
        client: _client,
        instanceId: copy.instanceId,
      );

      if (!mounted) {
        return;
      }

      final remainingCount =
          (_data?.copies.where((item) => item.instanceId != copy.instanceId) ??
                  const Iterable<VaultManageCardCopy>.empty())
              .length;
      if (remainingCount <= 0) {
        Navigator.of(context).pop(true);
        return;
      }

      await _load();
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkCopySaving = false;
        _statusMessage = 'Exact copy removed.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkCopySaving = false;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _removeSelectedCopies(VaultManageCardData data) async {
    final selectedIds = _selectedCopyIds.toSet();
    final selectedCopies = data.copies
        .where((copy) => selectedIds.contains(copy.instanceId))
        .toList(growable: false);
    if (_bulkCopySaving || selectedCopies.isEmpty) {
      return;
    }

    final count = selectedCopies.length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(
          'Remove $count selected ${count == 1 ? 'copy' : 'copies'}?',
        ),
        content: Text(
          'This removes only the selected exact ${count == 1 ? 'copy' : 'copies'} from your vault. Unselected copies stay in your vault.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(count == 1 ? 'Remove copy' : 'Remove copies'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _bulkCopySaving = true;
      _statusMessage = null;
    });

    try {
      // LOCK: Bulk removal is exact-copy scoped. Each selected row archives by
      // vault_item_instances.id through the same RPC as the GVVI screen.
      for (final copy in selectedCopies) {
        await VaultGvviService.archiveExactCopy(
          client: _client,
          instanceId: copy.instanceId,
        );
      }

      if (!mounted) {
        return;
      }

      final remainingCount = data.copies
          .where((copy) => !selectedIds.contains(copy.instanceId))
          .length;
      if (remainingCount <= 0) {
        Navigator.of(context).pop(true);
        return;
      }

      await _load();
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkCopySaving = false;
        _selectedCopyIds = const <String>{};
        _statusMessage =
            '$count exact ${count == 1 ? 'copy' : 'copies'} removed.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkCopySaving = false;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  void _showBulkSectionRemovalUndo({
    required Set<String> instanceIds,
    required String sectionId,
    required String? sectionName,
  }) {
    final count = instanceIds.length;
    final target = (sectionName ?? '').trim().isEmpty
        ? 'section'
        : sectionName!.trim();
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 5),
          content: Text(
            'Removed $count ${count == 1 ? 'copy' : 'copies'} from $target.',
          ),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () {
              unawaited(
                _restoreBulkSectionMembership(
                  instanceIds: instanceIds,
                  sectionId: sectionId,
                ),
              );
            },
          ),
        ),
      );
  }

  Future<void> _restoreBulkSectionMembership({
    required Set<String> instanceIds,
    required String sectionId,
  }) async {
    if (instanceIds.isEmpty || sectionId.trim().isEmpty || _bulkCopySaving) {
      return;
    }

    setState(() {
      _bulkCopySaving = true;
      _statusMessage = null;
    });

    try {
      await VaultCardService.bulkCopySectionMembership(
        client: _client,
        instanceIds: instanceIds,
        sectionId: sectionId,
        add: true,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _copySectionMemberships = {
          for (final entry in _copySectionMemberships.entries)
            entry.key: instanceIds.contains(entry.key)
                ? entry.value
                      .map(
                        (section) => section.id == sectionId
                            ? section.copyWith(isMember: true)
                            : section,
                      )
                      .toList(growable: false)
                : entry.value,
        };
        _bulkCopySaving = false;
        _statusMessage =
            '${instanceIds.length} ${instanceIds.length == 1 ? 'copy' : 'copies'} restored to section.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkCopySaving = false;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _removeAllCopies(VaultManageCardData data) async {
    if (_bulkCopySaving || data.copies.isEmpty) {
      return;
    }

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove all copies?'),
        content: Text(
          'This removes all ${data.totalCopies} active ${data.totalCopies == 1 ? 'copy' : 'copies'} of ${_manageCardDisplayIdentity(data).displayName} from your vault.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Remove all'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) {
      return;
    }

    setState(() {
      _bulkCopySaving = true;
      _statusMessage = null;
    });

    try {
      await VaultCardService.archiveAllVaultItems(
        client: _client,
        userId: _client.auth.currentUser?.id ?? '',
        vaultItemId: data.vaultItemId,
        cardId: data.cardPrintId,
      );

      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _bulkCopySaving = false;
      });
      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  VaultManageCardData _copyDataWithCopies(
    VaultManageCardData data,
    List<VaultManageCardCopy> copies,
  ) {
    return VaultManageCardData(
      vaultItemId: data.vaultItemId,
      cardPrintId: data.cardPrintId,
      gvId: data.gvId,
      name: data.name,
      setName: data.setName,
      setCode: data.setCode,
      number: data.number,
      rarity: data.rarity,
      imageUrl: data.imageUrl,
      canonicalImageUrl: data.canonicalImageUrl,
      representativeImageUrl: data.representativeImageUrl,
      imageStatus: data.imageStatus,
      imageNote: data.imageNote,
      variantKey: data.variantKey,
      printedIdentityModifier: data.printedIdentityModifier,
      setIdentityModel: data.setIdentityModel,
      totalCopies: data.totalCopies,
      rawCount: data.rawCount,
      slabCount: data.slabCount,
      inPlayCount: copies.where((copy) => copy.intent != 'hold').length,
      intent: _deriveCardIntent(copies),
      isShared: data.isShared,
      wallCategory: data.wallCategory,
      publicNote: data.publicNote,
      publicSlug: data.publicSlug,
      priceDisplayMode: data.priceDisplayMode,
      primarySharedGvviId: data.primarySharedGvviId,
      askingPriceAmount: data.askingPriceAmount,
      askingPriceCurrency: data.askingPriceCurrency,
      publicProfileEnabled: data.publicProfileEnabled,
      vaultSharingEnabled: data.vaultSharingEnabled,
      copies: copies,
    );
  }

  void _showStatus(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  bool _canUpgradeCopyToSlab(
    VaultManageCardData data,
    VaultManageCardCopy copy,
  ) {
    return !copy.isGraded &&
        (copy.gvviId ?? '').trim().isNotEmpty &&
        (data.gvId ?? '').trim().isNotEmpty;
  }

  Future<void> _openSlabUpgradeFlow(
    VaultManageCardData data,
    VaultManageCardCopy copy,
  ) async {
    final gvId = (data.gvId ?? '').trim();
    if (gvId.isEmpty || copy.instanceId.trim().isEmpty) {
      _showStatus('Unable to open slab upgrade right now.');
      return;
    }

    // NATIVE_SLAB_UPGRADE_FLOW_V1
    // Raw private copies upgrade to slab through the in-app slab flow, not
    // web handoff.
    final result = await Navigator.of(context).push<SlabUpgradeResult>(
      MaterialPageRoute<SlabUpgradeResult>(
        builder: (_) => SlabUpgradeScreen(
          sourceInstanceId: copy.instanceId,
          cardPrintId: data.cardPrintId,
          gvId: gvId,
          cardName: data.name,
          setName: data.setName,
          imageUrl: data.imageUrl,
        ),
      ),
    );
    if (!mounted || result == null) {
      return;
    }

    _showStatus('Slab upgrade saved.');
    await _load();
  }

  Future<void> _openCardDetail() async {
    final data = _data;
    if (data == null) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: data.cardPrintId,
          gvId: data.gvId,
          name: data.name,
          setName: data.setName,
          setCode: data.setCode,
          number: data.number,
          rarity: data.rarity,
          imageUrl: data.imageUrl,
          quantity: data.totalCopies,
          condition: data.copies.length == 1
              ? data.copies.first.conditionLabel
              : widget.condition,
          exactCopyGvviId: data.copies.length == 1
              ? data.copies.first.gvviId
              : null,
          exactCopyOwnerUserId: _client.auth.currentUser?.id,
        ),
      ),
    );
  }

  Future<void> _openExactCopy(VaultManageCardCopy copy) async {
    final gvviId = (copy.gvviId ?? '').trim();
    if (gvviId.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => VaultGvviScreen(gvviId: gvviId)),
    );
    if (mounted) {
      await _load();
    }
  }

  Future<void> _openWall() async {
    final slug = _data?.publicSlug;
    if (slug == null || slug.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: slug),
      ),
    );
  }

  Future<void> _openCopyPublicPage(VaultManageCardCopy copy) async {
    final gvviId = (copy.gvviId ?? '').trim();
    if (gvviId.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => PublicGvviScreen(gvviId: gvviId)),
    );
  }

  Future<void> _openCopyPublicSection(
    VaultManageCopySectionMembership section,
  ) async {
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
    _showStatus('$label link copied.');
  }

  Future<void> _shareCopyPublicLink(VaultManageCardCopy copy) async {
    final gvviId = (copy.gvviId ?? '').trim();
    if (gvviId.isEmpty) {
      return;
    }

    final uri = GrookaiWebRouteService.buildUri(_publicGvviPath(gvviId));
    await SharePlus.instance.share(
      ShareParams(uri: uri, subject: _data?.name ?? 'Grookai Vault copy'),
    );
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final data = _data;

    return PopScope<void>(
      onPopInvokedWithResult: (didPop, result) => _dismissKeyboard(),
      child: Scaffold(
        appBar: AppBar(title: const Text('Manage Card')),
        body: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _dismissKeyboard,
          child: SafeArea(
            bottom: false,
            child: _loading && data == null
                ? const Center(child: CircularProgressIndicator())
                : data == null
                ? _buildErrorState(theme, colorScheme)
                : Padding(
                    padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                    child: Column(
                      children: [
                        if (_error != null) ...[
                          _ManageSurface(
                            child: Text(
                              _error!,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: colorScheme.error,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        _buildHero(theme, colorScheme, data),
                        const SizedBox(height: 12),
                        _buildTabBar(theme, colorScheme),
                        const SizedBox(height: 12),
                        Expanded(
                          child: TabBarView(
                            controller: _tabController,
                            physics: const NeverScrollableScrollPhysics(),
                            children: [
                              _buildTabListView(
                                storageKey: 'overview',
                                children: [
                                  _buildOverviewTab(theme, colorScheme, data),
                                ],
                              ),
                              _buildTabListView(
                                storageKey: 'copies',
                                children: [
                                  _buildCopiesSection(theme, colorScheme, data),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorState(ThemeData theme, ColorScheme colorScheme) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
        children: [
          _ManageSurface(
            child: Text(
              _error ?? 'Unable to load this card.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colorScheme.error,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabBar(ThemeData theme, ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.12)),
      ),
      child: TabBar(
        controller: _tabController,
        dividerColor: Colors.transparent,
        indicatorSize: TabBarIndicatorSize.tab,
        splashBorderRadius: BorderRadius.circular(14),
        indicator: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: colorScheme.shadow.withValues(alpha: 0.06),
              blurRadius: 12,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        labelColor: colorScheme.onSurface,
        unselectedLabelColor: colorScheme.onSurface.withValues(alpha: 0.68),
        labelStyle: theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w700,
        ),
        unselectedLabelStyle: theme.textTheme.labelLarge?.copyWith(
          fontWeight: FontWeight.w600,
        ),
        tabs: const [
          Tab(text: 'Overview'),
          Tab(text: 'Copies'),
        ],
      ),
    );
  }

  Widget _buildTabListView({
    required String storageKey,
    required List<Widget> children,
  }) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        key: PageStorageKey<String>('manage-card-tab-$storageKey'),
        physics: const AlwaysScrollableScrollPhysics(),
        keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
        padding: const EdgeInsets.fromLTRB(0, 0, 0, 24),
        children: children,
      ),
    );
  }

  Widget _buildHero(
    ThemeData theme,
    ColorScheme colorScheme,
    VaultManageCardData data,
  ) {
    final subtitleParts = <String>[
      data.setName,
      if ((data.number ?? '').isNotEmpty) '#${data.number}',
    ];
    final displayIdentity = _manageCardDisplayIdentity(data);
    final imagePresentation = _manageCardImagePresentation(data);
    final heroPrice = _pricing?.visibleValue == null
        ? null
        : CardSurfacePriceText(
            pricing: _pricing,
            size: CardSurfacePriceSize.list,
            mode: CardSurfacePriceMode.grookai,
          );

    return _ManageSurface(
      emphasize: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Align(
            alignment: Alignment.center,
            child: Stack(
              children: [
                _CardThumb(imageUrl: data.imageUrl, size: 176),
                if (imagePresentation.compactBadgeLabel != null)
                  Positioned(
                    left: 8,
                    right: 8,
                    bottom: 8,
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: _ManageImageStatusBadge(
                        label: imagePresentation.compactBadgeLabel!,
                        strong: imagePresentation.isCollisionRepresentative,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (imagePresentation.detailNote != null) ...[
            const SizedBox(height: 10),
            _ManageImageTruthNote(note: imagePresentation.detailNote!),
          ],
          const SizedBox(height: 10),
          GvChip(
            label: data.isShared ? 'On Wall' : 'Private',
            tone: data.isShared
                ? colorScheme.primary
                : colorScheme.onSurface.withValues(alpha: 0.56),
          ),
          const SizedBox(height: 8),
          Text(
            displayIdentity.displayName,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: 0,
              height: 1.02,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            subtitleParts.join(' • '),
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
              fontWeight: FontWeight.w500,
              height: 1.2,
            ),
          ),
          if ((data.rarity ?? '').isNotEmpty) ...[
            const SizedBox(height: 7),
            GvChip(
              label: _formatRarity(data.rarity!),
              tone: colorScheme.secondary.withValues(alpha: 0.9),
            ),
          ],
          if (heroPrice != null) ...[const SizedBox(height: 10), heroPrice],
          const SizedBox(height: 8),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 5,
            runSpacing: 5,
            children: [
              GvChip(label: '${data.totalCopies} total'),
              GvChip(label: '${data.rawCount} raw'),
              GvChip(label: '${data.slabCount} slab'),
              GvChip(label: '${data.inPlayCount} visible'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(
    ThemeData theme,
    ColorScheme colorScheme,
    VaultManageCardData data,
  ) {
    final copyIntentCounts = <String, int>{
      'hold': 0,
      'trade': 0,
      'sell': 0,
      'showcase': 0,
    };
    for (final copy in data.copies) {
      final normalized = normalizeVaultIntentValue(copy.intent);
      copyIntentCounts[normalized] = (copyIntentCounts[normalized] ?? 0) + 1;
    }

    final mixTags = <Widget>[
      if (data.inPlayCount > 0) GvChip(label: '${data.inPlayCount} Public'),
      for (final option in kVaultIntentOptions)
        if (option.value != 'hold')
          if ((copyIntentCounts[option.value] ?? 0) > 0)
            GvChip(label: '${option.label} ${copyIntentCounts[option.value]}'),
    ];
    final privateCopyIds = data.copies
        .where((copy) => normalizeVaultIntentValue(copy.intent) == 'hold')
        .map((copy) => copy.instanceId)
        .toList(growable: false);
    final hasPrivateCopies = privateCopyIds.isNotEmpty;

    return _ManageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Collector intent',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _intentRelationshipText(data),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w400,
                        height: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _ManageStatusTile(
                  label: 'Public copies',
                  value: data.inPlayCount > 0
                      ? '${data.inPlayCount} public'
                      : 'Private',
                  tone: data.inPlayCount > 0
                      ? colorScheme.primary
                      : colorScheme.onSurface.withValues(alpha: 0.64),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _ManageStatusTile(
                  label: 'Presentation',
                  value: _presentationLabel(data),
                  tone: _presentationTone(colorScheme, data),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: data.copies.isEmpty
                    ? null
                    : () => _openCopiesTab(
                        selectedCopyIds: hasPrivateCopies
                            ? privateCopyIds
                            : data.copies.map((copy) => copy.instanceId),
                      ),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.library_add_check_outlined),
                label: Text(
                  hasPrivateCopies ? 'Select private copies' : 'Manage copies',
                ),
              ),
              OutlinedButton.icon(
                onPressed: data.copies.isEmpty
                    ? null
                    : () => _openCopiesTab(selectedCopyIds: const <String>[]),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.tune_rounded),
                label: const Text('Open copy controls'),
              ),
            ],
          ),
          if (mixTags.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: mixTags),
          ],
          if (data.copies.length > 1) ...[
            const SizedBox(height: 8),
            Text(
              'Exact copies below can still differ.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.54),
                height: 1.2,
              ),
            ),
          ],
          const SizedBox(height: 12),
          _buildQuickActionsWrap(data),
          if (_statusMessage != null) ...[
            const SizedBox(height: 8),
            Text(
              _statusMessage!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuickActionsWrap(VaultManageCardData data) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        FilledButton.icon(
          onPressed: _openCardDetail,
          style: FilledButton.styleFrom(
            minimumSize: const Size(0, 40),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          icon: const Icon(Icons.visibility_outlined),
          label: const Text('View card'),
        ),
        if (_canOpenWall(data))
          OutlinedButton.icon(
            onPressed: _openWall,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 40),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.open_in_new_rounded),
            label: const Text('View wall'),
          ),
        OutlinedButton.icon(
          onPressed: _bulkCopySaving || data.copies.isEmpty
              ? null
              : () => _removeAllCopies(data),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 40),
            foregroundColor: Theme.of(context).colorScheme.error,
            side: BorderSide(
              color: Theme.of(
                context,
              ).colorScheme.error.withValues(alpha: 0.52),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          icon: const Icon(Icons.delete_outline_rounded),
          label: Text(
            data.totalCopies > 1 ? 'Remove all copies' : 'Remove copy',
          ),
        ),
      ],
    );
  }

  Widget _buildCopiesSection(
    ThemeData theme,
    ColorScheme colorScheme,
    VaultManageCardData data,
  ) {
    return _ManageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Exact copies',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Choose a specific owned copy when you need copy-level intent, condition, or media controls.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
            ),
          ),
          const SizedBox(height: 12),
          if (data.copies.isEmpty)
            _SubtleEmptyState(
              title: 'No copies yet',
              body:
                  'Specific owned copies will appear here when this card is in your vault.',
            )
          else
            Column(
              children: [
                _CopyBulkActionSurface(
                  selectedCount: _selectedCopyIds.length,
                  totalCount: data.copies.length,
                  allSelected: _selectedCopyIds.length == data.copies.length,
                  busy: _bulkCopySaving,
                  sectionOptions: _bulkSectionOptions,
                  selectedSectionId: _bulkSectionId,
                  onToggleAll: (selected) =>
                      _toggleAllCopySelection(data, selected),
                  onIntentSelected: _saveSelectedCopyIntent,
                  onSectionChanged: (sectionId) {
                    setState(() {
                      _bulkSectionId = sectionId;
                    });
                  },
                  onAddToSection: () => _bulkCopySectionMembership(add: true),
                  onRemoveFromSection: () =>
                      _bulkCopySectionMembership(add: false),
                  onRemoveSelected: () => _removeSelectedCopies(data),
                ),
                const SizedBox(height: 10),
                for (var index = 0; index < data.copies.length; index++) ...[
                  _CopyRow(
                    copy: data.copies[index],
                    selected: _selectedCopyIds.contains(
                      data.copies[index].instanceId,
                    ),
                    intentSaving:
                        _copyIntentSavingId == data.copies[index].instanceId,
                    canPreviewPublic:
                        data.publicProfileEnabled &&
                        data.vaultSharingEnabled &&
                        (data.publicSlug ?? '').trim().isNotEmpty &&
                        normalizeVaultIntentValue(data.copies[index].intent) !=
                            'hold' &&
                        (data.copies[index].gvviId ?? '').trim().isNotEmpty,
                    sections:
                        _copySectionMemberships[data
                            .copies[index]
                            .instanceId] ??
                        const <VaultManageCopySectionMembership>[],
                    busySectionKey: _copySectionSavingKey,
                    onTap: (data.copies[index].gvviId ?? '').trim().isEmpty
                        ? null
                        : () => _openExactCopy(data.copies[index]),
                    onSelectionChanged: (selected) =>
                        _toggleCopySelection(data.copies[index], selected),
                    onIntentSelected: _copyIntentSavingId == null
                        ? (intent) =>
                              _saveCopyIntent(data.copies[index], intent)
                        : null,
                    onToggleSection: _copySectionSavingKey == null
                        ? (section) => _toggleCopySectionMembership(
                            data.copies[index],
                            section,
                          )
                        : null,
                    onRemoveCopy: _bulkCopySaving
                        ? null
                        : () => _removeExactCopy(data.copies[index]),
                    onOpenWall: _openWall,
                    onOpenPublicCopy: () =>
                        _openCopyPublicPage(data.copies[index]),
                    onCopyPublicCopyLink: () => _copyPublicPreviewLink(
                      _publicGvviPath(data.copies[index].gvviId ?? ''),
                      'Public copy',
                    ),
                    onSharePublicCopy: () =>
                        _shareCopyPublicLink(data.copies[index]),
                    onOpenPublicSection: _openCopyPublicSection,
                    onCopyPublicSectionLink: (section) =>
                        _copyPublicPreviewLink(
                          _publicSectionPath(
                            slug: data.publicSlug ?? '',
                            sectionId: section.id,
                          ),
                          section.name,
                        ),
                    secondaryActionLabel:
                        _canUpgradeCopyToSlab(data, data.copies[index])
                        ? 'Upgrade to Slab'
                        : null,
                    onSecondaryAction:
                        _canUpgradeCopyToSlab(data, data.copies[index])
                        ? () => _openSlabUpgradeFlow(data, data.copies[index])
                        : null,
                  ),
                  if (index < data.copies.length - 1)
                    const SizedBox(height: 10),
                ],
              ],
            ),
        ],
      ),
    );
  }

  String _presentationLabel(VaultManageCardData data) {
    if (data.inPlayCount == 0) {
      return 'Private';
    }

    switch (data.intent) {
      case 'sell':
        return 'For Sale';
      case 'trade':
        return 'Trade';
      case 'showcase':
        return 'Showcase';
      default:
        return 'Mixed';
    }
  }

  Color _presentationTone(ColorScheme colorScheme, VaultManageCardData data) {
    switch (data.intent) {
      case 'sell':
        return colorScheme.primary;
      case 'trade':
        return const Color(0xFF0F9D58);
      case 'showcase':
        return const Color(0xFFB26A00);
      default:
        return colorScheme.onSurface.withValues(alpha: 0.66);
    }
  }

  String _intentRelationshipText(VaultManageCardData data) {
    final intentLabel = getVaultIntentLabel(data.intent);
    if (data.inPlayCount == 0) {
      return 'Choose how you want to use this card.';
    }

    if (!data.publicProfileEnabled || !data.vaultSharingEnabled) {
      return '$intentLabel is saved, but public profile sharing is off.';
    }

    if (data.intent == 'hold') {
      return '${data.inPlayCount} exact copies are public to collectors.';
    }

    return '$intentLabel is public to collectors.';
  }

  bool _canOpenWall(VaultManageCardData data) {
    return data.inPlayCount > 0 &&
        (data.publicSlug?.isNotEmpty ?? false) &&
        data.publicProfileEnabled &&
        data.vaultSharingEnabled;
  }

  String _deriveCardIntent(List<VaultManageCardCopy> copies) {
    final discoverableIntents = copies
        .map((copy) => normalizeDiscoverableVaultIntentValue(copy.intent))
        .whereType<String>()
        .toSet()
        .toList();

    if (discoverableIntents.length == 1) {
      return discoverableIntents.first;
    }

    return 'hold';
  }

  List<VaultManageCopySectionMembership> get _bulkSectionOptions {
    final byId = <String, VaultManageCopySectionMembership>{};
    for (final sections in _copySectionMemberships.values) {
      for (final section in sections) {
        byId.putIfAbsent(section.id, () => section);
      }
    }
    final options = byId.values.toList(growable: false)
      ..sort((left, right) {
        final position = left.position.compareTo(right.position);
        if (position != 0) {
          return position;
        }
        return left.name.compareTo(right.name);
      });
    return options;
  }

  static String? _firstBulkSectionId(
    Map<String, List<VaultManageCopySectionMembership>> memberships,
  ) {
    final sections =
        memberships.values.expand((value) => value).toList(growable: false)
          ..sort((left, right) {
            final position = left.position.compareTo(right.position);
            if (position != 0) {
              return position;
            }
            return left.name.compareTo(right.name);
          });
    return sections.isEmpty ? null : sections.first.id;
  }

  String _formatRarity(String raw) {
    return raw
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .map((part) {
          final lower = part.toLowerCase();
          return '${lower[0].toUpperCase()}${lower.substring(1)}';
        })
        .join(' ');
  }
}

class _ManageSurface extends StatelessWidget {
  const _ManageSurface({required this.child, this.emphasize = false});

  final Widget child;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: emphasize ? 0.16 : 0.08),
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(
              alpha: emphasize ? 0.07 : 0.025,
            ),
            blurRadius: emphasize ? 18 : 8,
            offset: Offset(0, emphasize ? 7 : 3),
          ),
        ],
      ),
      padding: EdgeInsets.all(emphasize ? 12 : 14),
      child: child,
    );
  }
}

ResolvedImagePresentation _manageCardImagePresentation(
  VaultManageCardData data,
) {
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

class _CardThumb extends StatelessWidget {
  const _CardThumb({required this.imageUrl, required this.size});

  final String? imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final normalized = normalizeDisplayImageUrl(imageUrl) ?? '';
    final cardHeight = size * 1.395;

    return DecoratedBox(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.12),
            blurRadius: 16,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: SizedBox(
        width: size,
        height: cardHeight,
        child: normalized.isEmpty
            ? DecoratedBox(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Center(child: Icon(Icons.style)),
              )
            : Image.network(
                normalized,
                fit: BoxFit.contain,
                filterQuality: FilterQuality.high,
                errorBuilder: (context, error, stackTrace) => DecoratedBox(
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Center(child: Icon(Icons.broken_image)),
                ),
              ),
      ),
    );
  }
}

class _ManageImageStatusBadge extends StatelessWidget {
  const _ManageImageStatusBadge({required this.label, this.strong = false});

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

class _ManageImageTruthNote extends StatelessWidget {
  const _ManageImageTruthNote({required this.note});

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
          textAlign: TextAlign.center,
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

class _ManageStatusTile extends StatelessWidget {
  const _ManageStatusTile({
    required this.label,
    required this.value,
    required this.tone,
  });

  final String label;
  final String value;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.46),
              fontWeight: FontWeight.w600,
              letterSpacing: 0.18,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: tone.withValues(alpha: 0.9),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _CopyBulkActionSurface extends StatelessWidget {
  const _CopyBulkActionSurface({
    required this.selectedCount,
    required this.totalCount,
    required this.allSelected,
    required this.busy,
    required this.sectionOptions,
    required this.selectedSectionId,
    required this.onToggleAll,
    required this.onIntentSelected,
    required this.onSectionChanged,
    required this.onAddToSection,
    required this.onRemoveFromSection,
    required this.onRemoveSelected,
  });

  final int selectedCount;
  final int totalCount;
  final bool allSelected;
  final bool busy;
  final List<VaultManageCopySectionMembership> sectionOptions;
  final String? selectedSectionId;
  final ValueChanged<bool> onToggleAll;
  final ValueChanged<String> onIntentSelected;
  final ValueChanged<String?> onSectionChanged;
  final VoidCallback onAddToSection;
  final VoidCallback onRemoveFromSection;
  final VoidCallback onRemoveSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final hasSelection = selectedCount > 0;
    final hasSections = sectionOptions.isNotEmpty;
    final dropdownValue =
        sectionOptions.any((section) => section.id == selectedSectionId)
        ? selectedSectionId
        : null;

    // LOCK: Mobile bulk copy management writes only exact-copy instance IDs.
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Checkbox(
                  value: allSelected,
                  onChanged: busy
                      ? null
                      : (value) => onToggleAll(value == true),
                ),
                Expanded(
                  child: Text(
                    hasSelection ? '$selectedCount selected' : 'Select copies',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (busy)
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: colorScheme.primary,
                    ),
                  ),
              ],
            ),
            if (hasSelection) ...[
              const SizedBox(height: 10),
              Text(
                'Bulk actions',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.58),
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.18,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final option in kVaultIntentOptions)
                    ActionChip(
                      label: Text(option.label),
                      onPressed: busy
                          ? null
                          : () => onIntentSelected(option.value),
                    ),
                ],
              ),
              if (hasSections) ...[
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  key: ValueKey(dropdownValue ?? 'no-section'),
                  initialValue: dropdownValue,
                  decoration: const InputDecoration(
                    labelText: 'Wall section',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: [
                    for (final section in sectionOptions)
                      DropdownMenuItem<String>(
                        value: section.id,
                        child: Text(section.name),
                      ),
                  ],
                  onChanged: busy ? null : onSectionChanged,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.tonalIcon(
                      onPressed: busy || dropdownValue == null
                          ? null
                          : onAddToSection,
                      icon: const Icon(Icons.playlist_add_check_rounded),
                      label: const Text('Add to section'),
                    ),
                    OutlinedButton.icon(
                      onPressed: busy || dropdownValue == null
                          ? null
                          : onRemoveFromSection,
                      icon: const Icon(Icons.playlist_remove_rounded),
                      label: const Text('Remove from section'),
                    ),
                  ],
                ),
              ] else ...[
                const SizedBox(height: 8),
                Text(
                  'Create a Wall section before using bulk section actions.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.62),
                  ),
                ),
              ],
              const SizedBox(height: 10),
              OutlinedButton.icon(
                onPressed: busy ? null : onRemoveSelected,
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  foregroundColor: colorScheme.error,
                  side: BorderSide(
                    color: colorScheme.error.withValues(alpha: 0.52),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: const Icon(Icons.delete_outline_rounded),
                label: Text(
                  selectedCount == 1
                      ? 'Remove selected copy'
                      : 'Remove selected copies',
                ),
              ),
            ] else if (totalCount > 1) ...[
              const SizedBox(height: 4),
              Text(
                'Select multiple exact copies to update intent, section placement, or remove them together.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CopyRow extends StatelessWidget {
  const _CopyRow({
    required this.copy,
    required this.selected,
    required this.intentSaving,
    required this.sections,
    required this.canPreviewPublic,
    this.busySectionKey,
    this.onTap,
    this.onSelectionChanged,
    this.onIntentSelected,
    this.onToggleSection,
    this.onRemoveCopy,
    this.onOpenWall,
    this.onOpenPublicCopy,
    this.onCopyPublicCopyLink,
    this.onSharePublicCopy,
    this.onOpenPublicSection,
    this.onCopyPublicSectionLink,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  final VaultManageCardCopy copy;
  final bool selected;
  final bool intentSaving;
  final List<VaultManageCopySectionMembership> sections;
  final bool canPreviewPublic;
  final String? busySectionKey;
  final VoidCallback? onTap;
  final ValueChanged<bool>? onSelectionChanged;
  final ValueChanged<String>? onIntentSelected;
  final ValueChanged<VaultManageCopySectionMembership>? onToggleSection;
  final VoidCallback? onRemoveCopy;
  final VoidCallback? onOpenWall;
  final VoidCallback? onOpenPublicCopy;
  final VoidCallback? onCopyPublicCopyLink;
  final VoidCallback? onSharePublicCopy;
  final ValueChanged<VaultManageCopySectionMembership>? onOpenPublicSection;
  final ValueChanged<VaultManageCopySectionMembership>? onCopyPublicSectionLink;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final gvviId = (copy.gvviId ?? '').trim();
    final metaParts = <String>[
      if (copy.createdAt != null) _formatDate(copy.createdAt!),
    ];
    final copyTitle = copy.isGraded
        ? [
            if ((copy.grader ?? '').isNotEmpty) copy.grader!,
            if ((copy.grade ?? '').isNotEmpty) copy.grade!,
          ].join(' ')
        : 'Raw ${copy.conditionLabel}';
    final assignedSections = sections
        .where((section) => section.isMember)
        .toList(growable: false);

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Checkbox(
              value: selected,
              onChanged: onSelectionChanged == null
                  ? null
                  : (value) => onSelectionChanged!(value == true),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'GVVI',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.46),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.24,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    gvviId.isEmpty ? 'GVVI unavailable' : gvviId,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(
                      color: gvviId.isEmpty
                          ? colorScheme.error
                          : colorScheme.onSurface,
                      fontFeatures: const [FontFeature.tabularFigures()],
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.12,
                    ),
                  ),
                ],
              ),
            ),
            if (onTap != null)
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
            if (intentSaving) ...[
              const SizedBox(width: 8),
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colorScheme.primary,
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        Text(
          copyTitle.trim().isEmpty ? 'Vault copy' : copyTitle.trim(),
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.76),
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            GvChip(label: _intentLabel(copy.intent)),
            GvChip(label: copy.conditionLabel),
            if ((copy.certNumber ?? '').isNotEmpty)
              GvChip(label: copy.certNumber!),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final option in kVaultIntentOptions)
              GvChip(
                label: option.label,
                selected:
                    normalizeVaultIntentValue(copy.intent) == option.value,
                onSelected: intentSaving || onIntentSelected == null
                    ? null
                    : (_) => onIntentSelected!(option.value),
              ),
          ],
        ),
        if (sections.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            'Sections',
            style: theme.textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.54),
              fontWeight: FontWeight.w700,
              letterSpacing: 0.18,
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final section in sections)
                FilterChip(
                  label: Text(section.name),
                  selected: section.isMember,
                  avatar: busySectionKey == '${copy.instanceId}:${section.id}'
                      ? SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: colorScheme.primary,
                          ),
                        )
                      : null,
                  onSelected: busySectionKey == null && onToggleSection != null
                      ? (_) => onToggleSection!(section)
                      : null,
                ),
            ],
          ),
        ],
        if (canPreviewPublic) ...[
          const SizedBox(height: 12),
          _CopyPublicPreviewSurface(
            assignedSections: assignedSections,
            onOpenWall: onOpenWall,
            onOpenPublicCopy: onOpenPublicCopy,
            onCopyPublicCopyLink: onCopyPublicCopyLink,
            onSharePublicCopy: onSharePublicCopy,
            onOpenPublicSection: onOpenPublicSection,
            onCopyPublicSectionLink: onCopyPublicSectionLink,
          ),
        ],
        if (metaParts.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            metaParts.join(' • '),
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.66),
            ),
          ),
        ],
        if ((copy.note ?? '').isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(
            copy.note!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.74),
              height: 1.3,
            ),
          ),
        ],
        if (onTap != null ||
            onRemoveCopy != null ||
            ((secondaryActionLabel ?? '').trim().isNotEmpty &&
                onSecondaryAction != null)) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (onTap != null)
                FilledButton.tonalIcon(
                  onPressed: onTap,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.tune_rounded, size: 16),
                  label: const Text('Edit copy'),
                ),
              if ((secondaryActionLabel ?? '').trim().isNotEmpty &&
                  onSecondaryAction != null)
                OutlinedButton.icon(
                  onPressed: onSecondaryAction,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.verified_outlined, size: 16),
                  label: Text(secondaryActionLabel!),
                ),
              if (onRemoveCopy != null)
                OutlinedButton.icon(
                  onPressed: onRemoveCopy,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, 40),
                    foregroundColor: colorScheme.error,
                    side: BorderSide(
                      color: colorScheme.error.withValues(alpha: 0.52),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 10,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.delete_outline_rounded, size: 16),
                  label: const Text('Remove'),
                ),
            ],
          ),
        ],
      ],
    );

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.32),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(padding: const EdgeInsets.all(12), child: body),
        ),
      ),
    );
  }

  String _intentLabel(String intent) {
    return getVaultIntentLabel(intent);
  }

  static String _formatDate(DateTime value) {
    return '${value.month}/${value.day}/${value.year}';
  }
}

class _CopyPublicPreviewSurface extends StatelessWidget {
  const _CopyPublicPreviewSurface({
    required this.assignedSections,
    this.onOpenWall,
    this.onOpenPublicCopy,
    this.onCopyPublicCopyLink,
    this.onSharePublicCopy,
    this.onOpenPublicSection,
    this.onCopyPublicSectionLink,
  });

  final List<VaultManageCopySectionMembership> assignedSections;
  final VoidCallback? onOpenWall;
  final VoidCallback? onOpenPublicCopy;
  final VoidCallback? onCopyPublicCopyLink;
  final VoidCallback? onSharePublicCopy;
  final ValueChanged<VaultManageCopySectionMembership>? onOpenPublicSection;
  final ValueChanged<VaultManageCopySectionMembership>? onCopyPublicSectionLink;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    // LOCK: Grouped row public preview links are exact-copy read links only.
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surface.withValues(alpha: 0.62),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(10, 10, 10, 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Public Preview',
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w800,
                letterSpacing: 0.18,
                color: colorScheme.onSurface.withValues(alpha: 0.58),
              ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (onOpenWall != null)
                  _CopyPreviewActionChip(
                    icon: Icons.public_outlined,
                    label: 'View Wall',
                    onPressed: onOpenWall!,
                  ),
                if (onOpenPublicCopy != null)
                  _CopyPreviewActionChip(
                    icon: Icons.style_outlined,
                    label: 'View public copy',
                    onPressed: onOpenPublicCopy!,
                  ),
                if (onSharePublicCopy != null)
                  _CopyPreviewActionChip(
                    icon: Icons.ios_share_outlined,
                    label: 'Share copy',
                    onPressed: onSharePublicCopy!,
                  ),
                if (onCopyPublicCopyLink != null)
                  _CopyPreviewActionChip(
                    icon: Icons.link_rounded,
                    label: 'Copy link',
                    onPressed: onCopyPublicCopyLink!,
                  ),
              ],
            ),
            if (assignedSections.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final section in assignedSections)
                    InputChip(
                      label: Text(section.name),
                      avatar: const Icon(Icons.folder_open_outlined, size: 16),
                      onPressed: onOpenPublicSection == null
                          ? null
                          : () => onOpenPublicSection!(section),
                      deleteIcon: const Icon(Icons.link_rounded, size: 16),
                      onDeleted: onCopyPublicSectionLink == null
                          ? null
                          : () => onCopyPublicSectionLink!(section),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CopyPreviewActionChip extends StatelessWidget {
  const _CopyPreviewActionChip({
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
      icon: Icon(icon, size: 15),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 34),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}

class _SubtleEmptyState extends StatelessWidget {
  const _SubtleEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            body,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.7),
            ),
          ),
        ],
      ),
    );
  }
}
