package com.benevolentmidax.calls

import android.app.KeyguardManager
import android.content.Intent
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.benevolentmidax.R

class IncomingCallActivity : AppCompatActivity() {
    private lateinit var callId: String

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )
        val keyguard = getSystemService(KeyguardManager::class.java)
        if (keyguard.isKeyguardLocked) keyguard.requestDismissKeyguard(this, null)
        setContentView(R.layout.activity_incoming_call)
        callId = intent.getStringExtra("callId") ?: ""
        findViewById<TextView>(R.id.caller_name).text = intent.getStringExtra("callerName") ?: "Benevolent MIDAX"
        findViewById<TextView>(R.id.call_type).text = if (intent.getStringExtra("callType") == "video") "Incoming video call" else "Incoming audio call"
        findViewById<Button>(R.id.answer_button).setOnClickListener { answer() }
        findViewById<Button>(R.id.decline_button).setOnClickListener { decline() }
    }

    private fun answer() {
        launchWeb("answer")
    }

    private fun decline() {
        launchWeb("decline")
    }

    private fun launchWeb(action: String) {
        val base = "https://benovelent-midax.vercel.app"
        val role = intent.getStringExtra("role") ?: "member"
        val portal = when (role) { "admin" -> "/admin/messages"; "superadmin" -> "/superadmin/messages"; else -> "/member/messages" }
        val url = "$base$portal?incomingNativeCall=${android.net.Uri.encode(callId)}&callAction=$action"
        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        startActivity(intent)
        IncomingCallNotification.cancel(this, callId)
        finish()
    }
}
