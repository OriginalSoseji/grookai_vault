import 'package:flutter/material.dart';
import 'goal_detail_vm.dart';

class GoalDetailPage extends StatefulWidget {
  final String id;
  final String name;
  const GoalDetailPage({super.key, required this.id, required this.name});
  @override
  State<GoalDetailPage> createState() => _GoalDetailPageState();
}

class _GoalDetailPageState extends State<GoalDetailPage> {
  late final GoalDetailVm vm;
  @override
  void initState() {
    super.initState();
    vm = GoalDetailVm(widget.id)..load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.name)),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          Text('Owned', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ValueListenableBuilder(
            valueListenable: vm.owned,
            builder: (context, state, _) {
              if (state.loading) {
                return const LinearProgressIndicator(minHeight: 2);
              }
              if (state.hasError) {
                return Text('Error: ${state.error}');
              }
              final rows = state.data ?? const [];
              return Column(
                children: rows
                    .map(
                      (r) => ListTile(
                        title: Text(r.name),
                        subtitle: Text('${r.setCode} #${r.number}'),
                      ),
                    )
                    .toList(),
              );
            },
          ),
          const SizedBox(height: 12),
          Text('Missing', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ValueListenableBuilder(
            valueListenable: vm.missing,
            builder: (context, state, _) {
              if (state.loading) {
                return const LinearProgressIndicator(minHeight: 2);
              }
              if (state.hasError) {
                return Text('Error: ${state.error}');
              }
              final rows = state.data ?? const [];
              return Column(
                children: rows
                    .map(
                      (r) => ListTile(
                        title: Text(r.name),
                        subtitle: Text('${r.setCode} #${r.number}'),
                      ),
                    )
                    .toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
