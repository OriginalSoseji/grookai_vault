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
import com.grookai.vault.printing.P21PrinterBridge

class MainActivity : FlutterActivity() {
    private val debugIntentBridge = DebugIntentBridge()
    private var p21Bridge: P21PrinterBridge? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Local debug builds are used for unattended physical-device smoke
        // tests. Release builds retain normal lock-screen behavior unless the
        // explicit locked-acceptance variant is requested.
        if (!BuildConfig.DEBUG && !BuildConfig.LOCKED_ACCEPTANCE_ENABLED) return

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
        p21Bridge = P21PrinterBridge(this, flutterEngine)
    }

    override fun onNewIntent(intent: Intent) {
        setIntent(intent)
        debugIntentBridge.handleNewIntent(intent)
        super.onNewIntent(intent)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (p21Bridge?.onPermissionsResult(requestCode) == true) return
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    }

    override fun onDestroy() {
        p21Bridge?.close()
        p21Bridge = null
        super.onDestroy()
    }
}
