# Benevolent MIDAX V2

## Fixed
- Admin/SuperAdmin self-contact/self-chat removed using portal ID, mirrored chat-profile ID, email and phone identity checks.
- Self-chat guard retained in the frontend conversation starter.
- Admin and SuperAdmin chat filters are now explicit and visible.
- Filters are available on desktop and in the mobile chat chooser.
- Added site station, department, position, status, presence and verification filtering.
- Added a persistent Public Website/Home button to all authenticated portal topbars.
- V2 service-worker cache version bumped so old PWA shells are invalidated.
- Native incoming-call bridge hook added to the chat center.

## Native calling
- Android high-priority full-screen call notification building block added under `mobile/android-native/`.
- iOS CallKit building block added under `mobile/ios-native/`.
- The browser/PWA still uses Web Push. A true closed-app ringtone depends on the final native Android/iOS wrapper, platform permissions and native call integration.

## Existing V1 integrations retained
- TextBee SMS
- Resend email
- Socket.IO chat/calls
- Web Push notifications
