package com.benevolentmidax.calls

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.benevolentmidax.R

object IncomingCallNotification {
    private const val CHANNEL_ID = "benevolent_incoming_calls_v1"
    private const val BASE_ID = 42000

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val sound: Uri = Uri.parse("android.resource://${context.packageName}/${R.raw.benevolent_call}")
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        val channel = NotificationChannel(CHANNEL_ID, "Incoming calls", NotificationManager.IMPORTANCE_HIGH)
        channel.description = "Benevolent MIDAX audio and video calls"
        channel.setSound(sound, attributes)
        channel.enableVibration(true)
        channel.vibrationPattern = longArrayOf(0, 350, 120, 350, 120, 650)
        channel.lockscreenVisibility = android.view.View.VISIBLE
        manager.createNotificationChannel(channel)
    }

    fun show(context: Context, data: CallData) {
        ensureChannel(context)
        val id = BASE_ID + (data.callId.hashCode() and 0x7fff)
        val intent = Intent(context, IncomingCallActivity::class.java).apply {
            putExtra("callId", data.callId)
            putExtra("callerName", data.callerName)
            putExtra("callerUserId", data.callerUserId)
            putExtra("callType", data.callType)
            putExtra("role", data.role)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val fullScreen = PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_call)
            .setContentTitle(if (data.callType == "video") "Incoming video call" else "Incoming audio call")
            .setContentText(data.callerName)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreen, true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setVibrate(longArrayOf(0, 350, 120, 350, 120, 650))
        context.getSystemService(NotificationManager::class.java).notify(id, builder.build())
    }

    fun cancel(context: Context, callId: String) {
        val id = BASE_ID + (callId.hashCode() and 0x7fff)
        context.getSystemService(NotificationManager::class.java).cancel(id)
    }
}
