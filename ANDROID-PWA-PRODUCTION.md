# Benevolent MIDAX — Android/PWA Production Path

## PWA capability

The web PWA can install to Android, receive Web Push while the installed app/browser is not open (when permission and VAPID configuration are present), and show incoming-call notifications with Answer/Decline actions. Browser WebRTC calls remain subject to browser/device media permissions and network conditions.

A browser PWA must not be treated as a full WhatsApp-style native calling client. True closed-app, lock-screen/system call UI on Android is provided by the bundled native wrapper layer using FCM data messages and a full-screen incoming-call activity.

## Android wrapper

Use `mobile/android-native/` as the native source layer for the Capacitor Android host. The host must provide:

1. Capacitor Android runtime/plugin bridge.
2. Firebase Messaging.
3. AndroidX Core/AppCompat.
4. Android 13+ `POST_NOTIFICATIONS` runtime permission handling.
5. Full-screen incoming-call permission/channel handling.
6. A real Android application ID plus Firebase `google-services.json`.
7. Backend FCM delivery containing `type`, `callId`, `callerName`, `callerUserId`, `callType`, and `role`.

## Vite production build

```bash
npm install
npm run build
npm run preview
```

The production build is written to `dist/`. Vercel should use `npm run vercel-build`.

Only public `VITE_*` values belong in Vercel. Never put JWT, MongoDB, Daraja, VAPID private, Cloudinary, email, or SMS secrets into the frontend.

## M-PESA

No PayBill/account destination is hard-coded in the application anymore. Configure the real Safaricom-issued shortcode, account reference, Daraja credentials, B2C initiator/security credential and callback URLs on the Render backend after onboarding. The UI remains disabled until the server reports a real configured integration.
