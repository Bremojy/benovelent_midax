# Android incoming-call layer

Use these Kotlin/resources in the generated Capacitor/native Android project.

Required Android capabilities:
- `POST_NOTIFICATIONS` (Android 13+)
- `USE_FULL_SCREEN_INTENT`
- `VIBRATE`
- user-approved notification permissions/channel

Expose the notifier through the native bridge as:
`startIncomingCall({ callerName, callType, callId, callerUserId })`
and
`stopIncomingCall()`.

The React app contains `src/utils/nativeCallBridge.js` for this bridge.
