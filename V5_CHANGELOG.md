# Benevolent MIDAX V5

- Restored consistent dashboard navigation behavior across phones and laptops. Mobile portal navigation remains available on every dashboard page and uses safe-area spacing.
- Reduced page-transition pulse from 3.2 seconds to 2 seconds.
- Upgraded MIDAX Assistant to an auto-compact floating assistant that gently disappears into an orb when idle and re-expands on user interaction.
- Hardened public carousel loading with retry behavior and active-slide filtering so published Cloudinary/local slides are displayed reliably.
- Upgraded call audio handling with user-gesture audio unlocking and a WebAudio fallback for active pages.
- Replaced the bundled call ringtone with an original iPhone-style inspired ringtone at the existing `public/sounds/benovelent-call.mp3` path; it is not a copied proprietary Apple ringtone.
- Service worker now notifies open clients about incoming calls so the active page can start the ringtone while background push continues to use the OS notification/vibration path.
- Kept the native Android/iOS call bridge for true background ringing when the project is packaged as a native app.
