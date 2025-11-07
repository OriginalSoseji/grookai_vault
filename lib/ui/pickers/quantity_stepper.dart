import 'dart:async';
import 'package:flutter/material.dart';

class QuantityStepper extends StatefulWidget {
  final int value;
  final ValueChanged<int> onChanged;
  const QuantityStepper({super.key, required this.value, required this.onChanged});
  @override
  State<QuantityStepper> createState() => _QuantityStepperState();
}

class _QuantityStepperState extends State<QuantityStepper> {
  Timer? _repeat;
  void _start(bool inc) {
    _repeat?.cancel();
    _repeat = Timer.periodic(const Duration(milliseconds: 120), (_) {
      final v = inc ? widget.value + 1 : (widget.value > 1 ? widget.value - 1 : 1);
      widget.onChanged(v);
    });
  }

  void _stop() => _repeat?.cancel();

  @override
  void dispose() {
    _repeat?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      GestureDetector(
        onLongPressStart: (_) => _start(false),
        onLongPressEnd: (_) => _stop(),
        child: IconButton(
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: () => widget.onChanged(widget.value > 1 ? widget.value - 1 : 1),
        ),
      ),
      Text('${widget.value}'),
      GestureDetector(
        onLongPressStart: (_) => _start(true),
        onLongPressEnd: (_) => _stop(),
        child: IconButton(
          icon: const Icon(Icons.add_circle_outline),
          onPressed: () => widget.onChanged(widget.value + 1),
        ),
      ),
    ]);
  }
}

