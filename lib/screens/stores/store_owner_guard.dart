import 'package:flutter/material.dart';
import '../../services/stores/storefront_service.dart';

/// Removes private content immediately, even while a dialog or child is open.
mixin StoreOwnerGuard<T extends StatefulWidget> on State<T> {
  StorefrontService? _guardedStore;
  bool _guardDisposed = false;
  bool get storeOwnerClosed =>
      _guardDisposed || _guardedStore?.ownerClosed == true;

  void watchStoreOwner(StorefrontService service) {
    _guardedStore = service;
    service.bindOwner();
    service.addListener(_storeChanged);
  }

  void _storeChanged() {
    if (mounted && storeOwnerClosed) {
      clearStoreDraft();
      setState(() {});
    }
  }

  void clearStoreDraft() {}

  Widget closedStore() => Scaffold(
    appBar: AppBar(title: const Text('Store closed')),
    body: const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Text('Your account changed. Reopen Store to continue.'),
      ),
    ),
  );

  void stopWatchingStoreOwner() {
    _guardDisposed = true;
    _guardedStore?.removeListener(_storeChanged);
  }

  @override
  void dispose() {
    stopWatchingStoreOwner();
    super.dispose();
  }
}

Future<bool?> showStoreOwnerDialog({
  required BuildContext context,
  required StorefrontService service,
  required WidgetBuilder builder,
}) {
  if (service.ownerClosed) return Future.value(false);
  service.assertOwner();
  return showDialog<bool>(
    context: context,
    builder: (context) => AnimatedBuilder(
      animation: service,
      builder: (context, _) => service.ownerClosed
          ? AlertDialog(
              title: const Text('Store closed'),
              content: const Text(
                'Your account changed. Reopen Store to continue.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false),
                  child: const Text('Close'),
                ),
              ],
            )
          : builder(context),
    ),
  );
}
