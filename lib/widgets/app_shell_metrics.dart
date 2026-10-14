import 'package:flutter/widgets.dart';

const double kShellAppBarHeight = 46;
const double kShellBottomNavHeight = 64;
const double kShellBottomNavCollapsedHeight = 60;
double shellContentBottomPadding(BuildContext _, {double extra = 0}) {
  // The shell body ends above its bottom dock, so pages only need a calm
  // trailing scroll inset rather than dock-height compensation.
  return 24 + extra;
}
