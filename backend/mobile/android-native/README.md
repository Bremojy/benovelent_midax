# Benevolent MIDAX Android true background calling layer

This folder is the native Android layer for the Capacitor/native app. It is not a browser-only workaround.

## What it provides
- Android 13+ notification permission support through the host app.
- High-importance `CATEGORY_CALL` notification channel.
- Dedicated ringtone audio resource.
- Vibration pattern.
- Full-screen incoming-call intent.
- Lock-screen / screen-wake handling.
- Answer and Decline actions that return to the web call route.
- Capacitor `BenevolentCall` plugin with `startIncomingCall` / `stopIncomingCall`.

## Required host integration
1. Copy this source into the generated Capacitor Android app.
2. Add the Capacitor Android runtime and AndroidX dependencies.
3. Merge `AndroidManifest.xml` permissions.
4. Register `BenevolentCallPlugin` with the Capacitor bridge if the host does not auto-discover it.
5. Request `POST_NOTIFICATIONS` at runtime on Android 13+.
6. Deliver the call event to `BenevolentCallPlugin.startIncomingCall()` from the native push handler (FCM data message recommended for a production closed-app path).
7. The user must enable notifications and the incoming-call channel. Android may still suppress sound in system-wide Do Not Disturb or user-muted channels.

The bundled ringtone is the project's own iPhone-style-inspired tone, not Apple's proprietary ringtone file.
