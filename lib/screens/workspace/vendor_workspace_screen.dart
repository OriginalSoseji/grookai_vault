import 'dart:async';
import 'package:flutter/material.dart';
import 'workspace_activation.dart';

enum VendorDestination { desk, inventory, reports, store }

/// Navigation only: each destination keeps its existing access and write checks.
/// Pages mount on first use; the desk stays mounted while another tool is open.
class VendorWorkspaceScreen extends StatefulWidget {
  const VendorWorkspaceScreen({
    super.key,
    required this.pageBuilder,
    required this.onScan,
    required this.accountChanges,
    this.initialDestination = VendorDestination.desk,
  });

  final Widget Function(
    BuildContext,
    VendorDestination,
    ValueChanged<VendorDestination>,
  )
  pageBuilder;
  final Future<void> Function() onScan;
  final Stream<void> accountChanges;
  final VendorDestination initialDestination;

  @override
  State<VendorWorkspaceScreen> createState() => _VendorWorkspaceScreenState();
}

class _VendorWorkspaceScreenState extends State<VendorWorkspaceScreen> {
  late VendorDestination _selected = widget.initialDestination;
  final Map<VendorDestination, Widget> _pages = {};
  final Map<VendorDestination, int> _revisions = {};
  StreamSubscription<void>? _accountSubscription;
  bool _accountChanged = false;
  bool _scanning = false;
  bool _leaving = false;
  bool _allowPop = false;
  final _exits = WorkspaceExitCoordinator();

  Future<void> _leave() async {
    if (_leaving || _allowPop) return;
    _leaving = true;
    try {
      if (!await _exits.prepare() || !mounted) return;
      setState(() => _allowPop = true);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).pop();
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Your edits could not finish saving. Keep this workspace open and retry.',
            ),
          ),
        );
      }
    } finally {
      _leaving = false;
    }
  }

  @override
  void initState() {
    super.initState();
    _accountSubscription = widget.accountChanges.listen((_) {
      if (!mounted) return;
      setState(() {
        _accountChanged = true;
        _pages.clear();
      });
      final route = ModalRoute.of(context);
      if (route != null) Navigator.of(context).popUntil((r) => r == route);
    });
  }

  @override
  void dispose() {
    unawaited(_accountSubscription?.cancel());
    super.dispose();
  }

  void _select(VendorDestination value) {
    if (_accountChanged || value == _selected) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() {
      _selected = value;
      _revisions[value] = (_revisions[value] ?? 0) + 1;
    });
  }

  Future<void> _scan() async {
    if (_scanning || _accountChanged) return;
    setState(() => _scanning = true);
    try {
      await widget.onScan();
    } catch (_) {
      if (mounted && !_accountChanged) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Scan could not open. Please try again.'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _scanning = false;
          _revisions[_selected] = (_revisions[_selected] ?? 0) + 1;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_accountChanged) {
      return Scaffold(
        appBar: AppBar(title: const Text('Workspace closed')),
        body: const Center(
          child: Text('Your account changed. Reopen your workspace.'),
        ),
      );
    }
    _pages.putIfAbsent(
      _selected,
      () => widget.pageBuilder(context, _selected, _select),
    );
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final content = IndexedStack(
      index: _selected.index,
      children: VendorDestination.values
          .map(
            (destination) => TickerMode(
              enabled: destination == _selected,
              child: WorkspaceActivation(
                revision: _revisions[destination] ?? 0,
                exits: _exits,
                child: _pages[destination] ?? const SizedBox.shrink(),
              ),
            ),
          )
          .toList(),
    );
    const labels = ['Desk', 'Inventory', 'Scan', 'Reports', 'Store'];
    const icons = [
      Icons.point_of_sale_outlined,
      Icons.inventory_2_outlined,
      Icons.center_focus_strong,
      Icons.insights_outlined,
      Icons.storefront_outlined,
    ];
    final index = _selected.index < 2 ? _selected.index : _selected.index + 1;
    void navigate(int value) {
      if (value == 2) {
        unawaited(_scan());
        return;
      }
      _select(VendorDestination.values[value > 2 ? value - 1 : value]);
    }

    return PopScope(
      canPop: _allowPop,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_leave());
      },
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          toolbarHeight: 48,
          title: const Text(
            'Vendor workspace',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
          actions: [
            TextButton.icon(
              onPressed: _leave,
              icon: const Icon(Icons.collections_bookmark_outlined, size: 18),
              label: const Text('Collector'),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: wide
            ? Row(
                children: [
                  NavigationRail(
                    labelType: NavigationRailLabelType.all,
                    selectedIndex: index,
                    onDestinationSelected: navigate,
                    destinations: List.generate(
                      labels.length,
                      (i) => NavigationRailDestination(
                        icon: Icon(icons[i]),
                        label: Text(labels[i]),
                      ),
                    ),
                  ),
                  const VerticalDivider(width: 1),
                  Expanded(child: content),
                ],
              )
            : content,
        bottomNavigationBar: wide
            ? null
            : NavigationBar(
                selectedIndex: index,
                onDestinationSelected: navigate,
                destinations: List.generate(
                  labels.length,
                  (i) => NavigationDestination(
                    icon: Icon(icons[i]),
                    label: labels[i],
                  ),
                ),
              ),
      ),
    );
  }
}
