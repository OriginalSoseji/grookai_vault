import 'package:flutter/material.dart';

/// TODO: Enable coachmarks later; placeholder widget only.
class CoachBubble extends StatelessWidget {
  final String text;
  const CoachBubble({super.key, required this.text});
  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black87,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Text(text, style: const TextStyle(color: Colors.white)),
      ),
    );
  }
}

