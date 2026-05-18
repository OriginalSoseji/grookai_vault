package com.example.grookai_vault.scanner

import android.app.Activity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import androidx.lifecycle.LifecycleOwner

object ScannerConditionCameraBridge {
    private const val CHANNEL = "grookai/scanner_condition_camera"
    private const val VIEW_TYPE = "grookai/scanner_condition_camera_preview"

    fun register(activity: Activity, flutterEngine: FlutterEngine) {
        val registry = ScannerConditionCameraRegistry()
        val prewarmer = ScannerConditionCameraPrewarmer(
            activity.applicationContext,
            activity as? LifecycleOwner,
        )
        val channel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL,
        )

        flutterEngine
            .platformViewsController
            .registry
            .registerViewFactory(
                VIEW_TYPE,
                ScannerConditionCameraViewFactory(
                    activity,
                    registry,
                    channel,
                    prewarmer,
                ),
            )

        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "getMetrics" -> result.success(
                    registry.currentController?.metrics()
                        ?: mapOf(
                            "engine" to "camerax",
                            "status" to "no_active_view",
                        ),
                )
                "prewarmSession" -> {
                    if (registry.currentController != null) {
                        result.success(
                            mapOf(
                                "engine" to "camerax",
                                "status" to "skipped_active_scanner_view",
                            ),
                        )
                    } else {
                        result.success(prewarmer.prewarm(ttlMsFrom(call.arguments)))
                    }
                }
                "getPrewarmMetrics" -> result.success(prewarmer.metrics())
                "consumePrewarmFrame" -> result.success(prewarmer.consumeLatestFramePayload())
                "stopPrewarmSession" -> result.success(prewarmer.stop())
                "stopSession" -> {
                    registry.currentController?.stop()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun ttlMsFrom(arguments: Any?): Long {
        val map = arguments as? Map<*, *> ?: return 120_000L
        val ttlMs = map["ttl_ms"] as? Number ?: return 120_000L
        return ttlMs.toLong()
    }
}
