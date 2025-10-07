import "package:flutter/material.dart";
import "image_best.dart";

class BigCardImage extends StatelessWidget {
  final Map row;
  const BigCardImage({super.key, required this.row});

  @override
  Widget build(BuildContext context) {
    final url = imageBestFromRow(row);
    debugPrint("[DETAIL] image url => $url");

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          color: Colors.redAccent,
          child: const Text(
            "DETAIL PAGE REACHED",
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: 12),
        SelectableText(
          url.isEmpty ? "(empty image URL)" : url,
          style: const TextStyle(fontSize: 12),
        ),
        const SizedBox(height: 12),
        if (url.isNotEmpty)
          SizedBox(
            height: 260,
            child: Image.network(
              url,
              fit: BoxFit.contain,
              errorBuilder: (_, __, ___) =>
                  const Center(child: Text("Image failed to load (control)")),
            ),
          )
        else
          const SizedBox(
            height: 260,
            child: Center(child: Text("No image")),
          ),
      ],
    );
  }
}
