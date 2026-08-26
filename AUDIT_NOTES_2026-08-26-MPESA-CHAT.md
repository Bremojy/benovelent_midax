Benevolent MIDAX audit/update - 2026-08-26

Source: benovelent_midax-main (3).zip

Fixes:
1. M-PESA STK AccountReference is normalized to <= 12 chars before Daraja submission.
2. M-PESA TransactionDesc is constrained to 13 chars for compatibility with the documented contract.
3. STK upstream 400/401/403/404 errors remain payment-only and are returned as 502; authentication/session state is untouched.
4. M-PESA configuration endpoint now exposes non-secret configuration issues for diagnostics.
5. Safe root .env.example added; no real secrets are included.
6. Backend .env.example uses a <=12-char sample account reference.
7. Chat 'Choose a chat' now falls through from stale conversationId lookup to canonical conversation creation.
8. Chat transient errors and refresh/call feedback use react-hot-toast; existing persistent reconnect/call UI remains where appropriate.
9. ChatWindow send/load errors now surface modern toast feedback.
10. Existing incoming call ringtone asset verified at public/sounds/benovelent-call.mp3 (48,945 bytes); call regression test passes.

Testing:
- npm test: PASS (15/15 stages)
- backend JS syntax checks for modified payment files: PASS
- ZIP integrity: verified after packaging
