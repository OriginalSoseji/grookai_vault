import 'package:flutter/material.dart';
import 'package:grookai_vault/widgets/fix_card_image.dart';

void main() {
  runApp(const MaterialApp(home: TestFixCardImageScreen()));
}

class TestFixCardImageScreen extends StatelessWidget {
  const TestFixCardImageScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Replace these with known-good examples from your data:
    const cases = <({String setCode, String number, String label})>[
      // (a) Expected tcgdex hit (adjust to a set/number you know tcgdex serves)
      (setCode: 'sv8',     number: '001', label: 'A) Likely tcgdex hit'),
      // (b) Intentionally one that 404s on tcgdex but exists on images.pokemontcg.io
      (setCode: 'sv8pt5',  number: '010', label: 'B) tcgdex miss -> pokemontcg.io'),
      // (c) Bogus code to verify graceful failure
      (setCode: 'zz99',    number: '999', label: 'C) bogus -> placeholder'),
      // (d) sv0X -> svX mapping checks
      (setCode: 'sv03',    number: '125', label: 'D) sv03 -> sv3 try'),
      (setCode: 'sv3',     number: '001a', label: 'E) sv3 -> sv03 try + suffix'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('FixCardImage – Fallback Test')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: cases.length,
        separatorBuilder: (context, _) => const SizedBox(height: 16),
        itemBuilder: (context, i) {
          final c = cases[i];
          return Row(
            children: [
              FixCardImage(
                setCode: c.setCode,
                number: c.number,
                width: 88,
                height: 124,
                fit: BoxFit.cover,
                borderRadius: BorderRadius.circular(12),
                // tcgDexBuilder: yourExistingTcgdexBuilder, // if available
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Text(
                  '${c.label}\nsetCode=${c.setCode}, number=${c.number}',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

