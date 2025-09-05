// lib/main.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:image_picker/image_picker.dart';

// Live pricing (ticker + chart)
import 'features/pricing/live_pricing.dart';

/// --- Supabase config ---
const String kSupabaseUrl = 'https://ycdxbpibncqcchqiihfz.supabase.co';
const String kSupabaseAnonKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZHhicGlibmNxY2NocWlpaGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjM4NzIsImV4cCI6MjA3MTA5OTg3Mn0.3Y7KWRmroVYeyl-jhweLpkCNyE5X6yOrYR__dbalRsg';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: kSupabaseUrl, anonKey: kSupabaseAnonKey);
  runApp(const MyApp());
}

/// Root app with an auth gate: session -> AppShell, else -> LoginPage.
class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    final supabase = Supabase.instance.client;
    return MaterialApp(
      routes: {'/dev-price-import': (_) => const PriceImportPage()},

      title: 'Grookai Vault',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.green),
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

/// ---------------------- APP SHELL (Home + Vault + Wishlist + Scan) ----------------------
class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final supabase = Supabase.instance.client;
  int _index = 0;
  final _homeKey = GlobalKey<HomePageState>();
  final _vaultKey = GlobalKey<VaultPageState>();
  final _wishKey = GlobalKey<WishlistPageState>();

  Future<void> _signOut() async => supabase.auth.signOut();

  void _refreshCurrent() {
    if (_index == 0) _homeKey.currentState?.reload();
    if (_index == 1) _vaultKey.currentState?.reload();
    if (_index == 2) _wishKey.currentState?.reload();
  }

  @override
  Widget build(BuildContext context) {
    final titles = ['Home', 'Vault', 'Wishlist', 'Scan'];
    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_index]),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshCurrent,
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: _signOut),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          HomePage(key: _homeKey),
          VaultPage(key: _vaultKey),
          WishlistPage(key: _wishKey),
          const ScanPage(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Vault',
          ),
          NavigationDestination(
            icon: Icon(Icons.favorite_border),
            selectedIcon: Icon(Icons.favorite),
            label: 'Wishlist',
          ),
          NavigationDestination(
            icon: Icon(Icons.camera_outlined),
            selectedIcon: Icon(Icons.camera_alt),
            label: 'Scan',
          ),
        ],
      ),
      floatingActionButton: switch (_index) {
        1 => FloatingActionButton(
          onPressed: () => _vaultKey.currentState?.showAddOrEditDialog(),
          child: const Icon(Icons.add),
        ),
        2 => FloatingActionButton(
          onPressed: () => _wishKey.currentState?.showAddOrEditDialog(),
          child: const Icon(Icons.add),
        ),
        _ => null,
      },
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
      appBar: AppBar(title: const Text('Sign in')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
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

/// ---------------------- HOME PAGE (portfolio stats from v_vault_items) ----------------------
class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  HomePageState createState() => HomePageState();
}

class HomePageState extends State<HomePage> {
  final supabase = Supabase.instance.client;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];

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
      final data = await supabase
          .from('v_vault_items')
          .select()
          .eq('user_id', _uid!)
          .order('created_at', ascending: false);
      setState(() => _items = List<Map<String, dynamic>>.from(data));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  num _sumValue(List<Map<String, dynamic>> rows) {
    num total = 0;
    for (final r in rows) {
      final mp = (r['market_price'] ?? 0) as num;
      final q = (r['qty'] ?? 0) as int;
      total += mp * q;
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final unique = _items.length;
    final totalQty = _items.fold<int>(
      0,
      (sum, r) => sum + ((r['qty'] ?? 0) as int),
    );
    final recent = List<Map<String, dynamic>>.from(_items.take(5));
    final totalValue = _sumValue(_items);

    return _loading
        ? const Center(child: CircularProgressIndicator())
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _statCard('Unique cards', '$unique', Icons.style),
                  _statCard('Total quantity', '$totalQty', Icons.numbers),
                  _statCard(
                    'Portfolio value',
                    '\$${totalValue.toStringAsFixed(2)}',
                    Icons.attach_money,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text(
                'Recently added',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              if (recent.isEmpty)
                const Text('No recent items.')
              else
                ...recent.map((row) {
                  final name = (row['name'] ?? 'Item').toString();
                  final setCode = (row['set_name'] ?? '').toString();
                  final qty = (row['qty'] ?? 0) as int;
                  final mp = (row['market_price'] ?? 0) as num;
                  return Card(
                    child: ListTile(
                      leading: _thumb(row['image_url']),
                      title: Text(
                        name,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Text(
                        '$setCode Ã‚Â· Qty: $qty'
                        '${mp > 0 ? ' Ã‚Â· \$${mp.toStringAsFixed(2)} ea' : ''}',
                      ),
                      trailing: IconButton(
                        tooltip: 'Live',
                        icon: const Icon(Icons.show_chart_rounded),
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CardPriceChartPage(
                              setCode: setCode,
                              number: (row['number'] ?? '').toString(),
                              source: 'tcgplayer',
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
            ],
          );
  }

  Widget _statCard(String label, String value, IconData icon) {
    return SizedBox(
      width: 220,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(icon, size: 28),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(color: Colors.black54)),
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
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

/// ---------------------- VAULT PAGE (with Move to Wishlist) ----------------------
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
      final orderCol = _sortBy == _SortBy.newest
          ? 'created_at'
          : _sortBy == _SortBy.name
          ? 'name'
          : 'qty';
      final ascending = _sortBy != _SortBy.newest;
      final data = await supabase
          .from('v_vault_items')
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

  /// Picker -> choose Vault or Wishlist -> insert -> trigger pricing -> reload
  Future<void> showAddOrEditDialog({Map<String, dynamic>? row}) async {
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CatalogPicker(),
    );
    if (picked == null || _uid == null) return;

    final choice = await showDialog<String>(
      context: context,
      builder: (_) => SimpleDialog(
        title: const Text('Add to'),
        children: [
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, 'vault'),
            child: const Text('Vault'),
          ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(context, 'wishlist'),
            child: const Text('Wishlist'),
          ),
        ],
      ),
    );
    if (choice == null) return;

    if (choice == 'vault') {
      final qtyCtrl = TextEditingController(text: '1');
      final ok = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Quantity'),
          content: TextField(
            controller: qtyCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Qty'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Add'),
            ),
          ],
        ),
      );
      if (ok != true) return;
      final qty = int.tryParse(qtyCtrl.text) ?? 1;

      await supabase.from('vault_items').insert({
        'card_id': picked['id'],
        'name': picked['name'],
        'set_name': picked['set_code'], // code; swap to friendly set name later
        'photo_url': picked['image_url'],
        'qty': qty,
        'condition_label': 'NM',
      });
    } else {
      await supabase.from('wishlist_items').upsert({
        'user_id': _uid,
        'card_id': picked['id'],
      }, onConflict: 'user_id,card_id');
    }

    // Trigger immediate price import for the set
    try {
      await Supabase.instance.client.functions.invoke(
        'import-prices',
        body: {
          'setCode': picked['set_code'],
          'page': 1,
          'pageSize': 250,
          'source': 'tcgplayer',
        },
      );
    } catch (_) {}

    await reload();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added to ${choice == 'vault' ? 'Vault' : 'Wishlist'}'),
      ),
    );
  }

  Future<void> _moveToWishlist(Map<String, dynamic> row) async {
    final id = (row['id'] ?? '').toString();
    final cardId = (row['card_id'] ?? '').toString();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Move to Wishlist?'),
        content: const Text(
          'This will remove the card from Vault and add it to Wishlist.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Move'),
          ),
        ],
      ),
    );
    if (ok != true) return;

    await supabase.from('wishlist_items').upsert({
      'user_id': supabase.auth.currentUser!.id,
      'card_id': cardId,
    }, onConflict: 'user_id,card_id');
    await supabase.from('vault_items').delete().eq('id', id);

    // price import (non-fatal)
    try {
      await Supabase.instance.client.functions.invoke(
        'import-prices',
        body: {
          'setCode': (row['set_name'] ?? '').toString(),
          'page': 1,
          'pageSize': 250,
          'source': 'tcgplayer',
        },
      );
    } catch (_) {}

    await reload();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _items.where((row) {
      final name = (row['name'] ?? '').toString().toLowerCase();
      final set = (row['set_name'] ?? '').toString().toLowerCase();
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
                onSelected: (v) {
                  setState(() => _sortBy = v);
                  reload();
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: _SortBy.newest, child: Text('Newest')),
                  PopupMenuItem(
                    value: _SortBy.name,
                    child: Text('Name (AÃ¢â‚¬â€œZ)'),
                  ),
                  PopupMenuItem(
                    value: _SortBy.qty,
                    child: Text('Qty (lowÃ¢â€ â€™high)'),
                  ),
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
                    final setCode = (row['set_name'] ?? '').toString();
                    final number = (row['number'] ?? '').toString();
                    final qty = (row['qty'] ?? 0) as int;
                    final cond = (row['condition_label'] ?? 'NM').toString();
                    final mp = (row['market_price'] ?? 0) as num;

                    final tile = ListTile(
                      leading: _thumb(row['image_url']),
                      title: Text(
                        name,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        children: [
                          if (setCode.isNotEmpty)
                            Text(
                              setCode,
                              style: const TextStyle(color: Colors.black54),
                            ),
                          Text('#$number'),
                          _chip(cond),
                          Text('Qty: $qty'),
                          if (mp > 0)
                            Text('Ã¢â‚¬Â¢ \$${mp.toStringAsFixed(2)} ea'),
                        ],
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            tooltip: 'Live',
                            icon: const Icon(Icons.show_chart_rounded),
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => CardPriceChartPage(
                                  setCode: setCode,
                                  number: number,
                                  source: 'tcgplayer',
                                ),
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.remove),
                            onPressed: () => _incQty(id, -1),
                          ),
                          Text(
                            '$qty',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(Icons.add),
                            onPressed: () => _incQty(id, 1),
                          ),
                          PopupMenuButton<String>(
                            onSelected: (v) {
                              if (v == 'delete') _confirmDelete(id);
                              if (v == 'move_wishlist') _moveToWishlist(row);
                            },
                            itemBuilder: (_) => const [
                              PopupMenuItem(
                                value: 'move_wishlist',
                                child: Text('Move to Wishlist'),
                              ),
                              PopupMenuItem(
                                value: 'delete',
                                child: Text('Delete'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );

                    return Dismissible(
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
                      confirmDismiss: (_) async => await _confirmDelete(id),
                      child: Card(child: tile),
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
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) await _delete(id);
    return ok ?? false;
  }

  Widget _chip(String cond) {
    Color color;
    switch (cond) {
      case 'NM':
        color = Colors.green;
        break;
      case 'LP':
        color = Colors.lightGreen;
        break;
      case 'MP':
        color = Colors.orange;
        break;
      case 'HP':
        color = Colors.deepOrange;
        break;
      case 'DMG':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }
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

/// ---------------------- WISHLIST PAGE (with Move to Vault) ----------------------
class WishlistPage extends StatefulWidget {
  const WishlistPage({super.key});
  @override
  WishlistPageState createState() => WishlistPageState();
}

class WishlistPageState extends State<WishlistPage> {
  final supabase = Supabase.instance.client;
  bool _loading = false;
  String? _uid;
  List<Map<String, dynamic>> _items = const [];

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
      final data = await supabase
          .from('v_wishlist_items')
          .select()
          .eq('user_id', _uid!)
          .order('created_at', ascending: false);
      setState(() => _items = List<Map<String, dynamic>>.from(data));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> showAddOrEditDialog() async {
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CatalogPicker(),
    );
    if (picked == null || _uid == null) return;

    await supabase.from('wishlist_items').upsert({
      'user_id': _uid,
      'card_id': picked['id'],
    }, onConflict: 'user_id,card_id');

    // Trigger price import so wishlist shows a price immediately
    try {
      await Supabase.instance.client.functions.invoke(
        'import-prices',
        body: {
          'setCode': picked['set_code'],
          'page': 1,
          'pageSize': 250,
          'source': 'tcgplayer',
        },
      );
    } catch (_) {}

    await reload();
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Added to Wishlist')));
  }

  Future<void> _moveToVault(Map<String, dynamic> row) async {
    final qtyCtrl = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Move to Vault'),
        content: TextField(
          controller: qtyCtrl,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Quantity'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Move'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final qty = int.tryParse(qtyCtrl.text) ?? 1;

    await supabase.from('vault_items').insert({
      'card_id': row['card_id'],
      'name': row['name'],
      'set_name': row['set_name'],
      'photo_url': row['image_url'],
      'qty': qty,
      'condition_label': 'NM',
    });
    await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', (row['id'] ?? '').toString());

    // Non-fatal price import
    try {
      await Supabase.instance.client.functions.invoke(
        'import-prices',
        body: {
          'setCode': (row['set_name'] ?? '').toString(),
          'page': 1,
          'pageSize': 250,
          'source': 'tcgplayer',
        },
      );
    } catch (_) {}

    await reload();
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Moved to Vault')));
  }

  Future<void> _delete(String id) async {
    await supabase.from('wishlist_items').delete().eq('id', id);
    await reload();
  }

  @override
  Widget build(BuildContext context) {
    return _loading
        ? const Center(child: CircularProgressIndicator())
        : _items.isEmpty
        ? const Center(child: Text('Wishlist is empty.'))
        : ListView.separated(
            padding: const EdgeInsets.all(8),
            itemCount: _items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, i) {
              final row = _items[i];
              final id = (row['id'] ?? '').toString();
              final name = (row['name'] ?? 'Card').toString();
              final setCode = (row['set_name'] ?? '').toString();
              final number = (row['number'] ?? '').toString();
              final mp = (row['market_price'] ?? 0) as num;

              return Card(
                child: ListTile(
                  leading: _thumb(row['image_url']),
                  title: Text(
                    name,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    '$setCode Ã‚Â· #$number${mp > 0 ? ' Ã‚Â· \$${mp.toStringAsFixed(2)}' : ''}',
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        tooltip: 'Live',
                        icon: const Icon(Icons.show_chart_rounded),
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => CardPriceChartPage(
                              setCode: setCode,
                              number: number,
                              source: 'tcgplayer',
                            ),
                          ),
                        ),
                      ),
                      PopupMenuButton<String>(
                        onSelected: (v) {
                          if (v == 'move_vault') _moveToVault(row);
                          if (v == 'delete') _delete(id);
                        },
                        itemBuilder: (_) => const [
                          PopupMenuItem(
                            value: 'move_vault',
                            child: Text('Move to Vault'),
                          ),
                          PopupMenuItem(value: 'delete', child: Text('Remove')),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
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

/// ---------------------- Catalog Picker (debounced, no initial fetch) ----------------------
/// Uses v_card_search (=> card_prints) so selected id is a valid card_prints.id
class _CatalogPicker extends StatefulWidget {
  @override
  State<_CatalogPicker> createState() => _CatalogPickerState();
}

class _CatalogPickerState extends State<_CatalogPicker> {
  final supabase = Supabase.instance.client;
  final _q = TextEditingController();
  List<Map<String, dynamic>> _rows = [];
  bool _loading = false;
  DateTime _lastType = DateTime.now();

  @override
  void initState() {
    super.initState();
    // no initial fetch: stays empty until user types
  }

  Future<void> _fetch(String query) async {
    final q = query.trim();
    if (q.length < 2) {
      setState(() => _rows = []);
      return;
    } // min chars guard
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('v_card_search')
          .select('id, set_code, name, number, image_url')
          .or('name.ilike.%$q%,set_code.ilike.%$q%')
          .limit(50);
      setState(() => _rows = List<Map<String, dynamic>>.from(data));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onChanged(String s) {
    _lastType = DateTime.now();
    Future.delayed(const Duration(milliseconds: 350), () {
      final elapsed = DateTime.now().difference(_lastType).inMilliseconds;
      if (elapsed >= 350) _fetch(s);
    });
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets;
    final hint = _q.text.trim().length < 2
        ? 'Type at least 2 characters to searchÃ¢â‚¬Â¦'
        : '';
    return Padding(
      padding: EdgeInsets.only(bottom: padding.bottom),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              height: 4,
              width: 36,
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: TextField(
                controller: _q,
                decoration: const InputDecoration(
                  hintText: 'Search name or set code (e.g., Pikachu, BAS, OBF)',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: _onChanged,
              ),
            ),
            if (hint.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  hint,
                  style: const TextStyle(color: Colors.black54),
                ),
              ),
            const SizedBox(height: 8),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Flexible(
              child: _rows.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: Text('No results'),
                    )
                  : ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.all(8),
                      itemCount: _rows.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 6),
                      itemBuilder: (context, i) {
                        final r = _rows[i];
                        final subtitle =
                            '${(r['set_code'] ?? '').toString()} Ã‚Â· ${(r['number'] ?? '').toString()}';
                        return Card(
                          child: ListTile(
                            leading: _thumb(r['image_url']),
                            title: Text(
                              r['name'],
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            subtitle: Text(subtitle),
                            onTap: () => Navigator.pop(context, r),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
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

/// ---------------------- NEW Scan Page (one-tap intake) ----------------------
class ScanPage extends StatefulWidget {
  const ScanPage({super.key});
  @override
  State<ScanPage> createState() => _ScanPageState();
}

class _ScanPageState extends State<ScanPage> {
  final supabase = Supabase.instance.client;
  bool _busy = false;

  Future<void> _captureIdentifyAndAdd() async {
    setState(() => _busy = true);
    try {
      // 1) Capture
      final shot = await ImagePicker().pickImage(
        source: ImageSource.camera,
        maxWidth: 2000,
        imageQuality: 90,
      );
      if (shot == null) return;
      final file = File(shot.path);

      // 2) Upload to Storage (private scans bucket)
      final uid = supabase.auth.currentUser!.id;
      final filename = '${DateTime.now().millisecondsSinceEpoch}.jpg';
      final objectPath = '$uid/intake/$filename';

      await supabase.storage.from('scans').upload(objectPath, file);

      // 3) Signed URL (if your function needs it)
      final signedUrl = await supabase.storage
          .from('scans')
          .createSignedUrl(objectPath, 60 * 60 * 24 * 7);

      // 4) Call end-to-end intake function (identify + grade + price + add)
      final res = await supabase.functions.invoke(
        'intake-scan',
        body: {
          'user_id': uid,
          'object_path': objectPath,
          'signed_url': signedUrl,
        },
      );

      final data = Map<String, dynamic>.from(res.data ?? {});
      if (data.isEmpty) throw Exception('No data from intake-scan');

      final card = Map<String, dynamic>.from(data['card'] ?? {});
      final label = (data['label'] ?? '').toString();
      final price = (data['market_price'] ?? 0);
      if (!mounted) return;

      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Added to Vault'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _thumb(card['image_url']),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${card['name'] ?? 'Card'} Ã¢â‚¬Â¢ ${card['set_code'] ?? ''} #${card['number'] ?? ''}',
                      maxLines: 2,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text('Condition: $label'),
              Text(
                'Market: \$${(price is num ? price.toStringAsFixed(2) : price.toString())}',
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Intake failed: $e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Point your camera at a card. WeÃ¢â‚¬â„¢ll identify it, grade condition, fetch market price, and add it to your Vault automatically.',
          style: TextStyle(fontSize: 16),
        ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: _busy ? null : _captureIdentifyAndAdd,
          icon: const Icon(Icons.camera_alt),
          label: Text(_busy ? 'WorkingÃ¢â‚¬Â¦' : 'Scan & Add to Vault'),
        ),
        const SizedBox(height: 12),
        const Text('Tip: good lighting + flat card = better ID/grade.'),
      ],
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
