import 'package:flutter/widgets.dart';

const double kShellAppBarHeight = 52;
const double kShellBottomNavHeight = 60;
const double kShellBottomNavCollapsedHeight = 54;
const double kShellBottomNavContentGap = 96;

double shellContentBottomPadding(BuildContext context, {double extra = 0}) {
  final bottomInset = MediaQuery.viewPaddingOf(context).bottom;
  return kShellBottomNavContentGap + bottomInset + extra;
}
