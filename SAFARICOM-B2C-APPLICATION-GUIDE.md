# Safaricom M-PESA B2C onboarding guide for Benevolent MIDAX

This guide is for the organisation's authorised M-PESA account holder/administrator. Do not put any production Daraja secrets into the frontend or GitHub.

## 1. Choose the correct Safaricom product

B2C is Safaricom's Business-to-Customer/Bulk Payment service for disbursing money from an organisation's M-PESA shortcode to individual mobile numbers. Safaricom states that B2C is used for examples such as salaries, dividends and SACCO payments and is identified by a shortcode and username.

For this scheme, the B2C use case should be described accurately as authorised benevolent-scheme/member assistance disbursements, subject to Safaricom approval.

## 2. Start the application

Safaricom's current B2C material directs new applications through the M-PESA for Business channel. Use the official Safaricom onboarding route and follow the product-specific onboarding instructions shown for the organisation.

Safaricom's B2C application material lists the application form areas as:

- Company profile.
- Physical and postal address.
- Requested service, including Bulk Payments (B2C) where applicable.
- Reason for the M-PESA service.
- Contact person details.
- Administrator details.
- Payment/settlement details, including where funds are to be received where requested by the form.

## 3. What to enter for Benevolent MIDAX

Use the organisation's exact legal/trading name and the exact M-PESA shortcode that Safaricom has authorised. Do not invent or reuse a PayBill, Till or shortcode from another organisation.

For the service/reason field, use a truthful description such as:

“Authorised disbursement of benevolent scheme/member assistance payments to registered beneficiaries through M-PESA B2C.”

For the administrator, nominate the person who is formally authorised by the organisation to manage the M-PESA service and integration.

For settlement/source-of-funds details, use the organisation's real account information exactly as Safaricom's form and onboarding team require it.

## 4. Daraja/API side after B2C onboarding

After Safaricom approves the business service, create or verify the Daraja production application and enable the B2C API. The integration used by this project needs the server-side values below:

```env
MPESA_ENABLED=true
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=<Daraja production consumer key>
MPESA_CONSUMER_SECRET=<Daraja production consumer secret>
MPESA_B2C_SHORTCODE=<Safaricom-authorised B2C shortcode>
MPESA_INITIATOR_NAME=<Safaricom-issued initiator username>
MPESA_SECURITY_CREDENTIAL=<Safaricom-generated encrypted credential>
MPESA_B2C_RESULT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/result
MPESA_B2C_TIMEOUT_URL=https://benovelent-midax.onrender.com/api/payments/b2c/timeout
MPESA_B2C_COMMAND_ID=BusinessPayment
```

If the same organisation also uses STK collection, configure its separate STK fields as well. B2C authentication in this release is deliberately separated from STK-specific configuration.

## 5. Testing order

1. Confirm Safaricom has approved the B2C product and shortcode.
2. Confirm the Daraja production app is enabled for B2C.
3. Add the server-side secrets on Render only.
4. Verify both callback URLs are publicly reachable over HTTPS.
5. Perform a controlled, authorised test payout.
6. Verify the B2C ResultURL callback changes the community-assistance payout from pending to successful/failed exactly once.
7. Only after reconciliation should live member disbursements be enabled.

## Official Safaricom references

- Daraja developer portal: https://developer.safaricom.co.ke/
- Daraja Business To Customer documentation: https://developer.safaricom.co.ke/apis/BusinessToCustomer
- M-PESA Bulk Payment (B2C) product information: https://www.safaricom.co.ke/main-mpesa/m-pesa-for-you/tariffs-limits/bulk-payments-b2c-tariffs
- M-PESA B2C application material: https://www.safaricom.co.ke/images/Downloads/M-PESA-bulk-payment-b2c.pdf
