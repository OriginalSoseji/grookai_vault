import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Next rewrites these source files for a nondefault distDir. Restore only its
// known generated changes; never discard an unrelated or concurrent edit.
export function captureStorefrontBuildConfig(webRoot, env) {
  if (env.NEXT_PUBLIC_STOREFRONT_LOCAL_TEST !== "true") return () => {};
  assert.equal(env.NEXT_PUBLIC_COLLECTOR_STAGING, "true");
  assert.equal(env.GROOKAI_DISABLE_TELEMETRY, "1");
  assert.ok(!env.VERCEL && !env.VERCEL_ENV);
  const names = ["next-env.d.ts", "tsconfig.json"];
  const originals = names.map(name => fs.readFileSync(path.join(webRoot, name)));
  return () => {
    const current = names.map(name => fs.readFileSync(path.join(webRoot, name)));
    const generatedDeclarations = originals[0].toString().replaceAll(".next/types/", ".next-storefront/types/");
    assert.ok(current[0].equals(originals[0]) || current[0].toString().replaceAll("\r\n", "\n") === generatedDeclarations.replaceAll("\r\n", "\n"),
      "Unexpected next-env.d.ts edit; preserved for review");
    const config = JSON.parse(originals[1]);
    const nextConfig = JSON.parse(current[1]);
    const extraIncludes = [".next-storefront/types/**/*.ts", ".next-storefront/dev/types/**/*.ts"];
    const allowed = { ...config, include: [...new Set([...config.include, ...extraIncludes])] };
    if (!current[1].equals(originals[1])) {
      assert.deepEqual(nextConfig, allowed, "Unexpected tsconfig.json edit; preserved for review");
    }
    // Validate both before restoring either. Failed builds receive the same check.
    for (let i = 0; i < names.length; i++) {
      if (!current[i].equals(originals[i])) fs.writeFileSync(path.join(webRoot, names[i]), originals[i]);
    }
  };
}
