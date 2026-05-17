package com.example.grookai_vault

import android.content.Intent
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class DebugIntentBridge {
    private var channel: MethodChannel? = null
    private var latestAction: String? = null

    fun register(flutterEngine: FlutterEngine, initialIntent: Intent?) {
        if (!BuildConfig.DEBUG) return
        latestAction = extractAction(initialIntent)
        channel = MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL,
        ).also { methodChannel ->
            methodChannel.setMethodCallHandler { call, result ->
                when (call.method) {
                    "getInitialDebugAction" -> result.success(latestAction)
                    else -> result.notImplemented()
                }
            }
        }
    }

    fun handleNewIntent(intent: Intent?) {
        if (!BuildConfig.DEBUG) return
        val action = extractAction(intent) ?: return
        latestAction = action
        channel?.invokeMethod("debugIntentAction", action)
    }

    private fun extractAction(intent: Intent?): String? {
        return intent
            ?.getStringExtra(EXTRA_DEBUG_ACTION)
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
    }

    companion object {
        private const val CHANNEL = "grookai/debug_intents_v1"
        private const val EXTRA_DEBUG_ACTION = "gv_debug_action"
    }
}
