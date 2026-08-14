# iOS target settings

Add these capabilities to the native iOS target:

- Push Notifications
- Background Modes: Voice over IP, Remote notifications, Audio
- CallKit / VoIP support through the application target and App ID configuration

Use the entitlements in `BenevolentMIDAX.entitlements` and register the VoIP token emitted by `IncomingCallManager` with the backend.
