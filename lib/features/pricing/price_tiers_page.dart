import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/price_service.dart';

class PriceTiersPage extends StatefulWidget {
  final String setCode;   // e.g., sv02
  final String number;    // e.g., 001
  final String name;      // UI title
  final String? defaultVariant;

  const PriceTiersPage({
    super.key,
    required this.setCode,
    required this.number,
    required this.name,
    this.defaultVariant,
  });

  @override
  State<PriceTiersPage> createState() => _PriceTiersPageState();
}

class _PriceTiersPageState extends State<PriceTiersPage> {
  final svc = PriceService(Supabase.instance.client);

  List<String> _variantsAvail = [];      // discovered from DB
  String? _selectedVariant;              // user/current selection
  Map<String, dynamic>? _priceRow;       // fetched price
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() => _loading = true);

    // 1) Discover available variants
    final avail = await svc.availableVariants(
      setCode: widget.setCode,
      number: widget.number,
    );

    // Pick a starting variant: defaultVariant if available; else first available; else 'normal'
    String? start = widget.defaultVariant;
    if (start != null && !avail.contains(start)) start = null;
    start ??= (avail.isNotEmpty ? avail.first : 'normal');

    // 2) Fetch price using fallback logic
    final row = await svc.latestPrice(
      setCode: widget.setCode,
      number: widget.number,
      variant: start,
    );

    setState(() {
      _variantsAvail = avail;
      _selectedVariant = start;
      _priceRow = row;
      _loading = false;
    });

    // If still nothing, tell the user which set/number was tried
    if (row == null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'No pricing found for ${widget.setCode}/${widget.number}. '
            'Try a different result or import that set.',
          ),
        ),
      );
    }
  }

  Future<void> _selectVariant(String v) async {
    setState(() {
      _selectedVariant = v;
      _loading = true;
    });
    final row = await svc.latestPrice(
      setCode: widget.setCode,
      number: widget.number,
      variant: v,
    );
    setState(() {
      _priceRow = row;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(widget.name)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // Variant chips: show discovered ones if any; else a common list
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: (_variantsAvail.isNotEmpty
                        ? _variantsAvail
                        : const [
                            'normal',
                            'holofoil',
                            'reverseHolofoil',
                            '1stEditionHolofoil',
                            'unlimitedHolofoil',
                          ])
                    .map((v) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(v),
                            selected: v == _selectedVariant,
                            onSelected: (_) => _selectVariant(v),
                          ),
                        ))
                    .toList(),
              ),
            ),
            const SizedBox(height: 16),

            if (_loading) const CircularProgressIndicator(),

            if (!_loading && _priceRow == null)
              const Text('No price found for this print.'),

            if (!_loading && _priceRow != null)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: DefaultTextStyle(
                    style: theme.textTheme.bodyLarge!,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Latest Price', style: theme.textTheme.titleLarge),
                        const SizedBox(height: 8),
                        Text('price_usd: ${_priceRow!['price_usd']}'),
                        Text('market   : ${_priceRow!['price_market']}'),
                        Text('mid      : ${_priceRow!['price_mid']}'),
                        Text('low      : ${_priceRow!['price_low']}'),
                        Text('high     : ${_priceRow!['price_high']}'),
                        const SizedBox(height: 8),
                        Text('variant   : ${_priceRow!['variant']}'),
                        Text('observed  : ${_priceRow!['observed_at']}',
                            style: theme.textTheme.bodySmall),
                      ],
                    ),
                  ),
                ),
              ),

            const Spacer(),
            FilledButton.icon(
              onPressed: (_priceRow != null)
                  ? () async {
                      final user = Supabase.instance.client.auth.currentUser;
                      if (user == null) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Sign in required')),
                        );
                        return;
                      }
                      try {
                        await Supabase.instance.client.from('user_vault').insert({
                          'user_id': user.id,
                          'set_code': widget.setCode.toLowerCase(),
                          'number': widget.number,
                          'variant': _priceRow!['variant'],
                          'acquired_price': _priceRow!['price_usd'],
                          'source': 'app',
                        });
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Added to Vault')),
                        );
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Add failed: $e')),
                        );
                      }
                    }
                  : null,
              icon: const Icon(Icons.add),
              label: const Text('Add to Vault'),
            ),
          ],
        ),
      ),
    );
  }
}
