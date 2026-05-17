package com.example.grookai_vault.scanner

import android.content.Context
import android.graphics.ImageFormat
import android.hardware.camera2.CaptureRequest
import android.os.Handler
import android.os.Looper
import android.util.Size
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.FocusMeteringAction
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class ScannerConditionCameraController(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner,
    private val channel: MethodChannel,
    private val prewarmer: ScannerConditionCameraPrewarmer? = null,
) {
    private val analysisExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var status: String = "initial"
    private var error: String? = null
    private var previewWidth: Int? = null
    private var previewHeight: Int? = null
    private var analysisWidth: Int? = null
    private var analysisHeight: Int? = null
    private var analysisFrames: Int = 0
    private var analysisWindowStartedAtMs: Long = 0
    private var analysisFps: Double? = null
    private var frameBridgeFps: Double? = null
    private var frameBridgeWindowStartedAtMs: Long = 0
    private var frameBridgeFrames: Int = 0
    private var lastFrameBridgeSentAtMs: Long = 0
    private var nativeDetectionFps: Double? = null
    private var nativeDetectionWindowStartedAtMs: Long = 0
    private var nativeDetectionFrames: Int = 0
    private var lastNativeDetectionSentAtMs: Long = 0
    private var lastFrameAtMs: Long? = null
    private var lastQuadDetection: Map<String, Any?>? = null
    private var focusRunnable: Runnable? = null
    private var focusStatus: String = "idle"
    private var focusError: String? = null
    private var focusRequests: Int = 0
    private var lastFocusAtMs: Long? = null

    private companion object {
        val previewTargetSize = Size(1920, 1080)
        val analysisTargetSize = Size(1920, 1080)
        const val nativeDetectionIntervalMs = 100L
        const val fullFrameBridgeIntervalMs = 250L
        const val focusIntervalMs = 1800L
        const val focusAutoCancelMs = 1700L
        const val slotFocusX = 0.50f
        const val slotFocusY = 0.54f
    }

    fun start(previewView: PreviewView) {
        status = "starting"
        error = null
        previewView.scaleType = PreviewView.ScaleType.FILL_CENTER
        previewView.implementationMode = PreviewView.ImplementationMode.COMPATIBLE

        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener(
            {
                try {
                    val provider = providerFuture.get()
                    cameraProvider = provider
                    bindCamera(provider, previewView)
                } catch (throwable: Throwable) {
                    status = "error"
                    error = throwable.message ?: throwable.javaClass.simpleName
                }
            },
            ContextCompat.getMainExecutor(context),
        )
    }

    @OptIn(ExperimentalCamera2Interop::class)
    private fun bindCamera(provider: ProcessCameraProvider, previewView: PreviewView) {
        val previewBuilder = Preview.Builder()
            .setTargetResolution(previewTargetSize)
        Camera2Interop.Extender(previewBuilder)
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_AF_MODE,
                CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE,
            )
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_AE_MODE,
                CaptureRequest.CONTROL_AE_MODE_ON,
            )
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_AWB_MODE,
                CaptureRequest.CONTROL_AWB_MODE_AUTO,
            )
        val preview = previewBuilder
            .build()
            .also { it.setSurfaceProvider(previewView.surfaceProvider) }

        val analysisBuilder = ImageAnalysis.Builder()
            .setTargetResolution(analysisTargetSize)
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_YUV_420_888)
        Camera2Interop.Extender(analysisBuilder)
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_AF_MODE,
                CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE,
            )
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_AE_MODE,
                CaptureRequest.CONTROL_AE_MODE_ON,
            )
            .setCaptureRequestOption(
                CaptureRequest.CONTROL_AWB_MODE,
                CaptureRequest.CONTROL_AWB_MODE_AUTO,
            )
        val analysis = analysisBuilder
            .build()
            .also { imageAnalysis ->
                imageAnalysis.setAnalyzer(analysisExecutor) { imageProxy ->
                    try {
                        recordAnalysisFrame(imageProxy.width, imageProxy.height)
                        maybeSendFrameToFlutter(imageProxy)
                    } finally {
                        imageProxy.close()
                    }
                }
            }

        provider.unbindAll()
        prewarmer?.markSupersededByActiveScanner()
        camera = provider.bindToLifecycle(
            lifecycleOwner,
            CameraSelector.DEFAULT_BACK_CAMERA,
            preview,
            analysis,
        )
        val actualPreviewSize = preview.resolutionInfo?.resolution ?: previewTargetSize
        previewWidth = actualPreviewSize.width
        previewHeight = actualPreviewSize.height
        status = "running"
        startSlotFocusLoop(previewView)
    }

    private fun startSlotFocusLoop(previewView: PreviewView) {
        focusRunnable?.let { mainHandler.removeCallbacks(it) }
        val runnable = object : Runnable {
            override fun run() {
                requestSlotFocus(previewView)
                mainHandler.postDelayed(this, focusIntervalMs)
            }
        }
        focusRunnable = runnable
        previewView.post { runnable.run() }
    }

    private fun requestSlotFocus(previewView: PreviewView) {
        val activeCamera = camera ?: return
        if (previewView.width <= 0 || previewView.height <= 0) return
        try {
            val factory = previewView.meteringPointFactory
            val point = factory.createPoint(
                previewView.width * slotFocusX,
                previewView.height * slotFocusY,
            )
            val action = FocusMeteringAction.Builder(
                point,
                FocusMeteringAction.FLAG_AF or FocusMeteringAction.FLAG_AE,
            )
                .setAutoCancelDuration(focusAutoCancelMs, TimeUnit.MILLISECONDS)
                .build()
            focusStatus = "requested"
            focusError = null
            focusRequests += 1
            lastFocusAtMs = System.currentTimeMillis()
            activeCamera.cameraControl.startFocusAndMetering(action).addListener(
                {
                    focusStatus = "active"
                    focusError = null
                },
                ContextCompat.getMainExecutor(context),
            )
        } catch (throwable: Throwable) {
            focusStatus = "error"
            focusError = throwable.message ?: throwable.javaClass.simpleName
        }
    }

    private fun recordAnalysisFrame(width: Int, height: Int) {
        val now = System.currentTimeMillis()
        analysisWidth = width
        analysisHeight = height
        lastFrameAtMs = now
        if (analysisWindowStartedAtMs == 0L) {
            analysisWindowStartedAtMs = now
            analysisFrames = 0
        }
        analysisFrames += 1
        val elapsedMs = now - analysisWindowStartedAtMs
        if (elapsedMs >= 1000) {
            analysisFps = (analysisFrames * 1000.0) / elapsedMs
            analysisWindowStartedAtMs = now
            analysisFrames = 0
        }
    }

    private fun maybeSendFrameToFlutter(imageProxy: ImageProxy) {
        val now = System.currentTimeMillis()
        val shouldSendDetection = now - lastNativeDetectionSentAtMs >= nativeDetectionIntervalMs
        val shouldSendFrame = now - lastFrameBridgeSentAtMs >= fullFrameBridgeIntervalMs
        if (!shouldSendDetection && !shouldSendFrame) return

        var copiedFrame: YuvFramePayload? = null
        fun frame(): YuvFramePayload? {
            if (copiedFrame == null) {
                copiedFrame = yuvFramePayload(imageProxy)
            }
            return copiedFrame
        }

        if (shouldSendFrame) {
            val fullFrame = frame() ?: return
            lastFrameBridgeSentAtMs = now
            recordFrameBridge(now)
            val payload = framePayload(
                fullFrame,
                lastQuadDetection ?: pendingQuadDetection(),
            )
            mainHandler.post {
                channel.invokeMethod("nativeFrame", payload)
            }
        }

        if (shouldSendDetection) {
            val detectionFrame = frame() ?: return
            val quadDetection = QuadDetectorV1Bridge.detectQuadYuv420(
                width = detectionFrame.width,
                height = detectionFrame.height,
                rotation = detectionFrame.sensorRotation,
                yBytes = detectionFrame.yBytes,
                uBytes = detectionFrame.uBytes,
                vBytes = detectionFrame.vBytes,
                yRowStride = detectionFrame.yRowStride,
                uvRowStride = detectionFrame.uvRowStride,
                uvPixelStride = detectionFrame.uvPixelStride,
            )
            lastQuadDetection = quadDetection
            lastNativeDetectionSentAtMs = now
            recordNativeDetection(now)
            val payload = detectionPayload(detectionFrame, quadDetection)
            mainHandler.post {
                channel.invokeMethod("nativeDetection", payload)
            }
        }
    }

    private fun recordFrameBridge(now: Long) {
        if (frameBridgeWindowStartedAtMs == 0L) {
            frameBridgeWindowStartedAtMs = now
            frameBridgeFrames = 0
        }
        frameBridgeFrames += 1
        val elapsedMs = now - frameBridgeWindowStartedAtMs
        if (elapsedMs >= 1000) {
            frameBridgeFps = (frameBridgeFrames * 1000.0) / elapsedMs
            frameBridgeWindowStartedAtMs = now
            frameBridgeFrames = 0
        }
    }

    private fun recordNativeDetection(now: Long) {
        if (nativeDetectionWindowStartedAtMs == 0L) {
            nativeDetectionWindowStartedAtMs = now
            nativeDetectionFrames = 0
        }
        nativeDetectionFrames += 1
        val elapsedMs = now - nativeDetectionWindowStartedAtMs
        if (elapsedMs >= 1000) {
            nativeDetectionFps = (nativeDetectionFrames * 1000.0) / elapsedMs
            nativeDetectionWindowStartedAtMs = now
            nativeDetectionFrames = 0
        }
    }

    private fun yuvFramePayload(imageProxy: ImageProxy): YuvFramePayload? {
        val planes = imageProxy.planes
        if (planes.size < 3) return null
        val yPlane = planes[0]
        val uPlane = planes[1]
        val vPlane = planes[2]
        return YuvFramePayload(
            width = imageProxy.width,
            height = imageProxy.height,
            sensorRotation = imageProxy.imageInfo.rotationDegrees,
            yBytes = yPlane.buffer.toByteArray(),
            uBytes = uPlane.buffer.toByteArray(),
            vBytes = vPlane.buffer.toByteArray(),
            yRowStride = yPlane.rowStride,
            uvRowStride = uPlane.rowStride,
            uvPixelStride = uPlane.pixelStride,
            vRowStride = vPlane.rowStride,
            vPixelStride = vPlane.pixelStride,
        )
    }

    private fun detectionPayload(
        frame: YuvFramePayload,
        quadDetection: Map<String, Any?>,
    ): Map<String, Any?> {
        return mapOf(
            "sensorRotation" to frame.sensorRotation,
            "width" to frame.width,
            "height" to frame.height,
            "quadDetection" to lightweightQuadDetection(quadDetection),
        )
    }

    private fun framePayload(
        frame: YuvFramePayload,
        quadDetection: Map<String, Any?>,
    ): Map<String, Any?> {
        return mapOf(
            "sensorRotation" to frame.sensorRotation,
            "quadDetection" to quadDetection,
            "image" to mapOf(
                "format" to ImageFormat.YUV_420_888,
                "width" to frame.width,
                "height" to frame.height,
                "planes" to listOf(
                    mapOf(
                        "bytes" to frame.yBytes,
                        "bytesPerRow" to frame.yRowStride,
                        "bytesPerPixel" to 1,
                    ),
                    mapOf(
                        "bytes" to frame.uBytes,
                        "bytesPerRow" to frame.uvRowStride,
                        "bytesPerPixel" to frame.uvPixelStride,
                    ),
                    mapOf(
                        "bytes" to frame.vBytes,
                        "bytesPerRow" to frame.vRowStride,
                        "bytesPerPixel" to frame.vPixelStride,
                    ),
                ),
            ),
        )
    }

    private fun lightweightQuadDetection(quadDetection: Map<String, Any?>): Map<String, Any?> {
        return mapOf(
            "success" to quadDetection["success"],
            "points" to quadDetection["points"],
            "card_candidates" to quadDetection["card_candidates"],
            "confidence" to quadDetection["confidence"],
            "elapsed_ms" to quadDetection["elapsed_ms"],
            "failure_reason" to quadDetection["failure_reason"],
        )
    }

    private fun pendingQuadDetection(): Map<String, Any?> {
        return mapOf(
            "success" to false,
            "points" to null,
            "card_candidates" to emptyList<Any>(),
            "confidence" to 0.0,
            "elapsed_ms" to 0,
            "failure_reason" to "native_detection_pending",
        )
    }

    private fun java.nio.ByteBuffer.toByteArray(): ByteArray {
        val duplicate = duplicate()
        duplicate.rewind()
        val bytes = ByteArray(duplicate.remaining())
        duplicate.get(bytes)
        return bytes
    }

    fun metrics(): Map<String, Any?> {
        return mapOf(
            "engine" to "camerax",
            "status" to status,
            "error" to error,
            "preview_width" to previewWidth,
            "preview_height" to previewHeight,
            "analysis_width" to analysisWidth,
            "analysis_height" to analysisHeight,
            "analysis_fps" to analysisFps,
            "native_detection_fps" to nativeDetectionFps,
            "frame_bridge_fps" to frameBridgeFps,
            "native_detection_interval_ms" to nativeDetectionIntervalMs,
            "full_frame_bridge_interval_ms" to fullFrameBridgeIntervalMs,
            "last_frame_at_ms" to lastFrameAtMs,
            "focus_status" to focusStatus,
            "focus_error" to focusError,
            "focus_requests" to focusRequests,
            "last_focus_at_ms" to lastFocusAtMs,
            "focus_slot_x" to slotFocusX,
            "focus_slot_y" to slotFocusY,
        )
    }

    fun stop() {
        focusRunnable?.let { mainHandler.removeCallbacks(it) }
        focusRunnable = null
        try {
            cameraProvider?.unbindAll()
        } catch (_: Throwable) {
        }
        camera = null
        cameraProvider = null
        status = "stopped"
        analysisExecutor.shutdown()
    }

    private data class YuvFramePayload(
        val width: Int,
        val height: Int,
        val sensorRotation: Int,
        val yBytes: ByteArray,
        val uBytes: ByteArray,
        val vBytes: ByteArray,
        val yRowStride: Int,
        val uvRowStride: Int,
        val uvPixelStride: Int,
        val vRowStride: Int,
        val vPixelStride: Int,
    )
}
