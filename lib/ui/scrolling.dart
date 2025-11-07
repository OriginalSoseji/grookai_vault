import 'package:flutter/widgets.dart';
import 'package:grookai_vault/core/platform.dart';

ScrollPhysics platformPhysics() => isIOS ? const BouncingScrollPhysics() : const ClampingScrollPhysics();

