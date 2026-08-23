package ke.co.midax.benovelent.calls

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

object IncomingCallNotifier {
    private const val CHANNEL_ID = "benevolent_incoming_calls"
    private const val NOTIFICATION_ID = 8801

    fun start(context: Context, callerName: String, callType: String, contentIntent: PendingIntent) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ringtone = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            val audio = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Incoming calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Incoming Benevolent MIDAX audio/video calls"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 150, 400, 150, 700)
                setSound(ringtone, audio)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
            }
            manager.createNotificationChannel(channel)
        }

        val title = if (callType.equals("video", true)) "Incoming video call" else "Incoming audio call"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(com.benevolentmidax.R.drawable.ic_call)
            .setContentTitle(title)
            .setContentText("$callerName is calling you")
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(contentIntent, true)
            .setContentIntent(contentIntent)
            .setVibrate(longArrayOf(0, 400, 150, 400, 150, 700))
            .build()

        NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
    }

    fun stop(context: Context) {
        NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }
}
