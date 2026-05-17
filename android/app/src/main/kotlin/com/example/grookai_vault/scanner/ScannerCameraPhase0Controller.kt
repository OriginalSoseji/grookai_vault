package com.example.grookai_vault.scanner

import android.content.Context

class ScannerCameraPhase0Controller(private val context: Context) {
    private var zoom: Double = 1.0
    private var exposureBias: Double = 0.0
    private var started: Boolean = false

    fun startSession() {
        started = true
    }

    fun stopSession() {
        started = false
    }

    fun setZoom(nextZoom: Double) {
        zoom = nextZoom.coerceIn(1.0, 6.0)
    }

    fun setExposureBias(nextBias: Double) {
        exposureBias = nextBias.coerceIn(-4.0, 4.0)
    }

    fun getReadiness(): Map<String, Any> {
        return mapOf(
            "ready" to started,
            "deviceStable" to started,
            "focusStable" to started,
            "exposureStable" to started,
        )
    }

    fun capture(): Map<String, Any> {
        return mapOf(
            "imagePath" to "",
            "width" to 0,
            "height" to 0,
            "fileSize" to 0,
            "zoom" to zoom,
            "exposureBias" to exposureBias,
            "ready" to false,
            "error" to "recovered_phase0_stub_no_capture",
            "packageName" to context.packageName,
        )
    }
}
