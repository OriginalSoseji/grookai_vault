package com.grookai.vault.scanner

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.CaptureRequest
import android.os.Handler
import android.os.Looper
import android.util.Size
import androidx.camera.camera2.interop.Camera2Interop
import androidx.camera.camera2.interop.ExperimentalCamera2Interop
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class ScannerConditionCameraPrewarmer(
    private val context: Context,
    private val lifecycleOwner: LifecycleOwner?,
) {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var provider: ProcessCameraProvider? = null
    private var analysis: ImageAnalysis? = null
    private var executor: ExecutorService? = null
    private var stopRunnable: Runnable? = null
    private var status: String = "idle"
    private var error: String? = null
    private var startedAtMs: Long? = null
    private var firstFrameAtMs: Long? = null
    private var frameCount: Int = 0
    private var lastFrameCopiedAtMs: Long = 0
    private var latestFrame: YuvFramePayload? = null
    private val frameLock = Any()

    private companion object {
        val analysisTargetSize = Size(1920, 1080)
        const val defaultTtlMs = 120_000L
    }

    fun prewarm(ttlMs: Long): Map<String, Any?> {
        val owner = lifecycleOwner
        if (owner == null) {
            status = "skipped_no_lifecycle_owner"
            error = null
            return metrics()
        }
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED
        ) {
            status = "skipped_camera_permission_missing"
            error = null
            return metrics()
        }
        if (status == "starting" || status == "running") {
            scheduleStop(ttlMs)
            return metrics()
        }

        status = "starting"
        error = null
        startedAtMs = System.currentTimeMillis()
        firstFrameAtMs = null
        frameCount = 0
        lastFrameCopiedAtMs = 0
        synchronized(frameLock) {
            latestFrame = null
        }
        executor = Executors.newSingleThreadExecutor()

        val providerFuture = ProcessCameraProvider.getInstance(context)
        providerFuture.addListener(
            {
                try {
                    val cameraProvider = providerFuture.get()
                    provider = cameraProvider
                    bindAnalysis(owner, cameraProvider)
                    scheduleStop(ttlMs)
                } catch (throwable: Throwable) {
                    status = "error"
                    error = throwable.message ?: throwable.javaClass.simpleName
                    stop()
                }
            },
            ContextCompat.getMainExecutor(context),
        )
        return metrics()
    }

    @OptIn(ExperimentalCamera2Interop::class)
    private fun bindAnalysis(
        owner: LifecycleOwner,
        cameraProvider: ProcessCameraProvider,
    ) {
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
        val analysisUseCase = analysisBuilder
            .build()
        val activeExecutor = executor ?: Executors.newSingleThreadExecutor().also {
            executor = it
        }
        analysisUseCase.setAnalyzer(activeExecutor) { imageProxy ->
            try {
                val now = System.currentTimeMillis()
                if (firstFrameAtMs == null) {
                    firstFrameAtMs = now
                }
                frameCount += 1
                if (now - lastFrameCopiedAtMs >= 250L) {
                    yuvFramePayload(imageProxy)?.let { frame ->
                        val quadDetection = QuadDetectorV1Bridge.detectQuadYuv420(
                            width = frame.width,
                            height = frame.height,
                            rotation = frame.sensorRotation,
                            yBytes = frame.yBytes,
                            uBytes = frame.uBytes,
                            vBytes = frame.vBytes,
                            yRowStride = frame.yRowStride,
                            uvRowStride = frame.uvRowStride,
                            uvPixelStride = frame.uvPixelStride,
                        )
                        synchronized(frameLock) {
                            latestFrame = frame.copy(quadDetection = quadDetection)
                            lastFrameCopiedAtMs = now
                        }
                    }
                }
            } finally {
                imageProxy.close()
            }
        }
        analysis = analysisUseCase
        cameraProvider.bindToLifecycle(
            owner,
            CameraSelector.DEFAULT_BACK_CAMERA,
            analysisUseCase,
        )
        status = "running"
    }

    fun stop(): Map<String, Any?> {
        stopRunnable?.let { mainHandler.removeCallbacks(it) }
        stopRunnable = null
        val activeAnalysis = analysis
        val activeProvider = provider
        if (activeAnalysis != null && activeProvider != null) {
            try {
                activeProvider.unbind(activeAnalysis)
            } catch (_: Throwable) {
            }
        }
        analysis = null
        synchronized(frameLock) {
            latestFrame = null
        }
        executor?.shutdown()
        executor = null
        if (status == "starting" || status == "running") {
            status = "stopped"
        }
        return metrics()
    }

    fun markSupersededByActiveScanner(): Map<String, Any?> {
        stopRunnable?.let { mainHandler.removeCallbacks(it) }
        stopRunnable = null
        analysis = null
        synchronized(frameLock) {
            latestFrame = null
        }
        executor?.shutdown()
        executor = null
        if (status == "starting" || status == "running") {
            status = "superseded_active_scanner_view"
        }
        return metrics()
    }

    fun consumeLatestFramePayload(): Map<String, Any?>? {
        val frame = synchronized(frameLock) {
            val current = latestFrame
            latestFrame = null
            current
        } ?: return null
        return framePayload(frame)
    }

    fun metrics(): Map<String, Any?> {
        val startedAt = startedAtMs
        val firstFrameAt = firstFrameAtMs
        return mapOf(
            "engine" to "camerax",
            "status" to status,
            "error" to error,
            "started_at_ms" to startedAt,
            "first_frame_at_ms" to firstFrameAt,
            "time_to_first_frame_ms" to if (startedAt != null && firstFrameAt != null) {
                firstFrameAt - startedAt
            } else {
                null
            },
            "frame_count" to frameCount,
        )
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

    private fun framePayload(frame: YuvFramePayload): Map<String, Any?> {
        return mapOf(
            "sensorRotation" to frame.sensorRotation,
            "quadDetection" to (frame.quadDetection ?: pendingQuadDetection()),
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

    private fun pendingQuadDetection(): Map<String, Any?> {
        return mapOf(
            "success" to false,
            "points" to null,
            "card_candidates" to emptyList<Any>(),
            "confidence" to 0.0,
            "elapsed_ms" to 0,
            "failure_reason" to "native_prewarm_frame",
        )
    }

    private fun java.nio.ByteBuffer.toByteArray(): ByteArray {
        val duplicate = duplicate()
        duplicate.rewind()
        val bytes = ByteArray(duplicate.remaining())
        duplicate.get(bytes)
        return bytes
    }

    private fun scheduleStop(ttlMs: Long) {
        stopRunnable?.let { mainHandler.removeCallbacks(it) }
        val boundedTtlMs = ttlMs.coerceAtLeast(5_000L).coerceAtMost(defaultTtlMs)
        val runnable = Runnable { stop() }
        stopRunnable = runnable
        mainHandler.postDelayed(runnable, boundedTtlMs)
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
        val quadDetection: Map<String, Any?>? = null,
    )
}
