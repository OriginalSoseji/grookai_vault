import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

import '../../models/binders/binder_models.dart';
import '../../models/binders/binder_grid_layout.dart';
import '../../services/binders/binder_grid_preferences.dart';
import '../../services/binders/binder_display_identity.dart';
import 'binder_widgets.dart';
import 'binder_grid_size_sheet.dart';
import 'binder_page_picker_sheet.dart';
import 'binder_pocket_sheet.dart';
import 'binder_move_to_pocket_sheet.dart';
import 'binder_page_image_sheet.dart';

class BinderPageArrangement extends StatefulWidget {
  const BinderPageArrangement({
    super.key,
    required this.slots,
    required this.onMove,
    this.gridPreferences,
    this.revealSlotKey,
    this.revealVersion = 0,
    this.onInspect,
  });
  final List<BinderCustomSlotDraft> slots;
  final void Function(int from, int to) onMove;
  final BinderGridPreferences? gridPreferences;

  /// View-only request. Locating never selects a card for moving.
  final String? revealSlotKey;
  final int revealVersion;
  final ValueChanged<BinderCustomSlotDraft>? onInspect;
  @override
  State<BinderPageArrangement> createState() => _BinderPageArrangementState();
}

class _PocketDrag {
  const _PocketDrag(this.owner, this.key);
  final Object owner;
  final String key;
}

class _PocketMove {
  const _PocketMove(this.from, this.to, this.key);
  final int from;
  final int to;
  final String key;
}

class _BinderPageArrangementState extends State<BinderPageArrangement> {
  int _page = 0;
  bool _showDetails = true;
  bool _choosingPocket = false;
  bool _previewingImage = false;
  late BinderGridPreferences _preferences;
  late BinderGridLayout _layout;
  String? _selectedKey;
  String? _locatedKey;
  final _locatedPocketKey = GlobalKey();
  String? _moveMessage;
  late List<String> _lastSlots;
  final _undoMoves = <_PocketMove>[];
  final _redoMoves = <_PocketMove>[];
  final _dragOwner = Object();
  final _gridKey = GlobalKey();
  final _pageHeaderKey = GlobalKey();
  final _previousKey = GlobalKey();
  final _nextKey = GlobalKey();
  _PocketDrag? _drag;
  List<String>? _dragSnapshot;
  int? _hoverIndex;
  Offset? _pointer;
  Timer? _scrollTimer;
  Timer? _pageTimer;
  int? _turnDirection;
  bool _routingPointer = false;
  final Map<String, int> _pressedPointers = {};
  int? _dragPointer;

  int get _columns => _layout.columns;
  int get _rows => _layout.rows;
  int get _capacity => _layout.pockets;
  double get _horizontalGaps => 9.0 * (_columns - 1);
  double get _verticalGaps => 9.0 * (_rows - 1);
  int get _pages => (widget.slots.length / _capacity).ceil().clamp(1, 1000);
  List<String> _snapshot() => [
    for (final slot in widget.slots)
      '${slot.displayKey}:${slot.requiredQuantity}',
  ];
  bool _accepts(_PocketDrag? data) =>
      data != null &&
      identical(data.owner, _dragOwner) &&
      identical(data, _drag) &&
      listEquals(_dragSnapshot, _snapshot());

  Widget _inspectButton(BinderCustomSlotDraft slot) => TextButton.icon(
    key: const ValueKey('binder-inspect-card'),
    style: TextButton.styleFrom(minimumSize: const Size(0, 48)),
    onPressed: _drag != null
        ? null
        : () {
            final onInspect = widget.onInspect;
            if (onInspect != null) {
              onInspect(slot);
            } else {
              final index = widget.slots.indexWhere(
                (item) => item.displayKey == slot.displayKey,
              );
              if (index >= 0) {
                unawaited(
                  showBinderPocketSheet(
                    context,
                    slot: slot,
                    pocketNumber: index + 1,
                  ),
                );
              }
            }
          },
    icon: const Icon(Icons.visibility_outlined),
    label: const Text('Inspect card'),
  );

  Future<void> _moveToPocket() async {
    if (_drag != null || _choosingPocket) return;
    final from = widget.slots.indexWhere(
      (slot) => slot.displayKey == _selectedKey,
    );
    if (from < 0) return;
    FocusManager.instance.primaryFocus?.unfocus();
    final snapshot = _snapshot();
    final slots = List<BinderCustomSlotDraft>.unmodifiable(widget.slots);
    final selectedKey = _selectedKey;
    final layout = _layout;
    setState(() => _choosingPocket = true);
    int? chosen;
    try {
      chosen = await showModalBottomSheet<int>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        constraints: const BoxConstraints(maxWidth: 560),
        builder: (_) =>
            BinderMoveToPocketSheet(slots: slots, from: from, layout: layout),
      );
    } finally {
      if (mounted) setState(() => _choosingPocket = false);
    }
    if (!mounted || chosen == null) return;
    if (!listEquals(snapshot, _snapshot()) ||
        _layout != layout ||
        _selectedKey != selectedKey) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text(
            'The checklist or grid changed. Choose a pocket again to see the updated layout.',
          ),
        ),
      );
      return;
    }
    _move(from, chosen);
    _scrollToPageHeader();
  }

  Future<void> _sharePageImage() async {
    if (_drag != null || _previewingImage || widget.slots.isEmpty) return;
    FocusManager.instance.primaryFocus?.unfocus();
    final snapshot = _snapshot();
    final layout = _layout;
    final page = _page.clamp(0, _pages - 1);
    final pages = _pages;
    final slots = List<BinderCustomSlotDraft>.unmodifiable(
      widget.slots.skip(page * _capacity).take(_capacity),
    );
    setState(() => _previewingImage = true);
    try {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        constraints: BoxConstraints(
          maxWidth: 660,
          maxHeight: MediaQuery.sizeOf(context).height * .9,
        ),
        builder: (_) => BinderPageImageSheet(
          slots: slots,
          layout: layout,
          page: page,
          totalPages: pages,
          isCurrent: () =>
              mounted && _layout == layout && listEquals(snapshot, _snapshot()),
        ),
      );
    } finally {
      if (mounted) setState(() => _previewingImage = false);
    }
  }

  @override
  void initState() {
    super.initState();
    _lastSlots = _snapshot();
    _preferences = widget.gridPreferences ?? BinderGridPreferences.shared;
    _layout = _preferences.value;
    _preferences.addListener(_onGridChanged);
    unawaited(_preferences.ensureLoaded());
    _locateRequestedSlot();
  }

  void _locateRequestedSlot() {
    final index = widget.slots.indexWhere(
      (slot) => slot.displayKey == widget.revealSlotKey,
    );
    if (index < 0) return;
    _clearDrag(rebuild: false);
    _selectedKey = null;
    _moveMessage = null;
    _locatedKey = widget.revealSlotKey;
    _page = index ~/ _capacity;
    _scrollToLocatedPocket();
  }

  void _scrollToLocatedPocket() {
    final key = _locatedKey;
    final version = widget.revealVersion;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || key != _locatedKey || version != widget.revealVersion) {
        return;
      }
      final pocket = _locatedPocketKey.currentContext;
      if (pocket == null) return;
      unawaited(
        Scrollable.ensureVisible(
          pocket,
          alignment: .5,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 160),
        ),
      );
    });
  }

  void _onGridChanged() {
    if (!mounted || _layout == _preferences.value) return;
    final selected = widget.slots.indexWhere(
      (slot) => slot.displayKey == _selectedKey,
    );
    final located = widget.slots.indexWhere(
      (slot) => slot.displayKey == _locatedKey,
    );
    final anchor = selected >= 0
        ? selected
        : located >= 0
        ? located
        : _page * _capacity;
    _clearDrag(rebuild: false);
    setState(() {
      _layout = _preferences.value;
      _page = (anchor ~/ _capacity).clamp(0, _pages - 1);
      _moveMessage = null;
    });
    if (located >= 0) _scrollToLocatedPocket();
  }

  Future<void> _chooseGridSize() async {
    if (_drag != null) return;
    FocusManager.instance.primaryFocus?.unfocus();
    final chosen = await showModalBottomSheet<BinderGridLayout>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      constraints: const BoxConstraints(maxWidth: 560),
      builder: (_) => BinderGridSizeSheet(selected: _layout),
    );
    if (chosen == null || !mounted || chosen == _layout) return;
    final saved = await _preferences.select(chosen);
    if (!saved && mounted && _preferences.value == chosen) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text(
            'Grid size changed for this session, but could not be remembered on this device.',
          ),
        ),
      );
    }
  }

  Future<void> _choosePage() async {
    if (_drag != null) return;
    FocusManager.instance.primaryFocus?.unfocus();
    final snapshot = _snapshot();
    final layout = _layout;
    final chosen = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      constraints: const BoxConstraints(maxWidth: 560),
      builder: (_) => BinderPagePickerSheet(
        slots: List<BinderCustomSlotDraft>.unmodifiable(widget.slots),
        layout: layout,
        currentPage: _page,
        movingCard: _selectedKey != null,
      ),
    );
    if (chosen == null || !mounted) return;
    if (_layout != layout || !listEquals(snapshot, _snapshot())) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(
          content: Text(
            'The checklist changed. Open pages again to see the updated layout.',
          ),
        ),
      );
      return;
    }
    setState(() => _page = chosen.clamp(0, _pages - 1));
    _scrollToPageHeader();
  }

  void _scrollToPageHeader() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final header = _pageHeaderKey.currentContext;
      if (header == null) return;
      unawaited(
        Scrollable.ensureVisible(
          header,
          alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtStart,
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : const Duration(milliseconds: 160),
        ),
      );
    });
  }

  @override
  void didUpdateWidget(covariant BinderPageArrangement oldWidget) {
    super.didUpdateWidget(oldWidget);
    final next = widget.gridPreferences ?? BinderGridPreferences.shared;
    if (!identical(next, _preferences)) {
      _preferences.removeListener(_onGridChanged);
      _preferences = next;
      _preferences.addListener(_onGridChanged);
      _onGridChanged();
      unawaited(_preferences.ensureLoaded());
    }
    final current = _snapshot();
    if (!listEquals(current, _lastSlots)) {
      _lastSlots = current;
      _undoMoves.clear();
      _redoMoves.clear();
      _moveMessage = null;
      _locatedKey = null;
      if (!widget.slots.any((slot) => slot.displayKey == _selectedKey)) {
        _selectedKey = null;
      }
      if (_drag != null && !listEquals(current, _dragSnapshot)) {
        _clearDrag(rebuild: false);
      }
      _page = _page.clamp(0, _pages - 1);
    }
    if (widget.revealSlotKey != oldWidget.revealSlotKey ||
        widget.revealVersion != oldWidget.revealVersion) {
      _locateRequestedSlot();
    }
  }

  @override
  void dispose() {
    _preferences.removeListener(_onGridChanged);
    _clearDrag(rebuild: false);
    super.dispose();
  }

  void _startDrag(_PocketDrag data) {
    _clearDrag(rebuild: false);
    setState(() {
      _drag = data;
      _dragSnapshot = _snapshot();
      _hoverIndex = null;
      _moveMessage = null;
      _locatedKey = null;
      _dragPointer = _pressedPointers[data.key];
    });
    GestureBinding.instance.pointerRouter.addGlobalRoute(_routePointer);
    _routingPointer = true;
    _scrollTimer = Timer.periodic(
      const Duration(milliseconds: 30),
      (_) => _scrollAtEdge(),
    );
  }

  void _clearDrag({bool rebuild = true}) {
    _scrollTimer?.cancel();
    _scrollTimer = null;
    _pageTimer?.cancel();
    _pageTimer = null;
    _turnDirection = null;
    _dragPointer = null;
    if (_routingPointer) {
      GestureBinding.instance.pointerRouter.removeGlobalRoute(_routePointer);
      _routingPointer = false;
    }
    if (rebuild && mounted) {
      setState(() {
        _drag = null;
        _dragSnapshot = null;
        _hoverIndex = null;
        _pointer = null;
      });
    } else {
      _drag = null;
      _dragSnapshot = null;
      _hoverIndex = null;
      _pointer = null;
    }
  }

  void _routePointer(PointerEvent event) {
    if (_drag == null || !mounted) return;
    if (_dragPointer != null && event.pointer != _dragPointer) return;
    if (event is PointerMoveEvent) {
      _pointer = event.position;
      _checkPageEdge(event.position);
      _updatePointerHover();
    } else if (event is PointerUpEvent || event is PointerCancelEvent) {
      // Let the drag target process a release before clearing the preview.
      scheduleMicrotask(() {
        if (mounted && _drag != null) _clearDrag();
      });
    }
  }

  void _scrollAtEdge() {
    if (!mounted || _drag == null || _pointer == null) return;
    final scrollable = Scrollable.maybeOf(context);
    final box = scrollable?.context.findRenderObject();
    if (scrollable == null ||
        box is! RenderBox ||
        !scrollable.position.hasContentDimensions) {
      return;
    }
    final rect = box.localToGlobal(Offset.zero) & box.size;
    final pointer = _pointer!;
    if (pointer.dx < rect.left ||
        pointer.dx > rect.right ||
        pointer.dy < rect.top - 32 ||
        pointer.dy > rect.bottom + 32) {
      return;
    }
    final delta = pointer.dy < rect.top + 56
        ? -12.0
        : pointer.dy > rect.bottom - 56
        ? 12.0
        : 0.0;
    if (delta == 0) return;
    final position = scrollable.position;
    final next = (position.pixels + delta).clamp(
      position.minScrollExtent,
      position.maxScrollExtent,
    );
    if (next != position.pixels) {
      position.jumpTo(next);
    }
    _updatePointerHover();
  }

  int? _indexAtPointer() {
    final box = _gridKey.currentContext?.findRenderObject();
    if (_pointer == null || box is! RenderBox || widget.slots.isEmpty) {
      return null;
    }
    final point = box.globalToLocal(_pointer!);
    if (!(Offset.zero & box.size).contains(point)) return null;
    final width = (box.size.width - _horizontalGaps) / _columns;
    final height = (box.size.height - _verticalGaps) / _rows;
    final column = (point.dx / (width + 9)).floor();
    final row = (point.dy / (height + 9)).floor();
    if (column >= _columns ||
        row >= _rows ||
        point.dx % (width + 9) > width ||
        point.dy % (height + 9) > height) {
      return null;
    }
    return _page * _capacity + row * _columns + column;
  }

  void _updatePointerHover() {
    final target = _indexAtPointer();
    if (_hoverIndex != target) setState(() => _hoverIndex = target);
  }

  void _checkPageEdge(Offset pointer) {
    for (final entry in [(-1, _previousKey), (1, _nextKey)]) {
      final button = entry.$2.currentContext?.findRenderObject();
      if (button is RenderBox &&
          (button.localToGlobal(Offset.zero) & button.size).contains(pointer)) {
        _scheduleTurn(entry.$1);
        return;
      }
    }
    final box = _gridKey.currentContext?.findRenderObject();
    if (box is! RenderBox) return;
    final rect = box.localToGlobal(Offset.zero) & box.size;
    if (pointer.dy < rect.top || pointer.dy > rect.bottom) {
      _scheduleTurn(null);
      return;
    }
    _scheduleTurn(
      pointer.dx >= rect.right - 26 && pointer.dx <= rect.right + 26
          ? 1
          : pointer.dx <= rect.left + 26 && pointer.dx >= rect.left - 26
          ? -1
          : null,
    );
  }

  void _scheduleTurn(int? direction) {
    if (direction != null &&
        (_page + direction < 0 || _page + direction >= _pages)) {
      direction = null;
    }
    if (_turnDirection == direction) return;
    _pageTimer?.cancel();
    _turnDirection = direction;
    if (direction == null) return;
    _pageTimer = Timer(const Duration(milliseconds: 750), () {
      if (!mounted || _drag == null || _turnDirection == null) return;
      final target = (_page + _turnDirection!).clamp(0, _pages - 1);
      setState(() {
        _page = target;
        _hoverIndex = null;
      });
      _turnDirection = null;
      if (_pointer != null) _checkPageEdge(_pointer!);
    });
  }

  void _move(int from, int to) {
    if (from == to ||
        from < 0 ||
        from >= widget.slots.length ||
        to < 0 ||
        to >= widget.slots.length) {
      return;
    }
    final moved = widget.slots[from];
    if (!listEquals(_lastSlots, _snapshot())) _undoMoves.clear();
    _undoMoves.add(_PocketMove(from, to, moved.displayKey));
    // Keep session history bounded even during a long arrangement session.
    if (_undoMoves.length > 50) _undoMoves.removeAt(0);
    _redoMoves.clear();
    _applyMove(
      from,
      to,
      '${resolveBinderCatalogCardIdentity(moved.card).displayName} · ${moved.finish.label} moved to pocket ${to + 1}. Order is not saved yet.',
    );
  }

  void _applyMove(int from, int to, String message) {
    // Record the expected result before notifying the caller. Both in-place
    // draft edits and callers that replace their list are supported.
    final expected = _snapshot();
    expected.insert(to, expected.removeAt(from));
    _lastSlots = expected;
    widget.onMove(from, to);
    setState(() {
      _selectedKey = null;
      _locatedKey = null;
      _page = (to ~/ _capacity).clamp(0, _pages - 1);
      _moveMessage = message;
    });
  }

  void _replayMove({required bool redo}) {
    if (_drag != null) return;
    final source = redo ? _redoMoves : _undoMoves;
    final destination = redo ? _undoMoves : _redoMoves;
    if (source.isEmpty) return;
    final move = source.last;
    final from = redo ? move.from : move.to;
    final to = redo ? move.to : move.from;
    if (!listEquals(_lastSlots, _snapshot()) ||
        from >= widget.slots.length ||
        widget.slots[from].displayKey != move.key) {
      setState(() {
        _undoMoves.clear();
        _redoMoves.clear();
        _moveMessage = 'The checklist changed. Move history has been cleared.';
      });
      return;
    }
    final moved = widget.slots[from];
    source.removeLast();
    destination.add(move);
    _applyMove(
      from,
      to,
      '${redo ? 'Redid' : 'Undid'} move: ${resolveBinderCatalogCardIdentity(moved.card).displayName} · ${moved.finish.label} is in pocket ${to + 1}.',
    );
  }

  void _drop(_PocketDrag data, int index) {
    if (!_accepts(data)) return;
    // Scrolling can change the pocket beneath a stationary finger without a
    // new avatar hit test. Resolve against the current grid before committing.
    final current = _pointer == null ? index : _indexAtPointer();
    if (current == null) {
      _clearDrag();
      return;
    }
    final from = widget.slots.indexWhere((slot) => slot.displayKey == data.key);
    final to = current.clamp(0, widget.slots.length - 1);
    _clearDrag(rebuild: false);
    _move(from, to);
    if (mounted) setState(() {});
  }

  Widget _pageButton(int direction, int page) => DragTarget<_PocketDrag>(
    key: direction < 0 ? _previousKey : _nextKey,
    onWillAcceptWithDetails: (details) => _accepts(details.data),
    onMove: (_) => _scheduleTurn(direction),
    onLeave: (_) => _scheduleTurn(null),
    builder: (context, candidates, rejected) => DecoratedBox(
      decoration: BoxDecoration(
        color: candidates.isEmpty
            ? Colors.transparent
            : Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: IconButton(
        tooltip: direction < 0 ? 'Previous binder page' : 'Next binder page',
        onPressed: page + direction < 0 || page + direction >= _pages
            ? null
            : () => setState(() => _page = page + direction),
        icon: Icon(direction < 0 ? Icons.chevron_left : Icons.chevron_right),
      ),
    ),
  );

  Widget _pageHeader(ThemeData theme, int page) => LayoutBuilder(
    builder: (context, constraints) {
      final title = Text(
        'Page arrangement',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: theme.textTheme.titleSmall,
      );
      final share = IconButton(
        key: const ValueKey('binder-share-page'),
        tooltip: 'Share page image',
        constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
        onPressed: _drag == null && !_previewingImage && widget.slots.isNotEmpty
            ? _sharePageImage
            : null,
        icon: const Icon(Icons.ios_share_rounded),
      );
      final navigation = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _pageButton(-1, page),
          Tooltip(
            message: 'Choose binder page',
            child: TextButton(
              key: const ValueKey('binder-page-picker'),
              style: TextButton.styleFrom(
                minimumSize: const Size(48, 48),
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              onPressed: _drag == null ? _choosePage : null,
              child: Semantics(
                label: 'Page ${page + 1} of $_pages. Choose binder page',
                excludeSemantics: true,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${page + 1} / $_pages'),
                    const SizedBox(width: 4),
                    const Icon(Icons.expand_more_rounded, size: 16),
                  ],
                ),
              ),
            ),
          ),
          _pageButton(1, page),
        ],
      );
      final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
      if (constraints.maxWidth >= 340 && scale <= 1.15) {
        return Row(
          children: [
            Expanded(child: title),
            share,
            navigation,
          ],
        );
      }
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: title),
              share,
            ],
          ),
          Align(alignment: Alignment.centerRight, child: navigation),
        ],
      );
    },
  );

  Widget _viewControls(ThemeData theme) => Padding(
    padding: const EdgeInsets.only(bottom: 9),
    child: LayoutBuilder(
      builder: (context, constraints) {
        final grid = OutlinedButton.icon(
          key: const ValueKey('binder-grid-size'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
          ),
          onPressed: _drag == null ? _chooseGridSize : null,
          icon: const Icon(Icons.grid_view_rounded),
          label: Text('Grid size · ${_layout.label}'),
        );
        final display = SegmentedButton<bool>(
          key: const ValueKey('binder-page-display'),
          showSelectedIcon: false,
          style: SegmentedButton.styleFrom(
            minimumSize: const Size(0, 48),
            selectedForegroundColor: theme.colorScheme.primary,
            selectedBackgroundColor: theme.colorScheme.surfaceContainerHigh,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          segments: const [
            ButtonSegment(
              value: false,
              label: Text('Artwork'),
              tooltip: 'Show artwork with pocket, quantity and finish',
            ),
            ButtonSegment(
              value: true,
              label: Text('Details'),
              tooltip: 'Show full card labels',
            ),
          ],
          selected: {_showDetails},
          onSelectionChanged: _drag == null
              ? (selection) => setState(() => _showDetails = selection.single)
              : null,
        );
        final scale = MediaQuery.textScalerOf(context).scale(14) / 14;
        return constraints.maxWidth >= 340 && scale <= 1.15
            ? Row(
                children: [
                  Expanded(child: grid),
                  const SizedBox(width: 9),
                  Expanded(child: display),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [grid, const SizedBox(height: 9), display],
              );
      },
    ),
  );

  @override
  Widget build(BuildContext context) {
    final page = _page.clamp(0, _pages - 1);
    final selected = widget.slots.indexWhere(
      (slot) => slot.displayKey == _selectedKey,
    );
    final theme = Theme.of(context);
    final selectedSlot = selected < 0 ? null : widget.slots[selected];
    final located = widget.slots.indexWhere(
      (slot) => slot.displayKey == _locatedKey,
    );
    final preview = List<BinderCustomSlotDraft>.of(widget.slots);
    if (_drag != null && _hoverIndex != null) {
      final from = preview.indexWhere((slot) => slot.displayKey == _drag!.key);
      if (from >= 0) {
        preview.insert(
          _hoverIndex!.clamp(0, preview.length - 1),
          preview.removeAt(from),
        );
      }
    }
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 660),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            KeyedSubtree(key: _pageHeaderKey, child: _pageHeader(theme, page)),
            _viewControls(theme),
            Text(
              _drag != null
                  ? 'Release over a pocket to move. Hold at a side edge to turn the page.'
                  : selected < 0
                  ? 'Hold and drag a card, or tap to choose its new pocket. Save the checklist to keep the order.'
                  : 'Choose another card’s pocket, on this page or the next. Cards in between shift.',
              style: theme.textTheme.bodySmall,
            ),
            if (selectedSlot != null) ...[
              const SizedBox(height: 12),
              Text(
                '${resolveBinderCatalogCardIdentity(selectedSlot.card).displayName} · ${selectedSlot.finish.label}',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                ),
              ),
              if (!_showDetails)
                Text(
                  '${selectedSlot.requiredQuantity} ${selectedSlot.requiredQuantity == 1 ? 'copy' : 'copies'} required',
                  style: theme.textTheme.bodySmall,
                ),
              Text(
                'Moving from pocket ${selected + 1}',
                style: theme.textTheme.bodySmall,
              ),
              Wrap(
                spacing: 9,
                children: [
                  _inspectButton(selectedSlot),
                  TextButton.icon(
                    key: const ValueKey('binder-move-to-pocket'),
                    style: TextButton.styleFrom(minimumSize: const Size(0, 48)),
                    onPressed:
                        _drag == null &&
                            !_choosingPocket &&
                            widget.slots.length > 1
                        ? _moveToPocket
                        : null,
                    icon: const Icon(Icons.drive_file_move_outlined),
                    label: const Text('Move to pocket'),
                  ),
                  TextButton(
                    style: TextButton.styleFrom(minimumSize: const Size(0, 48)),
                    onPressed: () => setState(() => _selectedKey = null),
                    child: const Text('Cancel move'),
                  ),
                ],
              ),
            ] else if (located >= 0) ...[
              const SizedBox(height: 8),
              Semantics(
                liveRegion: true,
                child: Text(
                  'Located pocket ${located + 1}: ${resolveBinderCatalogCardIdentity(widget.slots[located].card).displayName} · ${widget.slots[located].finish.label}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
              Align(
                alignment: Alignment.centerLeft,
                child: _inspectButton(widget.slots[located]),
              ),
            ] else if (_moveMessage != null) ...[
              const SizedBox(height: 8),
              Semantics(
                liveRegion: true,
                child: Text(_moveMessage!, style: theme.textTheme.bodySmall),
              ),
            ],
            if (_undoMoves.isNotEmpty || _redoMoves.isNotEmpty)
              Wrap(
                spacing: 9,
                children: [
                  TextButton.icon(
                    key: const ValueKey('binder-undo-move'),
                    style: TextButton.styleFrom(minimumSize: const Size(0, 48)),
                    onPressed: _drag == null && _undoMoves.isNotEmpty
                        ? () => _replayMove(redo: false)
                        : null,
                    icon: const Icon(Icons.undo_rounded),
                    label: const Text('Undo move'),
                  ),
                  TextButton.icon(
                    key: const ValueKey('binder-redo-move'),
                    style: TextButton.styleFrom(minimumSize: const Size(0, 48)),
                    onPressed: _drag == null && _redoMoves.isNotEmpty
                        ? () => _replayMove(redo: true)
                        : null,
                    icon: const Icon(Icons.redo_rounded),
                    label: const Text('Redo move'),
                  ),
                ],
              ),
            const SizedBox(height: 9),
            LayoutBuilder(
              builder: (context, constraints) {
                final width =
                    (constraints.maxWidth - _horizontalGaps) / _columns;
                final scale = MediaQuery.textScalerOf(context).scale(12) / 12;
                final height =
                    (width - 8) * 1.4 + (_showDetails ? 104 : 32) * scale + 12;
                final duration = MediaQuery.disableAnimationsOf(context)
                    ? Duration.zero
                    : const Duration(milliseconds: 160);
                return SizedBox(
                  key: _gridKey,
                  height: height * _rows + _verticalGaps,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      for (var offset = 0; offset < _capacity; offset++)
                        if (page * _capacity + offset < preview.length) ...[
                          _pocket(
                            preview[page * _capacity + offset],
                            offset,
                            page * _capacity + offset,
                            selected,
                            width,
                            height,
                            duration,
                          ),
                        ] else
                          Positioned(
                            left: offset % _columns * (width + 9),
                            top: offset ~/ _columns * (height + 9),
                            width: width,
                            height: height,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: theme.colorScheme.outlineVariant,
                                ),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Center(
                                child: Text(
                                  _drag == null
                                      ? 'Empty pocket'
                                      : 'Move to end',
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                          ),
                      // Fixed targets sit over the animated card positions. Translucent
                      // hit testing keeps the card's long-press/tap gestures available.
                      for (var offset = 0; offset < _capacity; offset++)
                        Positioned(
                          left: offset % _columns * (width + 9),
                          top: offset ~/ _columns * (height + 9),
                          width: width,
                          height: height,
                          child: DragTarget<_PocketDrag>(
                            key: ValueKey(
                              'binder-drop-${page * _capacity + offset}',
                            ),
                            onWillAcceptWithDetails: (details) =>
                                _accepts(details.data),
                            onMove: (details) {
                              if (!_accepts(details.data)) return;
                              final target = page * _capacity + offset;
                              if (_hoverIndex != target) {
                                setState(() => _hoverIndex = target);
                              }
                            },
                            onAcceptWithDetails: (details) =>
                                _drop(details.data, page * _capacity + offset),
                            builder: (context, candidates, rejected) =>
                                IgnorePointer(
                                  child: AnimatedContainer(
                                    duration: duration,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(10),
                                      border: Border.all(
                                        width: 2,
                                        color:
                                            _drag == null ||
                                                _hoverIndex !=
                                                    page * _capacity + offset
                                            ? Colors.transparent
                                            : theme.colorScheme.primary,
                                      ),
                                    ),
                                  ),
                                ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _pocket(
    BinderCustomSlotDraft slot,
    int offset,
    int index,
    int selected,
    double width,
    double height,
    Duration duration,
  ) {
    final identity = resolveBinderCatalogCardIdentity(slot.card);
    final colors = Theme.of(context).colorScheme;
    final dragging = _drag?.key == slot.displayKey;
    final data = _PocketDrag(_dragOwner, slot.displayKey);
    void selectPocket() {
      if (_drag != null) return;
      if (selected >= 0 && selected != index) {
        _move(selected, index);
      } else {
        setState(() {
          _moveMessage = null;
          _locatedKey = null;
          _selectedKey = selected == index ? null : slot.displayKey;
        });
      }
    }

    return AnimatedPositioned(
      // A display change replaces the cell geometry in one frame. Animating a
      // short artwork cell while its full labels mount can clip enlarged text.
      key: ValueKey('binder-position-${slot.displayKey}-$_showDetails'),
      duration: duration,
      curve: Curves.easeOutCubic,
      left: offset % _columns * (width + 9),
      top: offset ~/ _columns * (height + 9),
      width: width,
      height: height,
      child: Semantics(
        key: ValueKey('binder-pocket-$index'),
        button: true,
        selected: selected == index,
        hint: _locatedKey == slot.displayKey ? 'Located card' : null,
        label:
            'Pocket ${index + 1}: ${identity.displayName}, ${slot.card.setLabel}, ${slot.card.number ?? ''}, ${slot.finish.label}, ${slot.requiredQuantity} required copies',
        excludeSemantics: true,
        onTap: selectPocket,
        child: Listener(
          key: _locatedKey == slot.displayKey ? _locatedPocketKey : null,
          onPointerDown: (event) =>
              _pressedPointers[slot.displayKey] = event.pointer,
          onPointerUp: (_) => _pressedPointers.remove(slot.displayKey),
          onPointerCancel: (_) => _pressedPointers.remove(slot.displayKey),
          child: LongPressDraggable<_PocketDrag>(
            data: data,
            maxSimultaneousDrags: _drag == null ? 1 : 0,
            delay: const Duration(milliseconds: 350),
            onDragStarted: () => _startDrag(data),
            onDragCompleted: () {
              if (mounted && _drag != null) _clearDrag();
            },
            onDraggableCanceled: (_, _) {
              if (mounted && _drag != null) _clearDrag();
            },
            feedback: Transform.rotate(
              angle: -.035,
              child: Material(
                elevation: 12,
                borderRadius: BorderRadius.circular(10),
                color: colors.surfaceContainerHigh,
                child: Container(
                  width: width * 1.08,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: colors.primary, width: 2),
                  ),
                  child: AspectRatio(
                    aspectRatio: 5 / 7,
                    child: BinderArtwork(
                      imageUrl: slot.card.hostedImageUrl,
                      fallbackImageUrl: slot.card.fallbackImageUrl,
                      size: width,
                      semanticLabel: identity.displayName,
                    ),
                  ),
                ),
              ),
            ),
            child: AnimatedOpacity(
              duration: duration,
              opacity: dragging ? .2 : 1,
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: selectPocket,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      width: selected == index || _locatedKey == slot.displayKey
                          ? 2
                          : 1,
                      color: selected == index || _locatedKey == slot.displayKey
                          ? colors.primary
                          : Colors.transparent,
                    ),
                  ),
                  child: Column(
                    children: [
                      Expanded(
                        child: BinderArtwork(
                          imageUrl: slot.card.hostedImageUrl,
                          fallbackImageUrl: slot.card.fallbackImageUrl,
                          size: width - 8,
                          semanticLabel: identity.displayName,
                        ),
                      ),
                      if (_showDetails) ...[
                        Text(
                          'Pocket ${index + 1}${(slot.card.number ?? '').isEmpty ? '' : ' · #${slot.card.number}'}',
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                        Text(
                          identity.displayName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                        Text(
                          slot.card.setLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(color: colors.onSurfaceVariant),
                        ),
                        Text(
                          '${slot.finish.label} · ×${slot.requiredQuantity}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(color: colors.onSurfaceVariant),
                        ),
                      ] else ...[
                        Text(
                          '${index + 1} · ×${slot.requiredQuantity}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall,
                        ),
                        Text(
                          slot.finish.label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(color: colors.onSurfaceVariant),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
