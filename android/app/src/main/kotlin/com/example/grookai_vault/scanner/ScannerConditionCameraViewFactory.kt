package com.example.grookai_vault.scanner

import android.app.Activity
import android.content.Context
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory

class ScannerConditionCameraViewFactory(
    private val activity: Activity,
    private val registry: ScannerConditionCameraRegistry,
    private val channel: MethodChannel,
    private val prewarmer: ScannerConditionCameraPrewarmer,
) : PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    override fun create(context: Context, viewId: Int, args: Any?): PlatformView {
        return ScannerConditionCameraPlatformView(
            context,
            activity,
            registry,
            channel,
            prewarmer,
        )
    }
}
