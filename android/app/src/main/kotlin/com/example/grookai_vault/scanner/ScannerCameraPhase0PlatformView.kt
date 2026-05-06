package com.example.grookai_vault.scanner

import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.FrameLayout
import android.widget.TextView
import io.flutter.plugin.platform.PlatformView

class ScannerCameraPhase0PlatformView(context: Context) : PlatformView {
    private val view: View = FrameLayout(context).apply {
        setBackgroundColor(Color.BLACK)
        addView(
            TextView(context).apply {
                text = "Scanner preview unavailable"
                setTextColor(Color.WHITE)
                textAlignment = View.TEXT_ALIGNMENT_CENTER
            },
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
            ),
        )
    }

    override fun getView(): View = view

    override fun dispose() = Unit
}
