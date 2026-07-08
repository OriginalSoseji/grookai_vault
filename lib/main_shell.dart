part of 'main.dart';

/// ---------------------- APP SHELL (Home + Vault) ----------------------
class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    this.pendingCanonicalLink,
    this.onCanonicalLinkHandled,
    this.pendingDebugAction,
    this.onDebugActionHandled,
    required this.themeMode,
    required this.onThemeModeChanged,
  });

  final PendingCanonicalLinkRequest? pendingCanonicalLink;
  final ValueChanged<int>? onCanonicalLinkHandled;
  final PendingDebugActionRequest? pendingDebugAction;
  final ValueChanged<int>? onDebugActionHandled;
  final ThemeMode themeMode;
  final ValueChanged<ThemeMode> onThemeModeChanged;

  @override
  State<AppShell> createState() => _AppShellState();
}

enum _ExploreHeaderAction { dex, sets, compare }

enum _ShellDestination {
  // BOTTOM_NAV_LUXURY_PASS_V1
  // Primary app navigation is behavior-first: Search, Feed, Scan, Wall, Vault.
  search(navIndex: 0, stackIndex: 0, title: 'Search'),
  feed(navIndex: 1, stackIndex: 1, title: 'Feed'),
  wall(navIndex: 3, stackIndex: 2, title: 'Wall'),
  vault(navIndex: 4, stackIndex: 3, title: 'Vault');

  const _ShellDestination({
    required this.navIndex,
    required this.stackIndex,
    required this.title,
  });

  final int navIndex;
  final int stackIndex;
  final String title;
}

class _AppShellState extends State<AppShell> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  final GlobalKey<HomePageState> _homeKey = GlobalKey();
  final GlobalKey<_MyWallTabState> _wallKey = GlobalKey();
  final GlobalKey<NetworkScreenState> _networkKey = GlobalKey();
  final GlobalKey<VaultPageState> _vaultKey = GlobalKey();

  late final List<Widget?> _shellPages;
  _ShellDestination _destination = _ShellDestination.feed;
  int? _lastHandledCanonicalLinkId;
  int? _lastHandledDebugActionId;
  bool _handlingCanonicalLink = false;
  bool _handlingDebugAction = false;
  bool _scannerPrewarmInFlight = false;
  bool _bottomNavCollapsed = false;
  bool _relationshipRouteLoading = false;
  int _pulseUnreadCount = 0;

  @override
  void initState() {
    super.initState();
    AppBootTiming.mark('app_shell_init_state_start');
    // PERFORMANCE_P1_SHELL_LAZY_TABS
    // Defers heavy tab construction until first visit while preserving tab
    // retention after a surface has been opened once.
    _shellPages = List<Widget?>.filled(
      _ShellDestination.values.length,
      null,
      growable: false,
    );
    _ensureShellPageBuilt(_destination);
    AppBootTiming.mark('app_shell_initial_page_built');
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AppBootTiming.markOnce('app_shell_first_post_frame');
      unawaited(_maybeHandlePendingCanonicalLink());
      unawaited(_maybeHandlePendingDebugAction());
      if (!kScannerConstructionPlaceholderEnabled &&
          !kFixedSlotCaptureScannerV1Enabled &&
          kNativeScannerPhase0Enabled) {
        unawaited(NativeScannerPhase0Bridge.startSession());
      }
      if (!kScannerConstructionPlaceholderEnabled &&
          !kFixedSlotCaptureScannerV1Enabled) {
        unawaited(_prewarmScanCardSurface(reason: 'shell_ready'));
      }
    });
    AppBootTiming.mark('app_shell_init_state_complete');
  }

  @override
  void didUpdateWidget(covariant AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextId = widget.pendingCanonicalLink?.id;
    final previousId = oldWidget.pendingCanonicalLink?.id;
    if (nextId != null && nextId != previousId) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        unawaited(_maybeHandlePendingCanonicalLink());
      });
    }
    final nextDebugId = widget.pendingDebugAction?.id;
    final previousDebugId = oldWidget.pendingDebugAction?.id;
    if (nextDebugId != null && nextDebugId != previousDebugId) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        unawaited(_maybeHandlePendingDebugAction());
      });
    }
  }

  void _ensureShellPageBuilt(_ShellDestination destination) {
    final index = destination.stackIndex;
    _shellPages[index] ??= _buildShellPage(destination);
  }

  Widget _buildShellPage(_ShellDestination destination) {
    switch (destination) {
      case _ShellDestination.search:
        return HomePage(key: _homeKey);
      case _ShellDestination.feed:
        return NetworkScreen(
          key: _networkKey,
          onPulseUnreadChanged: _handlePulseUnreadChanged,
        );
      case _ShellDestination.wall:
        return _MyWallTab(
          key: _wallKey,
          onOpenBySlug: _openPublicCollectorPrompt,
          onOpenAccount: _openAccountHub,
        );
      case _ShellDestination.vault:
        return VaultPage(key: _vaultKey);
    }
  }

  Future<void> _signOut() async {
    await GrookaiPushNotificationService.instance
        .disableCurrentTokenBeforeSignOut();
    await _supabase.auth.signOut();
  }

  Future<T?> _pushPage<T>(Widget page) {
    return Navigator.of(
      context,
    ).push<T>(MaterialPageRoute<T>(builder: (_) => page));
  }

  Future<void> _prewarmScanCardSurface({required String reason}) async {
    if (_scannerPrewarmInFlight) {
      return;
    }
    if (!ScannerNativeCameraGuardrail.nativeConditionCameraRequestedForScanCard(
      defaultTargetPlatform,
    )) {
      return;
    }

    _scannerPrewarmInFlight = true;
    try {
      final initialMetrics = await NativeConditionCameraBridge.prewarmSession();
      await Future<void>.delayed(const Duration(milliseconds: 650));
      final metrics = await NativeConditionCameraBridge.getPrewarmMetrics();
      if (kDebugMode) {
        debugPrint(
          '[scanner_prewarm] reason=$reason '
          'initial=${initialMetrics.status} '
          'status=${metrics.status} '
          'first_frame_ms=${metrics.timeToFirstFrameMs ?? -1} '
          'frames=${metrics.frameCount ?? 0}',
        );
      }
    } on MissingPluginException catch (error) {
      if (kDebugMode) {
        debugPrint('[scanner_prewarm] reason=$reason unavailable=$error');
      }
    } catch (error) {
      if (kDebugMode) {
        debugPrint('[scanner_prewarm] reason=$reason failed=$error');
      }
    } finally {
      _scannerPrewarmInFlight = false;
    }
  }

  Future<void> _maybeHandlePendingCanonicalLink() async {
    final pendingLink = widget.pendingCanonicalLink;
    if (!mounted ||
        pendingLink == null ||
        _handlingCanonicalLink ||
        _lastHandledCanonicalLinkId == pendingLink.id) {
      return;
    }

    _handlingCanonicalLink = true;
    _lastHandledCanonicalLinkId = pendingLink.id;
    try {
      await _openCanonicalRoute(pendingLink.route);
    } finally {
      _handlingCanonicalLink = false;
      widget.onCanonicalLinkHandled?.call(pendingLink.id);
    }
  }

  Future<void> _maybeHandlePendingDebugAction() async {
    if (!kDebugMode) return;
    final pendingAction = widget.pendingDebugAction;
    if (!mounted ||
        pendingAction == null ||
        _handlingDebugAction ||
        _lastHandledDebugActionId == pendingAction.id) {
      return;
    }

    _handlingDebugAction = true;
    _lastHandledDebugActionId = pendingAction.id;
    try {
      await _openDebugAction(pendingAction.action);
    } finally {
      _handlingDebugAction = false;
      widget.onDebugActionHandled?.call(pendingAction.id);
    }
  }

  Future<void> _openDebugAction(String action) async {
    if (action != _MyAppState._scannerV4AutoTestAction) return;
    debugPrint('[scanner_v4_auto_test] adb_action_opening_scanner');
    await _pushPage<void>(
      const ConditionCameraScreen(
        title: 'Scan Card',
        hintText: 'Align card inside the frame',
        autoStartScannerV4DiagnosticTest: true,
      ),
    );
  }

  Future<void> _openCanonicalRoute(GrookaiCanonicalRoute route) async {
    // DEEP_LINKING_UNIVERSAL_LINKS_V1
    // Canonical web URLs are the single source of truth for app deep-link
    // routing.
    switch (route.kind) {
      case GrookaiCanonicalRouteKind.card:
        await _openCardDetailFromCanonicalGvId(route.value);
        break;
      case GrookaiCanonicalRouteKind.collector:
        await _pushPage<void>(PublicCollectorScreen(slug: route.value));
        break;
      case GrookaiCanonicalRouteKind.collectorSection:
        return _buildCollectorSection(route);
      case GrookaiCanonicalRouteKind.set:
        await _pushPage<void>(PublicSetDetailScreen(setCode: route.value));
        break;
      case GrookaiCanonicalRouteKind.feed:
        _selectDestination(_ShellDestination.feed);
        if (route.value == 'pulse') {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              _networkKey.currentState?.openPulse();
            }
          });
        }
        break;
    }
  }

  void _handlePulseUnreadChanged(int count) {
    final normalized = count < 0 ? 0 : count;
    if (!mounted || _pulseUnreadCount == normalized) {
      return;
    }
    setState(() => _pulseUnreadCount = normalized);
  }

  Future<void> _buildCollectorSection(GrookaiCanonicalRoute route) async {
    await _pushPage<void>(
      PublicCollectorScreen(
        slug: route.value,
        initialSectionId: route.sectionId,
      ),
    );
  }

  Future<void> _openCardDetailFromCanonicalGvId(String gvId) async {
    final normalizedGvId = gvId.trim();
    if (normalizedGvId.isEmpty) {
      return;
    }

    Map<String, dynamic>? cardRow;
    try {
      final directMatch = await _supabase
          .from('card_prints')
          .select(
            'id,gv_id,name,set_code,number,number_plain,rarity,image_url,image_alt_url,image_source,image_path,representative_image_url,sets(name)',
          )
          .eq('gv_id', normalizedGvId)
          .maybeSingle();
      cardRow = directMatch == null
          ? null
          : Map<String, dynamic>.from(directMatch);

      if (cardRow == null) {
        final uppercaseGvId = normalizedGvId.toUpperCase();
        if (uppercaseGvId != normalizedGvId) {
          final uppercaseMatch = await _supabase
              .from('card_prints')
              .select(
                'id,gv_id,name,set_code,number,number_plain,rarity,image_url,image_alt_url,image_source,image_path,representative_image_url,sets(name)',
              )
              .eq('gv_id', uppercaseGvId)
              .maybeSingle();
          cardRow = uppercaseMatch == null
              ? null
              : Map<String, dynamic>.from(uppercaseMatch);
        }
      }
    } catch (_) {
      cardRow = null;
    }

    if (!mounted) {
      return;
    }

    if (cardRow != null) {
      final enriched = await CanonImageUrlService.enrichRows([cardRow]);
      if (!mounted) {
        return;
      }
      cardRow = enriched.first;
    }

    final cardPrintId = _routeText(cardRow?['id']);
    if (cardRow == null || cardPrintId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('That shared card could not be opened.')),
      );
      return;
    }

    final setData = cardRow['sets'];
    final setName = setData is Map ? _routeText(setData['name']) : '';
    final imageUrl = _routeDisplayImageUrl(cardRow);
    final displayNumber = _routeText(cardRow['number']).isNotEmpty
        ? _routeText(cardRow['number'])
        : _routeText(cardRow['number_plain']);

    await _pushPage<void>(
      CardDetailScreen(
        cardPrintId: cardPrintId,
        gvId: _routeText(cardRow['gv_id']).isEmpty
            ? normalizedGvId
            : _routeText(cardRow['gv_id']),
        name: _routeText(cardRow['name']).isEmpty
            ? null
            : _routeText(cardRow['name']),
        setCode: _routeText(cardRow['set_code']).isEmpty
            ? null
            : _routeText(cardRow['set_code']),
        setName: setName.isEmpty ? null : setName,
        number: displayNumber.isEmpty ? null : displayNumber,
        rarity: _routeText(cardRow['rarity']).isEmpty
            ? null
            : _routeText(cardRow['rarity']),
        imageUrl: imageUrl,
      ),
    );
  }

  String? _routeDisplayImageUrl(Map<String, dynamic>? row) {
    if (row == null) {
      return null;
    }

    return CanonImageUrlService.displayImageUrlFromRow(row) ??
        _routeHttpImageUrl(row['display_image_url']) ??
        _routeHttpImageUrl(row['image_url']) ??
        _routeHttpImageUrl(row['image_alt_url']) ??
        _routeHttpImageUrl(row['representative_image_url']);
  }

  String? _routeHttpImageUrl(dynamic value) {
    final normalized = _routeText(value);
    if (normalized.isEmpty) {
      return null;
    }

    final uri = Uri.tryParse(normalized);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      return null;
    }

    return normalized;
  }

  static String _routeText(dynamic value) => (value ?? '').toString().trim();

  void _selectDestination(_ShellDestination destination) {
    if (_destination == destination) {
      if (destination == _ShellDestination.wall) {
        // MY_WALL_FOLLOWER_COUNT_FIX_V1
        // Ensures signed-in My Wall header uses the authoritative follow
        // count source instead of a retained stale profile instance.
        _wallKey.currentState?.reload();
      }
      return;
    }
    _ensureShellPageBuilt(destination);
    setState(() {
      _destination = destination;
      _bottomNavCollapsed = false;
    });
    if (destination == _ShellDestination.wall) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          return;
        }
        _wallKey.currentState?.reload();
      });
    }
  }

  Future<void> _openSets() async {
    await _pushPage<void>(const PublicSetsScreen());
  }

  bool _handleShellScroll(UserScrollNotification notification) {
    if (ModalRoute.of(context)?.isCurrent == false) {
      if (_bottomNavCollapsed) {
        setState(() => _bottomNavCollapsed = false);
      }
      return false;
    }
    if (notification.metrics.axis != Axis.vertical) {
      return false;
    }
    final atTop =
        notification.metrics.pixels <= notification.metrics.minScrollExtent + 8;
    final shouldCollapse = notification.direction == ScrollDirection.reverse;
    final shouldExpand =
        notification.direction == ScrollDirection.forward || atTop;

    if (shouldCollapse && !_bottomNavCollapsed) {
      setState(() => _bottomNavCollapsed = true);
    } else if (shouldExpand && _bottomNavCollapsed) {
      setState(() => _bottomNavCollapsed = false);
    }
    return false;
  }

  Future<void> _openDex() async {
    await _pushPage<void>(const GrookaiDexScreen());
  }

  Future<void> _openCompare() async {
    await _pushPage<void>(const CompareScreen());
  }

  Future<void> _openMessages() async {
    await _pushPage<void>(const NetworkInboxScreen());
  }

  Future<void> _openNearby() async {
    await _pushPage<void>(const NetworkNearbyScreen());
  }

  Future<void> _openNearbyMap() async {
    await _pushPage<void>(const NetworkNearbyMapScreen());
  }

  Future<void> _openAccountHub() async {
    final action = await _pushPage<AccountHubAction>(const AccountScreen());

    if (!mounted || action == null) {
      return;
    }

    switch (action) {
      case AccountHubAction.wall:
        _selectDestination(_ShellDestination.wall);
        break;
      case AccountHubAction.vault:
        _selectDestination(_ShellDestination.vault);
        break;
      case AccountHubAction.network:
        _selectDestination(_ShellDestination.feed);
        break;
      case AccountHubAction.sets:
        await _openSets();
        break;
      case AccountHubAction.messages:
        await _openMessages();
        break;
      case AccountHubAction.signOut:
        await _signOut();
        break;
    }
  }

  Future<void> _openOwnRelationships(
    PublicCollectorRelationshipMode mode,
  ) async {
    final userId = (_supabase.auth.currentUser?.id ?? '').trim();
    if (userId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Sign in to view collector relationships.'),
        ),
      );
      return;
    }
    if (_relationshipRouteLoading) {
      return;
    }

    setState(() => _relationshipRouteLoading = true);
    try {
      final entry = await PublicCollectorService.resolveOwnEntry(
        client: _supabase,
        userId: userId,
      ).timeout(const Duration(seconds: 12));

      if (!mounted) {
        return;
      }

      final slug = (entry.slug ?? '').trim();
      if (entry.state != PublicCollectorEntryState.ready || slug.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Turn on your public Wall before viewing relationships.',
            ),
          ),
        );
        return;
      }

      final profile = await PublicCollectorService.loadPublicProfileBySlug(
        client: _supabase,
        slug: slug,
      ).timeout(const Duration(seconds: 12));

      if (!mounted) {
        return;
      }

      if (profile == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Unable to load your collector profile.'),
          ),
        );
        return;
      }

      _scaffoldKey.currentState?.closeEndDrawer();
      await _pushPage<void>(
        PublicCollectorRelationshipScreen(profile: profile, mode: mode),
      );
    } catch (_) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to load collector relationships.'),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _relationshipRouteLoading = false);
      }
    }
  }

  void _refreshCurrent() {
    switch (_destination) {
      case _ShellDestination.search:
        _homeKey.currentState?.reload();
        break;
      case _ShellDestination.feed:
        _networkKey.currentState?.reload();
        break;
      case _ShellDestination.wall:
        _wallKey.currentState?.reload();
        break;
      case _ShellDestination.vault:
        _vaultKey.currentState?.reload();
        break;
    }
  }

  Future<void> _openPublicCollectorPrompt() async {
    final slug = await _showPublicCollectorSlugPrompt(context);

    if (!mounted) {
      return;
    }

    final normalizedSlug = _normalizePublicCollectorSlugInput(slug ?? '');
    if (normalizedSlug.isEmpty) {
      return;
    }

    await _pushPage<void>(PublicCollectorScreen(slug: normalizedSlug));
  }

  Future<void> _startScanFlow() async {
    if (kScannerV5Enabled) {
      await _pushPage<void>(const ScanCaptureV5Screen());
      return;
    }

    if (kScannerConstructionPlaceholderEnabled) {
      final action = await _pushPage<ScannerBuildPlaceholderAction>(
        const ScannerBuildPlaceholderScreen(),
      );
      if (!mounted || action == null) {
        return;
      }
      switch (action) {
        case ScannerBuildPlaceholderAction.search:
          _selectDestination(_ShellDestination.search);
          break;
        case ScannerBuildPlaceholderAction.vault:
          _selectDestination(_ShellDestination.vault);
          break;
      }
      return;
    }

    if (kFixedSlotCaptureScannerV1Enabled) {
      await _pushPage<void>(const FixedSlotCaptureScreen());
      return;
    }
    if (kNativeScannerPhase0Enabled) {
      await _pushPage<void>(const NativeScannerPhase0Screen());
      return;
    }

    unawaited(_prewarmScanCardSurface(reason: 'scan_tap'));
    final file = await _pushPage<XFile?>(
      ConditionCameraScreen(
        title: 'Scan Card',
        hintText: 'Align card inside the frame',
      ),
    );

    if (!mounted || file == null) {
      unawaited(_prewarmScanCardSurface(reason: 'scan_return'));
      return;
    }

    await _pushPage<void>(IdentityScanScreen(initialFrontFile: file));
    if (mounted) {
      unawaited(_prewarmScanCardSurface(reason: 'identity_return'));
    }
  }

  IconButton _appBarActionButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return IconButton(
      tooltip: tooltip,
      icon: Icon(icon),
      onPressed: onPressed,
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints.tightFor(width: 34, height: 34),
    );
  }

  List<Widget> _buildAppBarActions({required bool isDesktopShell}) {
    return [
      if (_destination == _ShellDestination.search)
        ValueListenableBuilder<List<String>>(
          valueListenable: CompareCardSelectionController.instance.listenable,
          builder: (context, selectedIds, _) {
            final compareCount = selectedIds.length;

            return PopupMenuButton<_ExploreHeaderAction>(
              tooltip: 'Explore actions',
              onSelected: (value) {
                switch (value) {
                  case _ExploreHeaderAction.dex:
                    _openDex();
                    break;
                  case _ExploreHeaderAction.sets:
                    _openSets();
                    break;
                  case _ExploreHeaderAction.compare:
                    _openCompare();
                    break;
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: _ExploreHeaderAction.dex,
                  child: Text('Grookai Dex'),
                ),
                const PopupMenuItem(
                  value: _ExploreHeaderAction.sets,
                  child: Text('Sets'),
                ),
                if (compareCount > 0)
                  PopupMenuItem(
                    value: _ExploreHeaderAction.compare,
                    child: Text(
                      compareCount == 1
                          ? 'Compare 1 selected card'
                          : 'Compare $compareCount selected cards',
                    ),
                  ),
              ],
              icon: Stack(
                clipBehavior: Clip.none,
                children: [
                  const Icon(Icons.more_horiz_rounded),
                  if (compareCount > 0)
                    Positioned(
                      right: -8,
                      top: -6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '$compareCount',
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(
                                color: Theme.of(context).colorScheme.onPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ),
                    ),
                ],
              ),
            );
          },
        ),
      if (_destination == _ShellDestination.wall)
        _appBarActionButton(
          icon: Icons.public,
          tooltip: 'Open public collector',
          onPressed: _openPublicCollectorPrompt,
        ),
      _appBarActionButton(
        icon: Icons.mail_outline_rounded,
        tooltip: 'Messages',
        onPressed: _openMessages,
      ),
      if (isDesktopShell && _destination != _ShellDestination.search)
        _appBarActionButton(
          icon: Icons.refresh,
          tooltip: 'Refresh',
          onPressed: _refreshCurrent,
        ),
      _appBarActionButton(
        tooltip: 'Account',
        icon: Icons.account_circle_outlined,
        onPressed: _openAccountHub,
      ),
      _appBarActionButton(
        tooltip: 'Menu',
        icon: Icons.menu_rounded,
        onPressed: () => _scaffoldKey.currentState?.openEndDrawer(),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDesktopShell = MediaQuery.sizeOf(context).width >= 900;
    final keyboardVisible = MediaQuery.viewInsetsOf(context).bottom > 0;
    final bottomSafeInset = MediaQuery.viewPaddingOf(context).bottom;
    final shellChildren = List<Widget>.generate(
      _ShellDestination.values.length,
      (index) => _shellPages[index] ?? const SizedBox.shrink(),
      growable: false,
    );
    final shellBody = IndexedStack(
      index: _destination.stackIndex,
      children: shellChildren,
    );
    final mobileShellBody = NotificationListener<UserScrollNotification>(
      onNotification: _handleShellScroll,
      child: shellBody,
    );

    return Scaffold(
      key: _scaffoldKey,
      extendBody: !isDesktopShell,
      resizeToAvoidBottomInset: false,
      endDrawer: _GrookaiAppDrawer(
        signedIn: _supabase.auth.currentUser != null,
        relationshipRouteLoading: _relationshipRouteLoading,
        onOpenDex: _openDex,
        onOpenSets: _openSets,
        onOpenCompare: _openCompare,
        onOpenNearby: _openNearby,
        onOpenNearbyMap: _openNearbyMap,
        onOpenAccount: _openAccountHub,
        onOpenFollowers: () =>
            _openOwnRelationships(PublicCollectorRelationshipMode.followers),
        onOpenFollowing: () =>
            _openOwnRelationships(PublicCollectorRelationshipMode.following),
        themeMode: widget.themeMode,
        onThemeModeChanged: widget.onThemeModeChanged,
      ),
      appBar: AppBar(
        toolbarHeight: kShellAppBarHeight,
        actionsPadding: const EdgeInsets.only(right: 6),
        title: Text(
          _destination.title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        actions: _buildAppBarActions(isDesktopShell: isDesktopShell),
      ),
      body: isDesktopShell
          ? Row(
              children: [
                _GrookaiDesktopRail(
                  currentDestination: _destination,
                  onOpenSearch: () =>
                      _selectDestination(_ShellDestination.search),
                  onOpenFeed: () => _selectDestination(_ShellDestination.feed),
                  onOpenWall: () => _selectDestination(_ShellDestination.wall),
                  onOpenVault: () =>
                      _selectDestination(_ShellDestination.vault),
                  onOpenScan: _startScanFlow,
                  onOpenDex: () => unawaited(_openDex()),
                  onOpenSets: () => unawaited(_openSets()),
                  onOpenCompare: () => unawaited(_openCompare()),
                  onOpenMessages: () => unawaited(_openMessages()),
                  onOpenAccount: () => unawaited(_openAccountHub()),
                  onOpenMenu: () => _scaffoldKey.currentState?.openEndDrawer(),
                ),
                VerticalDivider(
                  width: 1,
                  thickness: 1,
                  color: colorScheme.outline.withValues(alpha: 0.08),
                ),
                Expanded(child: shellBody),
              ],
            )
          : mobileShellBody,
      bottomNavigationBar: isDesktopShell
          ? null
          : _buildMobileBottomDock(
              context: context,
              colorScheme: colorScheme,
              keyboardVisible: keyboardVisible,
              bottomSafeInset: bottomSafeInset,
            ),
    );
  }

  Widget _buildMobileBottomDock({
    required BuildContext context,
    required ColorScheme colorScheme,
    required bool keyboardVisible,
    required double bottomSafeInset,
  }) {
    final routeIsCurrent = ModalRoute.of(context)?.isCurrent ?? true;
    final collapsed = routeIsCurrent && _bottomNavCollapsed && !keyboardVisible;
    return AnimatedSlide(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOutCubic,
      offset: keyboardVisible ? const Offset(0, 1.2) : Offset.zero,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 160),
        opacity: keyboardVisible ? 0 : 1,
        child: SafeArea(
          top: false,
          minimum: EdgeInsets.fromLTRB(18, 4, 18, bottomSafeInset > 0 ? 4 : 14),
          child: Align(
            alignment: Alignment.bottomCenter,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 190),
              curve: Curves.easeOutCubic,
              constraints: BoxConstraints(
                maxWidth: 390,
                minHeight: collapsed
                    ? kShellBottomNavCollapsedHeight
                    : kShellBottomNavHeight,
              ),
              child: GvSurface(
                variant: GvSurfaceVariant.glass,
                borderRadius: 34,
                padding: EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: collapsed ? 6 : 8,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.max,
                  children: [
                    Expanded(
                      child: _buildDockButton(
                        colorScheme: colorScheme,
                        navIndex: 0,
                        label: 'Search',
                        icon: Icons.search_rounded,
                        collapsed: collapsed,
                        onPressed: () =>
                            _selectDestination(_ShellDestination.search),
                      ),
                    ),
                    Expanded(
                      child: _buildDockButton(
                        colorScheme: colorScheme,
                        navIndex: 1,
                        label: 'Feed',
                        icon: Icons.dynamic_feed_rounded,
                        collapsed: collapsed,
                        badgeCount: _pulseUnreadCount,
                        onPressed: () =>
                            _selectDestination(_ShellDestination.feed),
                      ),
                    ),
                    Expanded(
                      child: _buildDockButton(
                        colorScheme: colorScheme,
                        navIndex: 2,
                        label: 'Scan',
                        icon: Icons.center_focus_strong_rounded,
                        collapsed: collapsed,
                        isPrimaryAction: true,
                        onPressed: _startScanFlow,
                      ),
                    ),
                    Expanded(
                      child: _buildDockButton(
                        colorScheme: colorScheme,
                        navIndex: 3,
                        label: 'Wall',
                        icon: Icons.collections_bookmark_rounded,
                        collapsed: collapsed,
                        onPressed: () =>
                            _selectDestination(_ShellDestination.wall),
                      ),
                    ),
                    Expanded(
                      child: _buildDockButton(
                        colorScheme: colorScheme,
                        navIndex: 4,
                        label: 'Vault',
                        icon: Icons.inventory_2_rounded,
                        collapsed: collapsed,
                        onPressed: () =>
                            _selectDestination(_ShellDestination.vault),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDockButton({
    required ColorScheme colorScheme,
    required int navIndex,
    required String label,
    required IconData icon,
    required bool collapsed,
    bool isPrimaryAction = false,
    int badgeCount = 0,
    required VoidCallback onPressed,
  }) {
    final selected = _destination.navIndex == navIndex;
    final foreground = selected
        ? colorScheme.onPrimaryContainer
        : colorScheme.onSurface.withValues(alpha: 0.68);
    final background = selected
        ? colorScheme.primaryContainer.withValues(alpha: 0.86)
        : Colors.transparent;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Tooltip(
        message: label,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onPressed,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            height: collapsed ? 50 : 54,
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            decoration: BoxDecoration(
              color: background,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (isPrimaryAction)
                  Container(
                    width: collapsed ? 28 : 30,
                    height: collapsed ? 28 : 30,
                    decoration: BoxDecoration(
                      color: selected
                          ? colorScheme.primary
                          : colorScheme.primary.withValues(alpha: 0.16),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: colorScheme.primary.withValues(alpha: 0.46),
                      ),
                    ),
                    child: Icon(
                      icon,
                      size: 17,
                      color: selected
                          ? colorScheme.onPrimary
                          : colorScheme.primary,
                    ),
                  )
                else
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Icon(icon, size: selected ? 19 : 18, color: foreground),
                      if (badgeCount > 0)
                        Positioned(
                          right: -13,
                          top: -8,
                          child: _DockUnreadBadge(count: badgeCount),
                        ),
                    ],
                  ),
                const SizedBox(height: 2),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: foreground,
                    fontSize: collapsed ? 10 : 11,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
                    letterSpacing: 0,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DockUnreadBadge extends StatelessWidget {
  const _DockUnreadBadge({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final label = count > 99 ? '99+' : count.toString();
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFF0AF6E),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.82),
          width: 1.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4.5, vertical: 1.5),
        child: Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: const Color(0xFF17120A),
            fontSize: 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 0,
            height: 1,
          ),
        ),
      ),
    );
  }
}

class _GrookaiDesktopRail extends StatelessWidget {
  const _GrookaiDesktopRail({
    required this.currentDestination,
    required this.onOpenSearch,
    required this.onOpenFeed,
    required this.onOpenWall,
    required this.onOpenVault,
    required this.onOpenScan,
    required this.onOpenDex,
    required this.onOpenSets,
    required this.onOpenCompare,
    required this.onOpenMessages,
    required this.onOpenAccount,
    required this.onOpenMenu,
  });

  final _ShellDestination currentDestination;
  final VoidCallback onOpenSearch;
  final VoidCallback onOpenFeed;
  final VoidCallback onOpenWall;
  final VoidCallback onOpenVault;
  final VoidCallback onOpenScan;
  final VoidCallback onOpenDex;
  final VoidCallback onOpenSets;
  final VoidCallback onOpenCompare;
  final VoidCallback onOpenMessages;
  final VoidCallback onOpenAccount;
  final VoidCallback onOpenMenu;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return SafeArea(
      right: false,
      child: Container(
        width: 216,
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 16),
        color: colorScheme.surface.withValues(alpha: 0.985),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 4, 10, 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Grookai',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    'Collector OS',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.55),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
            _GrookaiRailTile(
              icon: Icons.search_rounded,
              label: 'Search',
              selected: currentDestination == _ShellDestination.search,
              onTap: onOpenSearch,
            ),
            _GrookaiRailTile(
              icon: Icons.dynamic_feed_rounded,
              label: 'Feed',
              selected: currentDestination == _ShellDestination.feed,
              onTap: onOpenFeed,
            ),
            _GrookaiRailTile(
              icon: Icons.center_focus_strong_rounded,
              label: 'Scan',
              onTap: onOpenScan,
            ),
            _GrookaiRailTile(
              icon: Icons.collections_bookmark_rounded,
              label: 'Wall',
              selected: currentDestination == _ShellDestination.wall,
              onTap: onOpenWall,
            ),
            _GrookaiRailTile(
              icon: Icons.inventory_2_rounded,
              label: 'Vault',
              selected: currentDestination == _ShellDestination.vault,
              onTap: onOpenVault,
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 10),
              child: Divider(height: 1),
            ),
            _GrookaiRailTile(
              icon: Icons.catching_pokemon_rounded,
              label: 'Dex',
              onTap: onOpenDex,
            ),
            _GrookaiRailTile(
              icon: Icons.style_rounded,
              label: 'Sets',
              onTap: onOpenSets,
            ),
            _GrookaiRailTile(
              icon: Icons.compare_arrows_rounded,
              label: 'Compare',
              onTap: onOpenCompare,
            ),
            const Spacer(),
            _GrookaiRailTile(
              icon: Icons.mail_rounded,
              label: 'Messages',
              onTap: onOpenMessages,
            ),
            _GrookaiRailTile(
              icon: Icons.account_circle_rounded,
              label: 'Account',
              onTap: onOpenAccount,
            ),
            _GrookaiRailTile(
              icon: Icons.menu_rounded,
              label: 'All tools',
              onTap: onOpenMenu,
            ),
          ],
        ),
      ),
    );
  }
}

class _GrookaiRailTile extends StatelessWidget {
  const _GrookaiRailTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.selected = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final foreground = selected
        ? colorScheme.primary
        : colorScheme.onSurface.withValues(alpha: 0.76);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: selected
            ? colorScheme.primary.withValues(alpha: 0.09)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Icon(icon, color: foreground, size: 21),
                const SizedBox(width: 11),
                Expanded(
                  child: Text(
                    label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: foreground,
                      fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GrookaiAppDrawer extends StatelessWidget {
  const _GrookaiAppDrawer({
    required this.signedIn,
    required this.relationshipRouteLoading,
    required this.onOpenDex,
    required this.onOpenSets,
    required this.onOpenCompare,
    required this.onOpenNearby,
    required this.onOpenNearbyMap,
    required this.onOpenAccount,
    required this.onOpenFollowers,
    required this.onOpenFollowing,
    required this.themeMode,
    required this.onThemeModeChanged,
  });

  final bool signedIn;
  final bool relationshipRouteLoading;
  final Future<void> Function() onOpenDex;
  final Future<void> Function() onOpenSets;
  final Future<void> Function() onOpenCompare;
  final Future<void> Function() onOpenNearby;
  final Future<void> Function() onOpenNearbyMap;
  final Future<void> Function() onOpenAccount;
  final Future<void> Function() onOpenFollowers;
  final Future<void> Function() onOpenFollowing;
  final ThemeMode themeMode;
  final ValueChanged<ThemeMode> onThemeModeChanged;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return NavigationDrawer(
      selectedIndex: null,
      onDestinationSelected: (_) {},
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 22, 20, 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Grookai Vault',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'Collector tools',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.62),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const Divider(indent: 20, endIndent: 20),
        if (kLocalCommunityFeedV1Enabled)
          _GrookaiDrawerTile(
            icon: Icons.radar_rounded,
            label: 'Nearby',
            onTap: () => _closeThenAsync(context, onOpenNearby),
          ),
        if (kLocalCommunityFeedV1Enabled)
          _GrookaiDrawerTile(
            icon: Icons.map_outlined,
            label: 'Nearby Map',
            onTap: () => _closeThenAsync(context, onOpenNearbyMap),
          ),
        const Divider(indent: 20, endIndent: 20),
        _GrookaiDrawerTile(
          icon: Icons.catching_pokemon_rounded,
          label: 'Grookai Dex',
          onTap: () => _closeThenAsync(context, onOpenDex),
        ),
        _GrookaiDrawerTile(
          icon: Icons.style_rounded,
          label: 'Sets',
          onTap: () => _closeThenAsync(context, onOpenSets),
        ),
        _GrookaiDrawerTile(
          icon: Icons.compare_arrows_rounded,
          label: 'Compare',
          onTap: () => _closeThenAsync(context, onOpenCompare),
        ),
        if (signedIn)
          _GrookaiDrawerTile(
            icon: Icons.group_outlined,
            label: 'Followers',
            enabled: !relationshipRouteLoading,
            trailing: relationshipRouteLoading
                ? const _GrookaiDrawerLoadingIndicator()
                : null,
            onTap: () => unawaited(onOpenFollowers()),
          ),
        if (signedIn)
          _GrookaiDrawerTile(
            icon: Icons.people_alt_outlined,
            label: 'Following',
            enabled: !relationshipRouteLoading,
            trailing: relationshipRouteLoading
                ? const _GrookaiDrawerLoadingIndicator()
                : null,
            onTap: () => unawaited(onOpenFollowing()),
          ),
        _GrookaiDrawerTile(
          icon: Icons.account_circle_rounded,
          label: 'Account',
          onTap: () => _closeThenAsync(context, onOpenAccount),
        ),
        const Divider(indent: 20, endIndent: 20),
        _GrookaiDrawerAppearanceSelector(
          value: themeMode,
          onChanged: onThemeModeChanged,
        ),
      ],
    );
  }

  void _closeThenAsync(BuildContext context, Future<void> Function() action) {
    Navigator.of(context).pop();
    unawaited(action());
  }
}

class _GrookaiDrawerTile extends StatelessWidget {
  const _GrookaiDrawerTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.enabled = true,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool enabled;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final foreground = colorScheme.onSurface.withValues(
      alpha: enabled ? 0.82 : 0.46,
    );

    return ListTile(
      leading: Icon(icon, color: foreground),
      title: Text(
        label,
        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
          color: foreground,
          fontWeight: FontWeight.w600,
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
      trailing: trailing,
      enabled: enabled,
      onTap: enabled ? onTap : null,
    );
  }
}

class _GrookaiDrawerLoadingIndicator extends StatelessWidget {
  const _GrookaiDrawerLoadingIndicator();

  @override
  Widget build(BuildContext context) {
    return const SizedBox.square(
      dimension: 18,
      child: CircularProgressIndicator(strokeWidth: 2),
    );
  }
}

class _GrookaiDrawerAppearanceSelector extends StatelessWidget {
  const _GrookaiDrawerAppearanceSelector({
    required this.value,
    required this.onChanged,
  });

  final ThemeMode value;
  final ValueChanged<ThemeMode> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 10, 24, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Appearance',
            style: theme.textTheme.labelLarge?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.68),
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: SegmentedButton<ThemeMode>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment<ThemeMode>(
                  value: ThemeMode.system,
                  icon: Icon(Icons.auto_awesome_rounded, size: 17),
                  label: Text('Auto'),
                ),
                ButtonSegment<ThemeMode>(
                  value: ThemeMode.light,
                  icon: Icon(Icons.light_mode_rounded, size: 17),
                  label: Text('Light'),
                ),
                ButtonSegment<ThemeMode>(
                  value: ThemeMode.dark,
                  icon: Icon(Icons.dark_mode_rounded, size: 17),
                  label: Text('Dark'),
                ),
              ],
              selected: {value},
              onSelectionChanged: (selection) {
                final selected = selection.isEmpty ? null : selection.first;
                if (selected != null) {
                  onChanged(selected);
                }
              },
              style: ButtonStyle(
                visualDensity: VisualDensity.compact,
                textStyle: WidgetStatePropertyAll(
                  theme.textTheme.labelMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// ---------------------- LOGIN PAGE ----------------------
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  static const bool _kAuthDiagnostics = false;
  static const String _kGoogleRedirectUri = 'grookaivault://login-callback';

  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _showEmailForm = false;
  String? _loginError;

  SupabaseClient get supabase => Supabase.instance.client;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (mounted) {
      setState(() {
        _loginError = null;
      });
    }
    setState(() => _loading = true);
    try {
      final response = await supabase.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
      _debugAuth(
        'success sessionPresent=${response.session != null} '
        'currentSessionPresent=${supabase.auth.currentSession != null}',
      );
    } on AuthException catch (e) {
      _debugAuth('failure error=${e.message}');
      if (mounted) {
        setState(() {
          _loginError = e.message;
        });
      }
      _snack('Login failed: ${e.message}');
    } catch (error, stackTrace) {
      _debugAuth('failure error=$error', stackTrace: stackTrace);
      if (mounted) {
        setState(() {
          _loginError = error.toString();
        });
      }
      _snack('Login failed: $error');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _signInWithGoogle() async {
    FocusScope.of(context).unfocus();
    if (_loading) {
      return;
    }
    _debugGoogleOAuthTap('tap');
    setState(() {
      _loginError = null;
      _loading = true;
    });
    try {
      _debugGoogleOAuthTap(
        'launch redirect=$_kGoogleRedirectUri currentSessionPresent='
        '${supabase.auth.currentSession != null}',
      );
      final launched = await supabase.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: kIsWeb ? null : _kGoogleRedirectUri,
      );
      _debugGoogleOAuthTap('launch result=$launched');
      _debugAuth('google launched=$launched');
      if (!launched) {
        throw const AuthException('Google sign in could not be opened.');
      }
    } on AuthException catch (e) {
      _debugAuth('google failure error=${e.message}');
      _debugGoogleOAuthTap('launch auth exception=${e.message}');
      if (mounted) {
        setState(() {
          _loginError = e.message;
        });
      }
      _snack('Google sign in failed: ${e.message}');
    } catch (error, stackTrace) {
      _debugAuth('google failure error=$error', stackTrace: stackTrace);
      _debugGoogleOAuthTap('launch unexpected error=$error');
      if (mounted) {
        setState(() {
          _loginError = error.toString();
        });
      }
      _snack('Google sign in failed: $error');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _debugGoogleOAuthTap(String message) {
    if (!_kGoogleOAuthDiagnostics) {
      return;
    }
    debugPrint('[GOOGLE_OAUTH_V1] $message');
  }

  void _submitSignIn() {
    FocusScope.of(context).unfocus();
    if (_loading) {
      return;
    }
    setState(() {
      _loginError = null;
    });
    unawaited(_signIn());
  }

  void _debugAuth(String message, {StackTrace? stackTrace}) {
    if (!_kAuthDiagnostics) {
      return;
    }
    assert(() {
      debugPrint('AUTH_V1 $message');
      if (stackTrace != null) {
        debugPrintStack(stackTrace: stackTrace);
      }
      return true;
    }());
  }

  void _showEmailEntry() {
    FocusScope.of(context).unfocus();
    if (_loading) {
      return;
    }
    setState(() {
      _showEmailForm = true;
      _loginError = null;
    });
  }

  Future<void> _signUp() async {
    FocusScope.of(context).unfocus();
    if (mounted) {
      setState(() {
        _loginError = null;
      });
    }
    setState(() => _loading = true);
    try {
      await supabase.auth.signUp(
        email: _email.text.trim(),
        password: _password.text,
      );
      _snack('Account created. Verify email if enabled.');
    } on AuthException catch (e) {
      _snack('Sign up failed: ${e.message}');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _snack(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  InputDecoration _authFieldDecoration({
    required String label,
    required IconData icon,
  }) {
    final scheme = Theme.of(context).colorScheme;
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 18),
      filled: true,
      fillColor: scheme.surface.withValues(alpha: 0.42),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.10)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(
          color: scheme.primary.withValues(alpha: 0.88),
          width: 1.3,
        ),
      ),
    );
  }

  Widget _buildHero(ColorScheme scheme, TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 20, 10, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const _LoginBrandMark(),
          const SizedBox(height: 16),
          // LOGIN_BRAND_LOCKUP_NAME_V1
          // The login hero pairs the official Grookai mark with the Grookai Vault name as a premium brand lockup.
          Text(
            'Grookai Vault',
            textAlign: TextAlign.center,
            style: textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
              color: Colors.white.withValues(alpha: 0.82),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Collect with purpose.',
            textAlign: TextAlign.center,
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: 0,
              height: 0.98,
              fontSize: 38,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Show your collection, connect with collectors, and act when it matters.',
            textAlign: TextAlign.center,
            style: textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.68),
              height: 1.42,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGoogleButton() {
    return FilledButton(
      onPressed: _loading ? null : _signInWithGoogle,
      style: FilledButton.styleFrom(
        backgroundColor: const Color(0xFFF4F1EA),
        foregroundColor: const Color(0xFF111318),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const _LoginGoogleMark(),
          const SizedBox(width: 12),
          Text(
            _loading ? 'Opening Google...' : 'Continue with Google',
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }

  Widget _buildEmailEntryButton(ColorScheme scheme) {
    return OutlinedButton(
      onPressed: _showEmailForm || _loading ? null : _showEmailEntry,
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white.withValues(alpha: 0.88),
        disabledForegroundColor: Colors.white.withValues(alpha: 0.38),
        backgroundColor: Colors.white.withValues(alpha: 0.01),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.22)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      child: const Text(
        'Continue with Email',
        style: TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _buildEmailForm(ColorScheme scheme, TextTheme textTheme) {
    return AnimatedCrossFade(
      duration: const Duration(milliseconds: 220),
      crossFadeState: _showEmailForm
          ? CrossFadeState.showSecond
          : CrossFadeState.showFirst,
      firstChild: const SizedBox.shrink(),
      secondChild: Padding(
        padding: const EdgeInsets.only(top: 14),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            color: Colors.white.withValues(alpha: 0.04),
            border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
          ),
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Use email instead',
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Keep your collector identity, vault, and shared shelves under one login.',
                style: textTheme.bodySmall?.copyWith(
                  color: scheme.onSurface.withValues(alpha: 0.68),
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: _authFieldDecoration(
                  label: 'Email',
                  icon: Icons.alternate_email_rounded,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _submitSignIn(),
                decoration: _authFieldDecoration(
                  label: 'Password',
                  icon: Icons.lock_outline_rounded,
                ),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _loading ? null : _submitSignIn,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Sign in'),
              ),
              const SizedBox(height: 4),
              Align(
                alignment: Alignment.center,
                child: TextButton(
                  onPressed: _loading ? null : _signUp,
                  child: const Text('Create account with email'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    const overlayStyle = SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarDividerColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
    );
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlayStyle,
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: () => FocusScope.of(context).unfocus(),
        child: Scaffold(
          resizeToAvoidBottomInset: true,
          body: Stack(
            children: [
              const _LoginBackgroundAura(),
              SafeArea(
                child: LayoutBuilder(
                  builder: (context, constraints) => SingleChildScrollView(
                    padding: EdgeInsets.fromLTRB(20, 18, 20, 20 + bottomInset),
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: (constraints.maxHeight - 38).clamp(
                          0.0,
                          double.infinity,
                        ),
                      ),
                      child: Center(
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 440),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _buildHero(scheme, textTheme),
                              const SizedBox(height: 34),
                              // MOBILE_LOGIN_GOOGLE_REDESIGN_V1
                              // The mobile auth entry is a branded first-impression surface with Google as the primary sign-in path.
                              _buildGoogleButton(),
                              const SizedBox(height: 14),
                              _buildEmailEntryButton(scheme),
                              _buildEmailForm(scheme, textTheme),
                              if (_loginError != null) ...[
                                const SizedBox(height: 14),
                                Text(
                                  _loginError!,
                                  textAlign: TextAlign.center,
                                  style: textTheme.bodySmall?.copyWith(
                                    color: scheme.error,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 22),
                              Text(
                                'Use one Grookai identity across your vault, wall, and collector feed.',
                                textAlign: TextAlign.center,
                                style: textTheme.bodySmall?.copyWith(
                                  color: Colors.white.withValues(alpha: 0.46),
                                  height: 1.35,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LoginBackgroundAura extends StatelessWidget {
  const _LoginBackgroundAura();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF090B11), Color(0xFF0D1119), Color(0xFF111620)],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.white.withValues(alpha: 0.035),
                    Colors.transparent,
                    Colors.white.withValues(alpha: 0.018),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LoginBrandMark extends StatelessWidget {
  const _LoginBrandMark();

  static const String _kGrookaiLogoAsset =
      'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png';

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(34),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4A90E2).withValues(alpha: 0.12),
            blurRadius: 34,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(30),
        child: SizedBox(
          width: 112,
          height: 112,
          // LOGIN_BRAND_POLISH_V1
          // Use the official Grookai logo as the login hero brand mark.
          child: Image.asset(
            _kGrookaiLogoAsset,
            fit: BoxFit.cover,
            filterQuality: FilterQuality.high,
          ),
        ),
      ),
    );
  }
}

class _LoginGoogleMark extends StatelessWidget {
  const _LoginGoogleMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFFF4F4F4),
        border: Border.all(color: const Color(0x22000000)),
      ),
      child: const Center(
        child: Text(
          'G',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: Color(0xFF2A61D6),
          ),
        ),
      ),
    );
  }
}

class _MyWallTab extends StatefulWidget {
  const _MyWallTab({
    required this.onOpenBySlug,
    required this.onOpenAccount,
    super.key,
  });

  final Future<void> Function() onOpenBySlug;
  final Future<void> Function() onOpenAccount;

  @override
  State<_MyWallTab> createState() => _MyWallTabState();
}

class _MyWallTabState extends State<_MyWallTab> {
  final SupabaseClient _client = Supabase.instance.client;
  StreamSubscription<AuthState>? _authSubscription;
  bool _loading = true;
  bool _loadFailed = false;
  PublicCollectorEntryState _entryState =
      PublicCollectorEntryState.missingProfile;
  String? _slug;
  int _contentVersion = 0;
  int _loadVersion = 0;
  String? _lastUserId;

  @override
  void initState() {
    super.initState();
    _lastUserId = _client.auth.currentUser?.id;
    _authSubscription = _client.auth.onAuthStateChange.listen((event) {
      final nextUserId = event.session?.user.id;
      if (nextUserId == _lastUserId) {
        return;
      }
      _lastUserId = nextUserId;
      if (mounted) {
        unawaited(_load());
      }
    });
    _load();
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    final loadVersion = ++_loadVersion;
    final userId = (_client.auth.currentUser?.id ?? '').trim();
    if (mounted) {
      setState(() {
        _loading = true;
        _loadFailed = false;
      });
    }

    if (userId.isEmpty) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }
      setState(() {
        _entryState = PublicCollectorEntryState.missingProfile;
        _slug = null;
        _loading = false;
        _loadFailed = false;
      });
      return;
    }

    try {
      final entry = await PublicCollectorService.resolveOwnEntry(
        client: _client,
        userId: userId,
      ).timeout(const Duration(seconds: 12));

      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _entryState = entry.state;
        _slug = entry.slug;
        _loading = false;
        _loadFailed = false;
        _contentVersion++;
      });
    } catch (_) {
      if (!mounted || loadVersion != _loadVersion) {
        return;
      }

      setState(() {
        _loading = false;
        _loadFailed = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_loadFailed) {
      return ListView(
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          shellContentBottomPadding(context),
        ),
        children: const [
          _ProductEmptyState(
            title: 'Unable to load My Wall',
            body: 'Try again in a moment.',
          ),
        ],
      );
    }

    if (_entryState == PublicCollectorEntryState.ready &&
        _slug != null &&
        _slug!.isNotEmpty) {
      return PublicCollectorScreen(
        key: ValueKey('my-wall-${_slug!}-$_contentVersion'),
        slug: _slug!,
        showAppBar: false,
        embeddedInShell: true,
        onOpenSettings: () => unawaited(widget.onOpenAccount()),
      );
    }

    final unavailableTitle =
        _entryState == PublicCollectorEntryState.unavailable
        ? 'My Wall is not public right now'
        : 'My Wall is not ready yet';
    final unavailableBody = _entryState == PublicCollectorEntryState.unavailable
        ? 'Your public profile or vault sharing is turned off, so the public wall cannot be shown here.'
        : 'Your account does not have a public collector slug yet.';

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.fromLTRB(
          16,
          16,
          16,
          shellContentBottomPadding(context),
        ),
        children: [
          _ProductSurfaceCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  unavailableTitle,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  unavailableBody,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.72),
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton(
                        onPressed: widget.onOpenAccount,
                        child: const Text('Open account settings'),
                      ),
                      OutlinedButton(
                        onPressed: widget.onOpenBySlug,
                        child: const Text('Open by slug'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
