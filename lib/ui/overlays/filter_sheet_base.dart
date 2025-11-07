import 'package:flutter/material.dart';

class FilterSheetBase extends StatelessWidget {
  final Widget child;
  const FilterSheetBase({super.key, required this.child});
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: child,
      ),
    );
  }
}

