import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/ui/pickers/segmented_control.dart';
import 'package:grookai_vault/ui/scrolling.dart';
import 'widgets/search_filter_sheet.dart';
import 'widgets/sort_action_menu.dart';
import 'package:grookai_vault/ui/haptics.dart';
import 'package:grookai_vault/services/search_service.dart' as svc;

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});
  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> with AutomaticKeepAliveClientMixin {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _seg = 'All';
  List<Map<String, dynamic>> _results = const [];
  final _service = svc.SearchService();
  bool _loading = false;
  @override
  bool get wantKeepAlive => true;

  Future<void> _triggerSearch({bool immediate = false}) async {
    _debounce?.cancel();
    Future<void> run() async {
      setState(() => _loading = true);
      final q = _controller.text;
      final res = await _service.search(svc.SearchParams(q));
      setState(() {
        _results = res.rows;
        _loading = false;
      });
    }
    if (immediate) return run();
    _debounce = Timer(const Duration(milliseconds: 250), () { unawaited(run()); });
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      appBar: AppBar(
        title: _SearchField(
          controller: _controller,
          onSubmitted: (_) => _triggerSearch(immediate: true),
          onChanged: (_) => _triggerSearch(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune),
            onPressed: () => showSearchFilterSheet(context),
          ),
          IconButton(
            icon: const Icon(Icons.sort),
            onPressed: () => showSortActionMenu(context),
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
            child: GVSegmentedControl(
              segments: const ['All', 'Raw', 'Conditioned', 'Graded'],
              value: _seg,
              onChanged: (v) async {
                setState(() => _seg = v);
                await Haptics.selection();
                _triggerSearch(immediate: true);
              },
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    key: const PageStorageKey('search_list'),
                    physics: platformPhysics(),
                    itemCount: _results.length,
                    itemBuilder: (_, i) {
                      final r = _results[i];
                      final name = (r['name'] ?? 'Card').toString();
                      final set = (r['set_code'] ?? '').toString().toUpperCase();
                      final num = (r['number'] ?? '').toString();
                      return ListTile(
                        title: Text(name),
                        subtitle: Text('$set • $num'),
                        onTap: () => Navigator.of(context).pushNamed('/details', arguments: r),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onSubmitted;
  final ValueChanged<String> onChanged;
  const _SearchField({required this.controller, required this.onSubmitted, required this.onChanged});
  @override
  Widget build(BuildContext context) {
    return Theme.of(context).platform == TargetPlatform.iOS
        ? CupertinoSearchTextField(controller: controller, onSubmitted: onSubmitted, onChanged: onChanged)
        : TextField(
            controller: controller,
            onSubmitted: onSubmitted,
            onChanged: onChanged,
            textInputAction: TextInputAction.search,
            decoration: const InputDecoration.collapsed(hintText: 'Search cards'),
          );
  }
}
