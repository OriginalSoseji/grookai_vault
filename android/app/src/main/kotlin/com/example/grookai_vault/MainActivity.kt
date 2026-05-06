package com.example.grookai_vault

import com.example.grookai_vault.scanner.QuadDetectorV1Bridge
import com.example.grookai_vault.scanner.ScannerCameraPhase0Bridge
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        QuadDetectorV1Bridge.register(flutterEngine)
        ScannerCameraPhase0Bridge.register(this, flutterEngine)
    }
}
