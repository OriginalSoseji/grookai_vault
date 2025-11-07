import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:grookai_vault/core/platform.dart';

PageRoute<T> adaptivePageRoute<T>({required WidgetBuilder builder, RouteSettings? settings}) {
  if (isIOS) {
    return CupertinoPageRoute<T>(builder: builder, settings: settings);
  }
  return MaterialPageRoute<T>(builder: builder, settings: settings);
}

