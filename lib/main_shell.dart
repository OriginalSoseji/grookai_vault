part of 'main.dart';

/// ---------------------- APP SHELL (Home + Vault) ----------------------
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

enum _ExploreHeaderAction { sets, compare }

enum _ShellDestination {
  explore(navIndex: 0, stackIndex: 0, title: 'Explore'),
  wall(navIndex: 1, stackIndex: 1, title: 'My Wall'),
  network(navIndex: 3, stackIndex: 2, title: 'Network'),
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
        return _ShellDestination.explore;
      case 1:
        return _ShellDestination.wall;
      case 3:
        return _ShellDestination.network;
      case 4:
        return _ShellDestination.vault;
      default:
        return _ShellDestination.wall;
    }
  }
}

class _AppShellState extends State<AppShell> {
  final SupabaseClient _supabase = Supabase.instance.client;
  final GlobalKey<HomePageState> _homeKey = GlobalKey();
  final GlobalKey<_MyWallTabState> _wallKey = GlobalKey();
  final GlobalKey<NetworkScreenState> _networkKey = GlobalKey();
  final GlobalKey<VaultPageState> _vaultKey = GlobalKey();

  late final List<Widget> _shellPages;
  _ShellDestination _destination = _ShellDestination.wall;

  @override
  void initState() {
    super.initState();
    _shellPages = [
      HomePage(key: _homeKey),
      _MyWallTab(
        key: _wallKey,
        onOpenBySlug: _openPublicCollectorPrompt,
        onOpenAccount: _openAccountHub,
      ),
      NetworkScreen(key: _networkKey),
      VaultPage(key: _vaultKey),
    ];
  }

  Future<void> _signOut() async => _supabase.auth.signOut();

  Future<T?> _pushPage<T>(Widget page) {
    return Navigator.of(
      context,
    ).push<T>(MaterialPageRoute<T>(builder: (_) => page));
  }

  void _selectDestination(_ShellDestination destination) {
    if (_destination == destination) {
      return;
    }
    setState(() {
      _destination = destination;
    });
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
        _selectDestination(_ShellDestination.network);
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
      case _ShellDestination.explore:
        _homeKey.currentState?.reload();
        break;
      case _ShellDestination.wall:
        _wallKey.currentState?.reload();
        break;
      case _ShellDestination.network:
        _networkKey.currentState?.reload();
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
      const ConditionCameraScreen(
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
      if (_destination == _ShellDestination.explore)
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
      if (_destination == _ShellDestination.network)
        _appBarActionButton(
          icon: Icons.mail_outline_rounded,
          tooltip: 'Messages',
          onPressed: _openMessages,
        ),
      if (_destination != _ShellDestination.explore)
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
    return Scaffold(
      extendBody: true,
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
      body: IndexedStack(index: _destination.stackIndex, children: _shellPages),
      bottomNavigationBar: SafeArea(
        top: false,
        maintainBottomViewPadding: true,
        child: NavigationBar(
          height: kShellBottomNavHeight,
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
              icon: Icon(Icons.search),
              selectedIcon: Icon(Icons.search),
              label: 'Explore',
            ),
            NavigationDestination(
              icon: Icon(Icons.public_outlined),
              selectedIcon: Icon(Icons.public),
              label: 'Wall',
            ),
            NavigationDestination(
              icon: Icon(Icons.camera_alt_outlined),
              selectedIcon: Icon(Icons.camera_alt),
              label: 'Scan',
            ),
            NavigationDestination(
              icon: Icon(Icons.hub_outlined),
              selectedIcon: Icon(Icons.hub),
              label: 'Network',
            ),
            NavigationDestination(
              icon: Icon(Icons.inventory_2_outlined),
              selectedIcon: Icon(Icons.inventory_2),
              label: 'Vault',
            ),
          ],
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
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;

  SupabaseClient get supabase => Supabase.instance.client;

  Future<void> _signIn() async {
    setState(() => _loading = true);
    try {
      await supabase.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on AuthException catch (e) {
      _snack('Login failed: ${e.message}');
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _signUp() async {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Welcome to Grookai Vault',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 8),
                Text(
                  'Sign in to manage your collection, track prices, and build your vault.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    prefixIcon: Icon(Icons.email),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    prefixIcon: Icon(Icons.lock),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _loading ? null : _signIn,
                  child: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Sign in'),
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _loading ? null : _signUp,
                  child: const Text('Create account'),
                ),
              ],
            ),
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
