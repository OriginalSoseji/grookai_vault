// lib/main.dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// --- Supabase config (your real values) ---
const String kSupabaseUrl =
    'https://ycdxbpibncqcchqiihfz.supabase.co';
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
    final titles = ['Home', 'Grookai Vault'];
    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_index]),
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
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
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
      appBar: AppBar(title: const Text('Sign in')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
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
              TextButton(onPressed: _loading ? null : _signUp, child: const Text('Create account')),
            ]),
          ),
        ),
      ),
    );
  }
}

/// ---------------------- HOME PAGE (reads the view) ----------------------
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
          .from('v_vault_items') // <— read the view
          .select()
          .eq('user_id', _uid!)
          .order('created_at', ascending: false);
      setState(() => _items = List<Map<String, dynamic>>.from(data));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final unique = _items.length;
    final totalQty = _items.fold<int>(0, (sum, r) => sum + ((r['qty'] ?? 0) as int));
    final recent = List<Map<String, dynamic>>.from(_items.take(5));

    return _loading
        ? const Center(child: CircularProgressIndicator())
        : ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Wrap(
                spacing: 12, runSpacing: 12,
                children: [
                  _statCard('Unique cards', '$unique', Icons.style),
                  _statCard('Total quantity', '$totalQty', Icons.numbers),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Recently added', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              if (recent.isEmpty)
                const Text('No recent items.')
              else
                ...recent.map((row) {
                  final name = (row['name'] ?? 'Item').toString();
                  final setName = (row['set_name'] ?? '').toString();
                  final qty = (row['qty'] ?? 0) as int;
                  return Card(
                    child: ListTile(
                      leading: _thumb(row['photo_url']),
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${setName.isEmpty ? '—' : setName}   ·   Qty: $qty'),
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
          child: Row(children: [
            Icon(icon, size: 28),
            const SizedBox(width: 12),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(color: Colors.black54)),
              Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            ]),
          ]),
        ),
      ),
    );
  }

  Widget _thumb(dynamic url) {
    final u = (url ?? '').toString();
    if (u.isEmpty) {
      return const CircleAvatar(child: Icon(Icons.style));
    }
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
    final picked = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CatalogPicker(),
    );
    if (picked == null || _uid == null) return;

    // Ask for quantity
    final qtyCtrl = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Add to Vault'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: _thumb(picked['image_url']),
              title: Text(picked['name']),
              subtitle: Text('${picked['set_name']} · ${picked['card_number'] ?? ''}'),
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

    // Insert a vault row linked to the catalog card
    await supabase.from('vault_items').insert({
      'user_id': _uid,
      'card_id': picked['id'],                // linkage
      // denormalized copies (optional but handy)
      'name': picked['name'],
      'set_name': picked['set_name'],
      'photo_url': picked['image_url'],
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

                        final tile = ListTile(
                          leading: _thumb(row['photo_url']),
                          title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Wrap(
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 8,
                            children: [
                              if (set.isNotEmpty) Text(set, style: const TextStyle(color: Colors.black54)),
                              _chip(cond),
                              Text('Qty: $qty'),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(icon: const Icon(Icons.remove), onPressed: () => _incQty(id, -1)),
                              Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold)),
                              IconButton(icon: const Icon(Icons.add), onPressed: () => _incQty(id, 1)),
                              PopupMenuButton<String>(
                                onSelected: (v) {
                                  if (v == 'delete') _confirmDelete(id);
                                },
                                itemBuilder: (_) => const [
                                  PopupMenuItem(value: 'delete', child: Text('Delete')),
                                ],
                              ),
                            ],
                          ),
                        );

                        return Dismissible(
                          key: ValueKey(id),
                          background: Container(color: Colors.red, alignment: Alignment.centerLeft, padding: const EdgeInsets.only(left: 16), child: const Icon(Icons.delete, color: Colors.white)),
                          secondaryBackground: Container(color: Colors.red, alignment: Alignment.centerRight, padding: const EdgeInsets.only(right: 16), child: const Icon(Icons.delete, color: Colors.white)),
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
  List<Map<String, dynamic>> _rows = [];
  bool _loading = false;
  DateTime _lastType = DateTime.now();

  @override
  void initState() {
    super.initState();
    _fetch(''); // start empty
  }

  Future<void> _fetch(String query) async {
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('card_catalog')
          .select()
          .or('name.ilike.%$query%,set_name.ilike.%$query%')
          .limit(50);
      setState(() => _rows = List<Map<String, dynamic>>.from(data));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _onChanged(String s) {
    _lastType = DateTime.now();
    Future.delayed(const Duration(milliseconds: 300), () {
      final elapsed = DateTime.now().difference(_lastType).inMilliseconds;
      if (elapsed >= 300) _fetch(s.trim());
    });
  }

  @override
  Widget build(BuildContext context) {
    final padding = MediaQuery.of(context).viewInsets;
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
              child: TextField(
                controller: _q,
                decoration: const InputDecoration(
                  hintText: 'Search name or set (e.g., Pikachu, Base Set)',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: _onChanged,
              ),
            ),
            const SizedBox(height: 8),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.all(8),
                itemCount: _rows.length,
                separatorBuilder: (_, __) => const SizedBox(height: 6),
                itemBuilder: (context, i) {
                  final r = _rows[i];
                  return Card(
                    child: ListTile(
                      leading: _thumb(r['image_url']),
                      title: Text(r['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${r['set_name']} · ${r['card_number'] ?? ''}'),
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
