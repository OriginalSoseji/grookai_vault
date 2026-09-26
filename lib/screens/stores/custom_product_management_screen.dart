import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/stores/storefront_service.dart';
import 'custom_product_screen.dart';

class CustomProductManagementScreen extends StatefulWidget {
  const CustomProductManagementScreen({
    required this.service,
    required this.owner,
    super.key,
  });
  final StorefrontService service;
  final StoreOwnerData owner;
  @override
  State<CustomProductManagementScreen> createState() =>
      _CustomProductManagementScreenState();
}

class _CustomProductManagementScreenState
    extends State<CustomProductManagementScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  int _offset = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await widget.service.customProducts(offset: _offset);
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

  Future<void> _edit([Map<String, dynamic>? product]) async {
    await Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => CustomProductEditorScreen(
          service: widget.service,
          owner: widget.owner,
          product: product,
        ),
      ),
    );
    await _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Custom collectibles')),
    body: ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Describe collectibles in your own words and photos. Quantity is vendor-managed availability.',
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed:
              widget.owner.canEdit &&
                  widget.owner.rollout['custom_enabled'] == true
              ? () => _edit()
              : null,
          icon: const Icon(Icons.add),
          label: const Text('Add custom collectible'),
        ),
        if (_error != null) Text(_error!),
        if (_data == null && _error == null)
          const Center(child: CircularProgressIndicator()),
        for (final row in (_data?['products'] as List? ?? []))
          Card(
            child: ListTile(
              title: Text(
                row['title'].toString().isEmpty
                    ? 'Untitled collectible'
                    : row['title'].toString(),
              ),
              subtitle: Text(
                row['archived_at'] != null
                    ? 'Archived'
                    : row['ineligible_reason']?.toString() ??
                          row['suspension_reason']?.toString() ??
                          (row['published'] == true
                              ? 'Published in enabled store destinations'
                              : 'Draft · Not published'),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => _edit(Map<String, dynamic>.from(row as Map)),
            ),
          ),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton(
              onPressed: _offset == 0
                  ? null
                  : () {
                      _offset = (_offset - 40).clamp(0, 100000);
                      _load();
                    },
              child: const Text('Previous'),
            ),
            TextButton(
              onPressed:
                  _data == null || _offset + 40 >= (_data!['total'] as int)
                  ? null
                  : () {
                      _offset += 40;
                      _load();
                    },
              child: const Text('Next'),
            ),
          ],
        ),
      ],
    ),
  );
}

class CustomProductEditorScreen extends StatefulWidget {
  const CustomProductEditorScreen({
    required this.service,
    required this.owner,
    this.product,
    super.key,
  });
  final StorefrontService service;
  final StoreOwnerData owner;
  final Map<String, dynamic>? product;
  @override
  State<CustomProductEditorScreen> createState() =>
      _CustomProductEditorScreenState();
}

class _CustomProductEditorScreenState extends State<CustomProductEditorScreen> {
  static const _fields = {
    'title': ('Title', 120),
    'description': ('Description', 4000),
    'category': ('Category / product type', 80),
    'franchise': ('Franchise', 80),
    'manufacturer': ('Brand / manufacturer', 120),
    'release_region': ('Release region', 80),
    'language': ('Language', 80),
    'condition_description': ('Condition description', 500),
    'packaging_description': ('Packaging description', 500),
    'private_sku': ('Private SKU (only you)', 80),
    'asking_price_amount': ('Asking price (USD)', 12),
    'available_quantity': ('Available quantity', 7),
  };
  late final _text = {for (final k in _fields.keys) k: TextEditingController()};
  Map<String, dynamic>? _product;
  bool _busy = false;
  String? _error;
  bool get _canEdit =>
      widget.owner.canEdit &&
      widget.owner.rollout['custom_enabled'] == true &&
      _product?['archived_at'] == null;
  String get _slug => widget.owner.store!['slug'].toString();
  @override
  void initState() {
    super.initState();
    _product = widget.product;
    _fill();
  }

  void _fill() {
    for (final e in _text.entries) {
      e.value.text =
          _product?[e.key]?.toString() ??
          (e.key == 'available_quantity' ? '0' : '');
    }
  }

  @override
  void dispose() {
    for (final c in _text.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _run(Future<void> Function() task) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await task();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _change(
    String action, [
    Map<String, dynamic> data = const {},
  ]) async {
    final p = await widget.service.changeProduct(_product, action, data);
    if (mounted) setState(() => _product = p);
  }

  Future<void> _save() async {
    final quantity = int.tryParse(_text['available_quantity']!.text.trim());
    final priceText = _text['asking_price_amount']!.text.trim();
    final price = priceText.isEmpty ? null : num.tryParse(priceText);
    if (quantity == null ||
        quantity < 0 ||
        quantity > 1000000 ||
        priceText.isNotEmpty &&
            (price == null ||
                !price.isFinite ||
                price < 0 ||
                price > 99999999.99 ||
                !RegExp(r'^\d+(\.\d{1,2})?$').hasMatch(priceText))) {
      throw const StorefrontException(
        'Use a nonnegative whole quantity and a USD price with at most two decimal places.',
      );
    }
    await _change('save', {
      for (final e in _text.entries)
        if (e.key != 'available_quantity' && e.key != 'asking_price_amount')
          e.key: e.value.text,
      'available_quantity': quantity,
      'asking_price_amount': price,
    });
    _fill();
  }

  Future<void> _reload() async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Reload saved product?'),
        content: const Text(
          'This replaces unsaved text with the latest saved version.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Keep editing'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Reload'),
          ),
        ],
      ),
    );
    if (yes != true) return;
    await _run(() async {
      final data = await widget.service.customProducts(
        id: _product!['id'].toString(),
      );
      if (mounted) {
        _product = Map<String, dynamic>.from(
          (data['products'] as List).first as Map,
        );
        _fill();
      }
    });
  }

  Future<void> _photo() async {
    final file = await ImagePicker().pickImage(source: ImageSource.gallery);
    if (file == null) return;
    await _run(() async {
      final path = await widget.service.uploadProductPhoto(
        widget.owner.store!['id'].toString(),
        _product!['id'].toString(),
        await file.readAsBytes(),
      );
      await _change('photos', {
        'paths': [...(_product!['photo_paths'] as List), path],
      });
    });
  }

  Future<void> _confirmAction(String action) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(
          action == 'publish'
              ? 'Publish this collectible?'
              : 'Archive this collectible?',
        ),
        content: Text(
          action == 'publish'
              ? 'Saved details and photos will appear in your currently published store destinations. Unsaved text is not included.'
              : 'Public access will stop. Your product data and history will be retained.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(c, true),
            child: Text(action == 'publish' ? 'Publish' : 'Archive'),
          ),
        ],
      ),
    );
    if (yes == true) await _run(() => _change(action));
  }

  @override
  Widget build(BuildContext context) {
    final p = _product,
        photos = List<String>.from(p?['photo_paths'] as List? ?? []);
    return Scaffold(
      appBar: AppBar(
        title: Text(
          p == null ? 'Add custom collectible' : 'Edit custom collectible',
        ),
        actions: [
          if (p != null)
            IconButton(
              onPressed: _busy ? null : _reload,
              tooltip: 'Reload saved product',
              icon: const Icon(Icons.refresh),
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text(
            'Seller-provided details. Use your own description and photos. Drafts may be incomplete.',
          ),
          if (p != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                p['archived_at'] != null
                    ? 'Archived'
                    : p['ineligible_reason']?.toString() ??
                          p['suspension_reason']?.toString() ??
                          (p['published'] == true
                              ? 'Published in enabled store destinations'
                              : 'Draft · Not published'),
              ),
            ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          for (final e in _fields.entries)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: TextField(
                key: ValueKey('custom_${e.key}'),
                controller: _text[e.key],
                enabled: _canEdit && !_busy,
                maxLength: e.value.$2,
                minLines: e.key == 'description' ? 3 : 1,
                maxLines: e.key == 'description'
                    ? 6
                    : e.key.endsWith('_description')
                    ? 3
                    : 1,
                keyboardType: e.key == 'available_quantity'
                    ? TextInputType.number
                    : e.key == 'asking_price_amount'
                    ? const TextInputType.numberWithOptions(decimal: true)
                    : TextInputType.text,
                decoration: InputDecoration(
                  labelText: e.value.$1,
                  border: const OutlineInputBorder(),
                ),
              ),
            ),
          FilledButton(
            onPressed: _canEdit && !_busy ? () => _run(_save) : null,
            child: Text(p == null ? 'Save draft' : 'Save details'),
          ),
          if (p == null)
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('Save a draft to add photos, sections and preview.'),
            ),
          if (p != null) ...[
            const SizedBox(height: 20),
            Text(
              'Vendor photos (${photos.length}/8)',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            for (var i = 0; i < photos.length; i++)
              Card(
                child: Column(
                  children: [
                    Image.network(
                      widget.service.productMediaUrl(
                        _slug,
                        p['id'].toString(),
                        photos[i].split('/').last,
                        preview: true,
                      ),
                      headers: widget.service.headers,
                      height: 150,
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => const SizedBox(
                        height: 100,
                        child: Center(child: Text('Photo unavailable')),
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Photo ${i + 1}'),
                        IconButton(
                          tooltip: 'Move photo earlier',
                          onPressed: _canEdit && !_busy && i > 0
                              ? () => _run(() async {
                                  final reordered = [...photos];
                                  final value = reordered.removeAt(i);
                                  reordered.insert(i - 1, value);
                                  await _change('photos', {'paths': reordered});
                                })
                              : null,
                          icon: const Icon(Icons.arrow_upward),
                        ),
                        IconButton(
                          tooltip: 'Remove photo',
                          onPressed: _canEdit && !_busy
                              ? () => _run(
                                  () => _change('photos', {
                                    'paths': [...photos]..removeAt(i),
                                  }),
                                )
                              : null,
                          icon: const Icon(Icons.delete_outline),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            OutlinedButton.icon(
              onPressed: _canEdit && !_busy && photos.length < 8
                  ? _photo
                  : null,
              icon: const Icon(Icons.add_photo_alternate_outlined),
              label: const Text('Upload photo · JPEG, PNG or WebP · 5 MB'),
            ),
            const SizedBox(height: 16),
            Text(
              'Store sections',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            if (!widget.owner.sections.any((s) => s['selected'] == true))
              const Text('Select sections in store management first.'),
            for (final section in widget.owner.sections.where(
              (s) => s['selected'] == true,
            ))
              CheckboxListTile(
                title: Text(section['name'].toString()),
                value: (p['section_ids'] as List).contains(section['id']),
                onChanged: _canEdit && !_busy
                    ? (selected) => _run(
                        () => _change('sections', {
                          'section_ids': selected == true
                              ? [...(p['section_ids'] as List), section['id']]
                              : (p['section_ids'] as List)
                                    .where((id) => id != section['id'])
                                    .toList(),
                        }),
                      )
                    : null,
              ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                OutlinedButton(
                  onPressed: _busy
                      ? null
                      : () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => CustomProductScreen(
                              slug: _slug,
                              productId: p['id'].toString(),
                              preview: true,
                              service: widget.service,
                            ),
                          ),
                        ),
                  child: const Text('Preview saved product'),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => launchUrl(
                          Uri.parse(
                            '${widget.service.baseUrl}/store/${Uri.encodeComponent(_slug)}/products/${p['id']}?preview=1',
                          ),
                          mode: LaunchMode.externalApplication,
                        ),
                  child: const Text('Web preview'),
                ),
                if (p['published'] != true)
                  FilledButton(
                    onPressed: _canEdit && !_busy
                        ? () => _confirmAction('publish')
                        : null,
                    child: const Text('Publish saved product'),
                  ),
                if (p['published'] == true)
                  OutlinedButton(
                    onPressed: _busy
                        ? null
                        : () => _run(() => _change('unpublish')),
                    child: const Text('Unpublish'),
                  ),
                if (p['archived_at'] == null)
                  TextButton(
                    onPressed: _busy ? null : () => _confirmAction('archive'),
                    child: const Text('Archive'),
                  ),
              ],
            ),
            const Text(
              'Web preview requires signing in as the store owner. Publishing a product does not publish the store itself.',
            ),
          ],
          if (_busy) const LinearProgressIndicator(),
        ],
      ),
    );
  }
}
