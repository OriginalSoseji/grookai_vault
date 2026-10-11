import 'package:flutter/widgets.dart';

class WorkspaceExitCoordinator {
  final _guards = <Object, Future<bool> Function()>{};
  void register(Object owner, Future<bool> Function() guard) =>
      _guards[owner] = guard;
  void unregister(Object owner) => _guards.remove(owner);
  Future<bool> prepare() async {
    for (final guard in _guards.values.toList()) {
      if (!await guard()) return false;
    }
    return true;
  }
}

/// Visibility and refresh revision for retained workspace destinations.
class WorkspaceActivation extends InheritedWidget {
  const WorkspaceActivation({
    super.key,
    required this.revision,
    this.active = true,
    this.exits,
    required super.child,
  });

  final int revision;
  final bool active;
  final WorkspaceExitCoordinator? exits;

  static WorkspaceExitCoordinator? exitsOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<WorkspaceActivation>()?.exits;

  static bool activeOf(BuildContext context) =>
      context
          .dependOnInheritedWidgetOfExactType<WorkspaceActivation>()
          ?.active ??
      true;

  static int? of(BuildContext context) => context
      .dependOnInheritedWidgetOfExactType<WorkspaceActivation>()
      ?.revision;

  @override
  bool updateShouldNotify(WorkspaceActivation oldWidget) =>
      revision != oldWidget.revision || active != oldWidget.active;
}
