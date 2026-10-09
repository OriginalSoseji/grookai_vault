package com.grookai.vault

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

object NotificationDeviceBridge {
    fun register(context: Context, engine: FlutterEngine) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        MethodChannel(engine.dartExecutor.binaryMessenger, "grookai/notifications/device")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "clearDelivered" -> {
                        manager.cancelAll()
                        result.success(null)
                    }
                    "proofDeliveredCount", "proofPostNotification" -> {
                        if (!BuildConfig.DEBUG || context.packageName != "com.grookai.vault.notificationsproof") {
                            result.error("proof_unavailable", "Local proof methods are unavailable.", null)
                        } else if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                            result.error("proof_platform", "This proof requires Android 8 or newer.", null)
                        } else if (call.method == "proofDeliveredCount") {
                            result.success(manager.activeNotifications.size)
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                            result.error("proof_permission", "The proof app needs notification permission.", null)
                        } else {
                            val channelId = "grookai-local-notification-proof"
                            manager.createNotificationChannel(NotificationChannel(channelId, "Local notification proof", NotificationManager.IMPORTANCE_DEFAULT))
                            val notification = Notification.Builder(context, channelId)
                                .setSmallIcon(android.R.drawable.stat_notify_chat)
                                .setContentTitle("Local notification proof")
                                .setContentText("Synthetic test only")
                                .build()
                            manager.notify(204410, notification)
                            result.success(null)
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
