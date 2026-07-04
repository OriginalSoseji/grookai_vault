import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import 'models/ownership_state.dart';
import 'screens/compare/compare_screen.dart';
import 'screens/gvvi/public_gvvi_screen.dart';
import 'screens/network/network_inbox_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'screens/vault/vault_manage_card_screen.dart';
import 'screens/vault/vault_gvvi_screen.dart';
import 'services/identity/display_identity.dart';
import 'services/identity/canon_image_url_service.dart';
import 'services/identity/image_presentation.dart';
import 'services/identity/variant_origin_public_copy.dart';
import 'services/navigation/grookai_web_route_service.dart';
import 'services/network/card_engagement_service.dart';
import 'services/public/compare_service.dart';
import 'services/vault/vault_card_service.dart';
import 'services/vault/vault_gvvi_service.dart';
import 'services/vault/ownership_resolver_adapter.dart';
import 'widgets/card_surface_artwork.dart';
import 'widgets/contact_owner_button.dart';
import 'widgets/gv_surface.dart';
import 'widgets/ownership/ownership_signal.dart';

class CardDetailScreen extends StatefulWidget {
  final String cardPrintId;
  final String? gvId;
  final String? name;
  final String? setName;
  final String? setCode;
  final String? number;
  final String? rarity;
  final String? imageUrl;
  final int? quantity;
  final String? condition;
  final String? contactVaultItemId;
  final String? contactOwnerDisplayName;
  final String? contactOwnerUserId;
  final String? contactIntent;
  final String? exactCopyGvviId;
  final String? exactCopyOwnerUserId;
  final String? entrySurface;
  final String? selectedPrintingGvId;
  final String? selectedFinishLabel;

  const CardDetailScreen({
    super.key,
    required this.cardPrintId,
    this.gvId,
    this.name,
    this.setName,
    this.setCode,
    this.number,
    this.rarity,
    this.imageUrl,
    this.quantity,
    this.condition,
    this.contactVaultItemId,
    this.contactOwnerDisplayName,
    this.contactOwnerUserId,
    this.contactIntent,
    this.exactCopyGvviId,
    this.exactCopyOwnerUserId,
    this.entrySurface,
    this.selectedPrintingGvId,
    this.selectedFinishLabel,
  });

  @override
  State<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailPrintingOption {
  const _CardDetailPrintingOption({
    required this.id,
    required this.finishName,
    required this.sortOrder,
    this.printingGvId,
    this.finishKey,
  });

  final String id;
  final String finishName;
  final int sortOrder;
  final String? printingGvId;
  final String? finishKey;
}

class _CardDetailScreenState extends State<CardDetailScreen> {
  static const double _sectionSpacing = 10;
  final supabase = Supabase.instance.client;
  final _ownershipAdapter = OwnershipResolverAdapter.instance;

  Map<String, dynamic>? _cardContextData;
  Map<String, dynamic>? _priceData;
  List<Map<String, dynamic>> _relatedVersions = const [];
  List<_CardDetailPrintingOption> _printingOptions =
      const <_CardDetailPrintingOption>[];
  String? _selectedCardPrintingId;
  bool _printingSelectionTouched = false;
  bool _priceLoading = false;
  String? _priceError;
  OwnershipState? _ownershipState;
  bool _ownershipLoading = false;
  String? _managedVaultItemId;
  int? _managedOwnedCount;
  bool _canOpenPublicPage = false;
  bool _addingToVault = false;
  bool _wantLoading = false;
  bool _didRecordOpenDetail = false;
  Map<String, OwnershipState> _relatedVersionOwnershipByCardPrintId =
      <String, OwnershipState>{};
  CardWantState _wantState = const CardWantState();

  @override
  void initState() {
    super.initState();
    _loadCardContext();
    _loadPricing();
    _loadActionContext();
    _loadOwnershipState();
    _loadWantState();
    unawaited(_recordOpenDetailEvent());
  }

  Future<void> _loadOwnershipState({bool refresh = false}) async {
    setState(() {
      _ownershipLoading = true;
    });

    try {
      final state = refresh
          ? await _ownershipAdapter.refresh(widget.cardPrintId)
          : await _ownershipAdapter.get(widget.cardPrintId);
      if (!mounted) {
        return;
      }

      setState(() {
        _ownershipState = state;
        _ownershipLoading = false;
        if (_cleanText(_managedVaultItemId).isEmpty &&
            _cleanText(state.primaryVaultItemId).isNotEmpty) {
          _managedVaultItemId = state.primaryVaultItemId;
        }
        if ((_managedOwnedCount ?? 0) <= 0 && state.ownedCount > 0) {
          _managedOwnedCount = state.ownedCount;
        }
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _ownershipLoading = false;
      });
    }
  }

  Future<void> _loadWantState() async {
    try {
      final wantState = await CardEngagementService.loadWantState(
        client: supabase,
        cardPrintId: widget.cardPrintId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _wantState = wantState;
      });
    } catch (_) {}
  }

  Future<void> _recordOpenDetailEvent() async {
    if (_didRecordOpenDetail) {
      return;
    }
    _didRecordOpenDetail = true;
    try {
      await CardEngagementService.recordFeedEvent(
        client: supabase,
        cardPrintId: widget.cardPrintId,
        eventType: 'open_detail',
        surface: _entrySurface,
        metadata: <String, dynamic>{
          if (_cleanText(widget.gvId).isNotEmpty)
            'gv_id': _cleanText(widget.gvId),
        },
      );
    } catch (_) {}
  }

  Future<void> _loadCardContext() async {
    try {
      final rawDetailRow = await supabase
          .from('card_prints')
          .select(
            'id,gv_id,name,number,number_plain,rarity,artist,variant_key,printed_identity_modifier,set_code,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,printed_total,release_date,printed_set_abbrev,identity_model)',
          )
          .eq('id', widget.cardPrintId)
          .maybeSingle();

      final contextData = rawDetailRow == null
          ? null
          : (await CanonImageUrlService.enrichRows([
              Map<String, dynamic>.from(rawDetailRow),
            ])).first;
      final contextName = _cleanText(contextData?['name']);
      final resolvedName = contextName.isNotEmpty ? contextName : _displayName;
      final cardPrintId = _cleanText(contextData?['id']).isNotEmpty
          ? _cleanText(contextData?['id'])
          : widget.cardPrintId;

      List<Map<String, dynamic>> relatedRows = const [];
      if (resolvedName.isNotEmpty) {
        final response = await supabase
            .from('card_prints')
            .select(
              'id,gv_id,name,set_code,number,number_plain,rarity,variant_key,printed_identity_modifier,image_url,image_alt_url,image_source,image_path,representative_image_url,image_status,image_note,sets(name,release_date,identity_model)',
            )
            .eq('name', resolvedName)
            .neq('id', widget.cardPrintId)
            .not('gv_id', 'is', null)
            .order('set_code', ascending: true)
            .order('number_plain', ascending: true, nullsFirst: false)
            .order('number', ascending: true)
            .limit(20);

        relatedRows = (await CanonImageUrlService.enrichRows(
          (response as List<dynamic>).map(
            (row) => Map<String, dynamic>.from(row as Map),
          ),
        )).where((row) => _cleanText(row['id']).isNotEmpty).toList();
      }

      final relatedVersionOwnershipByCardPrintId =
          await _primeRelatedVersionOwnership(
            relatedRows.map((row) => _cleanText(row['id'])),
          );
      final printingOptions = await _fetchPrintingOptions(cardPrintId);
      final selectedCardPrintingId = _resolveInitialPrintingSelection(
        printingOptions,
      );

      if (!mounted) {
        return;
      }

      setState(() {
        _cardContextData = contextData;
        _relatedVersions = relatedRows;
        _printingOptions = printingOptions;
        _selectedCardPrintingId = selectedCardPrintingId;
        _printingSelectionTouched = false;
        _relatedVersionOwnershipByCardPrintId =
            relatedVersionOwnershipByCardPrintId;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _cardContextData = null;
        _relatedVersions = const [];
        _printingOptions = const <_CardDetailPrintingOption>[];
        _selectedCardPrintingId = null;
        _printingSelectionTouched = false;
        _relatedVersionOwnershipByCardPrintId = <String, OwnershipState>{};
      });
    }
  }

  Future<List<_CardDetailPrintingOption>> _fetchPrintingOptions(
    String cardPrintId,
  ) async {
    final normalizedCardPrintId = _cleanText(cardPrintId);
    if (normalizedCardPrintId.isEmpty) {
      return const <_CardDetailPrintingOption>[];
    }

    late final List<dynamic> rows;
    try {
      rows =
          await supabase
                  .from('card_printings')
                  .select(
                    'id,printing_gv_id,finish_key,finish_keys(label,sort_order)',
                  )
                  .eq('card_print_id', normalizedCardPrintId)
              as List<dynamic>;
    } catch (_) {
      try {
        rows =
            await supabase
                    .from('card_printings')
                    .select('id,printing_gv_id,finish_key')
                    .eq('card_print_id', normalizedCardPrintId)
                as List<dynamic>;
      } catch (_) {
        return const <_CardDetailPrintingOption>[];
      }
    }

    final options = <_CardDetailPrintingOption>[];
    for (final raw in rows) {
      if (raw is! Map) {
        continue;
      }
      final row = Map<String, dynamic>.from(raw);
      final id = _cleanText(row['id']);
      if (id.isEmpty) {
        continue;
      }

      final finishRecord = _extractRecord(row['finish_keys']);
      final finishKey = _cleanText(row['finish_key']);
      final finishName =
          formatFinishLabel(
            finishKey: finishKey,
            finishLabel: _cleanText(finishRecord?['label']),
          ) ??
          'Standard';
      final sortOrderRaw = finishRecord?['sort_order'];
      final sortOrder = sortOrderRaw is num
          ? sortOrderRaw.toInt()
          : int.tryParse(_cleanText(sortOrderRaw?.toString())) ?? 9999;

      options.add(
        _CardDetailPrintingOption(
          id: id,
          printingGvId: _cleanText(row['printing_gv_id']).isEmpty
              ? null
              : _cleanText(row['printing_gv_id']),
          finishKey: finishKey.isEmpty ? null : finishKey,
          finishName: finishName,
          sortOrder: sortOrder,
        ),
      );
    }

    options.sort((left, right) {
      if (left.sortOrder != right.sortOrder) {
        return left.sortOrder.compareTo(right.sortOrder);
      }
      return left.finishName.compareTo(right.finishName);
    });
    return options;
  }

  String? _resolveInitialPrintingSelection(
    List<_CardDetailPrintingOption> options,
  ) {
    if (options.isEmpty) {
      return null;
    }

    final requested = _cleanText(widget.selectedPrintingGvId);
    if (requested.isNotEmpty) {
      for (final option in options) {
        if (_cleanText(option.printingGvId) == requested ||
            _cleanText(option.id) == requested) {
          return option.id;
        }
      }
    }

    return options.first.id;
  }

  Future<Map<String, OwnershipState>> _primeRelatedVersionOwnership(
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

    // PERFORMANCE_P4_RELATED_VERSIONS_SYNC_OWNERSHIP
    // Related version cards render ownership from precomputed snapshot state.
    try {
      await _ownershipAdapter.primeBatch(normalizedIds);
    } catch (error) {
      debugPrint('Related version ownership prime failed: $error');
    }
    return _ownershipAdapter.snapshotForIds(normalizedIds);
  }

  OwnershipState? _relatedVersionOwnershipState(String cardPrintId) {
    final userId = (supabase.auth.currentUser?.id ?? '').trim();
    final normalizedCardPrintId = cardPrintId.trim();
    if (userId.isEmpty || normalizedCardPrintId.isEmpty) {
      return null;
    }
    return _relatedVersionOwnershipByCardPrintId[normalizedCardPrintId] ??
        _ownershipAdapter.peek(normalizedCardPrintId);
  }

  Future<Map<String, dynamic>?> _fetchPricingUi() async {
    final row = await supabase
        .from('v_card_pricing_ui_v1')
        .select(
          'card_print_id,primary_price,primary_source,grookai_value,min_price,max_price,variant_count,ebay_median_price,ebay_listing_count',
        )
        .eq('card_print_id', widget.cardPrintId)
        .maybeSingle();

    if (row == null) {
      return null;
    }

    return Map<String, dynamic>.from(row);
  }

  Future<void> _loadPricing() async {
    setState(() {
      _priceLoading = true;
      _priceError = null;
    });

    try {
      final response = await _fetchPricingUi();
      if (!mounted) {
        return;
      }

      setState(() {
        _priceData = response;
      });
      // ignore: avoid_print
      print(
        '[pricing] _loadPricing data for ${widget.cardPrintId}: $_priceData',
      );
    } catch (e, st) {
      // Log the full error so we can diagnose it
      // ignore: avoid_print
      print('[pricing] _loadPricing error: $e');
      // ignore: avoid_print
      print(st);

      setState(() {
        _priceError = 'Failed to load pricing';
      });
    } finally {
      if (mounted) {
        setState(() {
          _priceLoading = false;
        });
      }
    }
  }

  Future<void> _loadActionContext() async {
    final exactCopyGvviId = _cleanText(widget.exactCopyGvviId);
    final currentUserId = supabase.auth.currentUser?.id;

    String? managedVaultItemId;
    int? managedOwnedCount;
    var canOpenPublicPage = false;

    try {
      if (exactCopyGvviId.isNotEmpty) {
        final isOwner =
            currentUserId != null &&
            currentUserId == _cleanText(widget.exactCopyOwnerUserId);

        if (isOwner) {
          final data = await VaultGvviService.loadPrivate(
            client: supabase,
            gvviId: exactCopyGvviId,
          );
          managedVaultItemId = _cleanText(data?.vaultItemId);
          managedOwnedCount = data?.activeCopyCount;
          canOpenPublicPage = data?.canOpenPublicPage == true;
        }
      }
    } catch (_) {
      // Ignore action-context lookup failures and keep only statically known actions.
    }

    if (!mounted) {
      return;
    }

    setState(() {
      _managedVaultItemId =
          managedVaultItemId != null && managedVaultItemId.isNotEmpty
          ? managedVaultItemId
          : null;
      _managedOwnedCount = managedOwnedCount;
      _canOpenPublicPage = canOpenPublicPage;
    });
  }

  String _cleanText(String? value) => (value ?? '').trim();

  String _formatRarity(String? value) {
    final normalized = _cleanText(value);
    if (normalized.isEmpty) {
      return '';
    }

    return normalized
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .map((part) {
          final lower = part.toLowerCase();
          return '${lower[0].toUpperCase()}${lower.substring(1)}';
        })
        .join(' ');
  }

  String get _displayName {
    final resolved = _cleanText(widget.name);
    final contextName = _cleanText(_cardContextData?['name']);
    if (contextName.isNotEmpty) {
      return contextName;
    }
    return resolved.isNotEmpty ? resolved : 'Card Detail';
  }

  ResolvedDisplayIdentity get _displayIdentity {
    final setRecord = _extractRecord(_cardContextData?['sets']);
    final selectedPrinting = _selectedPrintingForDisplay;
    return resolveDisplayIdentityFromFields(
      name: _displayName,
      variantKey: _cleanText(_cardContextData?['variant_key']),
      printedIdentityModifier: _cleanText(
        _cardContextData?['printed_identity_modifier'],
      ),
      finishKey: selectedPrinting?.finishKey,
      finishLabel: selectedPrinting?.finishName,
      displayDiscriminator: _cleanText(widget.selectedFinishLabel).isNotEmpty
          ? _cleanText(widget.selectedFinishLabel)
          : selectedPrinting?.finishName,
      searchObjectType:
          selectedPrinting != null ||
              _cleanText(widget.selectedPrintingGvId).isNotEmpty
          ? 'child_printing'
          : null,
      setIdentityModel: _cleanText(setRecord?['identity_model']),
      setCode: _resolvedSetCode,
      number: _resolvedCollectorNumber,
    );
  }

  String get _displayTitle => _displayIdentity.displayName;

  bool get _hasExplicitPrintingContext =>
      _printingSelectionTouched ||
      _cleanText(widget.selectedPrintingGvId).isNotEmpty ||
      _cleanText(widget.selectedFinishLabel).isNotEmpty;

  _CardDetailPrintingOption? get _selectedPrintingForDisplay =>
      _hasExplicitPrintingContext ? _selectedPrintingOption : null;

  _CardDetailPrintingOption? get _selectedPrintingOption {
    final selectedId = _cleanText(_selectedCardPrintingId);
    if (selectedId.isEmpty) {
      return null;
    }
    for (final option in _printingOptions) {
      if (option.id == selectedId) {
        return option;
      }
    }
    return null;
  }

  VariantOriginPublicCopy? get _variantOriginCopy {
    final contextCardPrintId = _cleanText(_cardContextData?['id']);
    final contextGvId = _cleanText(_cardContextData?['gv_id']);
    return getVariantOriginPublicCopy(
      cardPrintId: contextCardPrintId.isNotEmpty
          ? contextCardPrintId
          : widget.cardPrintId,
      gvId: contextGvId.isNotEmpty ? contextGvId : widget.gvId,
    );
  }

  bool get _hasContactContext =>
      _cleanText(widget.contactVaultItemId).isNotEmpty &&
      _cleanText(widget.contactOwnerDisplayName).isNotEmpty;

  bool get _hasVaultContext =>
      _ownershipState?.owned == true ||
      widget.quantity != null ||
      _cleanText(widget.condition).isNotEmpty;

  bool get _hasExactCopyContext =>
      _cleanText(widget.exactCopyGvviId).isNotEmpty;

  bool get _canCompare => normalizeCompareCardId(widget.gvId ?? '').isNotEmpty;

  bool get _canOpenPublicExactCopy =>
      _canOpenPublicPage && _hasExactCopyContext;

  OwnershipAction get _detailOwnershipAction {
    final state = _ownershipState;
    if (state == null) {
      return _hasVaultContext
          ? OwnershipAction.openManageCard
          : OwnershipAction.addToVault;
    }
    if (state.bestAction != OwnershipAction.none) {
      return state.bestAction;
    }
    return state.owned
        ? OwnershipAction.openManageCard
        : OwnershipAction.addToVault;
  }

  Future<void> _openCompareWorkspace() async {
    final normalizedGvId = normalizeCompareCardId(widget.gvId ?? '');
    if (normalizedGvId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This card is missing a public GV-ID for compare.'),
        ),
      );
      return;
    }

    final controller = CompareCardSelectionController.instance;
    final selectedIds = controller.selectedIds;
    final isSelected = selectedIds.contains(normalizedGvId);
    if (!isSelected && selectedIds.length >= kMaxCompareCards) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Compare supports up to $kMaxCompareCards cards at a time.',
          ),
        ),
      );
      return;
    }

    controller.toggle(normalizedGvId);
    await Navigator.of(
      context,
    ).push(MaterialPageRoute<void>(builder: (_) => const CompareScreen()));
  }

  Future<void> _openSetDetail() async {
    final setCode = _resolvedSetCode;
    if (setCode.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicSetDetailScreen(setCode: setCode),
      ),
    );
  }

  Future<void> _openVariantOriginSource(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      return;
    }

    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _openExactCopy() async {
    final gvviId = _cleanText(widget.exactCopyGvviId);
    if (gvviId.isEmpty) {
      return;
    }

    final currentUserId = supabase.auth.currentUser?.id;
    final isOwner =
        currentUserId != null &&
        currentUserId == _cleanText(widget.exactCopyOwnerUserId);

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => isOwner
            ? VaultGvviScreen(gvviId: gvviId)
            : PublicGvviScreen(gvviId: gvviId),
      ),
    );
  }

  Future<void> _openManageCard() async {
    final vaultItemId =
        _cleanText(_ownershipState?.primaryVaultItemId).isNotEmpty
        ? _cleanText(_ownershipState?.primaryVaultItemId)
        : _cleanText(_managedVaultItemId);
    if (vaultItemId.isEmpty) {
      return;
    }

    final ownedCount =
        _ownershipState?.ownedCount ??
        _managedOwnedCount ??
        widget.quantity ??
        1;

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => VaultManageCardScreen(
          vaultItemId: vaultItemId,
          cardPrintId: widget.cardPrintId,
          ownedCount: ownedCount,
          gvviId: _cleanText(_ownershipState?.primaryGvviId).isNotEmpty
              ? _ownershipState!.primaryGvviId
              : _hasExactCopyContext
              ? _cleanText(widget.exactCopyGvviId)
              : null,
          gvId: _cleanText(widget.gvId).isEmpty ? null : widget.gvId,
          name: _displayName,
          setName: _resolvedSetName,
          number: _resolvedCollectorNumber.isEmpty
              ? _cleanText(widget.number).isEmpty
                    ? null
                    : widget.number
              : _resolvedCollectorNumber,
          imageUrl: _cleanText(widget.imageUrl).isEmpty
              ? null
              : widget.imageUrl,
          condition: _cleanText(widget.condition).isEmpty
              ? null
              : widget.condition,
        ),
      ),
    );
    if (mounted) {
      await _loadOwnershipState(refresh: true);
    }
  }

  Future<void> _openResolvedOwnedCopy() async {
    final gvviId = _cleanText(_ownershipState?.primaryGvviId);
    if (gvviId.isNotEmpty) {
      await Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => VaultGvviScreen(gvviId: gvviId),
        ),
      );
      if (mounted) {
        await _loadOwnershipState(refresh: true);
      }
      return;
    }

    await _openManageCard();
  }

  Future<void> _openPublicExactCopy() async {
    final gvviId = _cleanText(widget.exactCopyGvviId);
    if (gvviId.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(builder: (_) => PublicGvviScreen(gvviId: gvviId)),
    );
  }

  Future<void> _toggleWant() async {
    if (_wantLoading) {
      return;
    }

    final userId = supabase.auth.currentUser?.id;
    if (userId == null || userId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sign in to save wanted cards.')),
      );
      return;
    }

    setState(() {
      _wantLoading = true;
    });

    try {
      final nextWantState = await CardEngagementService.setWant(
        client: supabase,
        cardPrintId: widget.cardPrintId,
        want: !_wantState.want,
        surface: _entrySurface,
        metadata: <String, dynamic>{
          if (_cleanText(widget.gvId).isNotEmpty)
            'gv_id': _cleanText(widget.gvId),
        },
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _wantState = nextWantState;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            nextWantState.want
                ? 'Saved to wanted cards.'
                : 'Removed from wanted cards.',
          ),
          duration: const Duration(milliseconds: 1400),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _wantLoading = false;
        });
      }
    }
  }

  Future<void> _shareCard() async {
    final gvId = _cleanText(widget.gvId);
    if (gvId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to share this card right now.')),
      );
      return;
    }

    final shareUri = GrookaiWebRouteService.buildUri(
      '/card/${Uri.encodeComponent(gvId)}',
    );

    try {
      await SharePlus.instance.share(
        ShareParams(uri: shareUri, subject: _displayTitle),
      );
      if (!mounted) {
        return;
      }
      await CardEngagementService.recordFeedEvent(
        client: supabase,
        cardPrintId: widget.cardPrintId,
        eventType: 'share',
        surface: _entrySurface,
        metadata: <String, dynamic>{'destination': 'system_share'},
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to share this card right now.')),
      );
    }
  }

  Future<void> _openCommentsSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (_) => _CardCommentsSheet(
        cardPrintId: widget.cardPrintId,
        cardName: _displayTitle,
      ),
    );
  }

  Future<void> _addToVault() async {
    if (_addingToVault) {
      return;
    }

    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    final userId = supabase.auth.currentUser?.id;
    if (userId == null) {
      messenger.showSnackBar(
        const SnackBar(content: Text('Sign in to add cards to your vault.')),
      );
      return;
    }

    setState(() {
      _addingToVault = true;
    });

    try {
      final gvviId = await VaultCardService.addOrIncrementVaultItem(
        client: supabase,
        userId: userId,
        cardId: widget.cardPrintId,
        conditionLabel: 'NM',
        fallbackName: _displayName,
        fallbackSetName: _resolvedSetName.isEmpty ? null : _resolvedSetName,
        fallbackImageUrl: _cleanText(widget.imageUrl).isEmpty
            ? null
            : widget.imageUrl,
        cardPrintingId: _selectedPrintingOption?.id,
      );

      if (!mounted) {
        return;
      }

      if (gvviId.isEmpty) {
        throw Exception('Exact copy could not be created.');
      }

      try {
        await CardEngagementService.recordFeedEvent(
          client: supabase,
          cardPrintId: widget.cardPrintId,
          eventType: 'add_to_vault',
          surface: _entrySurface,
          metadata: <String, dynamic>{
            if (_cleanText(widget.gvId).isNotEmpty)
              'gv_id': _cleanText(widget.gvId),
          },
        );
      } catch (_) {}

      if (!mounted) {
        return;
      }

      await navigator.pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => VaultGvviScreen(gvviId: gvviId),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      messenger.showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _addingToVault = false;
        });
      }
    }
  }

  Map<String, dynamic>? _extractRecord(dynamic rawValue) {
    if (rawValue is List && rawValue.isNotEmpty && rawValue.first is Map) {
      return Map<String, dynamic>.from(rawValue.first as Map);
    }

    if (rawValue is Map) {
      return Map<String, dynamic>.from(rawValue);
    }

    return null;
  }

  String _bestImageUrl({dynamic primary, dynamic fallback}) {
    final primaryText = _cleanText(primary?.toString());
    if (primaryText.isNotEmpty) {
      return primaryText;
    }
    return _cleanText(fallback?.toString());
  }

  ResolvedImagePresentation _resolveImagePresentationFromRecord(
    Map<String, dynamic>? row,
  ) {
    final imageStatus = _cleanText(row?['image_status']?.toString());
    final exactImageUrl = _bestImageUrl(
      primary: row?['display_image_url'],
      fallback: _bestImageUrl(
        primary: row?['image_url'],
        fallback: row?['image_alt_url'],
      ),
    );
    return resolveImagePresentationFromFields(
      imageUrl: exactImageUrl,
      representativeImageUrl: _cleanText(
        row?['representative_image_url']?.toString(),
      ),
      displayImageUrl: CanonImageUrlService.displayImageUrlFromRow(row),
      displayImageKind: imageStatus.toLowerCase().startsWith('representative_')
          ? 'representative'
          : null,
      imageStatus: imageStatus,
      imageNote: _cleanText(row?['image_note']?.toString()),
    );
  }

  ResolvedImagePresentation get _cardImagePresentation {
    final presentation = _resolveImagePresentationFromRecord(_cardContextData);
    if ((presentation.displayImageUrl ?? '').isNotEmpty) {
      return presentation;
    }

    return resolveImagePresentationFromFields(
      imageUrl: _cleanText(widget.imageUrl),
    );
  }

  String get _resolvedSetName {
    final contextSet = _extractRecord(_cardContextData?['sets']);
    final fromContext = _cleanText(contextSet?['name']);
    if (fromContext.isNotEmpty) {
      return fromContext;
    }
    return _cleanText(widget.setName);
  }

  String get _resolvedSetCode {
    final fromContext = _cleanText(_cardContextData?['set_code']);
    if (fromContext.isNotEmpty) {
      return fromContext;
    }
    return _cleanText(widget.setCode);
  }

  String get _resolvedCollectorNumber {
    final fromPlain = _cleanText(_cardContextData?['number_plain']);
    if (fromPlain.isNotEmpty) {
      return fromPlain;
    }

    final fromWidget = _cleanText(widget.number);
    if (fromWidget.isNotEmpty) {
      return fromWidget;
    }

    return _cleanText(_cardContextData?['number']);
  }

  String get _entrySurface {
    final value = _cleanText(widget.entrySurface);
    return value.isEmpty ? 'card_detail' : value;
  }

  String? get _collectorIdentityLine {
    final setRecord = _extractRecord(_cardContextData?['sets']);
    final printedTotal = setRecord?['printed_total'] is num
        ? (setRecord!['printed_total'] as num).toInt()
        : null;
    final printedSetAbbrev = _cleanText(
      setRecord?['printed_set_abbrev'],
    ).toUpperCase();
    final setPrefix = printedSetAbbrev.isNotEmpty
        ? printedSetAbbrev
        : _resolvedSetCode.toUpperCase();
    final collectorNumber = _resolvedCollectorNumber;

    final identityParts = <String>[
      if (setPrefix.isNotEmpty) setPrefix,
      if (collectorNumber.isNotEmpty)
        printedTotal != null
            ? '$collectorNumber/$printedTotal'
            : '#$collectorNumber',
    ];
    if (identityParts.isEmpty) {
      return null;
    }
    return identityParts.join(' ');
  }

  int get _relatedVersionDisplayCount {
    final fromPricing = (_priceData?['variant_count'] as num?)?.toInt();
    final fromLoaded = _relatedVersions.isEmpty
        ? 0
        : _relatedVersions.length + 1;
    if (fromPricing == null) {
      return fromLoaded;
    }
    return fromLoaded > fromPricing ? fromLoaded : fromPricing;
  }

  String? _formatReleaseDateLabel(dynamic rawValue) {
    final rawText = _cleanText(rawValue?.toString());
    if (rawText.isEmpty) {
      return null;
    }

    final parsed = DateTime.tryParse(rawText);
    if (parsed == null) {
      return rawText;
    }

    const months = <String>[
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final month = months[parsed.month - 1];
    return '$month ${parsed.day}, ${parsed.year}';
  }

  List<MapEntry<String, String>> _buildDetailEntries() {
    final entries = <MapEntry<String, String>>[];
    final illustrator = _cleanText(_cardContextData?['artist']);
    final variantKey = _cleanText(_cardContextData?['variant_key']);
    final printedIdentityModifier = _cleanText(
      _cardContextData?['printed_identity_modifier'],
    );
    final setRecord = _extractRecord(_cardContextData?['sets']);
    final printedTotal = setRecord?['printed_total'] is num
        ? (setRecord!['printed_total'] as num).toInt()
        : null;
    final releaseDate = _formatReleaseDateLabel(setRecord?['release_date']);

    if (illustrator.isNotEmpty) {
      entries.add(MapEntry('Illustrator', illustrator));
    }
    if (variantKey.isNotEmpty && variantKey.toLowerCase() != 'base') {
      entries.add(
        MapEntry('Variant', formatVariantKey(variantKey) ?? variantKey),
      );
    }
    if (printedIdentityModifier.isNotEmpty) {
      entries.add(
        MapEntry(
          'Printed Identity',
          formatPrintedIdentityModifier(printedIdentityModifier) ??
              printedIdentityModifier,
        ),
      );
    }
    if (printedTotal != null) {
      entries.add(MapEntry('Printed Total', '$printedTotal cards'));
    }
    if (releaseDate != null) {
      entries.add(MapEntry('Release Date', releaseDate));
    }

    return entries;
  }

  Future<void> _openOtherVersions() async {
    if (_relatedVersions.isEmpty) {
      return;
    }

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) {
        final theme = Theme.of(context);
        final colorScheme = theme.colorScheme;
        final versionsLabel = _relatedVersionDisplayCount.toString();

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Other Versions',
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '$versionsLabel total prints with this card name.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.72),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.58,
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: _relatedVersions.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final row = _relatedVersions[index];
                      final cardPrintId = _cleanText(row['id']);
                      final setRecord = _extractRecord(row['sets']);
                      final displayIdentity = resolveDisplayIdentityFromFields(
                        name: _cleanText(row['name']),
                        variantKey: _cleanText(row['variant_key']),
                        printedIdentityModifier: _cleanText(
                          row['printed_identity_modifier'],
                        ),
                        setIdentityModel: _cleanText(
                          setRecord?['identity_model'],
                        ),
                        setCode: _cleanText(row['set_code']),
                        number: _cleanText(row['number']),
                      );
                      final setName = _cleanText(setRecord?['name']);
                      final setCode = _cleanText(row['set_code']).toUpperCase();
                      final number = _cleanText(row['number_plain']).isNotEmpty
                          ? _cleanText(row['number_plain'])
                          : _cleanText(row['number']);
                      final rarity = _formatRarity(row['rarity']?.toString());
                      final imagePresentation =
                          _resolveImagePresentationFromRecord(row);
                      final imageUrl = imagePresentation.displayImageUrl ?? '';
                      final ownershipState = _relatedVersionOwnershipState(
                        cardPrintId,
                      );
                      void openRelatedVersion() {
                        Navigator.of(context).pop();
                        Navigator.of(this.context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => CardDetailScreen(
                              cardPrintId: _cleanText(row['id']),
                              gvId: _cleanText(row['gv_id']),
                              name: _cleanText(row['name']),
                              setName: setName,
                              setCode: setCode,
                              number: number,
                              rarity: rarity,
                              imageUrl: imageUrl,
                            ),
                          ),
                        );
                      }

                      return Material(
                        color: colorScheme.surface,
                        borderRadius: BorderRadius.circular(18),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: openRelatedVersion,
                          child: Padding(
                            padding: const EdgeInsets.all(10),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 58,
                                  child: AspectRatio(
                                    aspectRatio: 3 / 4,
                                    child: CardSurfaceArtwork(
                                      label: displayIdentity.displayName,
                                      imageUrl: imageUrl,
                                      borderRadius: 12,
                                      padding: const EdgeInsets.all(4),
                                      showZoomAffordance: imageUrl.isNotEmpty,
                                      onViewDetails: openRelatedVersion,
                                      detailsLabel: 'View version',
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        displayIdentity.displayName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.titleSmall
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      if ((displayIdentity.printedName ?? '')
                                          .isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          displayIdentity.printedName!,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: theme.textTheme.labelSmall
                                              ?.copyWith(
                                                color: colorScheme.onSurface
                                                    .withValues(alpha: 0.62),
                                                fontWeight: FontWeight.w600,
                                              ),
                                        ),
                                      ],
                                      const SizedBox(height: 3),
                                      Text(
                                        [
                                          if (setName.isNotEmpty) setName,
                                          if (setCode.isNotEmpty) setCode,
                                          if (number.isNotEmpty) '#$number',
                                          if (rarity.isNotEmpty) rarity,
                                        ].join(' • '),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: theme.textTheme.bodySmall
                                            ?.copyWith(
                                              color: colorScheme.onSurface
                                                  .withValues(alpha: 0.68),
                                            ),
                                      ),
                                      if (imagePresentation.compactBadgeLabel !=
                                          null) ...[
                                        const SizedBox(height: 6),
                                        _buildImageStatusBadge(
                                          theme: theme,
                                          colorScheme: colorScheme,
                                          label: imagePresentation
                                              .compactBadgeLabel!,
                                          strong: imagePresentation
                                              .isCollisionRepresentative,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    SizedBox(
                                      height: 16,
                                      child: OwnershipSignal(
                                        ownershipState: ownershipState,
                                        textStyle: theme.textTheme.labelSmall
                                            ?.copyWith(
                                              color: colorScheme.onSurface
                                                  .withValues(alpha: 0.56),
                                              fontWeight: FontWeight.w700,
                                            ),
                                        labelBuilder: (state) =>
                                            state.ownedCount > 1
                                            ? '${state.ownedCount} copies'
                                            : 'In Vault',
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Icon(
                                      Icons.chevron_right_rounded,
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.42,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bottomInset = MediaQuery.viewPaddingOf(context).bottom;
    final sections = <Widget>[
      _buildHeroPanel(theme, colorScheme),
      _buildPricingSection(theme, colorScheme),
      _buildTrustRows(theme, colorScheme),
      if (_buildDetailEntries().isNotEmpty)
        _buildCardDetailsSection(theme, colorScheme),
      if (_hasContactContext) _buildCollectorNetworkSection(theme, colorScheme),
      if (_printingOptions.isNotEmpty)
        _buildPrintingOptionsSection(theme, colorScheme),
      if (_variantOriginCopy != null)
        _buildVariantOriginSection(theme, colorScheme),
    ];

    return Scaffold(
      extendBody: true,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(24, 10, 24, 124 + bottomInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildPageChrome(theme, colorScheme),
              const SizedBox(height: 14),
              for (var index = 0; index < sections.length; index++) ...[
                if (index > 0) const SizedBox(height: _sectionSpacing),
                sections[index],
              ],
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildActions(context, theme, colorScheme),
    );
  }

  Widget _buildPageChrome(ThemeData theme, ColorScheme colorScheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        IconButton(
          tooltip: 'Back',
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(Icons.chevron_left_rounded, size: 30),
        ),
        IconButton(
          tooltip: 'Share',
          onPressed: _shareCard,
          icon: const Icon(Icons.ios_share_rounded, size: 22),
        ),
      ],
    );
  }

  Widget _buildHeroPanel(ThemeData theme, ColorScheme colorScheme) {
    final imagePresentation = _cardImagePresentation;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _buildHeroImage(),
        if (imagePresentation.compactBadgeLabel != null) ...[
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.center,
            child: _buildImageStatusBadge(
              theme: theme,
              colorScheme: colorScheme,
              label:
                  imagePresentation.detailBadgeLabel ??
                  imagePresentation.compactBadgeLabel!,
              strong: imagePresentation.isCollisionRepresentative,
            ),
          ),
        ],
        if (imagePresentation.detailNote != null) ...[
          const SizedBox(height: 8),
          Text(
            imagePresentation.detailNote!,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
              height: 1.35,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
        const SizedBox(height: 22),
        _buildIdentitySection(theme, colorScheme),
      ],
    );
  }

  Widget _buildHeroImage() {
    final url = _cardImagePresentation.displayImageUrl ?? '';

    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth < 420
            ? constraints.maxWidth * 0.72
            : 286.0;
        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: AspectRatio(
              aspectRatio: 3 / 4,
              child: CardSurfaceArtwork(
                label: _displayTitle,
                imageUrl: url,
                borderRadius: 20,
                padding: EdgeInsets.zero,
                frame: CardArtworkFrame.none,
                showShadow: true,
                showZoomAffordance: url.isNotEmpty,
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildImageStatusBadge({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required String label,
    required bool strong,
  }) {
    final backgroundColor = strong
        ? colorScheme.tertiaryContainer.withValues(alpha: 0.94)
        : colorScheme.surface.withValues(alpha: 0.96);
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
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Text(
          label,
          style: theme.textTheme.labelSmall?.copyWith(
            color: textColor,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.2,
          ),
        ),
      ),
    );
  }

  Widget _buildIdentitySection(ThemeData theme, ColorScheme colorScheme) {
    final setName = _resolvedSetName;
    final setCode = _resolvedSetCode.toUpperCase();
    final collectorIdentity = _collectorIdentityLine;
    final resolvedRarity = _cleanText(
      (_cardContextData == null ? null : _cardContextData!['rarity'])
          ?.toString(),
    );
    final rarity = _formatRarity(
      resolvedRarity.isNotEmpty ? resolvedRarity : widget.rarity,
    );
    final relatedVersionCount = _relatedVersionDisplayCount;
    final metaParts = <String>[
      if (setName.isNotEmpty) setName,
      if (_resolvedCollectorNumber.isNotEmpty) '#$_resolvedCollectorNumber',
      if (rarity.isNotEmpty) rarity,
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _displayTitle,
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w800,
            height: 1.04,
          ),
        ),
        if ((_displayIdentity.printedName ?? '').isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(
            _displayIdentity.printedName!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleSmall?.copyWith(
              color: colorScheme.primary.withValues(alpha: 0.82),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
        if (metaParts.isNotEmpty || collectorIdentity != null) ...[
          const SizedBox(height: 5),
          Text(
            metaParts.isNotEmpty
                ? metaParts.join(' · ')
                : collectorIdentity ?? '',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
              color: colorScheme.onSurface.withValues(alpha: 0.74),
              height: 1.25,
            ),
          ),
        ],
        if (collectorIdentity != null && metaParts.isNotEmpty) ...[
          const SizedBox(height: 3),
          Text(
            collectorIdentity,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w500,
              color: colorScheme.onSurface.withValues(alpha: 0.58),
              height: 1.2,
            ),
          ),
        ],
        if (setName.isNotEmpty ||
            _hasExactCopyContext ||
            _relatedVersions.isNotEmpty) ...[
          const SizedBox(height: 13),
          Wrap(
            spacing: 18,
            runSpacing: 8,
            children: [
              if (setName.isNotEmpty)
                _buildTextNavCue(
                  label: 'Set',
                  onTap: setCode.isNotEmpty ? _openSetDetail : null,
                  theme: theme,
                  colorScheme: colorScheme,
                ),
              if (_hasExactCopyContext)
                _buildTextNavCue(
                  label: 'Exact copy',
                  onTap: _openExactCopy,
                  theme: theme,
                  colorScheme: colorScheme,
                ),
              if (_relatedVersions.isNotEmpty)
                _buildTextNavCue(
                  label: 'Card family · $relatedVersionCount versions',
                  onTap: _openOtherVersions,
                  theme: theme,
                  colorScheme: colorScheme,
                ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildTextNavCue({
    required String label,
    required VoidCallback? onTap,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          label,
          style: theme.textTheme.labelLarge?.copyWith(
            color: onTap == null
                ? colorScheme.onSurface.withValues(alpha: 0.46)
                : colorScheme.onSurface,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(width: 3),
        Icon(
          Icons.chevron_right_rounded,
          size: 17,
          color: colorScheme.onSurface.withValues(alpha: 0.54),
        ),
      ],
    );

    if (onTap == null) {
      return child;
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: child,
      ),
    );
  }

  Widget _buildSurface({
    required ColorScheme colorScheme,
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(14),
    bool emphasize = false,
    bool soft = false,
  }) {
    return GvSurface(
      variant: emphasize
          ? GvSurfaceVariant.floating
          : soft
          ? GvSurfaceVariant.resting
          : GvSurfaceVariant.grouped,
      borderRadius: 16,
      padding: padding,
      child: child,
    );
  }

  Widget _buildSectionLabel(
    String label,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return Text(
      label.toUpperCase(),
      style: theme.textTheme.labelMedium?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: 0.8,
        color: colorScheme.onSurface.withValues(alpha: 0.58),
      ),
    );
  }

  Widget _buildInfoChip({
    required String label,
    required Color tint,
    required ThemeData theme,
    IconData? icon,
  }) {
    return Container(
      constraints: const BoxConstraints(minHeight: 28),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.11),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: tint.withValues(alpha: 0.24)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: tint),
            const SizedBox(width: 6),
          ],
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: tint,
              height: 1.0,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetadataRow({
    required String label,
    required String value,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 104,
          child: Text(
            label,
            style: theme.textTheme.labelMedium?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFlowDivider(ColorScheme colorScheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Divider(
        height: 1,
        thickness: 1,
        color: colorScheme.outlineVariant.withValues(alpha: 0.24),
      ),
    );
  }

  Widget _buildCollectorNetworkSection(
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    if (!_hasContactContext) {
      return const SizedBox.shrink();
    }

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Collector', theme, colorScheme),
          const SizedBox(height: 6),
          Text(
            _cleanText(widget.contactOwnerDisplayName),
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Message this collector about this card.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ContactOwnerButton(
                  vaultItemId: _cleanText(widget.contactVaultItemId),
                  cardPrintId: widget.cardPrintId,
                  ownerUserId: widget.contactOwnerUserId,
                  ownerDisplayName: _cleanText(widget.contactOwnerDisplayName),
                  cardName: _displayTitle,
                  intent: widget.contactIntent,
                ),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const NetworkInboxScreen(),
                    ),
                  );
                },
                child: const Text('Messages'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPrintingOptionsSection(
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    final selectedId = _cleanText(_selectedCardPrintingId);

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Printings', theme, colorScheme),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final option in _printingOptions)
                ChoiceChip(
                  label: Text(option.finishName),
                  selected: option.id == selectedId,
                  onSelected: (_) {
                    setState(() {
                      _selectedCardPrintingId = option.id;
                      _printingSelectionTouched = true;
                    });
                  },
                  labelStyle: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: option.id == selectedId
                        ? colorScheme.onPrimaryContainer
                        : colorScheme.onSurface,
                  ),
                  selectedColor: colorScheme.primaryContainer,
                  backgroundColor: colorScheme.surfaceContainerHighest
                      .withValues(alpha: 0.55),
                  side: BorderSide(
                    color: option.id == selectedId
                        ? colorScheme.primary.withValues(alpha: 0.45)
                        : colorScheme.outlineVariant.withValues(alpha: 0.65),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildVariantOriginSection(ThemeData theme, ColorScheme colorScheme) {
    final copy = _variantOriginCopy;
    if (copy == null) {
      return const SizedBox.shrink();
    }

    final sourceUrls = copy.sourceUrls.take(4).toList(growable: false);

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.all(14),
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
                    _buildSectionLabel('Variant Origin', theme, colorScheme),
                    const SizedBox(height: 5),
                    Text(
                      copy.familyLabel,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.15,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              _buildInfoChip(
                label: copy.confidence.isEmpty
                    ? 'Source backed'
                    : '${copy.confidence[0].toUpperCase()}${copy.confidence.substring(1)} confidence',
                icon: Icons.verified_outlined,
                tint: colorScheme.primary,
                theme: theme,
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildVariantOriginTextBlock(
            title: 'Why it exists',
            body: copy.whyItExists,
            theme: theme,
            colorScheme: colorScheme,
          ),
          const SizedBox(height: 10),
          _buildVariantOriginTextBlock(
            title: 'Why collectors care',
            body: copy.whyCollectorsCare,
            theme: theme,
            colorScheme: colorScheme,
          ),
          if (copy.howToIdentify.isNotEmpty) ...[
            const SizedBox(height: 10),
            _buildVariantOriginTextBlock(
              title: 'How to identify it',
              body: copy.howToIdentify,
              theme: theme,
              colorScheme: colorScheme,
            ),
          ],
          const SizedBox(height: 8),
          Theme(
            data: theme.copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: EdgeInsets.zero,
              dense: true,
              title: Text(
                'Source-backed modeling',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: colorScheme.onSurface.withValues(alpha: 0.78),
                ),
              ),
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    copy.grookaiRule,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.72),
                      height: 1.35,
                    ),
                  ),
                ),
                if (sourceUrls.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  for (var index = 0; index < sourceUrls.length; index++) ...[
                    if (index > 0) const SizedBox(height: 6),
                    _buildVariantOriginSourceLink(
                      url: sourceUrls[index],
                      theme: theme,
                      colorScheme: colorScheme,
                    ),
                  ],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVariantOriginTextBlock({
    required String title,
    required String body,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    if (body.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.labelMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.62),
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          body,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.84),
            height: 1.35,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildVariantOriginSourceLink({
    required String url,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    final uri = Uri.tryParse(url);
    final label = uri != null && uri.host.isNotEmpty ? uri.host : url;

    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton.icon(
        onPressed: () => _openVariantOriginSource(url),
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          minimumSize: const Size(0, 32),
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        ),
        icon: const Icon(Icons.open_in_new_rounded, size: 15),
        label: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: theme.textTheme.labelMedium?.copyWith(
            color: colorScheme.primary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  Widget _buildTrustRows(ThemeData theme, ColorScheme colorScheme) {
    final rows = <Widget>[];
    final ownershipState = _ownershipState;

    if (_ownershipLoading && ownershipState == null) {
      rows.add(
        _buildTrustRow(
          icon: Icons.inventory_2_outlined,
          label: 'Checking your vault',
          actionLabel: null,
          onAction: null,
          theme: theme,
          colorScheme: colorScheme,
        ),
      );
    } else if (ownershipState?.owned == true || _hasVaultContext) {
      final ownedCount = ownershipState?.ownedCount ?? widget.quantity ?? 1;
      rows.add(
        _buildTrustRow(
          icon: Icons.inventory_2_outlined,
          label: ownedCount > 1
              ? 'In your vault · $ownedCount copies'
              : 'In your vault',
          actionLabel: 'View your copy',
          onAction: _openResolvedOwnedCopy,
          theme: theme,
          colorScheme: colorScheme,
        ),
      );
    }

    if (_canOpenPublicExactCopy || _hasExactCopyContext) {
      rows.add(
        _buildTrustRow(
          icon: Icons.verified_outlined,
          label: 'Exact copy on file',
          actionLabel: 'Open copy',
          onAction: _canOpenPublicExactCopy
              ? _openPublicExactCopy
              : _openExactCopy,
          theme: theme,
          colorScheme: colorScheme,
        ),
      );
    }

    if (rows.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      children: [
        for (var index = 0; index < rows.length; index++) ...[
          if (index > 0) _buildFlowDivider(colorScheme),
          rows[index],
        ],
      ],
    );
  }

  Widget _buildTrustRow({
    required IconData icon,
    required String label,
    required String? actionLabel,
    required VoidCallback? onAction,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        children: [
          Icon(
            icon,
            size: 19,
            color: colorScheme.onSurface.withValues(alpha: 0.74),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Text(
              label,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface.withValues(alpha: 0.9),
              ),
            ),
          ),
          if (actionLabel != null && onAction != null)
            TextButton(
              onPressed: onAction,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                minimumSize: const Size(0, 32),
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text('$actionLabel  >'),
            ),
        ],
      ),
    );
  }

  Widget _buildCardDetailsSection(ThemeData theme, ColorScheme colorScheme) {
    final detailEntries = _buildDetailEntries();
    if (detailEntries.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionLabel('Details', theme, colorScheme),
        const SizedBox(height: 7),
        for (var index = 0; index < detailEntries.length; index++) ...[
          if (index > 0) _buildFlowDivider(colorScheme),
          _buildMetadataRow(
            label: detailEntries[index].key,
            value: detailEntries[index].value,
            theme: theme,
            colorScheme: colorScheme,
          ),
        ],
      ],
    );
  }

  Widget _buildPricingSection(ThemeData theme, ColorScheme colorScheme) {
    if (_priceLoading && _priceData == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Grookai Value · Raw', theme, colorScheme),
          const SizedBox(height: 7),
          Row(
            children: [
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 8),
              Text(
                'Loading pricing...',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.66),
                ),
              ),
            ],
          ),
        ],
      );
    }

    if (_priceError != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Grookai Value · Raw', theme, colorScheme),
          const SizedBox(height: 5),
          Text(
            _priceError!,
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.error,
            ),
          ),
          const SizedBox(height: 4),
          TextButton.icon(
            onPressed: _priceLoading ? null : _loadPricing,
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(0, 30),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('Retry'),
          ),
        ],
      );
    }

    if (_priceData == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Grookai Value · Raw', theme, colorScheme),
          const SizedBox(height: 5),
          Text(
            'No pricing data available',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Pricing for this card is not available yet.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
            ),
          ),
        ],
      );
    }

    final data = _priceData!;
    final primaryPrice = (data['primary_price'] as num?)?.toDouble();
    final grookaiValue = (data['grookai_value'] as num?)?.toDouble();
    final minPrice = (data['min_price'] as num?)?.toDouble();
    final maxPrice = (data['max_price'] as num?)?.toDouble();
    final ebayMedianPrice = (data['ebay_median_price'] as num?)?.toDouble();
    final primaryValue = primaryPrice ?? grookaiValue;
    final primarySource = _pricingSourceName(data['primary_source'] as String?);
    final pricingFooterParts = <String>[];
    if (primarySource != null) {
      pricingFooterParts.add(primarySource);
    }
    if (_hasVaultContext) {
      pricingFooterParts.add('In your vault');
    }
    final pricingContext = <String>[
      if (minPrice != null) 'Low ${_formatMoney(minPrice)}',
      if (primaryPrice != null) 'Market ${_formatMoney(primaryPrice)}',
      if (maxPrice != null) 'High ${_formatMoney(maxPrice)}',
      if (grookaiValue != null && primaryPrice != null)
        'Value ${_formatMoney(grookaiValue)}',
      if (ebayMedianPrice != null) 'eBay ${_formatMoney(ebayMedianPrice)}',
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (primaryValue == null) ...[
          _buildSectionLabel('Grookai Value · Raw', theme, colorScheme),
          const SizedBox(height: 5),
          Text(
            'No pricing data available',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Pricing for this card is not available yet.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.58),
            ),
          ),
        ] else ...[
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionLabel(
                      'Grookai Value · Raw',
                      theme,
                      colorScheme,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatMoney(primaryValue),
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        height: 1.0,
                      ),
                    ),
                    if (pricingFooterParts.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        pricingFooterParts.join(' · '),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.58),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (_priceLoading)
                Padding(
                  padding: const EdgeInsets.only(left: 8, bottom: 4),
                  child: SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: colorScheme.primary,
                    ),
                  ),
                ),
            ],
          ),
          if (pricingContext.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              pricingContext.join(' · '),
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.54),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ],
    );
  }

  String _formatMoney(double value) {
    return '\$${value.toStringAsFixed(2)}';
  }

  String? _pricingSourceName(String? source) {
    switch ((source ?? '').trim().toLowerCase()) {
      case 'justtcg':
        return 'JustTCG';
      case 'ebay':
        return 'eBay';
      default:
        return null;
    }
  }

  ButtonStyle _primaryActionButtonStyle(ThemeData theme) {
    return FilledButton.styleFrom(
      minimumSize: const Size.fromHeight(44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      textStyle: theme.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _buildActions(
    BuildContext context,
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    final ownershipAction = _detailOwnershipAction;
    final primaryOwnershipAction = switch (ownershipAction) {
      OwnershipAction.addToVault || OwnershipAction.none => FilledButton.icon(
        onPressed: _addingToVault ? null : _addToVault,
        style: _primaryActionButtonStyle(theme),
        icon: _buildPrimaryActionIcon(Icons.add_rounded),
        label: Text(_addingToVault ? 'Adding...' : 'Add to Vault'),
      ),
      OwnershipAction.viewYourCopy => FilledButton.icon(
        onPressed: _openResolvedOwnedCopy,
        style: _primaryActionButtonStyle(theme),
        icon: const Icon(Icons.collections_bookmark_outlined),
        label: const Text('View your copy'),
      ),
      OwnershipAction.addAnotherCopy => FilledButton.icon(
        onPressed: _addingToVault ? null : _addToVault,
        style: _primaryActionButtonStyle(theme),
        icon: _buildPrimaryActionIcon(Icons.add_rounded),
        label: Text(_addingToVault ? 'Adding...' : 'Add copy'),
      ),
      OwnershipAction.openManageCard => FilledButton.icon(
        onPressed: _openManageCard,
        style: _primaryActionButtonStyle(theme),
        icon: const Icon(Icons.tune_rounded),
        label: const Text('Manage card'),
      ),
    };

    return SafeArea(
      top: false,
      minimum: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      child: Align(
        alignment: Alignment.bottomCenter,
        child: GvSurface(
          variant: GvSurfaceVariant.glass,
          borderRadius: 34,
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 8),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              primaryOwnershipAction,
              const SizedBox(width: 6),
              _buildGlassIconButton(
                tooltip: _wantState.want ? 'Wanted' : 'Want this card',
                icon: _wantState.want
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                active: _wantState.want,
                onPressed: _wantLoading ? null : _toggleWant,
                colorScheme: colorScheme,
              ),
              _buildGlassIconButton(
                tooltip: 'Comments',
                icon: Icons.mode_comment_outlined,
                active: false,
                onPressed: _openCommentsSheet,
                colorScheme: colorScheme,
              ),
              _buildGlassIconButton(
                tooltip: _canCompare ? 'Compare' : 'Share',
                icon: _canCompare
                    ? Icons.compare_arrows_rounded
                    : Icons.ios_share_rounded,
                active: false,
                onPressed: _canCompare ? _openCompareWorkspace : _shareCard,
                colorScheme: colorScheme,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPrimaryActionIcon(IconData icon) {
    if (!_addingToVault) {
      return Icon(icon);
    }

    return const SizedBox(
      width: 16,
      height: 16,
      child: CircularProgressIndicator(strokeWidth: 2),
    );
  }

  Widget _buildGlassIconButton({
    required String tooltip,
    required IconData icon,
    required bool active,
    required VoidCallback? onPressed,
    required ColorScheme colorScheme,
  }) {
    final tint = active ? Colors.red.shade400 : colorScheme.onSurface;
    return IconButton(
      tooltip: tooltip,
      onPressed: onPressed,
      icon: Icon(icon),
      color: tint.withValues(alpha: onPressed == null ? 0.34 : 0.78),
      style: IconButton.styleFrom(
        minimumSize: const Size.square(42),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}

class _CardCommentsSheet extends StatefulWidget {
  const _CardCommentsSheet({required this.cardPrintId, required this.cardName});

  final String cardPrintId;
  final String cardName;

  @override
  State<_CardCommentsSheet> createState() => _CardCommentsSheetState();
}

class _CardCommentsSheetState extends State<_CardCommentsSheet> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final TextEditingController _bodyController = TextEditingController();

  List<CardCommentEntry> _comments = const <CardCommentEntry>[];
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    unawaited(_loadComments());
  }

  @override
  void dispose() {
    _bodyController.dispose();
    super.dispose();
  }

  Future<void> _loadComments() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final comments = await CardEngagementService.fetchComments(
        client: _supabase,
        cardPrintId: widget.cardPrintId,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _comments = comments;
        _loading = false;
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

  Future<void> _submitComment() async {
    final message = _bodyController.text.trim();
    if (_submitting || message.isEmpty) {
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final entry = await CardEngagementService.addComment(
        client: _supabase,
        cardPrintId: widget.cardPrintId,
        body: message,
      );
      if (!mounted) {
        return;
      }
      _bodyController.clear();
      setState(() {
        _comments = <CardCommentEntry>[entry, ..._comments];
        _submitting = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _submitting = false;
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    final currentUserId = _supabase.auth.currentUser?.id;
    final canComment = (currentUserId ?? '').trim().isNotEmpty;

    return Padding(
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.72,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Comments',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.cardName,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.66),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _loading
                  ? const Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : _error != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: colorScheme.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    )
                  : _comments.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 28),
                        child: Text(
                          'Start the first comment on this card.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.62,
                            ),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                      itemCount: _comments.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final entry = _comments[index];
                        final ownedByViewer = entry.isOwnedBy(currentUserId);
                        final accent = ownedByViewer
                            ? colorScheme.primary
                            : colorScheme.secondary;
                        return Container(
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerLowest,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: colorScheme.outlineVariant.withValues(
                                alpha: 0.34,
                              ),
                            ),
                          ),
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    ownedByViewer ? 'You' : 'Collector',
                                    style: theme.textTheme.labelLarge?.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: accent,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    CardEngagementService.formatRelativeTime(
                                      entry.createdAt,
                                    ),
                                    style: theme.textTheme.labelMedium
                                        ?.copyWith(
                                          color: colorScheme.onSurface
                                              .withValues(alpha: 0.54),
                                          fontWeight: FontWeight.w600,
                                        ),
                                  ),
                                  if ((entry.intentType ?? '').isNotEmpty) ...[
                                    const SizedBox(width: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: accent.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(
                                          999,
                                        ),
                                      ),
                                      child: Text(
                                        entry.intentType!.toUpperCase(),
                                        style: theme.textTheme.labelSmall
                                            ?.copyWith(
                                              color: accent,
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                entry.body,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  height: 1.35,
                                  color: colorScheme.onSurface,
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
            Container(
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: colorScheme.outlineVariant.withValues(alpha: 0.24),
                  ),
                ),
              ),
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _bodyController,
                    minLines: 1,
                    maxLines: 4,
                    enabled: canComment && !_submitting,
                    textInputAction: TextInputAction.newline,
                    decoration: InputDecoration(
                      hintText: canComment
                          ? 'Comment on this card'
                          : 'Sign in to comment',
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Comments stay attached to this card.',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.58,
                            ),
                            height: 1.3,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      FilledButton.icon(
                        onPressed: canComment && !_submitting
                            ? _submitComment
                            : null,
                        icon: _submitting
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.send_rounded),
                        label: Text(_submitting ? 'Posting...' : 'Post'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
