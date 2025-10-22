import "package:flutter/material.dart";

/// Build a list of small “pill” Chips based on any fields we can detect
/// from a row (coming from v_vault_items or similar).
///
/// It is intentionally tolerant:
///  - understands many possible key spellings
///  - parses strings like "1st Edition", "Reverse Holo", "Promo"
List<Widget> buildBadges(Map row) {
  final chips = <Widget>[];

  bool asBool(dynamic v) {
    if (v == null) return false;
    if (v is bool) return v;
    if (v is num) return v != 0;
    final s = v.toString().toLowerCase().trim();
    return ["1", "true", "yes", "y", "t"].contains(s);
  }

  String s(dynamic v) => (v ?? "").toString().trim();

  bool anyTrue(List<String> keys) => keys.any((k) => asBool(row[k]));
  String anyStr(List<String> keys) {
    for (final k in keys) {
      final val = s(row[k]);
      if (val.isNotEmpty) return val;
    }
    return "";
  }

  // Common strings
  final name = s(row["name"]);
  final setName = s(
    row["set_name"] ?? row["set"] ?? row["setCode"] ?? row["set_code"],
  );
  final rarity = s(row["rarity"]);
  final holoType = s(row["holo_type"] ?? row["holoType"]);
  final foilType = s(row["foil_type"] ?? row["foilType"]);
  final edition = s(row["edition"]);

  // First Edition
  final firstEdition =
      anyTrue(["first_edition", "is_first_edition", "firstEdition", "first"]) ||
      edition.toLowerCase().contains("1st") ||
      name.toLowerCase().contains("1st edition") ||
      rarity.toLowerCase().contains("1st");

  if (firstEdition) {
    chips.add(_chip("1st Edition", Colors.indigo));
  }

  // Shadowless
  final shadowless =
      anyTrue(["shadowless", "is_shadowless"]) ||
      name.toLowerCase().contains("shadowless") ||
      rarity.toLowerCase().contains("shadowless");

  if (shadowless) {
    chips.add(_chip("Shadowless", Colors.brown));
  }

  // Promo
  final isPromo =
      anyTrue(["promo", "is_promo"]) ||
      rarity.toLowerCase().contains("promo") ||
      setName.toUpperCase().contains("PR");

  if (isPromo) {
    chips.add(_chip("Promo", Colors.purple));
  }

  // Holo / Reverse Holo
  final looksReverse =
      anyTrue(["reverse_holo", "is_reverse_holo", "reverse"]) ||
      holoType.toLowerCase().contains("reverse") ||
      name.toLowerCase().contains("reverse holo") ||
      foilType.toLowerCase().contains("reverse");

  final looksHolo =
      anyTrue(["holo", "is_holo", "foil", "is_foil"]) ||
      holoType.toLowerCase().contains("holo") ||
      foilType.toLowerCase().contains("holo") ||
      rarity.toLowerCase().contains("holo") ||
      name.toLowerCase().contains("holo");

  if (looksReverse) {
    chips.add(_chip("Reverse Holo", Colors.teal));
  } else if (looksHolo) {
    chips.add(_chip("Holo", Colors.cyan));
  }

  // Always show rarity if present
  if (rarity.isNotEmpty) {
    chips.add(_chip(_titleCase(rarity), Colors.grey));
  }

  // Language
  final lang = anyStr(["language", "lang", "card_lang"]);
  if (lang.isNotEmpty) {
    chips.add(_chip(_titleCase(lang), Colors.blueGrey));
  }

  // Grade (if graded info ever stored)
  final grade = anyStr([
    "grade",
    "graded_label",
    "psa_grade",
    "cgc_grade",
    "bgs_grade",
  ]);
  if (grade.isNotEmpty) {
    chips.add(_chip("Grade $grade", Colors.orange));
  }

  // DEBUG: see what fields came in if nothing matched
  if (chips.isEmpty) {
    debugPrint(
      "?? No badges ? keys: ${row.keys} | rarity=${row['rarity']} | name=${row['name']}",
    );
  }

  return chips;
}

Widget _chip(String text, Color color) {
  return Padding(
    padding: const EdgeInsets.only(right: 6, bottom: 6),
    child: Chip(
      label: Text(text),
      visualDensity: VisualDensity.compact,
      backgroundColor: color.withValues(alpha: .12),
      side: BorderSide(color: color.withValues(alpha: .6)),
      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
    ),
  );
}

String _titleCase(String s) {
  if (s.isEmpty) return s;
  return s
      .split(RegExp(r"[\s_\-]+"))
      .map((w) {
        if (w.isEmpty) return w;
        final lower = w.toLowerCase();
        return lower[0].toUpperCase() + lower.substring(1);
      })
      .join(" ");
}
