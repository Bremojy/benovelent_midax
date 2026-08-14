# Benevolent MIDAX V6 — True native background calling

V6 upgrades the earlier browser/PWA call implementation with native Android and iOS call layers. The PWA can still receive Web Push notifications, but the packaged native app can use the operating system's call/notification stack when the app's web process is suspended or closed.

## Android
`mobile/android-native/` now contains:
- Capacitor `BenevolentCall` plugin.
- Full-screen incoming-call Activity.
- High-importance call notification channel.
- Custom Benevolent MIDAX ringtone resource.
- Vibration + lock-screen presentation.
- Answer/Decline actions.
- Firebase Messaging Service entry point for closed-app data messages.

For production Android distribution, connect the FCM service to a Firebase project, register device tokens, and send data-only call messages with `callId`, `callerName`, `callerUserId`, `callType`, and `role`.

## iOS
`mobile/ios-native/` now contains:
- Capacitor `BenevolentCall` plugin.
- PushKit VoIP token registration.
- PushKit incoming push handler.
- CallKit system incoming-call UI.
- Native audio-session activation/deactivation.
- Answer/End callbacks.
- VoIP entitlement template.

For production iOS distribution, configure the App ID, Push Notifications/VoIP capabilities, APNs VoIP key, and backend VoIP push sender. Do not use normal Web Push as a substitute for PushKit for a closed-app call flow.

## Web fallback
The existing PWA path is retained. On a normal browser/PWA install, Web Push continues to use the browser/OS notification sound rules. The custom HTML/Web Audio ringtone is only used while the web app is active and audio has been unlocked by a user interaction.

## Important
A completely closed **browser PWA** cannot be transformed into a native telecom-style call client only by JavaScript. The true closed-app behavior becomes available after the project is packaged/distributed as the native Android/iOS application and the required Firebase/APNs/CallKit configuration is completed.
