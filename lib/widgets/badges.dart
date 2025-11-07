import "package:flutter/material.dart";
import 'package:grookai_vault/ui/app/theme.dart';

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
    chips.add(_chip(context: null, text: "1st Edition", color: null, role: _Role.info));
  }

  // Shadowless
  final shadowless =
      anyTrue(["shadowless", "is_shadowless"]) ||
      name.toLowerCase().contains("shadowless") ||
      rarity.toLowerCase().contains("shadowless");

  if (shadowless) {
    chips.add(_chip(context: null, text: "Shadowless", color: null, role: _Role.info));
  }

  // Promo
  final isPromo =
      anyTrue(["promo", "is_promo"]) ||
      rarity.toLowerCase().contains("promo") ||
      setName.toUpperCase().contains("PR");

  if (isPromo) {
    chips.add(_chip(context: null, text: "Promo", color: null, role: _Role.info));
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
    chips.add(_chip(context: null, text: "Reverse Holo", color: null, role: _Role.info));
  } else if (looksHolo) {
    chips.add(_chip(context: null, text: "Holo", color: null, role: _Role.info));
  }

  // Always show rarity if present
  if (rarity.isNotEmpty) {
    chips.add(_chip(context: null, text: _titleCase(rarity), color: null, role: _Role.neutral));
  }

  // Language
  final lang = anyStr(["language", "lang", "card_lang"]);
  if (lang.isNotEmpty) {
    chips.add(_chip(context: null, text: _titleCase(lang), color: null, role: _Role.neutral));
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
    chips.add(_chip(context: null, text: "Grade $grade", color: null, role: _Role.warning));
  }

  // DEBUG: see what fields came in if nothing matched
  if (chips.isEmpty) {
    debugPrint(
      "?? No badges ? keys: ${row.keys} | rarity=${row['rarity']} | name=${row['name']}",
    );
  }

  return chips;
}

enum _Role { info, warning, success, neutral }

Widget _chip({required String text, Color? color, _Role role = _Role.neutral, BuildContext? context}) {
  return Builder(builder: (ctx) {
    final gv = (context != null ? GVTheme.of(context) : GVTheme.of(ctx));
    final base = color ?? (
      role == _Role.warning ? gv.colors.warning :
      role == _Role.success ? gv.colors.success :
      role == _Role.info ? gv.colors.accent :
      gv.colors.textSecondary
    );
    return Padding(
      padding: const EdgeInsets.only(right: 6, bottom: 6),
      child: Chip(
        label: Text(text),
        visualDensity: VisualDensity.compact,
        backgroundColor: base.withValues(alpha: .12),
        side: BorderSide(color: base.withValues(alpha: .6)),
        labelStyle: const TextStyle(fontWeight: FontWeight.w600),
      ),
    );
  });
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
