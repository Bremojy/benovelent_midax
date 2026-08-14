# Benevolent MIDAX mobile layer (V2)

The web/PWA can receive OS push notifications while the browser is backgrounded, but a browser cannot guarantee a persistent WhatsApp-style ringtone when the app process is fully closed.

V2 includes the Android-native call-notification building block under `mobile/android-native/`. It uses an Android high-importance call channel, vibration, sound and a full-screen call intent. This is the native path to use when the Vite frontend is wrapped as an Android/iOS app.

The browser/PWA path remains active for web installations.
