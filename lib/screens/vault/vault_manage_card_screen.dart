import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../services/identity/display_identity.dart';
import '../../services/public/card_surface_pricing_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../../services/vault/slab_upgrade_service.dart';
import '../../widgets/card_surface_price.dart';
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

enum _ManageCardPriceMode { grookai, myPrice, hidden }

enum _ManageCardTab { overview, wall, copies }

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
  final TextEditingController _publicNoteController = TextEditingController();
  final TextEditingController _manualPriceController = TextEditingController();
  late final TabController _tabController;

  VaultManageCardData? _data;
  CardSurfacePricingData? _pricing;
  bool _loading = true;
  bool _intentSaving = false;
  bool _shareSaving = false;
  bool _noteSaving = false;
  bool _priceSaving = false;
  _ManageCardPriceMode _selectedPriceMode = _ManageCardPriceMode.grookai;
  String? _error;
  String? _statusMessage;
  String? _priceError;

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
    _publicNoteController.dispose();
    _manualPriceController.dispose();
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

      if (!mounted) {
        return;
      }

      _applyLoadedState(data, pricing);
      setState(() {
        _data = data;
        _pricing = pricing;
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
        _loading = false;
      });
    }
  }

  Future<void> _toggleWall() async {
    final data = _data;
    if (data == null || _shareSaving) {
      return;
    }

    setState(() {
      _shareSaving = true;
      _statusMessage = null;
    });

    try {
      final nextShared = await VaultCardService.setSharedCardVisibility(
        client: _client,
        cardPrintId: data.cardPrintId,
        gvId: data.gvId ?? '',
        nextShared: !data.isShared,
      );

      if (!mounted) {
        return;
      }

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
          variantKey: data.variantKey,
          printedIdentityModifier: data.printedIdentityModifier,
          setIdentityModel: data.setIdentityModel,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          intent: data.intent,
          isShared: nextShared,
          wallCategory: nextShared ? data.wallCategory : null,
          publicNote: nextShared ? data.publicNote : null,
          publicSlug: data.publicSlug,
          priceDisplayMode: nextShared ? data.priceDisplayMode : null,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: data.askingPriceAmount,
          askingPriceCurrency: data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        if (!nextShared) {
          _publicNoteController.clear();
          _priceError = null;
        }
        _statusMessage = nextShared ? 'Added to wall.' : 'Removed from wall.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _shareSaving = false;
        });
      }
    }
  }

  Future<void> _saveWallCategory(String? value) async {
    final data = _data;
    if (data == null || !data.isShared) {
      return;
    }

    try {
      final nextCategory = await VaultCardService.saveSharedCardWallCategory(
        client: _client,
        cardPrintId: data.cardPrintId,
        wallCategory: value,
      );

      if (!mounted) {
        return;
      }

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
          variantKey: data.variantKey,
          printedIdentityModifier: data.printedIdentityModifier,
          setIdentityModel: data.setIdentityModel,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          intent: data.intent,
          isShared: data.isShared,
          wallCategory: nextCategory,
          publicNote: data.publicNote,
          publicSlug: data.publicSlug,
          priceDisplayMode: data.priceDisplayMode,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: data.askingPriceAmount,
          askingPriceCurrency: data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        _statusMessage = 'Wall category saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _savePublicNote() async {
    final data = _data;
    if (data == null || !data.isShared || _noteSaving) {
      return;
    }

    setState(() {
      _noteSaving = true;
      _statusMessage = null;
    });

    try {
      final nextNote = await VaultCardService.saveSharedCardPublicNote(
        client: _client,
        cardPrintId: data.cardPrintId,
        note: _publicNoteController.text,
      );

      if (!mounted) {
        return;
      }

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
          variantKey: data.variantKey,
          printedIdentityModifier: data.printedIdentityModifier,
          setIdentityModel: data.setIdentityModel,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          intent: data.intent,
          isShared: data.isShared,
          wallCategory: data.wallCategory,
          publicNote: nextNote,
          publicSlug: data.publicSlug,
          priceDisplayMode: data.priceDisplayMode,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: data.askingPriceAmount,
          askingPriceCurrency: data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        _publicNoteController.text = nextNote ?? '';
        _statusMessage = 'Wall note saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _noteSaving = false;
        });
      }
    }
  }

  void _applyLoadedState(
    VaultManageCardData data,
    CardSurfacePricingData? pricing,
  ) {
    _publicNoteController.text = data.publicNote ?? '';
    _manualPriceController.text = _formatManualPrice(data.askingPriceAmount);
    _selectedPriceMode = switch (data.priceDisplayMode) {
      'my_price' => _ManageCardPriceMode.myPrice,
      'hidden' => _ManageCardPriceMode.hidden,
      _ => _ManageCardPriceMode.grookai,
    };
    _priceError = null;
    _pricing = pricing;
  }

  Future<void> _savePriceDisplay() async {
    final data = _data;
    if (data == null || !data.isShared || _priceSaving) {
      return;
    }

    final persistedMode = switch (_selectedPriceMode) {
      _ManageCardPriceMode.grookai => 'grookai',
      _ManageCardPriceMode.myPrice => 'my_price',
      _ManageCardPriceMode.hidden => 'hidden',
    };
    final askingPriceAmount = _selectedPriceMode == _ManageCardPriceMode.myPrice
        ? _parseManualPrice(_manualPriceController.text)
        : null;

    if (_selectedPriceMode == _ManageCardPriceMode.myPrice &&
        askingPriceAmount == null) {
      setState(() {
        _priceError = 'Enter a valid price to use My Price.';
      });
      return;
    }

    setState(() {
      _priceSaving = true;
      _priceError = null;
      _statusMessage = null;
    });

    try {
      final result = await VaultCardService.saveSharedCardPriceDisplay(
        client: _client,
        cardPrintId: data.cardPrintId,
        priceDisplayMode: persistedMode,
        primarySharedGvviId: data.primarySharedGvviId,
        askingPriceAmount: askingPriceAmount,
        askingPriceCurrency: 'USD',
      );

      if (!mounted) {
        return;
      }

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
          variantKey: data.variantKey,
          printedIdentityModifier: data.printedIdentityModifier,
          setIdentityModel: data.setIdentityModel,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: data.inPlayCount,
          intent: data.intent,
          isShared: data.isShared,
          wallCategory: data.wallCategory,
          publicNote: data.publicNote,
          publicSlug: data.publicSlug,
          priceDisplayMode: result.priceDisplayMode,
          primarySharedGvviId: data.primarySharedGvviId,
          askingPriceAmount: result.askingPriceAmount ?? data.askingPriceAmount,
          askingPriceCurrency:
              result.askingPriceCurrency ?? data.askingPriceCurrency,
          publicProfileEnabled: data.publicProfileEnabled,
          vaultSharingEnabled: data.vaultSharingEnabled,
          copies: data.copies,
        );
        if (result.askingPriceAmount != null) {
          _manualPriceController.text = _formatManualPrice(
            result.askingPriceAmount,
          );
        }
        _statusMessage = 'Price display saved.';
      });
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _priceSaving = false;
        });
      }
    }
  }

  Future<void> _saveIntent(String nextIntent) async {
    final data = _data;
    final normalizedNextIntent = normalizeVaultIntentValue(nextIntent);
    if (data == null || _intentSaving || normalizedNextIntent == data.intent) {
      return;
    }

    setState(() {
      _intentSaving = true;
    });

    try {
      final savedIntent = await VaultCardService.saveVaultItemIntent(
        client: _client,
        vaultItemId: data.vaultItemId,
        intent: normalizedNextIntent,
      );

      if (!mounted) {
        return;
      }

      final updatedCopies = data.copies
          .map(
            (copy) => VaultManageCardCopy(
              instanceId: copy.instanceId,
              gvviId: copy.gvviId,
              conditionLabel: copy.conditionLabel,
              intent: savedIntent,
              note: copy.note,
              createdAt: copy.createdAt,
              grader: copy.grader,
              grade: copy.grade,
              certNumber: copy.certNumber,
              isGraded: copy.isGraded,
            ),
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
          variantKey: data.variantKey,
          printedIdentityModifier: data.printedIdentityModifier,
          setIdentityModel: data.setIdentityModel,
          totalCopies: data.totalCopies,
          rawCount: data.rawCount,
          slabCount: data.slabCount,
          inPlayCount: savedIntent == 'hold' ? 0 : updatedCopies.length,
          intent: savedIntent,
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
      });
      _showStatus('Intent saved.');
    } catch (error) {
      if (!mounted) {
        return;
      }

      _showStatus(error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) {
        setState(() {
          _intentSaving = false;
        });
      }
    }
  }

  String _formatManualPrice(double? amount) {
    if (amount == null || !amount.isFinite) {
      return '';
    }
    return amount.toStringAsFixed(2);
  }

  double? _parseManualPrice(String value) {
    final normalized = value.replaceAll(RegExp(r'[^0-9.]'), '').trim();
    if (normalized.isEmpty) {
      return null;
    }
    final parsed = double.tryParse(normalized);
    if (parsed == null || !parsed.isFinite || parsed < 0) {
      return null;
    }
    return double.parse(parsed.toStringAsFixed(2));
  }

  String _selectedPriceModeValue() {
    return switch (_selectedPriceMode) {
      _ManageCardPriceMode.grookai => 'grookai',
      _ManageCardPriceMode.myPrice => 'my_price',
      _ManageCardPriceMode.hidden => 'hidden',
    };
  }

  bool _moneyEquals(double? left, double? right) {
    if (left == null && right == null) {
      return true;
    }
    if (left == null || right == null) {
      return false;
    }
    return (left - right).abs() < 0.005;
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
                                storageKey: 'wall',
                                children: [
                                  _buildWallSettings(theme, colorScheme, data),
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
          Tab(text: 'Wall'),
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
    final heroPrice = _pricing?.visibleValue == null
        ? null
        : CardSurfacePricePill(
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
            child: _CardThumb(imageUrl: data.imageUrl, size: 176),
          ),
          const SizedBox(height: 10),
          _PillLabel(
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
              letterSpacing: -0.55,
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
            _MetaChip(
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
              _CountChip(label: '${data.totalCopies} total'),
              _CountChip(label: '${data.rawCount} raw'),
              _CountChip(label: '${data.slabCount} slab'),
              _CountChip(label: '${data.inPlayCount} visible'),
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
      if (data.inPlayCount > 0)
        _InlineTag(label: '${data.inPlayCount} Visible'),
      for (final option in kVaultIntentOptions)
        if (option.value != 'hold')
          if ((copyIntentCounts[option.value] ?? 0) > 0)
            _InlineTag(
              label: '${option.label} ${copyIntentCounts[option.value]}',
            ),
    ];

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
              if (_intentSaving)
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
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _ManageStatusTile(
                  label: 'Wall',
                  value: data.isShared ? 'On Wall' : 'Private',
                  tone: data.isShared
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
            spacing: 6,
            runSpacing: 6,
            children: kVaultIntentOptions
                .map(
                  (option) => ChoiceChip(
                    label: Text(option.label),
                    selected: data.intent == option.value,
                    onSelected: _intentSaving
                        ? null
                        : (_) => _saveIntent(option.value),
                  ),
                )
                .toList(),
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
        OutlinedButton.icon(
          onPressed: _shareSaving ? null : _toggleWall,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 40),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          icon: _shareSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(
                  data.isShared
                      ? Icons.public_off_outlined
                      : Icons.public_outlined,
                ),
          label: Text(data.isShared ? 'Remove from Wall' : 'Add to Wall'),
        ),
        if (data.canViewWall)
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
      ],
    );
  }

  Widget _buildWallSettings(
    ThemeData theme,
    ColorScheme colorScheme,
    VaultManageCardData data,
  ) {
    final manualPreviewPrice =
        _selectedPriceMode == _ManageCardPriceMode.myPrice
        ? _parseManualPrice(_manualPriceController.text)
        : null;
    final hasGrookaiPrice = _pricing?.visibleValue != null;
    final pricePreview = switch (_selectedPriceMode) {
      _ManageCardPriceMode.grookai when hasGrookaiPrice => CardSurfacePricePill(
        pricing: _pricing,
        size: CardSurfacePriceSize.list,
        mode: CardSurfacePriceMode.grookai,
      ),
      _ManageCardPriceMode.myPrice when manualPreviewPrice != null =>
        CardSurfacePricePill(
          size: CardSurfacePriceSize.list,
          mode: CardSurfacePriceMode.manual,
          manualPrice: manualPreviewPrice,
          manualCurrency: data.askingPriceCurrency ?? 'USD',
        ),
      _ => null,
    };
    final currentMode = _selectedPriceModeValue();
    final persistedMode =
        normalizeSharedCardPriceDisplayMode(data.priceDisplayMode) ?? 'grookai';
    final manualPrice = _selectedPriceMode == _ManageCardPriceMode.myPrice
        ? _parseManualPrice(_manualPriceController.text)
        : null;
    final noteChanged =
        _publicNoteController.text.trim() != (data.publicNote ?? '');
    final canUseManualPrice = (data.primarySharedGvviId ?? '')
        .trim()
        .isNotEmpty;
    final priceChanged =
        currentMode != persistedMode ||
        (currentMode == 'my_price' &&
            !_moneyEquals(manualPrice, data.askingPriceAmount));

    return _ManageSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Public presentation',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            data.isShared
                ? 'Tune how this grouped card appears on your wall.'
                : 'Add this card to your wall when you are ready to publish category, note, and pricing.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.3,
            ),
          ),
          if (pricePreview != null) ...[
            const SizedBox(height: 12),
            Align(alignment: Alignment.centerLeft, child: pricePreview),
          ],
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: data.wallCategory ?? '',
            decoration: const InputDecoration(
              labelText: 'Wall Category',
              isDense: true,
            ),
            items: [
              const DropdownMenuItem<String>(
                value: '',
                child: Text('No category'),
              ),
              ...kWallCategoryOptions.map(
                (option) => DropdownMenuItem<String>(
                  value: option.value,
                  child: Text(option.label),
                ),
              ),
            ],
            onChanged: data.isShared
                ? (value) {
                    _saveWallCategory((value ?? '').isEmpty ? null : value);
                  }
                : null,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _publicNoteController,
            enabled: data.isShared && !_noteSaving,
            minLines: 3,
            maxLines: 5,
            textInputAction: TextInputAction.done,
            onChanged: (_) {
              if (mounted) {
                setState(() {});
              }
            },
            onSubmitted: (_) => _dismissKeyboard(),
            decoration: const InputDecoration(
              labelText: 'Wall Note',
              hintText: 'Add a collector-facing note for this grouped card.',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            'Price Display',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Choose whether the wall card shows Grookai pricing, your own asking price, or no price.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              height: 1.3,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              ChoiceChip(
                label: const Text('Use Grookai Price'),
                selected: _selectedPriceMode == _ManageCardPriceMode.grookai,
                onSelected: data.isShared
                    ? (_) {
                        setState(() {
                          _selectedPriceMode = _ManageCardPriceMode.grookai;
                          _priceError = null;
                        });
                      }
                    : null,
              ),
              ChoiceChip(
                label: const Text('Use My Price'),
                selected: _selectedPriceMode == _ManageCardPriceMode.myPrice,
                onSelected: data.isShared && canUseManualPrice
                    ? (_) {
                        setState(() {
                          _selectedPriceMode = _ManageCardPriceMode.myPrice;
                          _priceError = null;
                        });
                      }
                    : null,
              ),
              ChoiceChip(
                label: const Text('Hide Price'),
                selected: _selectedPriceMode == _ManageCardPriceMode.hidden,
                onSelected: data.isShared
                    ? (_) {
                        setState(() {
                          _selectedPriceMode = _ManageCardPriceMode.hidden;
                          _priceError = null;
                        });
                      }
                    : null,
              ),
            ],
          ),
          if (_selectedPriceMode == _ManageCardPriceMode.myPrice) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _manualPriceController,
              enabled: data.isShared && canUseManualPrice && !_priceSaving,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
              textInputAction: TextInputAction.done,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[0-9.]')),
              ],
              onChanged: (_) {
                if (mounted) {
                  setState(() {
                    _priceError = null;
                  });
                }
              },
              onSubmitted: (_) => _dismissKeyboard(),
              decoration: InputDecoration(
                labelText: 'Your Price',
                hintText: '0.00',
                prefixText: '\$',
                errorText: _priceError,
              ),
            ),
          ] else if (_priceError != null) ...[
            const SizedBox(height: 8),
            Text(
              _priceError!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
          ],
          if (!canUseManualPrice) ...[
            const SizedBox(height: 8),
            Text(
              'My Price becomes available once this card has an exact copy to anchor the asking price.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
                height: 1.3,
              ),
            ),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton(
                onPressed: data.isShared && !_noteSaving && noteChanged
                    ? _savePublicNote
                    : null,
                child: _noteSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save note'),
              ),
              FilledButton.tonal(
                onPressed:
                    data.isShared &&
                        !_priceSaving &&
                        priceChanged &&
                        (_selectedPriceMode != _ManageCardPriceMode.myPrice ||
                            manualPrice != null)
                    ? _savePriceDisplay
                    : null,
                child: _priceSaving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save price'),
              ),
            ],
          ),
          if (_statusMessage != null) ...[
            const SizedBox(height: 10),
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
              title: 'No copies surfaced yet',
              body:
                  'Exact copies will appear here when the vault instance read returns rows.',
            )
          else
            Column(
              children: [
                for (var index = 0; index < data.copies.length; index++) ...[
                  _CopyRow(
                    copy: data.copies[index],
                    onTap: (data.copies[index].gvviId ?? '').trim().isEmpty
                        ? null
                        : () => _openExactCopy(data.copies[index]),
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
    if (!data.isShared) {
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
        return data.inPlayCount > 0 ? 'Visible' : 'Hidden';
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
    if (!data.isShared) {
      return data.intent == 'hold'
          ? 'Choose how you want to use this card.'
          : '$intentLabel is ready when you want to make it public.';
    }

    if (data.intent == 'hold') {
      return data.inPlayCount > 0
          ? 'This card is private here, while some copies below are visible to collectors.'
          : 'On wall, but not visible in the collector network.';
    }

    return '$intentLabel is visible to collectors.';
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

class _CardThumb extends StatelessWidget {
  const _CardThumb({required this.imageUrl, required this.size});

  final String? imageUrl;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final normalized = imageUrl?.trim() ?? '';
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

class _PillLabel extends StatelessWidget {
  const _PillLabel({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip({required this.label, required this.tone});

  final String label;
  final Color tone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: tone.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: tone,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _CountChip extends StatelessWidget {
  const _CountChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontSize: 10.5,
          fontWeight: FontWeight.w500,
          color: colorScheme.onSurface.withValues(alpha: 0.54),
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

class _CopyRow extends StatelessWidget {
  const _CopyRow({
    required this.copy,
    this.onTap,
    this.secondaryActionLabel,
    this.onSecondaryAction,
  });

  final VaultManageCardCopy copy;
  final VoidCallback? onTap;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final metaParts = <String>[
      if ((copy.gvviId ?? '').isNotEmpty) copy.gvviId!,
      if (copy.createdAt != null) _formatDate(copy.createdAt!),
    ];
    final copyTitle = copy.isGraded
        ? [
            if ((copy.grader ?? '').isNotEmpty) copy.grader!,
            if ((copy.grade ?? '').isNotEmpty) copy.grade!,
          ].join(' ')
        : 'Raw ${copy.conditionLabel}';

    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                copyTitle.trim().isEmpty ? 'Vault copy' : copyTitle.trim(),
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            if (onTap != null)
              Icon(
                Icons.chevron_right_rounded,
                color: colorScheme.onSurface.withValues(alpha: 0.38),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            _InlineTag(label: _intentLabel(copy.intent)),
            _InlineTag(label: copy.conditionLabel),
            if ((copy.certNumber ?? '').isNotEmpty)
              _InlineTag(label: copy.certNumber!),
          ],
        ),
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
        if ((secondaryActionLabel ?? '').trim().isNotEmpty &&
            onSecondaryAction != null) ...[
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              onPressed: onSecondaryAction,
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(0, 36),
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

class _InlineTag extends StatelessWidget {
  const _InlineTag({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface.withValues(alpha: 0.64),
        ),
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
