import 'package:flutter/widgets.dart';

const double kShellAppBarHeight = 46;
const double kShellBottomNavHeight = 58;
const double kShellBottomNavCollapsedHeight = 54;
const double kShellBottomNavContentGap = 104;

double shellContentBottomPadding(BuildContext context, {double extra = 0}) {
  final bottomInset = MediaQuery.viewPaddingOf(context).bottom;
  return kShellBottomNavContentGap + bottomInset + extra;
}
