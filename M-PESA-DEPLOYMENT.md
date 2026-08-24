# Benevolent MIDAX M-PESA Deployment Notes

## Collection details shown to members

- Manual collection PayBill: `247247`
- Account/reference: `0650186528835`

The portal deliberately keeps these manual collection instructions separate from the Daraja STK merchant shortcode. The STK merchant shortcode must be the shortcode registered to the Daraja production application and paired with its own passkey.

## Required backend production settings

Set these in `backend/.env` on the server only:

- `MPESA_ENABLED=true`
- `MPESA_ENVIRONMENT=production`
- `MPESA_CONSUMER_KEY=<real Daraja production key>`
- `MPESA_CONSUMER_SECRET=<real Daraja production secret>`
- `MPESA_PASSKEY=<real Daraja production passkey>`
- `MPESA_SHORTCODE=<Daraja business shortcode for the STK application>`
- `MPESA_ACCOUNT_REFERENCE=0650186528835`
- `MPESA_TRANSACTION_TYPE=CustomerPayBillOnline`
- `MPESA_CALLBACK_URL=https://benovelent-midax.onrender.com/api/payments/callback`

For SuperAdmin community disbursements, B2C also requires real Safaricom-issued values for:

- `MPESA_B2C_SHORTCODE`
- `MPESA_INITIATOR_NAME`
- `MPESA_SECURITY_CREDENTIAL`
- `MPESA_B2C_RESULT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/result`
- `MPESA_B2C_TIMEOUT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/timeout`
- `MPESA_B2C_COMMAND_ID=BusinessPayment`

`YOUR_B2C_INITIATOR` and `YOUR_B2C_SECURITY_CREDENTIAL` are placeholders and must not be deployed as live credentials.

## SuperAdmin controls

The SuperAdmin Accounts and Claims pages now expose:

- `Disburse collected funds` — submits the complete collected community balance through B2C.
- `Close M-PESA request` — immediately stops new member contributions while preserving the request history.
- Payment status, recipient details, target, collected amount and progress.
- Audit logging for payout and close actions.

A successful B2C callback creates a completed withdrawal in the scheme finance ledger. B2C timeout/failure callbacks restore the collection state when appropriate.

## Security

Never place Daraja consumer secrets, passkeys, B2C initiator credentials, B2C security credentials, JWT secrets, database credentials or private VAPID keys in the frontend or commit them to Git.

If production secrets have been exposed outside the deployment environment, rotate them before the next production deployment.
