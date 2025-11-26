You are operating under **Audit Rule L2 (Feature Audit)**.

**Do NOT fix anything yet.
Do NOT refactor anything.
Do NOT summarize.
Do NOT infer.
Do NOT guess.**

Your task is to locate and display the **actual Flutter code** responsible for:

* The Catalog screen UI
* The search TextField
* The `_loadCatalog()` / `_search()` logic
* The list that stores the results (e.g., `_items`, `_results`, `_cardPrints`)
* Any provider, bloc, notifier, or controller used in Catalog search
* Any old fetch function still referenced in the UI

### **Step 1 — Inspect Files Directly**

Open and display the FULL CONTENTS (no omissions) of the first file that exists in this list:

```
lib/screens/catalog/catalog_screen.dart
lib/screens/catalog/catalog.dart
lib/catalog/catalog_screen.dart
lib/catalog/catalog.dart
lib/pages/catalog/catalog_page.dart
lib/pages/catalog_page.dart
```

If none of these exist:

### **Step 2 — Search the repo**

Search for these patterns:

```
CatalogScreen
Catalog
onChanged:
TextField(
search
loadCatalog
_load
_items
_results
```

When found, **display the ENTIRE file**, including imports.

### **Important:**

* Do NOT modify the file.
* Do NOT offer suggestions yet.
* Do NOT “optimize” the code.
* Your ONLY job is to **expose the real source code** so it can be audited.

### Output format:

1. File path
2. Full file contents (no omissions)

---

# 📌 After Codex prints the actual code

I will produce *one* precise fix with:

* No guessing
* No rework
* No back-and-forth
* No partial assumptions

Only the correct surgical patch.
