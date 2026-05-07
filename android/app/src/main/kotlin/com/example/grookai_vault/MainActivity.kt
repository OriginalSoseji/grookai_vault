package com.example.grookai_vault

import android.content.Intent
import com.example.grookai_vault.scanner.QuadDetectorV1Bridge
import com.example.grookai_vault.scanner.ScannerCameraPhase0Bridge
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    private val debugIntentBridge = DebugIntentBridge()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        QuadDetectorV1Bridge.register(flutterEngine)
        ScannerCameraPhase0Bridge.register(this, flutterEngine)
        debugIntentBridge.register(flutterEngine, intent)
    }

    override fun onNewIntent(intent: Intent) {
        setIntent(intent)
        debugIntentBridge.handleNewIntent(intent)
        super.onNewIntent(intent)
    }
}
