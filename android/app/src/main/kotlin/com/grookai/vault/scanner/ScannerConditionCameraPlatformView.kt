package com.grookai.vault.scanner

import android.app.Activity
import android.content.Context
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.platform.PlatformView

class ScannerConditionCameraPlatformView(
    context: Context,
    activity: Activity,
    private val registry: ScannerConditionCameraRegistry,
    channel: MethodChannel,
    prewarmer: ScannerConditionCameraPrewarmer,
) : PlatformView {
    private val previewView = PreviewView(context)
    private val controller: ScannerConditionCameraController?

    init {
        val lifecycleOwner = activity as? LifecycleOwner
        controller = if (lifecycleOwner == null) {
            null
        } else {
            ScannerConditionCameraController(
                context.applicationContext,
                lifecycleOwner,
                channel,
                prewarmer,
            )
        }
        registry.currentController = controller
        controller?.start(previewView)
    }

    override fun getView() = previewView

    override fun dispose() {
        controller?.stop()
        if (registry.currentController == controller) {
            registry.currentController = null
        }
    }
}
