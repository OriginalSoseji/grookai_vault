import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'secrets.dart';

final navigatorKey = GlobalKey<NavigatorState>();

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);

  // Listen for auth changes and route accordingly
  Supabase.instance.client.auth.onAuthStateChange.listen((data) {
    final event = data.event;
    if (event == AuthChangeEvent.signedIn) {
      navigatorKey.currentState?.pushReplacementNamed('/home');
    } else if (event == AuthChangeEvent.signedOut) {
      navigatorKey.currentState?.pushReplacementNamed('/login');
    }
  });

  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});
  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    return MaterialApp(
      navigatorKey: navigatorKey,
      title: 'Grookai Vault',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.green),
      initialRoute: user == null ? '/login' : '/home',
      routes: {
        '/login': (_) => const LoginPage(),
        '/home': (_) => const HomePage(),
      },
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _err;
  bool _loading = false;

  Future<void> _auth({required bool signup}) async {
    setState(() {
      _err = null;
      _loading = true;
    });
    try {
      final c = Supabase.instance.client;
      if (signup) {
        await c.auth.signUp(
          email: _email.text.trim(),
          password: _password.text.trim(),
        );
      } else {
        await c.auth.signInWithPassword(
          email: _email.text.trim(),
          password: _password.text.trim(),
        );
      }
      // Navigation handled by auth listener
    } catch (e) {
      setState(() => _err = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Grookai Vault • Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'Email'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _password,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            if (_err != null)
              Text(_err!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: _loading ? null : () => _auth(signup: false),
                    child: _loading
                        ? const CircularProgressIndicator()
                        : const Text('Sign In'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _loading ? null : () => _auth(signup: true),
                    child: const Text('Create account'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _apiResult = '(no call yet)';
  bool _calling = false;

  Future<void> _callConditionApi() async {
    setState(() {
      _calling = true;
      _apiResult = 'calling...';
    });
    try {
      final uri = Uri.parse('$conditionApiBaseUrl/condition/score');
      final body = jsonEncode({
        "images": {
          "front_url": "test.jpg",
          "back_url": "test2.jpg",
          "corner_urls": [],
        },
        "conservative": true,
      });
      final res = await http
          .post(uri, headers: {'Content-Type': 'application/json'}, body: body)
          .timeout(const Duration(seconds: 10));
      setState(() => _apiResult = 'HTTP ${res.statusCode}\n${res.body}');
    } catch (e) {
      setState(() => _apiResult = 'Error: $e');
    } finally {
      setState(() => _calling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final email =
        Supabase.instance.client.auth.currentUser?.email ?? '(unknown)';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Grookai Vault • Home'),
        actions: [
          IconButton(
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
            },
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Signed in as: $email'),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _calling ? null : _callConditionApi,
              icon: _calling
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.settings),
              label: const Text('Test Condition API'),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: SingleChildScrollView(
                child: Text(
                  _apiResult,
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
