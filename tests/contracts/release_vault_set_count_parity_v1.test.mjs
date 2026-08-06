import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const webVaultPath = "apps/web/src/components/vault/VaultCollectionView.tsx";
const flutterVaultPath = "lib/main_vault.dart";

test("web and Flutter count Vault sets from canonical set names before legacy aliases", () => {
  const webVault = fs.readFileSync(webVaultPath, "utf8");
  const flutterVault = fs.readFileSync(flutterVaultPath, "utf8");

  assert.match(
    webVault,
    /item\.set_name\.trim\(\) \|\| item\.set_code\.trim\(\) \|\| "Unknown set"/,
  );
  assert.doesNotMatch(
    webVault,
    /new Set\(items\.map\(\(item\) => item\.set_code\.trim\(\) \|\| "Unknown set"\)\)/,
  );
  assert.match(
    flutterVault,
    /row\['set_name'\] \?\? row\['set_code'\]/,
  );
});
