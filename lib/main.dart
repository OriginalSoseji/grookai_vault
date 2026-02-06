// lib/main.dart
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter/services.dart';

import 'card_detail_screen.dart';
import 'models/card_print.dart';
import 'secrets.dart';
import 'screens/scanner/scan_capture_screen.dart';

ThemeData _buildGrookaiTheme(Brightness brightness) {
  const seed = Color(0xFF4A90E2);

  final base = ThemeData(
    useMaterial3: true,
    colorSchemeSeed: seed,
    brightness: brightness,
  );

  final colorScheme = base.colorScheme;

  return base.copyWith(
    scaffoldBackgroundColor: colorScheme.surface,
    appBarTheme: AppBarTheme(
      elevation: 0,
      centerTitle: false,
      backgroundColor: colorScheme.surface,
      foregroundColor: colorScheme.onSurface,
      titleTextStyle: base.textTheme.titleLarge?.copyWith(
        fontWeight: FontWeight.w700,
        color: colorScheme.onSurface,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: colorScheme.surface,
      indicatorColor: colorScheme.primary.withOpacity(0.18),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return IconThemeData(color: colorScheme.primary);
        }
        return IconThemeData(color: colorScheme.onSurface.withOpacity(0.7));
      }),
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final style = base.textTheme.labelMedium;
        if (states.contains(WidgetState.selected)) {
          return style?.copyWith(
            fontWeight: FontWeight.w600,
            color: colorScheme.primary,
          );
        }
        return style?.copyWith(
          color: colorScheme.onSurface.withOpacity(0.7),
        );
      }),
    ),
    cardTheme: CardThemeData(
      color: colorScheme.surfaceVariant.withOpacity(0.8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: base.inputDecorationTheme.copyWith(
      filled: false,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: colorScheme.outline.withOpacity(0.4),
          width: 1,
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: colorScheme.outline.withOpacity(0.4),
          width: 1,
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: colorScheme.primary,
          width: 1.4,
        ),
      ),
    ),
    textTheme: base.textTheme.copyWith(
      headlineSmall: base.textTheme.headlineSmall?.copyWith(
        fontWeight: FontWeight.w700,
        letterSpacing: -0.2,
      ),
      titleMedium: base.textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
      ),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(
        fontWeight: FontWeight.w500,
      ),
      labelSmall: base.textTheme.labelSmall?.copyWith(
        letterSpacing: 0.3,
        fontWeight: FontWeight.w500,
      ),
    ),
    snackBarTheme: base.snackBarTheme.copyWith(
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
  );
}

abstract class _CatalogRow {
  _CatalogRow();
}

class _CatalogHeaderRow extends _CatalogRow {
  final String title;
  _CatalogHeaderRow(this.title);
}

class _CatalogCardRow extends _CatalogRow {
  final CardPrint card;
  _CatalogCardRow(this.card);
}

class _TrendingHeaderBar extends StatelessWidget {
  const _TrendingHeaderBar({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Icon(
              Icons.trending_up,
              size: 16,
              color: colorScheme.primary,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Today\'s trending cards',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Popular & high-interest prints right now.',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withOpacity(0.7),
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

enum _RarityFilter { all, common, uncommon, rare, ultra }

class _SetIconBadge extends StatelessWidget {
  final CardPrint card;

  const _SetIconBadge({required this.card, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final setCode = card.setCode.toUpperCase();
    final setLabel = setCode.isNotEmpty
        ? setCode
        : (card.displaySet.isNotEmpty ? card.displaySet : 'SET');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: colorScheme.primary.withOpacity(0.5),
          width: 0.7,
        ),
      ),
      child: Text(
        setLabel,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
          color: colorScheme.primary.withOpacity(0.9),
        ),
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
}

class _RarityIconBadge extends StatelessWidget {
  final String? rarity;

  const _RarityIconBadge({required this.rarity, super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final raw = (rarity ?? '').trim();
    if (raw.isEmpty) {
      return const SizedBox.shrink();
    }

    final lower = raw.toLowerCase();

    Color bg;
    Color border;
    String label;

    if (lower.contains('secret')) {
      bg = Colors.amber.withOpacity(0.14);
      border = Colors.amber.withOpacity(0.7);
      label = 'SR';
    } else if (lower.contains('ultra')) {
      bg = Colors.deepPurple.withOpacity(0.14);
      border = Colors.deepPurple.withOpacity(0.7);
      label = 'UR';
    } else if (lower.contains('rare')) {
      bg = Colors.blue.withOpacity(0.14);
      border = Colors.blue.withOpacity(0.7);
      label = 'R';
    } else if (lower.contains('uncommon')) {
      bg = Colors.green.withOpacity(0.14);
      border = Colors.green.withOpacity(0.7);
      label = 'U';
    } else if (lower.contains('common')) {
      bg = Colors.grey.withOpacity(0.16);
      border = Colors.grey.withOpacity(0.7);
      label = 'C';
    } else {
      bg = colorScheme.secondary.withOpacity(0.14);
      border = colorScheme.secondary.withOpacity(0.7);
      label =
          raw.length > 3 ? raw.substring(0, 3).toUpperCase() : raw.toUpperCase();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: border, width: 0.7),
      ),
      child: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w600,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class _CatalogSkeletonTile extends StatelessWidget {
  const _CatalogSkeletonTile({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final base = colorScheme.surfaceVariant.withOpacity(0.7);
    final highlight = colorScheme.surfaceVariant.withOpacity(0.4);

    Widget bar({double width = 120, double height = 10}) {
      return Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: base,
          borderRadius: BorderRadius.circular(8),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Container(
        decoration: BoxDecoration(
          color: highlight,
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: base,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  bar(width: 160, height: 12),
                  const SizedBox(height: 6),
                  bar(width: 110, height: 10),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VaultItemTile extends StatelessWidget {
  final Map<String, dynamic> row;
  final VoidCallback? onIncrement;
  final VoidCallback? onDecrement;
  final VoidCallback? onDelete;
  final VoidCallback? onTap;
  final VoidCallback? onScan;

  const _VaultItemTile({
    required this.row,
    this.onIncrement,
    this.onDecrement,
    this.onDelete,
    this.onTap,
    this.onScan,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final id = (row['id'] ?? '').toString();
    final name = (row['name'] ?? 'Item').toString();
    final set = (row['set_name'] ?? '').toString();
    final qty = (row['qty'] ?? 0) as int;
    final cond = (row['condition_label'] ?? 'NM').toString();
    final cardPrintId = (row['card_id'] ?? '').toString();
    final number = (row['number'] ?? '').toString();
    final imgUrl = (row['photo_url'] ?? row['image_url']).toString();

    final subtitleParts = <String>[];
    if (set.isNotEmpty) subtitleParts.add(set);
    if (number.isNotEmpty) subtitleParts.add('#$number');
    final subtitle = subtitleParts.join(' • ');

    Color condColor;
    switch (cond) {
      case 'NM':
        condColor = Colors.green;
        break;
      case 'LP':
        condColor = Colors.lightGreen;
        break;
      case 'MP':
        condColor = Colors.orange;
        break;
      case 'HP':
        condColor = Colors.deepOrange;
        break;
      case 'DMG':
        condColor = Colors.red;
        break;
      default:
        condColor = Colors.grey;
    }

    Widget _thumb() {
      final u = imgUrl.toString();
      if (u.isEmpty) {
        return const CircleAvatar(
          radius: 22,
          child: Icon(Icons.style),
        );
      }
      return ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Image.network(
          u,
          width: 44,
          height: 44,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              const CircleAvatar(radius: 22, child: Icon(Icons.broken_image)),
        ),
      );
    }

    Widget _condChip() {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: condColor.withOpacity(0.12),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: condColor.withOpacity(0.8), width: 0.7),
        ),
        child: Text(
          cond,
          style: theme.textTheme.labelSmall?.copyWith(
            color: condColor,
            fontWeight: FontWeight.w600,
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Dismissible(
        key: ValueKey(id),
        background: Container(
          color: Colors.red,
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.only(left: 16),
          child: const Icon(Icons.delete, color: Colors.white),
        ),
        secondaryBackground: Container(
          color: Colors.red,
          alignment: Alignment.centerRight,
          padding: const EdgeInsets.only(right: 16),
          child: const Icon(Icons.delete, color: Colors.white),
        ),
        confirmDismiss: (_) async {
          if (onDelete == null) return false;
          await Future.sync(onDelete!);
          return false;
        },
        child: Material(
          color: colorScheme.surfaceVariant.withOpacity(0.7),
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: cardPrintId.isEmpty ? null : onTap,
            child: Padding(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
              child: Row(
                children: [
                  _thumb(),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (subtitle.isNotEmpty) ...[
                          const SizedBox(height: 3),
                          Text(
                            subtitle,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colorScheme.onSurface.withOpacity(0.7),
                            ),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 8,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            _condChip(),
                            Text(
                              'Qty: $qty',
                              style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.camera_alt, size: 20),
                        onPressed: onScan,
                        tooltip: 'Scan (Condition + Fingerprint)',
                      ),
                      IconButton(
                        icon: const Icon(Icons.add, size: 20),
                        onPressed: onIncrement,
                        tooltip: 'Increase quantity',
                      ),
                      IconButton(
                        icon: const Icon(Icons.remove, size: 20),
                        onPressed: onDecrement,
                        tooltip: 'Decrease quantity',
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
class _CatalogSearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onSubmitted;

  const _CatalogSearchField({
    required this.controller,
    required this.onChanged,
    this.onSubmitted,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: colorScheme.surfaceVariant.withOpacity(0.7),
          borderRadius: BorderRadius.circular(12),
        ),
        child: TextField(
          controller: controller,
          onChanged: onChanged,
          onSubmitted: onSubmitted,
          textInputAction: TextInputAction.search,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            hintText: 'Search by name, set, or number',
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(vertical: 12),
          ),
        ),
      ),
    );
  }
}

class _CatalogSectionHeader extends StatelessWidget {
  final String title;

  const _CatalogSectionHeader(this.title, {super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = theme.colorScheme.onSurface.withOpacity(0.6);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 6),
      child: Text(
        title,
        style: theme.textTheme.titleSmall?.copyWith(
          fontWeight: FontWeight.w600,
          color: color,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

class _CatalogCardTile extends StatelessWidget {
  final CardPrint card;
  final VoidCallback? onTap;

  const _CatalogCardTile({
    required this.card,
    this.onTap,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final subtitleParts = <String>[];
    if (card.displaySet.isNotEmpty) {
      subtitleParts.add(card.displaySet);
    }
    if (card.displayNumber.isNotEmpty) {
      subtitleParts.add('#${card.displayNumber}');
    }
    if ((card.rarity ?? '').isNotEmpty) {
      subtitleParts.add(card.rarity!);
    }
    final subtitle = subtitleParts.join(' | ');

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Material(
        color: colorScheme.surfaceVariant.withOpacity(0.7),
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: () {
            HapticFeedback.lightImpact();
            if (onTap != null) onTap!();
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
            child: Row(
              children: [
                _thumb(card.displayImage),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        card.name,
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          subtitle,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _SetIconBadge(card: card),
                            _RarityIconBadge(rarity: card.rarity),
                          ],
                        ),
                      ]
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _thumb(String? url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) {
      return const CircleAvatar(
        radius: 22,
        child: Icon(Icons.style),
      );
    }
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(radius: 22, child: Icon(Icons.broken_image)),
      ),
    );
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _loadEnv();

  final url = supabaseUrl;
  final key = supabasePublishableKey;
  if (url.isEmpty || key.isEmpty) {
    throw Exception(
        'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Update your .env.local file.');
  }

  await Supabase.initialize(url: url, anonKey: key);
  runApp(const MyApp());
}

Future<void> _loadEnv() async {
  try {
    await dotenv.load(fileName: '.env.local');
  } catch (_) {
    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {
      // fall through; missing files will be handled by guard in main()
    }
  }
}

/// Root app with an auth gate: session -> AppShell, else -> LoginPage.
class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    final supabase = Supabase.instance.client;
    return MaterialApp(
      title: 'Grookai Vault',
      theme: _buildGrookaiTheme(Brightness.light),
      darkTheme: _buildGrookaiTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: StreamBuilder<AuthState>(
        stream: supabase.auth.onAuthStateChange,
        initialData: AuthState(
          AuthChangeEvent.initialSession,
          supabase.auth.currentSession,
        ),
        builder: (context, _) {
          final session = supabase.auth.currentSession;
          return session == null ? const LoginPage() : const AppShell();
        },
      ),
    );
  }
}

/// ---------------------- APP SHELL (Home + Vault) ----------------------
class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final supabase = Supabase.instance.client;
  int _index = 0;
  final GlobalKey<HomePageState> _homeKey = GlobalKey();
  final GlobalKey<VaultPageState> _vaultKey = GlobalKey();

  Future<void> _signOut() async => supabase.auth.signOut();

  void _refreshCurrent() {
    if (_index == 0) _homeKey.currentState?.reload();
    else _vaultKey.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Catalog', 'Grookai Vault'];
    return Scaffold(
      appBar: AppBar(
        title: Text(
          titles[_index],
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refreshCurrent),
          IconButton(icon: const Icon(Icons.logout), onPressed: _signOut),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          HomePage(key: _homeKey),
          VaultPage(key: _vaultKey),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.search), selectedIcon: Icon(Icons.search), label: 'Catalog'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Vault'),
        ],
      ),
      floatingActionButton: _index == 1
          ? FloatingActionButton(
              onPressed: () => _vaultKey.currentState?.showAddOrEditDialog(),
              child: const Icon(Icons.add),
            )
          : null,
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
      if (mounted) setState(() => _loading = false);
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
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sign in'),
      ),
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
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.7),
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
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
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

/// ---------------------- HOME PAGE (catalog search) ----------------------
class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  HomePageState createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  final supabase = Supabase.instance.client;
  final _searchCtrl = TextEditingController();
  List<CardPrint> _results = const [];
  List<CardPrint> _trending = const [];
  bool _loading = false;
  Timer? _debounce;
  _RarityFilter _rarityFilter = _RarityFilter.all;

  List<_CatalogRow> _buildRows(List<CardPrint> cards) {
    final rows = <_CatalogRow>[];
    String? lastSet;
    for (final card in cards) {
      final setTitle = card.displaySet;
      if (setTitle != lastSet) {
        lastSet = setTitle;
        rows.add(_CatalogHeaderRow(setTitle));
      }
      rows.add(_CatalogCardRow(card));
    }
    return rows;
  }

  @override
  void initState() {
    super.initState();
    _loadTrending();
    reload();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> reload() async {
    await _runSearch(_searchCtrl.text);
  }

  Future<void> _loadTrending() async {
    final rows = await CardPrintRepository.fetchTrending(client: supabase);
    if (!mounted) return;
    setState(() {
      _trending = rows;
    });
  }

  Widget _buildRarityChip(_RarityFilter filter, String label) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final bool selected = _rarityFilter == filter;

    Color bg;
    Color border;
    Color text;

    if (selected) {
      bg = colorScheme.primary.withOpacity(0.12);
      border = colorScheme.primary;
      text = colorScheme.primary;
    } else {
      bg = colorScheme.surfaceVariant.withOpacity(0.5);
      border = Colors.transparent;
      text = colorScheme.onSurface.withOpacity(0.75);
    }

    return ChoiceChip(
      label: Text(
        label,
        style: theme.textTheme.labelSmall?.copyWith(
          color: text,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
      selected: selected,
      onSelected: (_) {
        setState(() {
          _rarityFilter = filter;
        });
      },
      selectedColor: bg,
      backgroundColor: bg,
      side: BorderSide(color: border, width: selected ? 1.0 : 0.0),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }

  List<CardPrint> _applyRarityFilter(List<CardPrint> cards) {
    if (_rarityFilter == _RarityFilter.all) return cards;

    bool matchesRarity(String? rarity, _RarityFilter filter) {
      final raw = (rarity ?? '').toLowerCase();
      if (raw.isEmpty) return false;

      switch (filter) {
        case _RarityFilter.common:
          return raw.contains('common');
        case _RarityFilter.uncommon:
          return raw.contains('uncommon');
        case _RarityFilter.rare:
          return raw.contains('rare') &&
              !raw.contains('ultra') &&
              !raw.contains('secret');
        case _RarityFilter.ultra:
          return raw.contains('ultra') || raw.contains('secret');
        case _RarityFilter.all:
          return true;
      }
    }

    return cards.where((card) => matchesRarity(card.rarity, _rarityFilter)).toList();
  }

  Future<void> _runSearch(String query) async {
    setState(() => _loading = true);
    try {
      final rows = await CardPrintRepository.searchCardPrints(
        client: supabase,
        options: CardSearchOptions(query: query),
      );
      setState(() => _results = rows);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _runSearch(value.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final trimmed = _searchCtrl.text.trim();
    final showingTrending = trimmed.isEmpty && _trending.isNotEmpty && _results.isEmpty;
    final cards = _applyRarityFilter(showingTrending ? _trending : _results);
    final showEmpty = !_loading && cards.isEmpty;
    final rows = _buildRows(cards);

    return Column(
      children: [
        _CatalogSearchField(
          controller: _searchCtrl,
          onChanged: _onQueryChanged,
          onSubmitted: _runSearch,
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildRarityChip(_RarityFilter.all, 'All'),
                const SizedBox(width: 6),
                _buildRarityChip(_RarityFilter.common, 'Common'),
                const SizedBox(width: 6),
                _buildRarityChip(_RarityFilter.uncommon, 'Uncommon'),
                const SizedBox(width: 6),
                _buildRarityChip(_RarityFilter.rare, 'Rare'),
                const SizedBox(width: 6),
                _buildRarityChip(_RarityFilter.ultra, 'Ultra / Secret'),
              ],
            ),
          ),
        ),
        if (_loading) const LinearProgressIndicator(minHeight: 2),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => reload(),
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                if (showingTrending)
                  SliverToBoxAdapter(
                    child: _buildTrendingSection(Theme.of(context)),
                  ),
                if (_loading && _results.isEmpty && _trending.isEmpty)
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => const _CatalogSkeletonTile(),
                      childCount: 6,
                    ),
                  )
                else if (showEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Center(
                        child: Text(
                          'No results. Try another search term.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ),
                    ),
                  )
                else
                  SliverList.separated(
                    itemCount: rows.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 4),
                    itemBuilder: (context, index) {
                      final row = rows[index];
                      if (row is _CatalogHeaderRow) {
                        return _CatalogSectionHeader(row.title);
                      } else if (row is _CatalogCardRow) {
                        final card = row.card;
                        return _CatalogCardTile(
                          card: card,
                          onTap: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => CardDetailScreen(
                                  cardPrintId: card.id,
                                  name: card.name,
                                  setName: card.displaySet,
                                  number: card.displayNumber,
                                  imageUrl: card.displayImage,
                                ),
                              ),
                            );
                          },
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _subtitle(CardPrint card) {
    final parts = <String>[];
    if (card.displaySet.isNotEmpty) parts.add(card.displaySet);
    if (card.displayNumber.isNotEmpty) parts.add('#${card.displayNumber}');
    if ((card.rarity ?? '').isNotEmpty) parts.add(card.rarity!);
    return parts.join(' | ');
  }

  Widget _buildTrendingSection(ThemeData theme) {
    if (_trending.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _TrendingHeaderBar(),
        const SizedBox(height: 4),
        SizedBox(
          height: 150,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: _trending.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final card = _trending[index];

              return AspectRatio(
                aspectRatio: 3 / 4,
                child: Material(
                  color: theme.colorScheme.surfaceVariant.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(14),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: () {
                      HapticFeedback.lightImpact();
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CardDetailScreen(
                            cardPrintId: card.id,
                            name: card.name,
                            setName: card.displaySet,
                            number: card.displayNumber,
                            imageUrl: card.displayImage,
                          ),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.network(
                                (card.displayImage ?? '').toString(),
                                fit: BoxFit.cover,
                                width: double.infinity,
                                errorBuilder: (_, __, ___) => const Center(
                                  child: Icon(Icons.style),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            card.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            card.displaySet,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurface.withOpacity(0.7),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _thumb(String? url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) return const CircleAvatar(child: Icon(Icons.style));
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(child: Icon(Icons.broken_image)),
      ),
    );
  }
}

/// ---------------------- VAULT PAGE (uses view + catalog picker) ----------------------
class VaultPage extends StatefulWidget {
  const VaultPage({super.key});
  @override
  VaultPageState createState() => VaultPageState();
}

class VaultPageState extends State<VaultPage> {
  final supabase = Supabase.instance.client;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];
  String _search = '';
  _SortBy _sortBy = _SortBy.newest;

  @override
  void initState() {
    super.initState();
    _uid = supabase.auth.currentUser?.id;
    reload();
  }

  Future<void> reload() async {
    if (_uid == null) {
      setState(() => _items = const []);
      return;
    }
    setState(() => _loading = true);
    try {
      final orderCol = switch (_sortBy) {
        _SortBy.newest => 'created_at',
        _SortBy.name => 'name',
        _SortBy.qty => 'qty',
      };
      final ascending = _sortBy != _SortBy.newest;

      final data = await supabase
          .from('v_vault_items') // <— read the view
          .select()
          .eq('user_id', _uid!)
          .order(orderCol, ascending: ascending);

      setState(() => _items = List<Map<String, dynamic>>.from(data));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _incQty(String id, int delta) async {
    final idx = _items.indexWhere((x) => (x['id'] ?? '').toString() == id);
    final current = idx >= 0 ? (_items[idx]['qty'] ?? 0) as int : 0;
    final next = (current + delta).clamp(0, 9999);
    await supabase.from('vault_items').update({'qty': next}).eq('id', id);
    await reload();
  }

  Future<void> _delete(String id) async {
    await supabase.from('vault_items').delete().eq('id', id);
    await reload();
  }

  /// NEW: Add uses the internal catalog picker
  Future<void> showAddOrEditDialog({Map<String, dynamic>? row}) async {
    if (row == null) {
      await _showCatalogPickerAndInsert();
    } else {
      // (Optional) could open an edit dialog; for now, keep qty/cond editing inline
      // or reuse your previous edit dialog if you prefer.
    }
  }

  Future<void> _showCatalogPickerAndInsert() async {
    final picked = await showModalBottomSheet<CardPrint>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CatalogPicker(),
    );
    if (picked == null || _uid == null) return;

    final qtyCtrl = TextEditingController(text: '1');
    final subtitleParts = <String>[];
    if (picked.displaySet.isNotEmpty) subtitleParts.add(picked.displaySet);
    if (picked.displayNumber.isNotEmpty) subtitleParts.add('#${picked.displayNumber}');
    final subtitle = subtitleParts.join(' - ');

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add to Vault'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: _thumb(picked.displayImage),
              title: Text(picked.name),
              subtitle: Text(subtitle.isEmpty ? picked.displaySet : subtitle),
            ),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Quantity'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Add')),
        ],
      ),
    );
    if (ok != true) return;

    final qty = int.tryParse(qtyCtrl.text) ?? 1;

    await supabase.from('vault_items').insert({
      'user_id': _uid,
      'card_id': picked.id,
      'name': picked.name,
      'set_name': picked.displaySet,
      'photo_url': picked.displayImage,
      'qty': qty,
      'condition_label': 'NM',
    });

    await reload();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _items.where((row) {
      final name = (row['name'] ?? '').toString().toLowerCase();
      final set  = (row['set_name'] ?? '').toString().toLowerCase();
      final q = _search.toLowerCase();
      return name.contains(q) || set.contains(q);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: const InputDecoration(
                    hintText: 'Search cards or sets...',
                    prefixIcon: Icon(Icons.search),
                  ),
                  onChanged: (val) => setState(() => _search = val),
                ),
              ),
              const SizedBox(width: 8),
              PopupMenuButton<_SortBy>(
                icon: const Icon(Icons.sort),
                onSelected: (v) { setState(() => _sortBy = v); reload(); },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: _SortBy.newest, child: Text('Newest')),
                  PopupMenuItem(value: _SortBy.name,   child: Text('Name (A–Z)')),
                  PopupMenuItem(value: _SortBy.qty,    child: Text('Qty (low→high)')),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : filtered.isEmpty
                  ? const Center(child: Text('No items found.'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(8),
                      itemCount: filtered.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final row = filtered[index];
                        final id = (row['id'] ?? '').toString();
                        final name = (row['name'] ?? 'Item').toString();
                        final set  = (row['set_name'] ?? '').toString();
                        final qty  = (row['qty'] ?? 0) as int;
                        final cond = (row['condition_label'] ?? 'NM').toString();
                        final cardPrintId = (row['card_id'] ?? '').toString();

                        return _VaultItemTile(
                          row: row,
                          onScan: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => ScanCaptureScreen(
                                  vaultItemId: id,
                                  cardName: name,
                                ),
                              ),
                            );
                          },
                          onIncrement: () => _incQty(id, 1),
                          onDecrement: () => _incQty(id, -1),
                          onDelete: () async {
                            final ok = await _confirmDelete(id);
                            if (ok) await reload();
                          },
                          onTap: cardPrintId.isEmpty
                              ? null
                              : () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => CardDetailScreen(
                                        cardPrintId: cardPrintId,
                                        name: name,
                                        setName: set,
                                        number: (row['number'] ?? '').toString(),
                                        imageUrl: (row['photo_url'] ?? row['image_url']).toString(),
                                        quantity: qty,
                                        condition: cond,
                                      ),
                                    ),
                                  );
                                },
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Future<bool> _confirmDelete(String id) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete item?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok == true) await _delete(id);
    return ok ?? false;
  }

  Widget _chip(String cond) {
    final color = switch (cond) {
      'NM' => Colors.green,
      'LP' => Colors.lightGreen,
      'MP' => Colors.orange,
      'HP' => Colors.deepOrange,
      'DMG' => Colors.red,
      _ => Colors.grey,
    };
    return Chip(
      label: Text(cond),
      visualDensity: VisualDensity.compact,
      backgroundColor: color.withOpacity(.15),
      side: BorderSide(color: color.withOpacity(.6)),
    );
  }

  Widget _thumb(dynamic url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) return const CircleAvatar(child: Icon(Icons.style));
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(child: Icon(Icons.broken_image)),
      ),
    );
  }
}

enum _SortBy { newest, name, qty }

/// ---------------------- Catalog Picker (bottom sheet) ----------------------
class _CatalogPicker extends StatefulWidget {
  @override
  State<_CatalogPicker> createState() => _CatalogPickerState();
}

class _CatalogPickerState extends State<_CatalogPicker> {
  final supabase = Supabase.instance.client;
  final _q = TextEditingController();
  List<CardPrint> _rows = const [];
  bool _loading = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _fetch('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  Future<void> _fetch(String query) async {
    setState(() => _loading = true);
    try {
      final rows = await CardPrintRepository.searchCardPrints(
        client: supabase,
        options: CardSearchOptions(query: query),
      );
      setState(() => _rows = rows);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onChanged(String s) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () {
      _fetch(s.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets;
    final grouped = <_CatalogRow>[];
    String? lastSet;
    for (final card in _rows) {
      final setTitle = card.displaySet;
      if (setTitle != lastSet) {
        lastSet = setTitle;
        grouped.add(_CatalogHeaderRow(setTitle));
      }
      grouped.add(_CatalogCardRow(card));
    }

    return Padding(
      padding: EdgeInsets.only(bottom: padding.bottom),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(height: 4, width: 36, decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(3))),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: _CatalogSearchField(
                controller: _q,
                onChanged: _onChanged,
                onSubmitted: _fetch,
              ),
            ),
            const SizedBox(height: 8),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.all(8),
                itemCount: grouped.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (context, i) {
                  final row = grouped[i];
                  if (row is _CatalogHeaderRow) {
                    return _CatalogSectionHeader(row.title);
                  }
                  final card = (row as _CatalogCardRow).card;
                  return _CatalogCardTile(
                    card: card,
                    onTap: () => Navigator.pop(context, card),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _thumb(String? url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) return const CircleAvatar(child: Icon(Icons.style));
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: Image.network(
        u,
        width: 44,
        height: 44,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) =>
            const CircleAvatar(child: Icon(Icons.broken_image)),
      ),
    );
  }
}
