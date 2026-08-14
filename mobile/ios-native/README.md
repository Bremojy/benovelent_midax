# iOS incoming-call layer

This V2 source includes a CallKit building block for native iOS packaging. Connect it to the Capacitor/native bridge so incoming Web Push/VoIP events can be translated into `reportNewIncomingCall`.

For production iOS background calling, use PushKit VoIP pushes + CallKit and Apple's required entitlement/configuration. A normal Safari/PWA notification cannot provide a true WhatsApp-style closed-app ringtone.
