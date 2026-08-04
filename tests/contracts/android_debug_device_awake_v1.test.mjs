import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  'android/app/src/main/kotlin/com/grookai/vault/MainActivity.kt',
  'utf8',
);

test('debug smoke builds stay visible and awake without changing release behavior', () => {
  assert.match(
    source,
    /if \(!BuildConfig\.DEBUG && !BuildConfig\.LOCKED_ACCEPTANCE_ENABLED\) return/,
  );
  assert.match(source, /setShowWhenLocked\(true\)/);
  assert.match(source, /setTurnScreenOn\(true\)/);
  assert.match(source, /WindowManager\.LayoutParams\.FLAG_KEEP_SCREEN_ON/);
});
