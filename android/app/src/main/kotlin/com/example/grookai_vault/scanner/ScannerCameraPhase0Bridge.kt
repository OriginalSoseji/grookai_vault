package com.example.grookai_vault.scanner

import android.content.Context
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

object ScannerCameraPhase0Bridge {
    private const val CHANNEL = "grookai/scanner_camera_phase0"
    private const val VIEW_TYPE = "grookai/scanner_camera_phase0_preview"

    fun register(context: Context, flutterEngine: FlutterEngine) {
        val controller = ScannerCameraPhase0Controller(context.applicationContext)

        flutterEngine
            .platformViewsController
            .registry
            .registerViewFactory(VIEW_TYPE, ScannerCameraPhase0ViewFactory())

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL,
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "startSession" -> {
                    controller.startSession()
                    result.success(null)
                }
                "stopSession" -> {
                    controller.stopSession()
                    result.success(null)
                }
                "setZoom" -> {
                    controller.setZoom((call.argument<Number>("zoom") ?: 1.0).toDouble())
                    result.success(null)
                }
                "setExposureBias" -> {
                    controller.setExposureBias((call.argument<Number>("bias") ?: 0.0).toDouble())
                    result.success(null)
                }
                "getReadiness" -> result.success(controller.getReadiness())
                "capture" -> result.success(controller.capture())
                else -> result.notImplemented()
            }
        }
    }
}
