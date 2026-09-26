import 'package:flutter/material.dart';
import 'custom_product_screen.dart';
import 'package:share_plus/share_plus.dart';

import '../../services/stores/storefront_service.dart';
import '../gvvi/public_gvvi_screen.dart';
import '../public_collector/public_collector_screen.dart';

class StorefrontScreen extends StatefulWidget {
  const StorefrontScreen({
    required this.slug,
    this.preview = false,
    this.service,
    super.key,
  });
  final String slug;
  final bool preview;
  final StorefrontService? service;
  @override
  State<StorefrontScreen> createState() => _StorefrontScreenState();
}

class _StorefrontScreenState extends State<StorefrontScreen> {
  late final StorefrontService _service = widget.service ?? StorefrontService();
  final _search = TextEditingController();
  StorefrontData? _data;
  String? _error;
  bool _loading = true;
  String _kind = 'all', _condition = '', _section = '';
  int _offset = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    if (widget.service == null) _service.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _service.read(
        widget.slug,
        preview: widget.preview,
        query: _search.text,
        kind: _kind,
        condition: _condition,
        section: _section,
        offset: _offset,
      );
      if (mounted) setState(() => _data = data);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _filter(VoidCallback update) {
    update();
    _offset = 0;
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final data = _data;
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.preview
              ? 'Store preview'
              : data?.store['display_name']?.toString() ?? 'Store',
        ),
        actions: [
          if (!widget.preview && data != null)
            IconButton(
              tooltip: 'Share store',
              icon: const Icon(Icons.share_outlined),
              onPressed: () => SharePlus.instance.share(
                ShareParams(
                  text:
                      '${_service.baseUrl}/store/${Uri.encodeComponent(widget.slug)}',
                ),
              ),
            ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    TextButton(onPressed: _load, child: const Text('Retry')),
                  ],
                ),
              ),
            )
          : data == null
          ? const SizedBox.shrink()
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (widget.preview)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Text(
                          'Owner preview. Selected copies and complete custom listings appear here.',
                        ),
                      ),
                    ),
                  if (data.store['has_banner'] == true)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        _service.mediaUrl(
                          data.slug,
                          'banner',
                          preview: widget.preview,
                        ),
                        headers: _service.headers,
                        height: 150,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => const SizedBox(height: 80),
                      ),
                    ),
                  const SizedBox(height: 16),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (data.store['has_logo'] == true)
                        Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              _service.mediaUrl(
                                data.slug,
                                'logo',
                                preview: widget.preview,
                              ),
                              headers: _service.headers,
                              width: 60,
                              height: 60,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) =>
                                  const Icon(Icons.storefront, size: 48),
                            ),
                          ),
                        ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              data.store['display_name'].toString(),
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            if (data.store['description'] != '')
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  data.store['description'].toString(),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  if (data.store['collector_slug'] != null)
                    TextButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => PublicCollectorScreen(
                            slug: data.store['collector_slug'].toString(),
                          ),
                        ),
                      ),
                      child: const Text('Meet and follow the collector'),
                    ),
                  Text(
                    'Available collectibles',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const Text(
                    'Browse asking prices and seller-provided listings.',
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _search,
                    maxLength: 120,
                    onSubmitted: (_) => _filter(() {}),
                    decoration: InputDecoration(
                      labelText: 'Name or GV-ID',
                      counterText: '',
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        tooltip: 'Search store',
                        onPressed: () => _filter(() {}),
                        icon: const Icon(Icons.search),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    children: [
                      DropdownButton<String>(
                        value: _kind,
                        items: const [
                          DropdownMenuItem(
                            value: 'all',
                            child: Text('All collectibles'),
                          ),
                          DropdownMenuItem(
                            value: 'catalog',
                            child: Text('Catalog copies'),
                          ),
                          DropdownMenuItem(
                            value: 'custom',
                            child: Text('Custom collectibles'),
                          ),
                          DropdownMenuItem(value: 'raw', child: Text('Raw')),
                          DropdownMenuItem(
                            value: 'slab',
                            child: Text('Graded'),
                          ),
                        ],
                        onChanged: (v) {
                          if (v != null) _filter(() => _kind = v);
                        },
                      ),
                      DropdownButton<String>(
                        value: _condition,
                        items: ['', 'NM', 'LP', 'MP', 'HP', 'DMG']
                            .map(
                              (c) => DropdownMenuItem(
                                value: c,
                                child: Text(c.isEmpty ? 'All conditions' : c),
                              ),
                            )
                            .toList(),
                        onChanged: (v) {
                          if (v != null) _filter(() => _condition = v);
                        },
                      ),
                      if (data.sections.isNotEmpty)
                        DropdownButton<String>(
                          value: _section,
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text('All sections'),
                            ),
                            ...data.sections.map(
                              (s) => DropdownMenuItem(
                                value: s['id'].toString(),
                                child: Text(s['name'].toString()),
                              ),
                            ),
                          ],
                          onChanged: (v) {
                            if (v != null) _filter(() => _section = v);
                          },
                        ),
                    ],
                  ),
                  Text(
                    '${data.total} listings',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 12),
                  if (data.items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(32),
                      child: Text(
                        'No available collectibles match this view.',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ...data.items.map(
                    (item) => item['entry_type'] == 'custom_product'
                        ? Card(
                            child: ListTile(
                              title: Text(item['title'].toString()),
                              leading: (item['photo_ids'] as List).isEmpty
                                  ? const Icon(Icons.image_outlined)
                                  : Image.network(
                                      _service.productMediaUrl(
                                        data.slug,
                                        item['id'].toString(),
                                        (item['photo_ids'] as List).first
                                            .toString(),
                                        preview: widget.preview,
                                      ),
                                      headers: _service.headers,
                                      width: 48,
                                      fit: BoxFit.contain,
                                      errorBuilder: (_, _, _) => const Icon(
                                        Icons.image_not_supported_outlined,
                                      ),
                                    ),
                              subtitle: Text(
                                'Seller-provided details\n${item['asking_price_currency']} ${(item['asking_price_amount'] as num).toStringAsFixed(2)} asking price · ${item['available_quantity']} available',
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => Navigator.push(
                                context,
                                MaterialPageRoute<void>(
                                  builder: (_) => CustomProductScreen(
                                    slug: data.slug,
                                    productId: item['id'].toString(),
                                    preview: widget.preview,
                                    service: _service,
                                  ),
                                ),
                              ),
                            ),
                          )
                        : Card(
                            clipBehavior: Clip.antiAlias,
                            child: ListTile(
                              contentPadding: const EdgeInsets.all(12),
                              leading: item['display_image_url'] == null
                                  ? const SizedBox(
                                      width: 48,
                                      child: Icon(
                                        Icons.image_not_supported_outlined,
                                      ),
                                    )
                                  : Image.network(
                                      Uri.parse(_service.baseUrl)
                                          .resolve(
                                            item['display_image_url']
                                                .toString(),
                                          )
                                          .toString(),
                                      width: 48,
                                      fit: BoxFit.contain,
                                      errorBuilder: (_, _, _) => const SizedBox(
                                        width: 48,
                                        child: Icon(
                                          Icons.image_not_supported_outlined,
                                        ),
                                      ),
                                    ),
                              title: Text(item['display_name'].toString()),
                              subtitle: Text(
                                '${item['set_code']} · ${item['number']}\n${item['finish_label'] ?? ''} · ${item['is_graded'] == true ? '${item['grade_company'] ?? ''} ${item['grade_label'] ?? item['grade_value'] ?? ''}' : item['condition_label'] ?? 'Condition not recorded'}\n${item['gv_vi_id']}\n${item['asking_price_currency']} ${(item['asking_price_amount'] as num).toStringAsFixed(2)} asking price${item['display_image_kind'] != 'exact' && item['display_image_url'] != null ? '\nRepresentative artwork' : ''}',
                              ),
                              trailing: const Icon(Icons.chevron_right),
                              onTap: () => Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) => PublicGvviScreen(
                                    gvviId: item['gv_vi_id'].toString(),
                                  ),
                                ),
                              ),
                            ),
                          ),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton(
                        onPressed: data.offset == 0
                            ? null
                            : () {
                                _offset = (data.offset - data.limit).clamp(
                                  0,
                                  data.total,
                                );
                                _load();
                              },
                        child: const Text('Previous'),
                      ),
                      TextButton(
                        onPressed: data.offset + data.limit >= data.total
                            ? null
                            : () {
                                _offset = data.offset + data.limit;
                                _load();
                              },
                        child: const Text('Next'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }
}
