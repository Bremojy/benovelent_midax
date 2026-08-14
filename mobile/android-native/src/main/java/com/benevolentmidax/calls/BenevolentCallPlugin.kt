package com.benevolentmidax.calls

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "BenevolentCall")
class BenevolentCallPlugin : Plugin() {
    override fun load() {
        IncomingCallNotification.ensureChannel(context)
    }

    @com.getcapacitor.annotation.PluginMethod
    fun startIncomingCall(call: PluginCall) {
        val data = CallData.from(call)
        IncomingCallNotification.show(context, data)
        call.resolve()
    }

    @com.getcapacitor.annotation.PluginMethod
    fun stopIncomingCall(call: PluginCall) {
        IncomingCallNotification.cancel(context, call.getString("callId") ?: "")
        call.resolve()
    }

    @com.getcapacitor.annotation.PluginMethod
    fun requestNativePermission(call: PluginCall) {
        // POST_NOTIFICATIONS is requested by the host Activity on Android 13+.
        call.resolve(JSObject().put("supported", true))
    }
}

data class CallData(
    val callId: String,
    val callerName: String,
    val callerUserId: String,
    val callType: String,
    val role: String,
) {
    companion object {
        fun from(call: PluginCall) = CallData(
            callId = call.getString("callId") ?: System.currentTimeMillis().toString(),
            callerName = call.getString("callerName") ?: "Benevolent MIDAX",
            callerUserId = call.getString("callerUserId") ?: "",
            callType = if (call.getString("callType") == "video") "video" else "audio",
            role = when (call.getString("role")) { "admin" -> "admin"; "superadmin" -> "superadmin"; else -> "member" },
        )
    }
}
