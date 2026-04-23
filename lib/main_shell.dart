part of 'main.dart';

/// ---------------------- APP SHELL (Home + Vault) ----------------------
class AppShell extends StatefulWidget {
  const AppShell({
    super.key,
    this.pendingCanonicalLink,
    this.onCanonicalLinkHandled,
  });

  final PendingCanonicalLinkRequest? pendingCanonicalLink;
  final ValueChanged<int>? onCanonicalLinkHandled;

  @override
  State<AppShell> createState() => _AppShellState();
}

enum _ExploreHeaderAction { sets, compare }

enum _ShellDestination {
  // BOTTOM_NAV_LUXURY_PASS_V1
  // Primary app navigation is behavior-first: Search, Feed, Scan, Wall, Vault.
  search(navIndex: 0, stackIndex: 0, title: 'Search'),
  feed(navIndex: 1, stackIndex: 1, title: 'Feed'),
  wall(navIndex: 3, stackIndex: 2, title: 'My Wall'),
  vault(navIndex: 4, stackIndex: 3, title: 'Vault');

  const _ShellDestination({
    required this.navIndex,
    required this.stackIndex,
    required this.title,
  });

  final int navIndex;
  final int stackIndex;
  final String title;

  static _ShellDestination fromNavIndex(int index) {
    switch (index) {
      case 0:
        return _ShellDestination.search;
      case 1:
        return _ShellDestination.feed;
      case 3:
        return _ShellDestination.wall;
      case 4:
        return _ShellDestination.vault;
      default:
        return _ShellDestination.feed;
    }
  }
}

class _AppShellState extends State<AppShell> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final GlobalKey<HomePageState> _homeKey = GlobalKey();
  final GlobalKey<_MyWallTabState> _wallKey = GlobalKey();
  final GlobalKey<NetworkScreenState> _networkKey = GlobalKey();
  final GlobalKey<VaultPageState> _vaultKey = GlobalKey();

  late final List<Widget?> _shellPages;
  _ShellDestination _destination = _ShellDestination.feed;
  int? _lastHandledCanonicalLinkId;
  bool _handlingCanonicalLink = false;

  @override
  void initState() {
    super.initState();
    // PERFORMANCE_P1_SHELL_LAZY_TABS
    // Defers heavy tab construction until first visit while preserving tab
    // retention after a surface has been opened once.
    _shellPages = List<Widget?>.filled(
      _ShellDestination.values.length,
      null,
      growable: false,
    );
    _ensureShellPageBuilt(_destination);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_maybeHandlePendingCanonicalLink());
    });
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
        return NetworkScreen(key: _networkKey);
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

  Future<void> _signOut() async => _supabase.auth.signOut();

  Future<T?> _pushPage<T>(Widget page) {
    return Navigator.of(
      context,
    ).push<T>(MaterialPageRoute<T>(builder: (_) => page));
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
    }
  }

  Future<void> _buildCollectorSection(GrookaiCanonicalRoute route) async {
    await _pushPage<void>(PublicCollectorScreen(slug: route.value));
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
            'id,gv_id,name,set_code,number,number_plain,rarity,image_url,image_alt_url,representative_image_url,sets(name)',
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
                'id,gv_id,name,set_code,number,number_plain,rarity,image_url,image_alt_url,representative_image_url,sets(name)',
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

    return _routeHttpImageUrl(row['display_image_url']) ??
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

  Future<void> _openCompare() async {
    await _pushPage<void>(const CompareScreen());
  }

  Future<void> _openMessages() async {
    await _pushPage<void>(const NetworkInboxScreen());
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

  Future<String?> _showPublicCollectorSlugPrompt() async {
    var draftSlug = '';
    return showDialog<String>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Open Public Collector'),
        content: TextField(
          autofocus: true,
          textInputAction: TextInputAction.go,
          decoration: const InputDecoration(
            labelText: 'Collector slug',
            hintText: 'Enter /u/slug',
          ),
          onChanged: (value) {
            draftSlug = value;
          },
          onSubmitted: (value) {
            Navigator.of(dialogContext).pop(value.trim());
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(draftSlug.trim()),
            child: const Text('Open'),
          ),
        ],
      ),
    );
  }

  Future<void> _openPublicCollectorPrompt() async {
    final slug = await _showPublicCollectorSlugPrompt();

    if (!mounted) {
      return;
    }

    final normalizedSlug = (slug ?? '').trim().toLowerCase();
    if (normalizedSlug.isEmpty) {
      return;
    }

    await _pushPage<void>(PublicCollectorScreen(slug: normalizedSlug));
  }

  Future<void> _startScanFlow() async {
    final file = await _pushPage<XFile?>(
      ConditionCameraScreen(
        title: 'Scan Card',
        hintText: 'Align card inside the frame',
      ),
    );

    if (!mounted || file == null) {
      return;
    }

    await _pushPage<void>(IdentityScanScreen(initialFrontFile: file));
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

  List<Widget> _buildAppBarActions() {
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
                  value: _ExploreHeaderAction.sets,
                  child: Text('Browse sets'),
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
      if (_destination != _ShellDestination.search)
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
    ];
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final bottomSafeInset = MediaQuery.viewPaddingOf(context).bottom;
    final shellChildren = List<Widget>.generate(
      _ShellDestination.values.length,
      (index) => _shellPages[index] ?? const SizedBox.shrink(),
      growable: false,
    );
    final navRadius = BorderRadius.circular(22);

    return Scaffold(
      extendBody: false,
      resizeToAvoidBottomInset: false,
      appBar: AppBar(
        toolbarHeight: kShellAppBarHeight,
        actionsPadding: const EdgeInsets.only(right: 6),
        title: Text(
          _destination.title,
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        ),
        actions: _buildAppBarActions(),
      ),
      body: IndexedStack(
        index: _destination.stackIndex,
        children: shellChildren,
      ),
      // BOTTOM_NAV_CORRECTION_V1
      // Compact dock geometry and safe-area handling so the bottom nav feels
      // anchored, not oversized.
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: EdgeInsets.fromLTRB(10, 4, 10, bottomSafeInset > 0 ? 2 : 6),
        child: Padding(
          padding: const EdgeInsets.only(top: 2),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: colorScheme.surface.withValues(
                alpha: isDark ? 0.985 : 0.975,
              ),
              borderRadius: navRadius,
              border: Border.all(
                color: colorScheme.outline.withValues(
                  alpha: isDark ? 0.12 : 0.07,
                ),
              ),
              boxShadow: [
                BoxShadow(
                  color: colorScheme.shadow.withValues(
                    alpha: isDark ? 0.12 : 0.05,
                  ),
                  blurRadius: isDark ? 16 : 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: navRadius,
              child: NavigationBarTheme(
                data: NavigationBarTheme.of(context).copyWith(
                  backgroundColor: Colors.transparent,
                  indicatorColor: colorScheme.onSurface.withValues(
                    alpha: isDark ? 0.09 : 0.045,
                  ),
                  height: kShellBottomNavHeight,
                  labelBehavior:
                      NavigationDestinationLabelBehavior.onlyShowSelected,
                  iconTheme: WidgetStateProperty.resolveWith((states) {
                    if (states.contains(WidgetState.selected)) {
                      return IconThemeData(
                        color: colorScheme.primary,
                        size: 20,
                      );
                    }
                    return IconThemeData(
                      color: colorScheme.onSurface.withValues(alpha: 0.54),
                      size: 19,
                    );
                  }),
                  labelTextStyle: WidgetStateProperty.resolveWith((states) {
                    final baseStyle = theme.textTheme.labelSmall;
                    if (states.contains(WidgetState.selected)) {
                      return baseStyle?.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.w700,
                        fontSize: 10.4,
                        letterSpacing: 0.08,
                      );
                    }
                    return baseStyle?.copyWith(
                      color: colorScheme.onSurface.withValues(alpha: 0.56),
                      fontWeight: FontWeight.w500,
                      fontSize: 10.1,
                      letterSpacing: 0.08,
                    );
                  }),
                ),
                child: NavigationBar(
                  elevation: 0,
                  labelPadding: const EdgeInsets.only(top: 1),
                  selectedIndex: _destination.navIndex,
                  onDestinationSelected: (index) {
                    if (index == 2) {
                      _startScanFlow();
                      return;
                    }
                    _selectDestination(_ShellDestination.fromNavIndex(index));
                  },
                  destinations: const [
                    NavigationDestination(
                      icon: Icon(Icons.search_rounded),
                      selectedIcon: Icon(Icons.search_rounded),
                      label: 'Search',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.dynamic_feed_outlined),
                      selectedIcon: Icon(Icons.dynamic_feed_rounded),
                      label: 'Feed',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.center_focus_strong_outlined),
                      selectedIcon: Icon(Icons.center_focus_strong_rounded),
                      label: 'Scan',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.person_outline_rounded),
                      selectedIcon: Icon(Icons.person_rounded),
                      label: 'Wall',
                    ),
                    NavigationDestination(
                      icon: Icon(Icons.inventory_2_outlined),
                      selectedIcon: Icon(Icons.inventory_2_rounded),
                      label: 'Vault',
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
              color: scheme.onSurface.withValues(alpha: 0.88),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Collect with purpose.',
            textAlign: TextAlign.center,
            style: textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.9,
              height: 0.98,
              fontSize: 38,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Show your collection, connect with collectors, and act when it matters.',
            textAlign: TextAlign.center,
            style: textTheme.bodyMedium?.copyWith(
              color: scheme.onSurface.withValues(alpha: 0.70),
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
        foregroundColor: scheme.onSurface,
        backgroundColor: Colors.white.withValues(alpha: 0.01),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        side: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
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
                                  color: scheme.onSurface.withValues(
                                    alpha: 0.54,
                                  ),
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
        children: const [
          Positioned(
            top: -90,
            left: -40,
            child: _LoginGlowOrb(diameter: 240, color: Color(0x334A90E2)),
          ),
          Positioned(
            right: -90,
            top: 180,
            child: _LoginGlowOrb(diameter: 260, color: Color(0x22C7F284)),
          ),
          Positioned(
            left: 50,
            bottom: -110,
            child: _LoginGlowOrb(diameter: 220, color: Color(0x22F2A55A)),
          ),
        ],
      ),
    );
  }
}

class _LoginGlowOrb extends StatelessWidget {
  const _LoginGlowOrb({required this.diameter, required this.color});

  final double diameter;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: diameter,
        height: diameter,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
        ),
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
  bool _loading = true;
  bool _loadFailed = false;
  PublicCollectorEntryState _entryState =
      PublicCollectorEntryState.missingProfile;
  String? _slug;
  int _contentVersion = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> reload() => _load();

  Future<void> _load() async {
    final userId = _client.auth.currentUser?.id ?? '';
    if (mounted) {
      setState(() {
        _loading = true;
        _loadFailed = false;
      });
    }

    try {
      final entry = await PublicCollectorService.resolveOwnEntry(
        client: _client,
        userId: userId,
      );

      if (!mounted) {
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
      if (!mounted) {
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
