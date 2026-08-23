# Benevolent MIDAX — M-PESA & Policy Setup

## Included in this release

- SuperAdmin policy CRUD at `/superadmin/policies`.
- Active policies are published to public Services, Member Benefits and the Member Support application form.
- Education Policy limits, interest and repayment period are read from the active SuperAdmin policy instead of relying on a fixed hidden limit.
- Education repayments can be initiated through M-PESA STK Push and are recorded against the correct education loan after Daraja callback confirmation.
- Declined support/claim cases can be opened for voluntary Community Assistance by Admin/SuperAdmin.
- Members can contribute to an open assistance case through M-PESA STK Push.
- Admin/SuperAdmin can submit a recipient payout for the amount raised through the M-PESA B2C endpoint once production B2C credentials are configured.
- M-PESA transaction status is idempotent and the frontend checks the transaction until it is successful/failed/pending.
- Call foreground audio is primed after user interaction; background/closed-tab call alerts depend on Web Push/service-worker notifications because browser pages cannot guarantee arbitrary audio playback while closed.

## M-PESA destination configuration

The application intentionally does **not** embed a PayBill, shortcode, or account reference. The live destination must be the organisation's Safaricom-authorised account supplied during onboarding and approved by the authorised account holder.

For B2C, use the Safaricom-issued B2C shortcode and initiator/security credential; do not reuse a collection PayBill unless Safaricom has explicitly configured it for B2C.

## Production backend variables

Set these in the Render backend environment, never in the Vite frontend environment:

```env
MPESA_ENABLED=true
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=<Safaricom-authorised collection shortcode>
MPESA_ACCOUNT_REFERENCE=<scheme-approved account/reference>
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_CALLBACK_URL=https://benovelent-midax.onrender.com/api/payments/callback
MPESA_B2C_SHORTCODE=<Safaricom-authorised B2C shortcode>
MPESA_INITIATOR_NAME=
MPESA_SECURITY_CREDENTIAL=
MPESA_B2C_RESULT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/result
MPESA_B2C_TIMEOUT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/timeout
MPESA_B2C_COMMAND_ID=BusinessPayment
```

The current release deliberately does not contain live Daraja credentials. The application will safely report M-PESA as not configured until the production credentials are supplied.

## Recommended rollout

1. Complete the Safaricom M-PESA Bulk Payment/B2C onboarding for the organisation and obtain the authorised B2C shortcode and credentials.
2. Create/verify the Daraja production application and enable the products actually used by the scheme.
3. Set the backend environment variables above on Render.
4. Confirm the Render result/timeout callbacks are publicly reachable over HTTPS.
5. Test STK collection with a small authorised payment and verify the callback, receipt and ledger update.
6. Test a community contribution and a B2C administrator payout separately.
7. Only then enable live financial transactions for all members.

## Security

Do not copy MongoDB, Cloudinary, Resend, TextBee, JWT, VAPID private keys or Daraja secrets into frontend `.env` files, GitHub, client-side JavaScript, screenshots or this ZIP. Rotate any production credentials that have been exposed outside the protected deployment environment.
