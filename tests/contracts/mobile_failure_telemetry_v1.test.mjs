import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("mobile non-fatal telemetry uses an explicit privacy-safe context allowlist", () => {
  const source = read(
    "lib/services/diagnostics/grookai_crash_reporting_service.dart",
  );

  assert.match(source, /static bool recordNonFatalError\(/);
  assert.match(source, /_allowedContextKeys\.contains\(entry\.key\)/);
  for (const allowed of [
    "destination",
    "object_type",
    "operation",
    "platform",
    "send_status",
    "stage",
    "surface",
  ]) {
    assert.match(source, new RegExp(`'${allowed}'`));
  }
  for (const sensitive of ["user_id", "email", "message", "card_name"]) {
    assert.doesNotMatch(source, new RegExp(`'${sensitive}'`));
  }
});

test("reported share and messaging failures emit non-fatal diagnostics", () => {
  for (const path of [
    "lib/screens/grookai_objects/memory_card_capture_screen.dart",
    "lib/screens/grookai_objects/for_sale_terms_screen.dart",
    "lib/screens/grookai_objects/lot_pricing_screen.dart",
    "lib/widgets/contact_owner_button.dart",
  ]) {
    assert.match(read(path), /GrookaiCrashReportingService\.recordNonFatalError\(/);
  }
});
