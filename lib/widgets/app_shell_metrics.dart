import 'package:flutter/widgets.dart';

const double kShellAppBarHeight = 46;
const double kShellBottomNavHeight = 52;
const double kShellBottomNavContentGap = 14;

double shellContentBottomPadding(BuildContext context, {double extra = 0}) {
  final bottomInset = MediaQuery.viewPaddingOf(context).bottom;
  final baseGap = bottomInset > 0
      ? kShellBottomNavContentGap
      : kShellBottomNavContentGap + 2;
  return baseGap + extra;
}
