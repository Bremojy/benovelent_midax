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

## Default M-PESA destination configured

- PayBill: `247247`
- Account: `0650186528835`

These are defaults only and are controlled by backend environment variables. Confirm with Safaricom and the organisation's authorised M-PESA account holder that the shortcode/account is authorised for this scheme before processing live funds.

## Production backend variables

Set these in the Render backend environment, never in the Vite frontend environment:

```env
MPESA_ENABLED=true
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=247247
MPESA_ACCOUNT_REFERENCE=0650186528835
MPESA_TRANSACTION_TYPE=CustomerPayBillOnline
MPESA_CALLBACK_URL=https://benovelent-midax.onrender.com/api/payments/callback
MPESA_B2C_SHORTCODE=247247
MPESA_INITIATOR_NAME=
MPESA_SECURITY_CREDENTIAL=
MPESA_B2C_RESULT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/result
MPESA_B2C_TIMEOUT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/timeout
MPESA_B2C_COMMAND_ID=BusinessPayment
```

The current release deliberately does not contain live Daraja credentials. The application will safely report M-PESA as not configured until the production credentials are supplied.

## Recommended rollout

1. Create/verify the authorised Safaricom Daraja production application and the appropriate business collection/payout products.
2. Set the backend environment variables above on Render.
3. Deploy the frontend and backend.
4. Confirm STK callback delivery to the Render callback URL.
5. Test a small real payment and verify the M-PESA receipt is stored in the member transaction and, for loan repayment, the education balance decreases exactly once.
6. Test a community contribution and administrator payout separately.
7. Only then enable live financial collection for all members.

## Security

Do not copy MongoDB, Cloudinary, Resend, TextBee, JWT, VAPID private keys or Daraja secrets into frontend `.env` files, GitHub, client-side JavaScript, screenshots or this ZIP. Rotate any production credentials that have been exposed outside the protected deployment environment.
