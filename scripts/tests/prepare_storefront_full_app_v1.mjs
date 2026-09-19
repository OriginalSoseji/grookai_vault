import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), out = path.join(root, '.local/storefront/native_auth');
assert.equal(process.argv.length, 2);
assert(!fs.existsSync(path.join(out, 'prepared.json')));
assert(fs.readFileSync(path.join(out, 'pubspec.yaml'), 'utf8').includes('name: storefrontauthproof'));
const shell = JSON.parse(fs.readFileSync(path.join(root, 'scripts/tests/storefront_device_shell_v1.json')));
for (const [name, content] of Object.entries(shell.files)) {
    const dest = path.resolve(out, name);
    assert(dest.startsWith(out + path.sep));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content.replaceAll('storefrontproof', 'storefrontauthproof').replaceAll('Storefront Local Proof', 'Storefront Full App Proof'));
}
for (const name of ['pubspec.lock', 'android/settings.gradle.kts', 'android/gradle/wrapper/gradle-wrapper.properties'])
    fs.copyFileSync(path.join(root, name), path.join(out, name));
fs.copyFileSync(path.join(root, 'scripts/tests/storefront_full_app_boot_v1.dart.template'), path.join(out, 'lib/main.dart'));
fs.mkdirSync(path.join(out, 'integration_test'), { recursive: true });
fs.copyFileSync(path.join(root, 'scripts/tests/storefront_full_app_auth_v1.dart.template'), path.join(out, 'integration_test/full_app_auth_test.dart'));
const manifest = path.join(out, 'android/app/src/main/AndroidManifest.xml');
let text = fs.readFileSync(manifest, 'utf8').replace('<activity', '<meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false"/><meta-data android:name="firebase_analytics_collection_enabled" android:value="false"/><meta-data android:name="firebase_crashlytics_collection_enabled" android:value="false"/>\n        <activity');
fs.writeFileSync(manifest, text);
const asset = 'ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png';
fs.mkdirSync(path.dirname(path.join(out, asset)), { recursive: true });
fs.copyFileSync(path.join(root, asset), path.join(out, asset));
const pubspec = path.join(out, 'pubspec.yaml');
fs.appendFileSync(pubspec, '\n  assets:\n    - ' + asset + '\n');
fs.writeFileSync(path.join(out, 'prepared.json'), JSON.stringify({ recordedAt: new Date().toISOString(), applicationId: 'com.grookai.storefrontauthproof', productionDartPathDependency: true, productionMainInvoked: true, firebaseDisabled: true, allowedHttpPorts: [16421, 15440] }, null, 2));
// Test runner artifacts are already cached; avoid dynamic repository lookups.
const gradle = path.join(out, 'android/build.gradle.kts');
fs.appendFileSync(gradle, '\nsubprojects { configurations.configureEach { resolutionStrategy.force("androidx.test:runner:1.3.0") } }\n');
const wrapper = path.join(out, 'android/gradlew.bat');
fs.writeFileSync(wrapper, fs.readFileSync(wrapper, 'utf8').replace('org.gradle.wrapper.GradleWrapperMain %CMD_LINE_ARGS%', 'org.gradle.wrapper.GradleWrapperMain --offline %CMD_LINE_ARGS%'));
