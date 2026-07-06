package com.grookai.vault

import android.content.Intent
import com.grookai.vault.scanner.QuadDetectorV1Bridge
import com.grookai.vault.scanner.ScannerCameraPhase0Bridge
import com.grookai.vault.scanner.ScannerConditionCameraBridge
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    private val debugIntentBridge = DebugIntentBridge()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        QuadDetectorV1Bridge.register(flutterEngine)
        ScannerCameraPhase0Bridge.register(this, flutterEngine)
        ScannerConditionCameraBridge.register(this, flutterEngine)
        debugIntentBridge.register(flutterEngine, intent)
    }

    override fun onNewIntent(intent: Intent) {
        setIntent(intent)
        debugIntentBridge.handleNewIntent(intent)
        super.onNewIntent(intent)
    }
}
