import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../card_detail_screen.dart';
import '../../models/vault/collection_project.dart';
import '../../services/grookai_dex/grookai_dex_service.dart';
import '../../services/identity/display_identity.dart';
import '../../services/identity/image_presentation.dart';
import '../../services/navigation/grookai_web_route_service.dart';
import '../../services/network/card_engagement_service.dart';
import '../../services/public/compare_service.dart';
import '../../services/vault/vault_card_service.dart';
import '../../services/vault/collection_project_service.dart';
import '../../utils/dex_filter_options.dart';
import '../../utils/pokemon_sprite_url.dart';
import '../../widgets/card_surface_artwork.dart';
import '../../widgets/vault/vault_quick_action_sheet.dart';
import '../account/account_screen.dart';
import '../compare/compare_screen.dart';
import '../vault/vault_manage_card_screen.dart';
import 'dex_wall_showcase_screen.dart';

enum _DexSpeciesView { collection, owned, missing, additional, cameos }

enum _DexCardOwnership { all, owned, missing }

enum _DexCardSort { setAndNumber, name, rarity, ownedHigh, missingFirst }

enum _DexCardPresentation { list, grid, compact }

enum _DexSpeciesMenuAction { wallShowcase, share }

String _cardSetLabel(GrookaiDexCardPrint card) {
  final value = (card.setName ?? card.setCode ?? '').trim();
  return value.isEmpty ? 'Unknown set' : value;
}

String _cardRarityLabel(GrookaiDexCardPrint card) {
  final value = (card.rarity ?? '').trim();
  return value.isEmpty ? 'Unspecified rarity' : value;
}

int _compareSetAndNumber(GrookaiDexCardPrint left, GrookaiDexCardPrint right) {
  final setResult = _cardSetLabel(
    left,
  ).toLowerCase().compareTo(_cardSetLabel(right).toLowerCase());
  if (setResult != 0) {
    return setResult;
  }
  final leftNumber = (left.number ?? '').trim();
  final rightNumber = (right.number ?? '').trim();
  final leftNumeric = int.tryParse(leftNumber.replaceAll(RegExp(r'\D'), ''));
  final rightNumeric = int.tryParse(rightNumber.replaceAll(RegExp(r'\D'), ''));
  if (leftNumeric != null && rightNumeric != null) {
    final numberResult = leftNumeric.compareTo(rightNumeric);
    if (numberResult != 0) {
      return numberResult;
    }
  }
  return leftNumber.toLowerCase().compareTo(rightNumber.toLowerCase());
}

class GrookaiDexSpeciesScreen extends StatefulWidget {
  const GrookaiDexSpeciesScreen({
    required this.speciesSlug,
    this.initialDisplayName,
    this.onOpenScanner,
    this.onOpenVaultSpecies,
    super.key,
  });

  final String speciesSlug;
  final String? initialDisplayName;
  final Future<void> Function()? onOpenScanner;
  final Future<void> Function({
    required String speciesSlug,
    required String displayName,
  })?
  onOpenVaultSpecies;

  @override
  State<GrookaiDexSpeciesScreen> createState() =>
      _GrookaiDexSpeciesScreenState();
}

class _GrookaiDexSpeciesScreenState extends State<GrookaiDexSpeciesScreen> {
  final SupabaseClient _client = Supabase.instance.client;

  bool _loading = true;
  String? _error;
  GrookaiDexSpeciesDetail? _detail;
  _DexSpeciesView _view = _DexSpeciesView.collection;
  String? _setFilter;
  String? _rarityFilter;
  String? _finishFilter;
  _DexCardOwnership _ownershipFilter = _DexCardOwnership.all;
  _DexCardSort _sort = _DexCardSort.setAndNumber;
  _DexCardPresentation _presentation = _DexCardPresentation.list;
  final Map<String, CardWantState> _wantStates = <String, CardWantState>{};
  final Set<String> _busyCardIds = <String>{};
  final CollectionProjectService _projectService = CollectionProjectService();
  bool _projectLoading = false;
  bool _trackingProject = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final detail = await GrookaiDexService.fetchSpeciesDetail(
        client: _client,
        speciesSlug: widget.speciesSlug,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _detail = detail;
        if (detail == null) {
          _error = 'This Pokemon could not be found.';
        }
      });
      if (detail != null) {
        unawaited(_loadProjectState(detail));
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = 'Unable to load this Dex entry.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadProjectState(GrookaiDexSpeciesDetail detail) async {
    if (_client.auth.currentUser == null) {
      if (mounted) {
        setState(() {
          _projectLoading = false;
          _trackingProject = false;
        });
      }
      return;
    }
    setState(() {
      _projectLoading = true;
    });
    try {
      final tracking = await _projectService.isTracking(
        subjectType: CollectionProjectSubjectType.species,
        subjectId: detail.speciesId,
      );
      if (mounted && _detail?.speciesId == detail.speciesId) {
        setState(() {
          _trackingProject = tracking;
        });
      }
    } catch (_) {
      // Project state is optional context and must never block the Dex entry.
    } finally {
      if (mounted && _detail?.speciesId == detail.speciesId) {
        setState(() {
          _projectLoading = false;
        });
      }
    }
  }

  Future<void> _toggleProject() async {
    final detail = _detail;
    if (detail == null || _projectLoading) {
      return;
    }
    if (_client.auth.currentUser == null) {
      _showMessage('Sign in to track private collection projects.');
      return;
    }

    if (_trackingProject) {
      final shouldStop = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Stop tracking this project?'),
          content: Text(
            '${detail.displayName} will leave Collection Projects. '
            'Your Vault and Wall will not change.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Keep tracking'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Stop tracking'),
            ),
          ],
        ),
      );
      if (shouldStop != true || !mounted) {
        return;
      }
    }

    setState(() {
      _projectLoading = true;
    });
    try {
      if (_trackingProject) {
        await _projectService.stopProject(
          subjectType: CollectionProjectSubjectType.species,
          subjectId: detail.speciesId,
        );
      } else {
        await _projectService.startProject(
          subjectType: CollectionProjectSubjectType.species,
          subjectId: detail.speciesId,
        );
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _trackingProject = !_trackingProject;
      });
      _showMessage(
        _trackingProject
            ? 'Tracking ${detail.displayName} privately.'
            : 'Stopped tracking ${detail.displayName}.',
      );
    } catch (_) {
      _showMessage('Unable to update this project right now.');
    } finally {
      if (mounted) {
        setState(() {
          _projectLoading = false;
        });
      }
    }
  }

  List<GrookaiDexCardPrint> _cardsForView(GrookaiDexSpeciesDetail detail) {
    return switch (_view) {
      _DexSpeciesView.owned =>
        detail.completionCards.where((card) => card.isOwned).toList(),
      _DexSpeciesView.missing =>
        detail.completionCards.where((card) => !card.isOwned).toList(),
      _DexSpeciesView.additional => detail.additionalCards,
      _DexSpeciesView.cameos => detail.cameoCards,
      _DexSpeciesView.collection => detail.completionCards,
    };
  }

  List<GrookaiDexCardPrint> _visibleCards(GrookaiDexSpeciesDetail detail) {
    final effectiveOwnership = switch (_view) {
      _DexSpeciesView.owned => _DexCardOwnership.owned,
      _DexSpeciesView.missing => _DexCardOwnership.missing,
      _ => _ownershipFilter,
    };
    final cards = _cardsForView(detail)
        .where((card) {
          final setValue = _cardSetLabel(card);
          if (_setFilter != null && setValue != _setFilter) {
            return false;
          }
          final rarityValue = _cardRarityLabel(card);
          if (!matchesDexFilterValue(rarityValue, _rarityFilter)) {
            return false;
          }
          if (_finishFilter != null &&
              !card.printings.any(
                (printing) =>
                    matchesDexFilterValue(printing.finishName, _finishFilter),
              )) {
            return false;
          }
          return switch (effectiveOwnership) {
            _DexCardOwnership.all => true,
            _DexCardOwnership.owned => card.isOwned,
            _DexCardOwnership.missing => !card.isOwned,
          };
        })
        .toList(growable: false);

    if (cards.length > 1) {
      cards.sort((left, right) {
        final result = switch (_sort) {
          _DexCardSort.setAndNumber => _compareSetAndNumber(left, right),
          _DexCardSort.name => left.name.toLowerCase().compareTo(
            right.name.toLowerCase(),
          ),
          _DexCardSort.rarity => _cardRarityLabel(
            left,
          ).toLowerCase().compareTo(_cardRarityLabel(right).toLowerCase()),
          _DexCardSort.ownedHigh => right.ownedCount.compareTo(left.ownedCount),
          _DexCardSort.missingFirst =>
            left.isOwned == right.isOwned
                ? 0
                : left.isOwned
                ? 1
                : -1,
        };
        return result == 0
            ? left.name.toLowerCase().compareTo(right.name.toLowerCase())
            : result;
      });
    }
    return cards;
  }

  bool get _hasCardFilters =>
      _setFilter != null ||
      _rarityFilter != null ||
      _finishFilter != null ||
      _ownershipFilter != _DexCardOwnership.all;

  void _clearCardFilters() {
    setState(() {
      _setFilter = null;
      _rarityFilter = null;
      _finishFilter = null;
      _ownershipFilter = _DexCardOwnership.all;
    });
  }

  Future<void> _openCard(GrookaiDexCardPrint card) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => CardDetailScreen(
          cardPrintId: card.cardPrintId,
          gvId: card.gvId,
          name: card.name,
          setCode: card.setCode,
          setName: card.setName,
          number: card.number,
          rarity: card.rarity,
          imageUrl: card.hostedImageUrl,
          fallbackImageUrl: card.providerFallbackImageUrl,
        ),
      ),
    );
  }

  Future<void> _manageCard(GrookaiDexCardPrint card) async {
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VaultManageCardScreen(
          cardPrintId: card.cardPrintId,
          ownedCount: card.ownedCount,
          gvId: card.gvId,
          name: card.name,
          setName: card.setName,
          number: card.number,
          imageUrl: card.hostedImageUrl ?? card.providerFallbackImageUrl,
        ),
      ),
    );
    if (mounted) {
      await _load();
    }
  }

  Future<void> _addCard(GrookaiDexCardPrint card) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      _showMessage('Sign in to add cards to your Vault.');
      return;
    }
    if (_busyCardIds.contains(card.cardPrintId)) {
      return;
    }

    GrookaiDexPrintingOption? selectedPrinting;
    if (card.printings.length > 1) {
      selectedPrinting = await showModalBottomSheet<GrookaiDexPrintingOption>(
        context: context,
        showDragHandle: true,
        builder: (sheetContext) => SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Choose the exact finish',
                  style: Theme.of(
                    sheetContext,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(
                  '${card.name} has ${card.printings.length} collectible options. Your Vault copy will keep the finish you choose.',
                ),
                const SizedBox(height: 12),
                Flexible(
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final printing in card.printings)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.layers_outlined),
                          title: Text(printing.finishName),
                          subtitle: printing.ownedCount > 0
                              ? Text('${printing.ownedCount} already owned')
                              : null,
                          onTap: () => Navigator.of(sheetContext).pop(printing),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      );
      if (selectedPrinting == null) {
        return;
      }
    } else if (card.printings.length == 1) {
      selectedPrinting = card.printings.single;
    }

    setState(() => _busyCardIds.add(card.cardPrintId));
    try {
      await VaultCardService.addOrIncrementVaultItem(
        client: _client,
        userId: userId,
        cardId: card.cardPrintId,
        conditionLabel: 'NM',
        fallbackName: card.name,
        fallbackSetName: card.setName,
        fallbackImageUrl: card.hostedImageUrl ?? card.providerFallbackImageUrl,
        cardPrintingId: selectedPrinting?.id,
      );
      if (!mounted) {
        return;
      }
      _showMessage(
        selectedPrinting == null
            ? 'Added ${card.name} to your Vault.'
            : 'Added ${card.name} · ${selectedPrinting.finishName}.',
      );
      await _load();
    } catch (error) {
      if (mounted) {
        _showMessage(error.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) {
        setState(() => _busyCardIds.remove(card.cardPrintId));
      }
    }
  }

  Future<CardWantState> _loadWantState(GrookaiDexCardPrint card) async {
    final cached = _wantStates[card.cardPrintId];
    if (cached != null) {
      return cached;
    }
    try {
      final state = await CardEngagementService.loadWantState(
        client: _client,
        cardPrintId: card.cardPrintId,
      );
      _wantStates[card.cardPrintId] = state;
      return state;
    } catch (_) {
      return const CardWantState();
    }
  }

  Future<void> _toggleWant(GrookaiDexCardPrint card) async {
    if (_client.auth.currentUser == null) {
      _showMessage('Sign in to save wanted cards.');
      return;
    }
    if (_busyCardIds.contains(card.cardPrintId)) {
      return;
    }

    setState(() => _busyCardIds.add(card.cardPrintId));
    try {
      final current = await _loadWantState(card);
      final next = await CardEngagementService.setWant(
        client: _client,
        cardPrintId: card.cardPrintId,
        want: !current.want,
        surface: 'grookai_dex',
        metadata: <String, dynamic>{
          if ((card.gvId ?? '').trim().isNotEmpty) 'gv_id': card.gvId,
          'species_slug': widget.speciesSlug,
        },
      );
      _wantStates[card.cardPrintId] = next;
      if (mounted) {
        _showMessage(
          next.want ? 'Saved to wanted cards.' : 'Removed from wanted cards.',
        );
      }
    } catch (error) {
      if (mounted) {
        _showMessage(error.toString().replaceFirst('Exception: ', ''));
      }
    } finally {
      if (mounted) {
        setState(() => _busyCardIds.remove(card.cardPrintId));
      }
    }
  }

  Future<void> _compareCard(GrookaiDexCardPrint card) async {
    final gvId = normalizeCompareCardId(card.gvId ?? '');
    if (gvId.isEmpty) {
      _showMessage('This card is missing a public GV-ID for compare.');
      return;
    }
    final controller = CompareCardSelectionController.instance;
    if (!controller.contains(gvId) &&
        controller.selectedIds.length >= kMaxCompareCards) {
      _showMessage('Compare supports up to $kMaxCompareCards cards.');
      return;
    }
    controller.toggle(gvId);
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const CompareScreen()));
  }

  Future<void> _shareCard(GrookaiDexCardPrint card) async {
    final gvId = (card.gvId ?? '').trim();
    if (gvId.isEmpty) {
      _showMessage('Unable to share this card right now.');
      return;
    }
    try {
      await SharePlus.instance.share(
        ShareParams(
          uri: GrookaiWebRouteService.buildUri(
            '/card/${Uri.encodeComponent(gvId)}',
          ),
          subject: card.name,
        ),
      );
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to share this card right now.');
      }
    }
  }

  Future<void> _showCardActions(GrookaiDexCardPrint card) async {
    final wantState = await _loadWantState(card);
    if (!mounted) {
      return;
    }
    final compareSelected = CompareCardSelectionController.instance.contains(
      card.gvId,
    );
    await showVaultQuickActionSheet(
      context: context,
      title: card.name,
      subtitle: [
        card.setName ?? card.setCode,
        if ((card.number ?? '').trim().isNotEmpty) '#${card.number}',
      ].whereType<String>().join(' · '),
      actions: [
        VaultQuickAction(
          icon: Icons.open_in_new_rounded,
          label: 'View card',
          onPressed: () => unawaited(_openCard(card)),
        ),
        VaultQuickAction(
          icon: card.isOwned
              ? Icons.inventory_2_outlined
              : Icons.add_circle_outline_rounded,
          label: card.isOwned ? 'Manage Vault copies' : 'Add to Vault',
          onPressed: () =>
              unawaited(card.isOwned ? _manageCard(card) : _addCard(card)),
        ),
        VaultQuickAction(
          icon: wantState.want
              ? Icons.bookmark_remove_outlined
              : Icons.bookmark_add_outlined,
          label: wantState.want ? 'Remove Want' : 'Want this card',
          onPressed: () => unawaited(_toggleWant(card)),
        ),
        VaultQuickAction(
          icon: compareSelected
              ? Icons.compare_arrows_rounded
              : Icons.compare_outlined,
          label: compareSelected ? 'Remove from Compare' : 'Compare',
          onPressed: () => unawaited(_compareCard(card)),
        ),
        VaultQuickAction(
          icon: Icons.document_scanner_outlined,
          label: 'Scan a card',
          onPressed: widget.onOpenScanner == null
              ? null
              : () => unawaited(widget.onOpenScanner!()),
        ),
        VaultQuickAction(
          icon: Icons.share_outlined,
          label: 'Share',
          onPressed: (card.gvId ?? '').trim().isEmpty
              ? null
              : () => unawaited(_shareCard(card)),
        ),
      ],
    );
  }

  void _showMessage(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _shareSpecies() async {
    final detail = _detail;
    if (detail == null) {
      return;
    }
    try {
      await SharePlus.instance.share(
        ShareParams(
          uri: GrookaiWebRouteService.buildUri(
            '/dex/${Uri.encodeComponent(detail.slug)}',
          ),
          subject: '${detail.displayName} Dex progress',
        ),
      );
    } catch (_) {
      if (mounted) {
        _showMessage('Unable to share this Dex entry right now.');
      }
    }
  }

  Future<void> _openVaultSpecies() async {
    final detail = _detail;
    final callback = widget.onOpenVaultSpecies;
    if (detail == null || callback == null) {
      return;
    }
    await callback(speciesSlug: detail.slug, displayName: detail.displayName);
  }

  Future<void> _openWallShowcase() async {
    final detail = _detail;
    if (detail == null) {
      return;
    }
    if (_client.auth.currentUser == null) {
      _showMessage('Sign in to curate an exact-copy Wall showcase.');
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DexWallShowcaseScreen(
          speciesSlug: detail.slug,
          displayName: detail.displayName,
          canonicalCardPrintIds: detail.cards
              .map((card) => card.cardPrintId)
              .where((id) => id.trim().isNotEmpty)
              .toSet(),
          onOpenSharingSettings: () async {
            await Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const AccountScreen()),
            );
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    final title =
        detail?.displayName ?? widget.initialDisplayName ?? 'Grookai Dex';
    final visibleCards = detail == null
        ? const <GrookaiDexCardPrint>[]
        : _visibleCards(detail);
    final viewCards = detail == null
        ? const <GrookaiDexCardPrint>[]
        : _cardsForView(detail);
    final setOptions = viewCards.map(_cardSetLabel).toSet().toList()
      ..sort(
        (left, right) => left.toLowerCase().compareTo(right.toLowerCase()),
      );
    final rarityOptions = buildDexFilterOptions(
      viewCards.map(_cardRarityLabel),
    );
    final finishOptions = buildDexFilterOptions(
      viewCards
          .expand((card) => card.printings)
          .map((printing) => printing.finishName),
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        actions: [
          IconButton(
            tooltip: _client.auth.currentUser == null
                ? 'Sign in to track project'
                : _trackingProject
                ? 'Stop tracking project'
                : 'Track private project',
            onPressed: _loading || detail == null || _projectLoading
                ? null
                : _toggleProject,
            icon: _projectLoading
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(
                    _trackingProject ? Icons.flag_rounded : Icons.flag_outlined,
                  ),
          ),
          IconButton(
            tooltip: 'View exact species in Vault',
            onPressed: _loading || widget.onOpenVaultSpecies == null
                ? null
                : _openVaultSpecies,
            icon: const Icon(Icons.inventory_2_outlined),
          ),
          PopupMenuButton<_DexSpeciesMenuAction>(
            tooltip: 'Species actions',
            enabled: !_loading && detail != null,
            onSelected: (action) {
              switch (action) {
                case _DexSpeciesMenuAction.wallShowcase:
                  unawaited(_openWallShowcase());
                  break;
                case _DexSpeciesMenuAction.share:
                  unawaited(_shareSpecies());
                  break;
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(
                value: _DexSpeciesMenuAction.wallShowcase,
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.wallpaper_outlined),
                  title: Text('Curate Wall showcase'),
                ),
              ),
              PopupMenuItem(
                value: _DexSpeciesMenuAction.share,
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: Icon(Icons.share_outlined),
                  title: Text('Share species'),
                ),
              ),
            ],
          ),
          IconButton(
            tooltip: 'Reload',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                sliver: SliverToBoxAdapter(
                  child: _loading
                      ? const Padding(
                          padding: EdgeInsets.symmetric(vertical: 44),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : _error != null
                      ? _DexDetailSurfaceCard(
                          child: _DexDetailEmptyState(
                            title: 'Unable to load',
                            body: _error!,
                          ),
                        )
                      : detail == null
                      ? const SizedBox.shrink()
                      : Column(
                          children: [
                            _DexSpeciesHeader(detail: detail),
                            const SizedBox(height: 12),
                            _DexSpeciesViewPicker(
                              value: _view,
                              detail: detail,
                              onChanged: (value) => setState(() {
                                _view = value;
                                _setFilter = null;
                                _rarityFilter = null;
                                _finishFilter = null;
                                _ownershipFilter = _DexCardOwnership.all;
                              }),
                            ),
                            const SizedBox(height: 12),
                            _DexCardBrowseControls(
                              sets: setOptions,
                              rarities: rarityOptions,
                              finishes: finishOptions,
                              setValue: _setFilter,
                              rarity: _rarityFilter,
                              finish: _finishFilter,
                              ownership: switch (_view) {
                                _DexSpeciesView.owned =>
                                  _DexCardOwnership.owned,
                                _DexSpeciesView.missing =>
                                  _DexCardOwnership.missing,
                                _ => _ownershipFilter,
                              },
                              ownershipLocked:
                                  _view == _DexSpeciesView.owned ||
                                  _view == _DexSpeciesView.missing,
                              sort: _sort,
                              presentation: _presentation,
                              resultCount: visibleCards.length,
                              hasFilters: _hasCardFilters,
                              onSetChanged: (value) => setState(() {
                                _setFilter = value;
                              }),
                              onRarityChanged: (value) => setState(() {
                                _rarityFilter = value;
                              }),
                              onFinishChanged: (value) => setState(() {
                                _finishFilter = value;
                              }),
                              onOwnershipChanged: (value) => setState(() {
                                _ownershipFilter = value;
                              }),
                              onSortChanged: (value) => setState(() {
                                _sort = value;
                              }),
                              onPresentationChanged: (value) => setState(() {
                                _presentation = value;
                              }),
                              onClearFilters: _clearCardFilters,
                            ),
                            const SizedBox(height: 12),
                            if (visibleCards.isEmpty)
                              const _DexDetailSurfaceCard(
                                child: _DexDetailEmptyState(
                                  title: 'No cards here',
                                  body: 'This view has no mapped cards.',
                                ),
                              ),
                          ],
                        ),
                ),
              ),
              if (!_loading &&
                  _error == null &&
                  detail != null &&
                  visibleCards.isNotEmpty &&
                  _presentation == _DexCardPresentation.list)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  sliver: SliverList.builder(
                    itemCount: visibleCards.length,
                    itemBuilder: (context, index) {
                      final card = visibleCards[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _DexCardTile(
                          card: card,
                          onTap: () => _openCard(card),
                          onLongPress: () => _showCardActions(card),
                          primaryActionLabel:
                              _busyCardIds.contains(card.cardPrintId)
                              ? 'Working'
                              : card.isOwned
                              ? 'Manage'
                              : 'Add',
                          onPrimaryAction:
                              _busyCardIds.contains(card.cardPrintId)
                              ? null
                              : () => unawaited(
                                  card.isOwned
                                      ? _manageCard(card)
                                      : _addCard(card),
                                ),
                          onManagePrinting: card.needsPrintingSelection
                              ? () => _manageCard(card)
                              : null,
                        ),
                      );
                    },
                  ),
                ),
              if (!_loading &&
                  _error == null &&
                  detail != null &&
                  visibleCards.isNotEmpty &&
                  _presentation == _DexCardPresentation.grid)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  sliver: SliverGrid.builder(
                    gridDelegate:
                        const SliverGridDelegateWithMaxCrossAxisExtent(
                          maxCrossAxisExtent: 240,
                          mainAxisExtent: 392,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                    itemCount: visibleCards.length,
                    itemBuilder: (context, index) {
                      final card = visibleCards[index];
                      return _DexCardGridTile(
                        card: card,
                        onTap: () => _openCard(card),
                        onLongPress: () => _showCardActions(card),
                        primaryActionLabel:
                            _busyCardIds.contains(card.cardPrintId)
                            ? 'Working'
                            : card.isOwned
                            ? 'Manage'
                            : 'Add',
                        onPrimaryAction: _busyCardIds.contains(card.cardPrintId)
                            ? null
                            : () => unawaited(
                                card.isOwned
                                    ? _manageCard(card)
                                    : _addCard(card),
                              ),
                      );
                    },
                  ),
                ),
              if (!_loading &&
                  _error == null &&
                  detail != null &&
                  visibleCards.isNotEmpty &&
                  _presentation == _DexCardPresentation.compact)
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  sliver: SliverList.builder(
                    itemCount: visibleCards.length,
                    itemBuilder: (context, index) {
                      final card = visibleCards[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: _DexCardCompactTile(
                          card: card,
                          onTap: () => _openCard(card),
                          onLongPress: () => _showCardActions(card),
                          onPrimaryAction:
                              _busyCardIds.contains(card.cardPrintId)
                              ? null
                              : () => unawaited(
                                  card.isOwned
                                      ? _manageCard(card)
                                      : _addCard(card),
                                ),
                        ),
                      );
                    },
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 28)),
            ],
          ),
        ),
      ),
    );
  }
}

extension on _DexCardOwnership {
  String get label => switch (this) {
    _DexCardOwnership.all => 'All ownership',
    _DexCardOwnership.owned => 'Owned',
    _DexCardOwnership.missing => 'Missing',
  };
}

extension on _DexCardSort {
  String get label => switch (this) {
    _DexCardSort.setAndNumber => 'Set and number',
    _DexCardSort.name => 'Card name',
    _DexCardSort.rarity => 'Rarity',
    _DexCardSort.ownedHigh => 'Most copies',
    _DexCardSort.missingFirst => 'Missing first',
  };
}

class _DexCardBrowseControls extends StatelessWidget {
  const _DexCardBrowseControls({
    required this.sets,
    required this.rarities,
    required this.finishes,
    required this.setValue,
    required this.rarity,
    required this.finish,
    required this.ownership,
    required this.ownershipLocked,
    required this.sort,
    required this.presentation,
    required this.resultCount,
    required this.hasFilters,
    required this.onSetChanged,
    required this.onRarityChanged,
    required this.onFinishChanged,
    required this.onOwnershipChanged,
    required this.onSortChanged,
    required this.onPresentationChanged,
    required this.onClearFilters,
  });

  static const String _allValue = '__all__';

  final List<String> sets;
  final List<String> rarities;
  final List<String> finishes;
  final String? setValue;
  final String? rarity;
  final String? finish;
  final _DexCardOwnership ownership;
  final bool ownershipLocked;
  final _DexCardSort sort;
  final _DexCardPresentation presentation;
  final int resultCount;
  final bool hasFilters;
  final ValueChanged<String?> onSetChanged;
  final ValueChanged<String?> onRarityChanged;
  final ValueChanged<String?> onFinishChanged;
  final ValueChanged<_DexCardOwnership> onOwnershipChanged;
  final ValueChanged<_DexCardSort> onSortChanged;
  final ValueChanged<_DexCardPresentation> onPresentationChanged;
  final VoidCallback onClearFilters;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return _DexDetailSurfaceCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Refine cards',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      '$resultCount ${resultCount == 1 ? 'card' : 'cards'} shown',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              if (hasFilters)
                TextButton.icon(
                  onPressed: onClearFilters,
                  icon: const Icon(Icons.filter_alt_off_outlined, size: 18),
                  label: const Text('Clear'),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              PopupMenuButton<String>(
                tooltip: 'Filter by set',
                initialValue: setValue ?? _allValue,
                onSelected: (value) =>
                    onSetChanged(value == _allValue ? null : value),
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: _allValue,
                    child: Text('All sets'),
                  ),
                  for (final value in sets)
                    PopupMenuItem(value: value, child: Text(value)),
                ],
                child: _DexCardControlChip(
                  icon: Icons.collections_bookmark_outlined,
                  label: setValue ?? 'All sets',
                  active: setValue != null,
                ),
              ),
              PopupMenuButton<String>(
                tooltip: 'Filter by rarity',
                initialValue: rarity ?? _allValue,
                onSelected: (value) =>
                    onRarityChanged(value == _allValue ? null : value),
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: _allValue,
                    child: Text('All rarities'),
                  ),
                  for (final value in rarities)
                    PopupMenuItem(value: value, child: Text(value)),
                ],
                child: _DexCardControlChip(
                  icon: Icons.diamond_outlined,
                  label: rarity ?? 'All rarities',
                  active: rarity != null,
                ),
              ),
              PopupMenuButton<String>(
                tooltip: 'Filter by finish',
                initialValue: finish ?? _allValue,
                onSelected: (value) =>
                    onFinishChanged(value == _allValue ? null : value),
                itemBuilder: (_) => [
                  const PopupMenuItem(
                    value: _allValue,
                    child: Text('All finishes'),
                  ),
                  for (final value in finishes)
                    PopupMenuItem(value: value, child: Text(value)),
                ],
                child: _DexCardControlChip(
                  icon: Icons.layers_outlined,
                  label: finish ?? 'All finishes',
                  active: finish != null,
                ),
              ),
              PopupMenuButton<_DexCardOwnership>(
                tooltip: ownershipLocked
                    ? 'Ownership is set by this view'
                    : 'Filter by ownership',
                enabled: !ownershipLocked,
                initialValue: ownership,
                onSelected: onOwnershipChanged,
                itemBuilder: (_) => [
                  for (final value in _DexCardOwnership.values)
                    PopupMenuItem(value: value, child: Text(value.label)),
                ],
                child: _DexCardControlChip(
                  icon: Icons.inventory_2_outlined,
                  label: ownership.label,
                  active:
                      !ownershipLocked && ownership != _DexCardOwnership.all,
                ),
              ),
              PopupMenuButton<_DexCardSort>(
                tooltip: 'Sort cards',
                initialValue: sort,
                onSelected: onSortChanged,
                itemBuilder: (_) => [
                  for (final value in _DexCardSort.values)
                    PopupMenuItem(value: value, child: Text(value.label)),
                ],
                child: _DexCardControlChip(
                  icon: Icons.sort_rounded,
                  label: sort.label,
                  active: sort != _DexCardSort.setAndNumber,
                ),
              ),
              _DexCardPresentationPicker(
                value: presentation,
                onChanged: onPresentationChanged,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DexCardControlChip extends StatelessWidget {
  const _DexCardControlChip({
    required this.icon,
    required this.label,
    required this.active,
  });

  final IconData icon;
  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 220),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: active
              ? colorScheme.primaryContainer.withValues(alpha: 0.72)
              : colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: active
                ? colorScheme.primary.withValues(alpha: 0.22)
                : colorScheme.outline.withValues(alpha: 0.09),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 17),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(width: 3),
              const Icon(Icons.arrow_drop_down_rounded, size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _DexCardPresentationPicker extends StatelessWidget {
  const _DexCardPresentationPicker({
    required this.value,
    required this.onChanged,
  });

  final _DexCardPresentation value;
  final ValueChanged<_DexCardPresentation> onChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.09)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _DexCardPresentationButton(
            tooltip: 'Detailed list',
            icon: Icons.view_agenda_outlined,
            selected: value == _DexCardPresentation.list,
            onPressed: () => onChanged(_DexCardPresentation.list),
          ),
          _DexCardPresentationButton(
            tooltip: 'Grid',
            icon: Icons.grid_view_rounded,
            selected: value == _DexCardPresentation.grid,
            onPressed: () => onChanged(_DexCardPresentation.grid),
          ),
          _DexCardPresentationButton(
            tooltip: 'Compact list',
            icon: Icons.view_list_rounded,
            selected: value == _DexCardPresentation.compact,
            onPressed: () => onChanged(_DexCardPresentation.compact),
          ),
        ],
      ),
    );
  }
}

class _DexCardPresentationButton extends StatelessWidget {
  const _DexCardPresentationButton({
    required this.tooltip,
    required this.icon,
    required this.selected,
    required this.onPressed,
  });

  final String tooltip;
  final IconData icon;
  final bool selected;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return IconButton(
      tooltip: tooltip,
      visualDensity: VisualDensity.compact,
      onPressed: onPressed,
      icon: Icon(icon, size: 19),
      color: selected ? colorScheme.onPrimaryContainer : null,
      style: IconButton.styleFrom(
        backgroundColor: selected
            ? colorScheme.primaryContainer.withValues(alpha: 0.78)
            : Colors.transparent,
      ),
    );
  }
}

class _DexSpeciesHeader extends StatelessWidget {
  const _DexSpeciesHeader({required this.detail});

  final GrookaiDexSpeciesDetail detail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final optionPercent = detail.variantOptionCount <= 0
        ? 0
        : ((detail.ownedVariantOptionCount / detail.variantOptionCount) * 100)
              .round()
              .clamp(0, 100);

    return _DexDetailSurfaceCard(
      emphasize: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _DexSpeciesSprite(
                nationalDexNumber: detail.nationalDexNumber,
                label: detail.displayName,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _DexDetailPill(
                      label:
                          '#${detail.nationalDexNumber.toString().padLeft(4, '0')} Species Dex',
                    ),
                    const SizedBox(height: 10),
                    Text(
                      detail.displayName,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0,
                        height: 0.98,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${detail.ownedPrintCount} / ${detail.totalPrintCount} printings · ${detail.ownedCopyCount} ${detail.ownedCopyCount == 1 ? 'copy' : 'copies'}',
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.72),
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          _DexProgressBar(
            label: 'Card Prints',
            value: detail.completionPercent,
            caption:
                '${detail.totalPrintCount} known • ${detail.ownedPrintCount} owned • ${(detail.totalPrintCount - detail.ownedPrintCount).clamp(0, detail.totalPrintCount)} missing',
          ),
          const SizedBox(height: 14),
          _DexProgressBar(
            label: 'Master Set Options',
            value: optionPercent,
            caption:
                '${detail.ownedVariantOptionCount}/${detail.variantOptionCount} finish and parallel options',
          ),
        ],
      ),
    );
  }
}

class _DexSpeciesSprite extends StatelessWidget {
  const _DexSpeciesSprite({
    required this.nationalDexNumber,
    required this.label,
  });

  final int nationalDexNumber;
  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final url = pokemonSpriteUrl(nationalDexNumber);

    return Container(
      width: 96,
      height: 96,
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withValues(alpha: 0.07),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: url == null
          ? Icon(
              Icons.catching_pokemon_rounded,
              color: colorScheme.onSurface.withValues(alpha: 0.36),
            )
          : Padding(
              padding: const EdgeInsets.all(9),
              child: Image.network(
                url,
                fit: BoxFit.contain,
                cacheWidth: 320,
                filterQuality: FilterQuality.none,
                errorBuilder: (context, error, stackTrace) => Center(
                  child: Text(
                    label.isEmpty ? '?' : label.substring(0, 1),
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}

class _DexDetailPill extends StatelessWidget {
  const _DexDetailPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.64),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.68),
            fontWeight: FontWeight.w900,
            letterSpacing: 1.1,
          ),
        ),
      ),
    );
  }
}

class _DexProgressBar extends StatelessWidget {
  const _DexProgressBar({
    required this.label,
    required this.value,
    required this.caption,
  });

  final String label;
  final int value;
  final String caption;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            Text(
              '$value%',
              style: theme.textTheme.labelLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            minHeight: 7,
            value: value / 100,
            backgroundColor: colorScheme.surfaceContainerHighest.withValues(
              alpha: 0.72,
            ),
          ),
        ),
        const SizedBox(height: 5),
        Text(
          caption,
          style: theme.textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.62),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

class _DexSpeciesViewPicker extends StatelessWidget {
  const _DexSpeciesViewPicker({
    required this.value,
    required this.detail,
    required this.onChanged,
  });

  final _DexSpeciesView value;
  final GrookaiDexSpeciesDetail detail;
  final ValueChanged<_DexSpeciesView> onChanged;

  @override
  Widget build(BuildContext context) {
    final ownedCount = detail.completionCards
        .where((card) => card.isOwned)
        .length;
    final missingCount = detail.completionCards
        .where((card) => !card.isOwned)
        .length;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _DexViewChip(
            label: 'Collection ${detail.completionCards.length}',
            selected: value == _DexSpeciesView.collection,
            onTap: () => onChanged(_DexSpeciesView.collection),
          ),
          const SizedBox(width: 8),
          _DexViewChip(
            label: 'Owned $ownedCount',
            selected: value == _DexSpeciesView.owned,
            onTap: () => onChanged(_DexSpeciesView.owned),
          ),
          const SizedBox(width: 8),
          _DexViewChip(
            label: 'Missing $missingCount',
            selected: value == _DexSpeciesView.missing,
            onTap: () => onChanged(_DexSpeciesView.missing),
          ),
          if (detail.additionalCards.isNotEmpty) ...[
            const SizedBox(width: 8),
            _DexViewChip(
              label: 'Additional ${detail.additionalCards.length}',
              selected: value == _DexSpeciesView.additional,
              onTap: () => onChanged(_DexSpeciesView.additional),
            ),
          ],
          if (detail.cameoCards.isNotEmpty) ...[
            const SizedBox(width: 8),
            _DexViewChip(
              label: 'Cameos ${detail.cameoCards.length}',
              selected: value == _DexSpeciesView.cameos,
              onTap: () => onChanged(_DexSpeciesView.cameos),
            ),
          ],
        ],
      ),
    );
  }
}

class _DexViewChip extends StatelessWidget {
  const _DexViewChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _DexCardTile extends StatelessWidget {
  const _DexCardTile({
    required this.card,
    required this.onTap,
    required this.primaryActionLabel,
    required this.onPrimaryAction,
    required this.onLongPress,
    this.onManagePrinting,
  });

  final GrookaiDexCardPrint card;
  final VoidCallback onTap;
  final String primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final VoidCallback onLongPress;
  final VoidCallback? onManagePrinting;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final identity = resolveDisplayIdentityFromFields(
      name: card.name,
      variantKey: card.variantKey,
      printedIdentityModifier: card.printedIdentityModifier,
    );
    final imagePresentation = resolveImagePresentationFromFields(
      imageUrl: card.exactImageUrl,
      representativeImageUrl: card.representativeImageUrl,
      displayImageUrl: card.imageUrl,
      imageStatus: card.imageStatus,
      imageNote: card.imageNote,
    );
    final meta = [
      card.setName ?? card.setCode,
      if ((card.number ?? '').isNotEmpty) '#${card.number}',
      card.rarity,
    ].whereType<String>().where((value) => value.trim().isNotEmpty).join(' • ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        onLongPress: onLongPress,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.82),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.09),
            ),
          ),
          padding: const EdgeInsets.all(10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardSurfaceArtwork(
                label: identity.displayName,
                imageUrl: card.hostedImageUrl,
                fallbackImageUrl: card.providerFallbackImageUrl,
                width: 78,
                height: 108,
                borderRadius: 16,
                padding: const EdgeInsets.all(1.5),
                filterQuality: FilterQuality.medium,
                imageTruthLabel: imagePresentation.compactBadgeLabel,
                imageTruthStrong: imagePresentation.isCollisionRepresentative,
                onViewDetails: onTap,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            identity.baseName,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              height: 1.08,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _OwnedPrintBadge(card: card),
                      ],
                    ),
                    if (identity.suffix != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        identity.suffix!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      meta,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.62),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 9),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        _DexOptionChip(
                          label:
                              '${card.ownedOptionCount}/${card.totalOptionCount} options',
                          owned: card.missingOptionCount == 0,
                        ),
                        if (card.missingOptionCount > 0)
                          _DexOptionChip(
                            label: '${card.missingOptionCount} missing',
                            owned: false,
                          ),
                      ],
                    ),
                    if (card.printings.isNotEmpty) ...[
                      const SizedBox(height: 9),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: [
                          for (final printing in card.printings.take(5))
                            _DexOptionChip(
                              label: printing.ownedCount > 0
                                  ? '${printing.finishName} ${printing.ownedCount}x'
                                  : printing.finishName,
                              owned: printing.ownedCount > 0,
                            ),
                          if (card.printings.length > 5)
                            _DexOptionChip(
                              label: '+${card.printings.length - 5}',
                              owned: false,
                            ),
                        ],
                      ),
                    ],
                    if (card.needsPrintingSelection) ...[
                      const SizedBox(height: 10),
                      Material(
                        color: colorScheme.errorContainer.withValues(
                          alpha: 0.72,
                        ),
                        borderRadius: BorderRadius.circular(12),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: onManagePrinting,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 9,
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.tune_rounded,
                                  size: 17,
                                  color: colorScheme.onErrorContainer,
                                ),
                                const SizedBox(width: 7),
                                Expanded(
                                  child: Text(
                                    '${card.unassignedPrintingCount} owned ${card.unassignedPrintingCount == 1 ? 'copy needs' : 'copies need'} a finish',
                                    style: theme.textTheme.labelMedium
                                        ?.copyWith(
                                          color: colorScheme.onErrorContainer,
                                          fontWeight: FontWeight.w800,
                                        ),
                                  ),
                                ),
                                Icon(
                                  Icons.chevron_right_rounded,
                                  color: colorScheme.onErrorContainer,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.tonalIcon(
                        onPressed: onPrimaryAction,
                        icon: Icon(
                          card.isOwned
                              ? Icons.inventory_2_outlined
                              : Icons.add_circle_outline_rounded,
                          size: 18,
                        ),
                        label: Text(primaryActionLabel),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DexCardGridTile extends StatelessWidget {
  const _DexCardGridTile({
    required this.card,
    required this.onTap,
    required this.onLongPress,
    required this.primaryActionLabel,
    required this.onPrimaryAction,
  });

  final GrookaiDexCardPrint card;
  final VoidCallback onTap;
  final VoidCallback onLongPress;
  final String primaryActionLabel;
  final VoidCallback? onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final identity = resolveDisplayIdentityFromFields(
      name: card.name,
      variantKey: card.variantKey,
      printedIdentityModifier: card.printedIdentityModifier,
    );
    final imagePresentation = resolveImagePresentationFromFields(
      imageUrl: card.exactImageUrl,
      representativeImageUrl: card.representativeImageUrl,
      displayImageUrl: card.imageUrl,
      imageStatus: card.imageStatus,
      imageNote: card.imageNote,
    );
    final meta = <String>[
      _cardSetLabel(card),
      if ((card.number ?? '').trim().isNotEmpty) '#${card.number}',
      _cardRarityLabel(card),
    ].join(' · ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        onLongPress: onLongPress,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.84),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.09),
            ),
          ),
          padding: const EdgeInsets.all(9),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CardSurfaceArtwork(
                label: identity.displayName,
                imageUrl: card.hostedImageUrl,
                fallbackImageUrl: card.providerFallbackImageUrl,
                width: double.infinity,
                height: 220,
                borderRadius: 14,
                filterQuality: FilterQuality.medium,
                imageTruthLabel: imagePresentation.compactBadgeLabel,
                imageTruthStrong: imagePresentation.isCollisionRepresentative,
                onViewDetails: onTap,
              ),
              const SizedBox(height: 9),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      identity.displayName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                        height: 1.08,
                      ),
                    ),
                  ),
                  const SizedBox(width: 5),
                  _OwnedPrintBadge(card: card),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                meta,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.60),
                ),
              ),
              if (card.needsPrintingSelection) ...[
                const SizedBox(height: 4),
                Text(
                  '${card.unassignedPrintingCount} need a finish',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colorScheme.error,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                child: FilledButton.tonal(
                  onPressed: onPrimaryAction,
                  child: Text(primaryActionLabel),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DexCardCompactTile extends StatelessWidget {
  const _DexCardCompactTile({
    required this.card,
    required this.onTap,
    required this.onLongPress,
    required this.onPrimaryAction,
  });

  final GrookaiDexCardPrint card;
  final VoidCallback onTap;
  final VoidCallback onLongPress;
  final VoidCallback? onPrimaryAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final identity = resolveDisplayIdentityFromFields(
      name: card.name,
      variantKey: card.variantKey,
      printedIdentityModifier: card.printedIdentityModifier,
    );
    final imagePresentation = resolveImagePresentationFromFields(
      imageUrl: card.exactImageUrl,
      representativeImageUrl: card.representativeImageUrl,
      displayImageUrl: card.imageUrl,
      imageStatus: card.imageStatus,
      imageNote: card.imageNote,
    );
    final meta = <String>[
      _cardSetLabel(card),
      if ((card.number ?? '').trim().isNotEmpty) '#${card.number}',
      _cardRarityLabel(card),
    ].join(' · ');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        onLongPress: onLongPress,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.surface.withValues(alpha: 0.84),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.09),
            ),
          ),
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              CardSurfaceArtwork(
                label: identity.displayName,
                imageUrl: card.hostedImageUrl,
                fallbackImageUrl: card.providerFallbackImageUrl,
                width: 54,
                height: 76,
                borderRadius: 11,
                showShadow: false,
                filterQuality: FilterQuality.medium,
                imageTruthLabel: imagePresentation.compactBadgeLabel,
                imageTruthStrong: imagePresentation.isCollisionRepresentative,
                onViewDetails: onTap,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      identity.displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      meta,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.58),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        _OwnedPrintBadge(card: card),
                        if (card.needsPrintingSelection)
                          Text(
                            '${card.unassignedPrintingCount} need finish',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colorScheme.error,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              IconButton(
                tooltip: card.isOwned ? 'Manage Vault copies' : 'Add to Vault',
                onPressed: onPrimaryAction,
                icon: Icon(
                  card.isOwned
                      ? Icons.inventory_2_outlined
                      : Icons.add_circle_outline_rounded,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OwnedPrintBadge extends StatelessWidget {
  const _OwnedPrintBadge({required this.card});

  final GrookaiDexCardPrint card;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final owned = card.isOwned;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: owned
            ? Colors.green.withValues(alpha: 0.12)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Text(
          owned ? '${card.ownedCount} owned' : 'Missing',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: owned ? Colors.green.shade800 : colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _DexOptionChip extends StatelessWidget {
  const _DexOptionChip({required this.label, required this.owned});

  final String label;
  final bool owned;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: owned
            ? Colors.green.withValues(alpha: 0.10)
            : colorScheme.surfaceContainerHighest.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: owned
              ? Colors.green.withValues(alpha: 0.24)
              : colorScheme.outline.withValues(alpha: 0.09),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: owned ? Colors.green.shade800 : colorScheme.onSurfaceVariant,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _DexDetailSurfaceCard extends StatelessWidget {
  const _DexDetailSurfaceCard({required this.child, this.emphasize = false});

  final Widget child;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: emphasize
            ? colorScheme.primaryContainer.withValues(alpha: 0.16)
            : colorScheme.surface.withValues(alpha: 0.82),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.09)),
      ),
      padding: const EdgeInsets.all(16),
      child: child,
    );
  }
}

class _DexDetailEmptyState extends StatelessWidget {
  const _DexDetailEmptyState({required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Icon(
          Icons.catching_pokemon_rounded,
          size: 30,
          color: colorScheme.onSurface.withValues(alpha: 0.46),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 5),
        Text(
          body,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.62),
          ),
        ),
      ],
    );
  }
}
