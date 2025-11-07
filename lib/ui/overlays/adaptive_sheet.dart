import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/core/platform.dart';

Future<T?> showAdaptiveSheet<T>(BuildContext context, {required Widget child, bool isScrollControlled = true}) {
  if (isIOS) {
    return showCupertinoModalPopup<T>(
      context: context,
      builder: (_) => SafeArea(child: Material(type: MaterialType.transparency, child: child)),
    );
  }
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: isScrollControlled,
    builder: (_) => child,
  );
}

