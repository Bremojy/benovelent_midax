package com.benevolentmidax.calls

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Native closed-app entry point for FCM data messages. Configure your backend
 * to send data-only incoming-call messages when a user initiates a call.
 */
class BenevolentFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        if (data["type"] !in setOf("incoming_call", "audio_call", "video_call")) return
        IncomingCallNotification.show(this, CallData(
            callId = data["callId"] ?: System.currentTimeMillis().toString(),
            callerName = data["callerName"] ?: "Benevolent MIDAX",
            callerUserId = data["callerUserId"] ?: "",
            callType = if (data["callType"] == "video") "video" else "audio",
            role = when (data["role"]) { "admin" -> "admin"; "superadmin" -> "superadmin"; else -> "member" }
        ))
    }
}
