# Phone notifications and TalkBee SMS

## Phone/app notifications
The installed PWA can store a browser push subscription for each signed-in user. The notification settings panel is available in the relevant Admin, Member and SuperAdmin settings pages. On supported HTTPS browsers, the user taps **Enable phone notifications**, grants permission, and the browser/device stores the subscription.

Set these backend environment variables:

```env
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@midax.co.ke
```

On a machine with the backend dependencies installed, generate VAPID keys with:

```bash
cd backend
npx web-push generate-vapid-keys
```

Copy the two generated keys into the backend environment. Keep `VAPID_PRIVATE_KEY` secret. The site must be served over HTTPS for browser notification permission/push to work in production.

## TalkBee SMS
The backend now has a TalkBee provider adapter used by notification broadcasts. Configure:

```env
SMS_PROVIDER=talkbee
TALKBEE_API_URL=YOUR_TALKBEE_MESSAGING_ENDPOINT
TALKBEE_API_TOKEN=YOUR_TALKBEE_API_TOKEN
TALKBEE_SENDER_ID=YOUR_APPROVED_SENDER_ID
```

The exact TalkBee SMS/API endpoint and payload can vary by the API/channel enabled in the TalkBee account, so the project deliberately keeps the endpoint configurable instead of hard-coding an unverified URL.

## Browser notification behaviour
Notifications are created in the same backend notification flow used by messages, contributions/finance updates and broadcasts. When a browser subscription exists, the service worker displays the notification and opens the supplied application route after the user taps it.
