import 'package:flutter/widgets.dart';

const double kShellAppBarHeight = 46;
const double kShellBottomNavHeight = 56;
const double kShellBottomNavContentGap = 20;

double shellContentBottomPadding(BuildContext context, {double extra = 0}) {
  final bottomInset = MediaQuery.viewPaddingOf(context).bottom;
  return bottomInset +
      kShellBottomNavHeight +
      kShellBottomNavContentGap +
      extra;
}
