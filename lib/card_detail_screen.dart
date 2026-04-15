import 'dart:async';

import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'models/ownership_state.dart';
import 'screens/compare/compare_screen.dart';
import 'screens/gvvi/public_gvvi_screen.dart';
import 'screens/network/network_inbox_screen.dart';
import 'screens/public_collector/public_collector_screen.dart';
import 'screens/sets/public_set_detail_screen.dart';
import 'screens/vault/vault_manage_card_screen.dart';
import 'screens/vault/vault_gvvi_screen.dart';
import 'services/identity/display_identity.dart';
import 'services/navigation/grookai_web_route_service.dart';
import 'services/network/card_engagement_service.dart';
import 'services/public/compare_service.dart';
import 'services/vault/vault_card_service.dart';
import 'services/vault/vault_gvvi_service.dart';
import 'services/vault/ownership_resolver_adapter.dart';
import 'widgets/card_surface_artwork.dart';
import 'widgets/contact_owner_button.dart';
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
  });

  @override
  State<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends State<CardDetailScreen> {
  static const double _sectionSpacing = 10;
  final supabase = Supabase.instance.client;
  final _ownershipAdapter = OwnershipResolverAdapter.instance;

  Map<String, dynamic>? _cardContextData;
  Map<String, dynamic>? _priceData;
  List<Map<String, dynamic>> _relatedVersions = const [];
  bool _priceLoading = false;
  String? _priceError;
  OwnershipState? _ownershipState;
  bool _ownershipLoading = false;
  String? _collectorSlug;
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
      final detailRow = await supabase
          .from('card_prints')
          .select(
            'id,gv_id,name,number,number_plain,rarity,artist,variant_key,printed_identity_modifier,set_code,sets(name,printed_total,release_date,printed_set_abbrev,identity_model)',
          )
          .eq('id', widget.cardPrintId)
          .maybeSingle();

      final contextData = detailRow == null
          ? null
          : Map<String, dynamic>.from(detailRow);
      final contextName = _cleanText(contextData?['name']);
      final resolvedName = contextName.isNotEmpty ? contextName : _displayName;

      List<Map<String, dynamic>> relatedRows = const [];
      if (resolvedName.isNotEmpty) {
        final response = await supabase
            .from('card_prints')
            .select(
              'id,gv_id,name,set_code,number,number_plain,rarity,variant_key,printed_identity_modifier,image_url,image_alt_url,sets(name,release_date,identity_model)',
            )
            .eq('name', resolvedName)
            .neq('id', widget.cardPrintId)
            .not('gv_id', 'is', null)
            .order('set_code', ascending: true)
            .order('number_plain', ascending: true, nullsFirst: false)
            .order('number', ascending: true)
            .limit(20);

        relatedRows = (response as List<dynamic>)
            .map((row) => Map<String, dynamic>.from(row as Map))
            .where((row) => _cleanText(row['id']).isNotEmpty)
            .toList();
      }

      final relatedVersionOwnershipByCardPrintId =
          await _primeRelatedVersionOwnership(
            relatedRows.map((row) => _cleanText(row['id'])),
          );

      if (!mounted) {
        return;
      }

      setState(() {
        _cardContextData = contextData;
        _relatedVersions = relatedRows;
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
        _relatedVersionOwnershipByCardPrintId = <String, OwnershipState>{};
      });
    }
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
    final contactOwnerUserId = _cleanText(widget.contactOwnerUserId);
    final currentUserId = supabase.auth.currentUser?.id;

    String? collectorSlug;
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
          collectorSlug = _cleanText(data?.publicSlug);
          canOpenPublicPage = data?.canOpenPublicPage == true;
        } else {
          final data = await VaultGvviService.loadPublic(
            client: supabase,
            gvviId: exactCopyGvviId,
          );
          collectorSlug = _cleanText(data?.ownerSlug);
        }
      }

      if (collectorSlug == null || collectorSlug.isEmpty) {
        if (contactOwnerUserId.isNotEmpty) {
          final rawProfile = await supabase
              .from('public_profiles')
              .select('slug,public_profile_enabled')
              .eq('user_id', contactOwnerUserId)
              .maybeSingle();
          final profile = rawProfile == null
              ? null
              : Map<String, dynamic>.from(rawProfile);
          final slug = _cleanText(profile?['slug']);
          if (profile?['public_profile_enabled'] == true && slug.isNotEmpty) {
            collectorSlug = slug;
          }
        }
      }
    } catch (_) {
      // Ignore action-context lookup failures and keep only statically known actions.
    }

    if (!mounted) {
      return;
    }

    setState(() {
      _collectorSlug = collectorSlug != null && collectorSlug.isNotEmpty
          ? collectorSlug
          : null;
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
    return resolveDisplayIdentityFromFields(
      name: _displayName,
      variantKey: _cleanText(_cardContextData?['variant_key']),
      printedIdentityModifier: _cleanText(
        _cardContextData?['printed_identity_modifier'],
      ),
      setIdentityModel: _cleanText(setRecord?['identity_model']),
      setCode: _resolvedSetCode,
      number: _resolvedCollectorNumber,
    );
  }

  String get _displayTitle => _displayIdentity.displayName;

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

  bool get _canViewCollector => _cleanText(_collectorSlug).isNotEmpty;

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

  Future<void> _openCollector() async {
    final slug = _cleanText(_collectorSlug);
    if (slug.isEmpty) {
      return;
    }

    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PublicCollectorScreen(slug: slug),
      ),
    );
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

  int? get _printedTotalInSet {
    final setRecord = _extractRecord(_cardContextData?['sets']);
    final printedTotal = setRecord?['printed_total'];
    if (printedTotal is num) {
      return printedTotal.toInt();
    }
    return null;
  }

  int? get _listingCount {
    final rawValue = _priceData?['ebay_listing_count'];
    if (rawValue is num) {
      final value = rawValue.toInt();
      return value > 0 ? value : null;
    }
    return null;
  }

  String? get _topMarketSignalLabel {
    final listingCount = _listingCount;
    if (listingCount == null) {
      return null;
    }
    return '$listingCount listing${listingCount == 1 ? '' : 's'}';
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
                      final imageUrl = _bestImageUrl(
                        primary: row['image_url'],
                        fallback: row['image_alt_url'],
                      );
                      final ownershipState = _relatedVersionOwnershipState(
                        cardPrintId,
                      );

                      return Material(
                        color: colorScheme.surface,
                        borderRadius: BorderRadius.circular(18),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () {
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
                          },
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
      _buildActions(context, theme, colorScheme),
      if (_hasContactContext) _buildCollectorNetworkSection(theme, colorScheme),
      _buildPricingSection(theme, colorScheme),
      if (_buildDetailEntries().isNotEmpty)
        _buildCardDetailsSection(theme, colorScheme),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _displayTitle,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 18 + bottomInset),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (var index = 0; index < sections.length; index++) ...[
                if (index > 0) const SizedBox(height: _sectionSpacing),
                sections[index],
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroPanel(ThemeData theme, ColorScheme colorScheme) {
    final ownershipSection = _buildOwnershipSection(theme);

    return _buildSurface(
      colorScheme: colorScheme,
      emphasize: true,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildHeroImage(colorScheme),
          const SizedBox(height: 16),
          _buildIdentitySection(theme, colorScheme),
          if (ownershipSection != null) ...[
            const SizedBox(height: 12),
            ownershipSection,
          ],
        ],
      ),
    );
  }

  Widget _buildHeroImage(ColorScheme colorScheme) {
    final url = (widget.imageUrl ?? '').toString();

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 286),
        child: Container(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.42),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(
              color: colorScheme.outlineVariant.withValues(alpha: 0.42),
            ),
          ),
          padding: const EdgeInsets.all(9),
          child: Container(
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest.withValues(
                alpha: 0.62,
              ),
              borderRadius: BorderRadius.circular(18),
            ),
            padding: const EdgeInsets.all(6),
            child: AspectRatio(
              aspectRatio: 3 / 4,
              child: CardSurfaceArtwork(
                label: _displayTitle,
                imageUrl: url,
                borderRadius: 16,
                padding: const EdgeInsets.all(4),
                showZoomAffordance: url.isNotEmpty,
              ),
            ),
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
    final listingSignal = _topMarketSignalLabel;
    final inSetLabel = _printedTotalInSet != null
        ? 'In this set · ${_printedTotalInSet!} cards'
        : 'In this set';
    final metadataBadges = <Widget>[
      if (_hasVaultContext)
        _buildInfoChip(
          label: 'In your vault',
          icon: Icons.inventory_2_outlined,
          tint: Colors.orange.shade800,
          theme: theme,
        ),
      if (_wantState.want)
        _buildInfoChip(
          label: 'Wanted',
          icon: Icons.favorite_rounded,
          tint: Colors.red.shade500,
          theme: theme,
        ),
      if (rarity.isNotEmpty)
        _buildInfoChip(
          label: rarity,
          tint: _rarityAccentColor(colorScheme, rarity),
          theme: theme,
        ),
      if (listingSignal != null)
        _buildInfoChip(
          label: listingSignal,
          icon: Icons.storefront_outlined,
          tint: colorScheme.primary,
          theme: theme,
        ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _displayTitle,
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w800,
            letterSpacing: -0.6,
            height: 1.04,
          ),
        ),
        if (setName.isNotEmpty || _relatedVersions.isNotEmpty) ...[
          const SizedBox(height: 9),
          Wrap(
            spacing: 10,
            runSpacing: 8,
            children: [
              if (setName.isNotEmpty)
                _buildPrimaryNavCue(
                  eyebrow: 'Set',
                  label: setName,
                  supporting: inSetLabel,
                  theme: theme,
                  colorScheme: colorScheme,
                  onTap: setCode.isNotEmpty ? _openSetDetail : null,
                ),
              if (_hasExactCopyContext)
                _buildPrimaryNavCue(
                  eyebrow: 'Exact copy',
                  label: 'Open exact copy',
                  supporting: _hasVaultContext
                      ? 'Continue to this owned copy'
                      : 'Continue to this specific copy',
                  theme: theme,
                  colorScheme: colorScheme,
                  onTap: _openExactCopy,
                ),
              if (_relatedVersions.isNotEmpty)
                _buildPrimaryNavCue(
                  eyebrow: 'Card family',
                  label: '$relatedVersionCount versions',
                  supporting: 'Explore other prints',
                  theme: theme,
                  colorScheme: colorScheme,
                  onTap: _openOtherVersions,
                ),
            ],
          ),
        ],
        if (collectorIdentity != null) ...[
          const SizedBox(height: 7),
          Text(
            collectorIdentity,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface.withValues(alpha: 0.72),
              height: 1.15,
            ),
          ),
        ],
        if (metadataBadges.isNotEmpty) ...[
          const SizedBox(height: 6),
          Wrap(spacing: 8, runSpacing: 8, children: metadataBadges),
        ],
      ],
    );
  }

  Widget? _buildOwnershipSection(ThemeData theme) {
    final ownershipChips = _buildOwnershipChips(theme);
    if (ownershipChips.isEmpty) {
      return null;
    }

    return Wrap(spacing: 8, runSpacing: 8, children: ownershipChips);
  }

  Widget _buildSurface({
    required ColorScheme colorScheme,
    required Widget child,
    EdgeInsetsGeometry padding = const EdgeInsets.all(14),
    bool emphasize = false,
    bool soft = false,
  }) {
    return Container(
      decoration: _surfaceDecoration(
        colorScheme,
        emphasize: emphasize,
        soft: soft,
      ),
      padding: padding,
      child: child,
    );
  }

  BoxDecoration _surfaceDecoration(
    ColorScheme colorScheme, {
    bool emphasize = false,
    bool soft = false,
  }) {
    return BoxDecoration(
      color: soft
          ? colorScheme.surfaceContainerLowest.withValues(alpha: 0.7)
          : colorScheme.surface,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: colorScheme.outlineVariant.withValues(
          alpha: emphasize
              ? 0.6
              : soft
              ? 0.28
              : 0.45,
        ),
      ),
      boxShadow: [
        BoxShadow(
          color: colorScheme.shadow.withValues(
            alpha: emphasize
                ? 0.1
                : soft
                ? 0.025
                : 0.06,
          ),
          blurRadius: emphasize
              ? 16
              : soft
              ? 4
              : 8,
          offset: Offset(
            0,
            emphasize
                ? 7
                : soft
                ? 1
                : 3,
          ),
        ),
      ],
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

  Color _rarityAccentColor(ColorScheme colorScheme, String rarity) {
    final lower = rarity.toLowerCase();
    if (lower.contains('secret')) {
      return Colors.amber.shade800;
    }
    if (lower.contains('ultra')) {
      return Colors.deepPurple;
    }
    if (lower.contains('rare')) {
      return Colors.blue;
    }
    if (lower.contains('uncommon')) {
      return Colors.green;
    }
    if (lower.contains('common')) {
      return Colors.grey.shade700;
    }
    return colorScheme.tertiary;
  }

  List<Widget> _buildOwnershipChips(ThemeData theme) {
    final chips = <Widget>[];
    final ownershipState = _ownershipState;
    final condition = _cleanText(widget.condition);
    final quantity = widget.quantity;

    if (_ownershipLoading && ownershipState == null) {
      chips.add(
        _buildInfoChip(
          label: 'Checking vault',
          icon: Icons.sync_outlined,
          tint: Colors.blueGrey.shade600,
          theme: theme,
        ),
      );
    }

    if (ownershipState?.owned == true) {
      final ownedCount = ownershipState!.ownedCount;
      chips.add(
        _buildInfoChip(
          label: ownedCount > 1 ? '$ownedCount copies' : 'In your vault',
          icon: Icons.inventory_2_outlined,
          tint: Colors.indigo.shade700,
          theme: theme,
        ),
      );
      if (ownershipState.onWall) {
        chips.add(
          _buildInfoChip(
            label: 'On wall',
            icon: Icons.wallpaper_outlined,
            tint: Colors.deepPurple.shade400,
            theme: theme,
          ),
        );
      }
      if (ownershipState.inPlay) {
        chips.add(
          _buildInfoChip(
            label: 'In play',
            icon: Icons.local_fire_department_outlined,
            tint: Colors.deepOrange.shade500,
            theme: theme,
          ),
        );
      }
    }

    if (condition.isNotEmpty) {
      chips.add(
        _buildInfoChip(
          label: 'Condition $condition',
          icon: Icons.grade_outlined,
          tint: Colors.teal.shade700,
          theme: theme,
        ),
      );
    }

    if (quantity != null) {
      chips.add(
        _buildInfoChip(
          label: 'Qty $quantity',
          icon: Icons.inventory_2_outlined,
          tint: Colors.orange.shade800,
          theme: theme,
        ),
      );
    }

    return chips;
  }

  Widget _buildPrimaryNavCue({
    required String eyebrow,
    required String label,
    required String? supporting,
    required ThemeData theme,
    required ColorScheme colorScheme,
    required VoidCallback? onTap,
  }) {
    final cueChild = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          eyebrow.toUpperCase(),
          style: theme.textTheme.labelSmall?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: 0.75,
            color: colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
        const SizedBox(height: 3),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 220),
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: onTap == null
                      ? colorScheme.onSurface
                      : colorScheme.primary,
                  height: 1.05,
                ),
              ),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 4),
              Icon(
                Icons.arrow_outward_rounded,
                size: 15,
                color: colorScheme.primary,
              ),
            ],
          ],
        ),
        if (_cleanText(supporting).isNotEmpty) ...[
          const SizedBox(height: 2),
          Text(
            supporting!,
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface.withValues(alpha: 0.62),
            ),
          ),
        ],
      ],
    );

    if (onTap == null) {
      return cueChild;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            color: colorScheme.primary.withValues(alpha: 0.045),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: colorScheme.primary.withValues(alpha: 0.12),
            ),
          ),
          padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
          child: cueChild,
        ),
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
          _buildSectionLabel('Collector Actions', theme, colorScheme),
          const SizedBox(height: 6),
          Text(
            _cleanText(widget.contactOwnerDisplayName),
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Use the existing intent path for this exact collector and card.',
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

  Widget _buildCardDetailsSection(ThemeData theme, ColorScheme colorScheme) {
    final detailEntries = _buildDetailEntries();
    if (detailEntries.isEmpty) {
      return const SizedBox.shrink();
    }

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Card Details', theme, colorScheme),
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
      ),
    );
  }

  Widget _buildPricingSection(ThemeData theme, ColorScheme colorScheme) {
    if (_priceLoading && _priceData == null) {
      return _buildSurface(
        colorScheme: colorScheme,
        soft: true,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 6),
            Row(
              children: [
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                const SizedBox(width: 8),
                Text(
                  'Loading pricing…',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.78),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (_priceError != null) {
      return _buildSurface(
        colorScheme: colorScheme,
        soft: true,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 4),
            Text(
              _priceError!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.error,
              ),
            ),
            const SizedBox(height: 6),
            TextButton.icon(
              onPressed: _priceLoading ? null : _loadPricing,
              style: TextButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
                minimumSize: const Size(0, 30),
              ),
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_priceData == null) {
      return _buildSurface(
        colorScheme: colorScheme,
        soft: true,
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 4),
            Text(
              'No pricing data available',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              'Pricing for this card is not available yet.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
              ),
            ),
          ],
        ),
      );
    }

    final data = _priceData!;
    final primaryPrice = (data['primary_price'] as num?)?.toDouble();
    final grookaiValue = (data['grookai_value'] as num?)?.toDouble();
    final minPrice = (data['min_price'] as num?)?.toDouble();
    final maxPrice = (data['max_price'] as num?)?.toDouble();
    final ebayMedianPrice = (data['ebay_median_price'] as num?)?.toDouble();
    final primaryValue = primaryPrice ?? grookaiValue;
    final primaryLabel = primaryPrice != null ? 'Market' : 'Value';
    final primarySource = _pricingSourceName(data['primary_source'] as String?);
    final pricingFooterParts = <String>[
      if (primarySource != null) primarySource,
      if (_hasVaultContext) 'In your vault',
    ];
    final pricingContext = <Widget>[
      if (minPrice != null)
        _buildPricingMetricChip(
          label: 'Low',
          value: _formatMoney(minPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (primaryPrice != null)
        _buildPricingMetricChip(
          label: 'Mid',
          value: _formatMoney(primaryPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (maxPrice != null)
        _buildPricingMetricChip(
          label: 'High',
          value: _formatMoney(maxPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (grookaiValue != null && primaryPrice != null)
        _buildPricingMetricChip(
          label: 'Value',
          value: _formatMoney(grookaiValue),
          theme: theme,
          colorScheme: colorScheme,
        ),
      if (ebayMedianPrice != null)
        _buildPricingMetricChip(
          label: 'eBay',
          value: _formatMoney(ebayMedianPrice),
          theme: theme,
          colorScheme: colorScheme,
        ),
    ];

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (primaryValue == null) ...[
            _buildSectionLabel('Pricing', theme, colorScheme),
            const SizedBox(height: 4),
            Text(
              'No pricing data available',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 1),
            Text(
              'Pricing for this card is not available yet.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: colorScheme.onSurface.withValues(alpha: 0.68),
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
                      _buildSectionLabel('Pricing', theme, colorScheme),
                      const SizedBox(height: 3),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            _formatMoney(primaryValue),
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.55,
                              height: 1.0,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Padding(
                            padding: const EdgeInsets.only(bottom: 3),
                            child: Text(
                              primaryLabel,
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.68,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (pricingFooterParts.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          pricingFooterParts.join(' • '),
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: colorScheme.onSurface.withValues(
                              alpha: 0.58,
                            ),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (_priceLoading)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 4),
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
              const SizedBox(height: 5),
              Wrap(spacing: 6, runSpacing: 6, children: pricingContext),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildPricingMetricChip({
    required String label,
    required String value,
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.32),
        borderRadius: BorderRadius.circular(999),
      ),
      child: RichText(
        text: TextSpan(
          style: theme.textTheme.labelSmall?.copyWith(
            color: colorScheme.onSurface.withValues(alpha: 0.7),
            height: 1.0,
          ),
          children: [
            TextSpan(
              text: '$label ',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            TextSpan(
              text: value,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
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
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      textStyle: theme.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
      ),
    );
  }

  ButtonStyle _secondaryActionButtonStyle(
    ThemeData theme,
    ColorScheme colorScheme,
  ) {
    return OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      side: BorderSide(
        color: colorScheme.outlineVariant.withValues(alpha: 0.9),
      ),
      textStyle: theme.textTheme.labelLarge?.copyWith(
        fontWeight: FontWeight.w700,
      ),
    );
  }

  ButtonStyle _accentActionButtonStyle(
    ThemeData theme,
    ColorScheme colorScheme, {
    required bool active,
  }) {
    final tint = active ? Colors.red.shade500 : colorScheme.primary;
    return OutlinedButton.styleFrom(
      minimumSize: const Size.fromHeight(44),
      backgroundColor: active ? tint.withValues(alpha: 0.1) : null,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      side: BorderSide(
        color: active
            ? tint.withValues(alpha: 0.4)
            : colorScheme.outlineVariant.withValues(alpha: 0.9),
      ),
      foregroundColor: active ? tint : colorScheme.onSurface,
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
        icon: _addingToVault
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.add_circle_outline_rounded),
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
        icon: _addingToVault
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.add_circle_outline_rounded),
        label: Text(_addingToVault ? 'Adding...' : 'Add another copy'),
      ),
      OwnershipAction.openManageCard => FilledButton.icon(
        onPressed: _openManageCard,
        style: _primaryActionButtonStyle(theme),
        icon: const Icon(Icons.tune_rounded),
        label: const Text('Manage card'),
      ),
    };

    final actions = <Widget>[
      primaryOwnershipAction,
      OutlinedButton.icon(
        onPressed: _wantLoading ? null : _toggleWant,
        style: _accentActionButtonStyle(
          theme,
          colorScheme,
          active: _wantState.want,
        ),
        icon: _wantLoading
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(
                _wantState.want
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
              ),
        label: Text(_wantState.want ? 'Wanted' : 'Want this card'),
      ),
      OutlinedButton.icon(
        onPressed: _openCommentsSheet,
        style: _secondaryActionButtonStyle(theme, colorScheme),
        icon: const Icon(Icons.mode_comment_outlined),
        label: const Text('Comments'),
      ),
      OutlinedButton.icon(
        onPressed: _shareCard,
        style: _secondaryActionButtonStyle(theme, colorScheme),
        icon: const Icon(Icons.share_outlined),
        label: const Text('Share'),
      ),
      if ((_ownershipState?.owned ?? false) &&
          ownershipAction != OwnershipAction.addAnotherCopy)
        OutlinedButton.icon(
          onPressed: _addingToVault ? null : _addToVault,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.add_circle_outline_rounded),
          label: const Text('Add another copy'),
        ),
      if ((_ownershipState?.hasExactCopy ?? false) &&
          ownershipAction != OwnershipAction.viewYourCopy)
        OutlinedButton.icon(
          onPressed: _openResolvedOwnedCopy,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.collections_bookmark_outlined),
          label: const Text('View your copy'),
        ),
      if (_canOpenPublicExactCopy)
        OutlinedButton.icon(
          onPressed: _openPublicExactCopy,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.public_outlined),
          label: const Text('Open public page'),
        ),
      if (_canViewCollector)
        OutlinedButton.icon(
          onPressed: _openCollector,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.person_outline_rounded),
          label: const Text('View collector'),
        ),
      if (_canCompare)
        OutlinedButton.icon(
          onPressed: _openCompareWorkspace,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.compare_arrows_rounded),
          label: const Text('Compare'),
        ),
      if (_hasExactCopyContext)
        OutlinedButton.icon(
          onPressed: _openExactCopy,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.open_in_new_rounded),
          label: const Text('Exact copy'),
        ),
      if (_resolvedSetCode.isNotEmpty)
        OutlinedButton.icon(
          onPressed: _openSetDetail,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.view_carousel_outlined),
          label: const Text('Open set'),
        ),
      if (_relatedVersions.isNotEmpty)
        OutlinedButton.icon(
          onPressed: _openOtherVersions,
          style: _secondaryActionButtonStyle(theme, colorScheme),
          icon: const Icon(Icons.layers_outlined),
          label: const Text('Versions'),
        ),
    ];

    if (actions.isEmpty) {
      return const SizedBox.shrink();
    }

    return _buildSurface(
      colorScheme: colorScheme,
      soft: true,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionLabel('Actions', theme, colorScheme),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: actions),
        ],
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
