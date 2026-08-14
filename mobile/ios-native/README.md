# Benevolent MIDAX iOS true background calling layer

This is the native iOS layer for a packaged Capacitor/native app. A Safari/PWA alone cannot become a WhatsApp-style system calling client after its web process is completely closed.

## Pipeline
VoIP Push (PushKit) -> `IncomingCallManager` -> CallKit -> iOS system incoming-call screen/ringtone -> Answer/Decline -> app WebView -> existing WebRTC call screen.

## Included
- PushKit VoIP token handling.
- PushKit incoming VoIP event handling while the app is suspended/backgrounded.
- CallKit incoming-call presentation.
- Audio/video call type support.
- Answer/end event notifications for the JS/native bridge.
- Capacitor `BenevolentCall` plugin.
- Entitlements template.

## Production setup
1. Add Push Notifications and VoIP/PushKit capabilities to the Apple target.
2. Configure the Apple Developer App ID and APNs VoIP key/certificate.
3. Add the entitlements file to the target; use the provisioning profile appropriate to the app.
4. Register the VoIP token received through `BenevolentVoIPToken` with the Benevolent MIDAX backend.
5. Add a backend APNs VoIP sender using HTTP/2 token authentication.
6. Send a small VoIP payload containing `callId`, `callerName`, `callerUserId` and `callType` when a call is initiated.
7. Map CallKit Answer/End events to the existing Socket.IO/WebRTC call flow.

CallKit and iOS system settings still control final ringtone/Focus/DND behavior. This is the native system path and is the required architecture for true closed-app incoming calls.
