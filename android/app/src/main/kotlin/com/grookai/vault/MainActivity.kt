package com.grookai.vault

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.grookai.vault.scanner.QuadDetectorV1Bridge
import com.grookai.vault.scanner.ScannerCameraPhase0Bridge
import com.grookai.vault.scanner.ScannerConditionCameraBridge
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    private val debugIntentBridge = DebugIntentBridge()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        if (!BuildConfig.LOCKED_ACCEPTANCE_ENABLED) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON,
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

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
