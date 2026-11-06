import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/ebay/ebay_seller_controller.dart';
import '../../services/ebay/ebay_seller_link_return.dart';
import '../../services/ebay/ebay_seller_service.dart';
import 'ebay_seller_fields.dart';
import 'ebay_seller_review.dart';

Future<void> openEbaySeller(
  BuildContext context, {
  String? instanceId,
  String? draftId,
}) => Navigator.of(context, rootNavigator: true).push<void>(
  MaterialPageRoute(
    settings: const RouteSettings(name: EbaySellerScreen.routeName),
    builder: (_) => EbaySellerScreen(instanceId: instanceId, draftId: draftId),
  ),
);

class EbaySellerScreen extends StatefulWidget {
  const EbaySellerScreen({
    super.key,
    this.instanceId,
    this.draftId,
    this.controller,
  });
  static const routeName = '/vault/ebay';
  final String? instanceId, draftId;
  final EbaySellerController? controller;
  @override
  State<EbaySellerScreen> createState() => _EbaySellerScreenState();
}

class _EbaySellerScreenState extends State<EbaySellerScreen>
    with WidgetsBindingObserver {
  EbaySellerController? _model;
  StreamSubscription<AuthState>? _auth;
  StreamSubscription<void>? _returns;
  Timer? _clock;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    if (widget.controller != null) {
      _model = widget.controller;
    } else {
      final client = Supabase.instance.client;
      final owner = client.auth.currentUser?.id;
      if (owner != null) {
        _model = EbaySellerController(
          api: EbaySellerService(client, ownerId: owner),
          initialInstanceId: widget.instanceId,
          initialDraftId: widget.draftId,
        );
        _auth = client.auth.onAuthStateChange.listen((state) {
          if (mounted && state.session?.user.id != owner) {
            setState(() {
              _model?.removeListener(_changed);
              _model?.dispose();
              _model = null;
            });
          }
        });
      }
    }
    _model?.addListener(_changed);
    _returns = EbaySellerLinkReturn.stream.listen((_) => _model?.refresh());
    _clock = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) setState(() {});
    });
    unawaited(_model?.refresh());
  }

  void _changed() {
    if (mounted) setState(() {});
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(_model?.refresh());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _clock?.cancel();
    _auth?.cancel();
    _returns?.cancel();
    _model?.removeListener(_changed);
    if (widget.controller == null) _model?.dispose();
    super.dispose();
  }

  Future<void> _photo(ImageSource source) async {
    final model = _model;
    if (model == null || model.busy != null) return;
    try {
      final file = await ImagePicker().pickImage(
        source: source,
        requestFullMetadata: false,
      );
      if (file == null || !mounted) return;
      if (await file.length() > 16 * 1024 * 1024) {
        throw StateError('Choose a photo up to 16 MB.');
      }
      final bytes = await file.readAsBytes();
      final jpeg = bytes.length > 2 && bytes[0] == 0xff && bytes[1] == 0xd8;
      final png =
          bytes.length > 8 &&
          bytes[0] == 0x89 &&
          bytes[1] == 0x50 &&
          bytes[2] == 0x4e &&
          bytes[3] == 0x47;
      if (!jpeg && !png) throw StateError('Choose a JPEG or PNG photo.');
      await model.uploadPhoto(
        filename: file.name,
        bytes: bytes,
        contentType: png ? 'image/png' : 'image/jpeg',
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              error is StateError
                  ? error.message.toString()
                  : 'Could not choose a photo. Try again.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _connect() async {
    final uri = await _model?.startLink();
    if (uri == null || !mounted) return;
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw StateError('Could not open eBay.');
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open the seller connection. Try again.'),
          ),
        );
      }
    }
  }

  Widget _message(BuildContext context, String value, {bool error = false}) =>
      Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: error
              ? Theme.of(context).colorScheme.errorContainer
              : Theme.of(context).colorScheme.surfaceContainerLow,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          value,
          style: TextStyle(
            height: 1.5,
            color: error
                ? Theme.of(context).colorScheme.onErrorContainer
                : null,
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final model = _model;
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 48,
        title: const Text('eBay listings'),
        actions: [
          IconButton(
            tooltip: 'Refresh eBay status',
            onPressed: model == null || model.busy != null
                ? null
                : model.refresh,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: model == null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Sign in to your grookai account to manage eBay listings.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            )
          : SafeArea(
              top: false,
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                child: Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1040),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (model.busy != null) ...[
                          const LinearProgressIndicator(minHeight: 2),
                          const SizedBox(height: 8),
                          Text(
                            '${model.busy}…',
                            style: TextStyle(
                              fontSize: 13,
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],
                        if (model.error != null)
                          _message(context, model.error!, error: true),
                        if (model.notice != null)
                          _message(context, model.notice!),
                        if (model.account.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            model.account['linked'] == true
                                                ? model.account['username']
                                                          ?.toString() ??
                                                      'Seller connected'
                                                : 'Connect your eBay seller account',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                          const SizedBox(height: 5),
                                          Text(
                                            model.account['reconnectRequired'] ==
                                                    true
                                                ? 'Reconnect to continue listing.'
                                                : 'One exact copy · your photos · your selling policies',
                                            style: TextStyle(
                                              fontSize: 13,
                                              color: colors.onSurfaceVariant,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (model.account['linked'] != true ||
                                        model.account['reconnectRequired'] ==
                                            true)
                                      FilledButton(
                                        onPressed:
                                            model.busy == null &&
                                                model.account['linkingEnabled'] ==
                                                    true
                                            ? _connect
                                            : null,
                                        child: const Text('Connect eBay'),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                const Divider(height: 1),
                              ],
                            ),
                          ),
                        if (model.account.isNotEmpty &&
                            model.account['linkingEnabled'] != true)
                          _message(
                            context,
                            'Seller listings aren’t available yet. Active and sold searches remain available from your card details.',
                          ),
                        if (model.copy.isEmpty) ...[
                          const Text(
                            'Choose an exact copy from your Vault to start a listing.',
                          ),
                          const SizedBox(height: 16),
                          for (final summary in sellerRows(
                            model.workspace['drafts'],
                          ))
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.sell_outlined),
                              title: Text(
                                summary['title']?.toString() ?? 'Listing draft',
                              ),
                              subtitle: Text(
                                sellerStateLabel(summary['state']),
                              ),
                              trailing: const Icon(Icons.chevron_right_rounded),
                              onTap: () => openEbaySeller(
                                context,
                                draftId: summary['id'] as String,
                              ),
                            ),
                        ] else if (model.local != null) ...[
                          Padding(
                            padding: const EdgeInsets.only(bottom: 24),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: SizedBox(
                                    width: 64,
                                    height: 90,
                                    child: model.copy['gvId'] is String
                                        ? Image.network(
                                            'https://grookaivault.com/api/canon/cards/${Uri.encodeComponent(model.copy['gvId'] as String)}/image',
                                            fit: BoxFit.contain,
                                            semanticLabel:
                                                '${model.copy['name']} catalog reference',
                                            errorBuilder: (_, _, _) =>
                                                ColoredBox(
                                                  color: colors
                                                      .surfaceContainerLow,
                                                  child: const Icon(
                                                    Icons.style_outlined,
                                                  ),
                                                ),
                                          )
                                        : ColoredBox(
                                            color: colors.surfaceContainerLow,
                                            child: const Icon(
                                              Icons.style_outlined,
                                            ),
                                          ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        model.copy['name']?.toString() ??
                                            'Exact copy',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        '${model.copy['setCode'] ?? ''} · ${model.copy['number'] ?? ''} · ${model.copy['isGraded'] == true ? '${model.copy['grader'] ?? 'Graded'} ${model.copy['grade'] ?? ''}' : model.copy['condition'] ?? 'Condition unknown'}',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: colors.onSurfaceVariant,
                                        ),
                                      ),
                                      const SizedBox(height: 5),
                                      Text(
                                        '${model.copy['gvviId'] ?? ''} · ${sellerStateLabel(model.draft['state'])}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          color: colors.onSurfaceVariant,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          LayoutBuilder(
                            builder: (context, constraints) {
                              final fields = EbaySellerFields(
                                controller: model,
                                onChoosePhoto: () =>
                                    _photo(ImageSource.gallery),
                                onTakePhoto: () => _photo(ImageSource.camera),
                              );
                              final review = EbaySellerReview(
                                controller: model,
                                nowMillis:
                                    DateTime.now().millisecondsSinceEpoch,
                              );
                              if (constraints.maxWidth >= 800) {
                                return Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(child: fields),
                                    const SizedBox(width: 32),
                                    SizedBox(width: 280, child: review),
                                  ],
                                );
                              }
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [fields, review],
                              );
                            },
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}
