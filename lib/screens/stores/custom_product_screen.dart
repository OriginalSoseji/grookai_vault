import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../services/stores/storefront_service.dart';

class CustomProductScreen extends StatefulWidget {
  const CustomProductScreen({
    required this.slug,
    required this.productId,
    this.preview = false,
    this.service,
    super.key,
  });
  final String slug, productId;
  final bool preview;
  final StorefrontService? service;
  @override
  State<CustomProductScreen> createState() => _CustomProductScreenState();
}

class _CustomProductScreenState extends State<CustomProductScreen> {
  late final _service = widget.service ?? StorefrontService();
  Map<String, dynamic>? _data;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    if (widget.service == null) _service.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await _service.product(
        widget.slug,
        widget.productId,
        preview: widget.preview,
      );
      if (mounted) {
        setState(() {
          _data = data;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _data?['product'] as Map?;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.preview ? 'Product preview' : 'Custom collectible'),
        actions: [
          if (!widget.preview && p != null)
            IconButton(
              tooltip: 'Share product',
              icon: const Icon(Icons.share_outlined),
              onPressed: () => SharePlus.instance.share(
                ShareParams(
                  text:
                      '${_service.baseUrl}/store/${Uri.encodeComponent(widget.slug)}/products/${widget.productId}',
                ),
              ),
            ),
        ],
      ),
      body: _error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_error!),
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            )
          : p == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (widget.preview)
                  const Text(
                    'Owner preview. This does not publish the product.',
                  ),
                const Text('Seller-provided details'),
                const SizedBox(height: 12),
                Text(
                  p['title'].toString().isEmpty
                      ? 'Untitled collectible'
                      : p['title'].toString(),
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                for (final photo in p['photo_ids'] as List)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Image.network(
                      _service.productMediaUrl(
                        widget.slug,
                        widget.productId,
                        photo.toString(),
                        preview: widget.preview,
                      ),
                      headers: _service.headers,
                      height: 280,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => const SizedBox(
                        height: 100,
                        child: Center(child: Text('Photo unavailable')),
                      ),
                    ),
                  ),
                Text(p['description'].toString()),
                const SizedBox(height: 16),
                if (p['asking_price_amount'] != null)
                  Text(
                    '${p['asking_price_currency']} ${(p['asking_price_amount'] as num).toStringAsFixed(2)} asking price',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                Text('${p['available_quantity']} available (vendor-reported)'),
                const SizedBox(height: 16),
                for (final field in const {
                  'category': 'Category',
                  'franchise': 'Franchise',
                  'manufacturer': 'Manufacturer',
                  'release_region': 'Release region',
                  'language': 'Language',
                  'condition_description': 'Condition',
                  'packaging_description': 'Packaging',
                }.entries)
                  if (p[field.key]?.toString().isNotEmpty == true)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text('${field.value}: ${p[field.key]}'),
                    ),
              ],
            ),
    );
  }
}
