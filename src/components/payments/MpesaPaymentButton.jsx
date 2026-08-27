import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2, Smartphone, XCircle } from "lucide-react";
import API from "../../services/api";
import "./MpesaPaymentButton.css";

const normalizePhone = (value) => String(value || "").replace(/\s+/g, "").replace(/^\+/, "");
const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));

const mpesaFriendlyError = (error) => {
  const status = Number(error?.response?.status || 0);
  const body = error?.response?.data || {};
  const requestId = String(body?.requestId || error?.requestId || "").trim();
  const bodyMessage = String(body?.message || "").trim();
  const networkCode = String(error?.code || "").trim();
  if (!error?.response) {
    if (networkCode === "ECONNABORTED" || networkCode === "ETIMEDOUT") return `The payment request timed out before the server responded.${requestId ? ` Reference: ${requestId}` : ""} Please retry.`;
    return `The payment server could not be reached. Check your connection and retry.${requestId ? ` Reference: ${requestId}` : ""}`;
  }
  if (body?.paymentStage === "oauth") return body?.upstreamStatus === 401 || body?.upstreamStatus === 403
    ? `M-PESA authentication was rejected by Safaricom. Ask the administrator to verify the production consumer credentials and Daraja permissions.${requestId ? ` Reference: ${requestId}` : ""}`
    : body?.code === "MPESA_OAUTH_404"
      ? `Safaricom's production authentication endpoint could not be reached correctly. Verify the production Daraja host and environment.${requestId ? ` Reference: ${requestId}` : ""}`
      : `M-PESA could not authenticate with Safaricom. Ask the administrator to verify the production Daraja environment and credentials.${requestId ? ` Reference: ${requestId}` : ""}`;
  if (status === 404) return `The deployed payment API route is missing. Deploy the updated backend before retrying this payment.${requestId ? ` Reference: ${requestId}` : ""}`;
  if (body?.code === "API_REQUEST_FAILED") return `${bodyMessage || "The server could not complete the payment request."}${requestId ? ` Reference: ${requestId}` : ""}`;
  if (body?.code === "MPESA_DATABASE_FAILED") return `${bodyMessage || "The payment record could not be prepared safely."}${requestId ? ` Reference: ${requestId}` : ""}`;
  if (status === 400 || Number(body?.upstreamStatus) === 400) return `Safaricom rejected the STK request. Check the M-PESA number and ask the administrator to verify the production shortcode, passkey and Daraja configuration.${requestId ? ` Reference: ${requestId}` : ""}`;
  if (status === 401 || Number(body?.upstreamStatus) === 401) return `M-PESA authentication was rejected by Safaricom. The backend production Daraja credentials need to be checked by an administrator.${requestId ? ` Reference: ${requestId}` : ""}`;
  if (status === 403 || Number(body?.upstreamStatus) === 403) return `Safaricom denied this request. Ask the administrator to verify that the production application and shortcode are provisioned for STK Push.${requestId ? ` Reference: ${requestId}` : ""}`;
  if (status === 502) return `${bodyMessage || "The M-PESA request was rejected before a successful payment could be created."}${requestId ? ` Reference: ${requestId}` : ""}`;
  return `${bodyMessage || error?.message || "M-PESA request failed."}${requestId ? ` Reference: ${requestId}` : ""}`;
};

export default function MpesaPaymentButton({ purpose, referenceId, label = "Pay with M-PESA", defaultAmount = "", maxAmount = 0, phoneNumber = "", disabled = false, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState("stk");
  const [amount, setAmount] = useState(defaultAmount || "");
  const [phone, setPhone] = useState(phoneNumber || "");
  const [transactionCode, setTransactionCode] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [stkConfigured, setStkConfigured] = useState(false);
  const [manualReady, setManualReady] = useState(false);
  const [mpesaConfig, setMpesaConfig] = useState({ shortCode: "", manualPaybill: "247247", manualAccountNumber: "", accountReference: "", environment: "production" });
  const [transactionId, setTransactionId] = useState("");

  useEffect(() => setPhone(phoneNumber || ""), [phoneNumber]);
  useEffect(() => setAmount(defaultAmount || ""), [defaultAmount]);

  useEffect(() => {
    if (!transactionId || status !== "sent" || method !== "stk") return undefined;
    let stopped = false;
    let attempts = 0;
    const poll = async () => {
      try {
        const { data } = await API.get(`/payments/transactions/${transactionId}`);
        const tx = data?.transaction;
        if (!tx || stopped) return;
        if (tx.status === "successful") {
          setStatus("success");
          setMessage(`Payment confirmed. M-PESA receipt: ${tx.mpesaReceiptNumber || "recorded"}.`);
          onSuccess?.({ transaction: tx });
          return;
        }
        if (tx.status === "failed") {
          setStatus("error");
          setMessage(tx.resultDescription || "M-PESA payment was not completed.");
          return;
        }
        attempts += 1;
        if (attempts % 5 === 0) {
          try {
            const query = await API.post("/payments/stk-query", { transactionId });
            const refreshed = query.data?.transaction;
            if (refreshed?.status === "successful") {
              setStatus("success");
              setMessage(`Payment confirmed. M-PESA receipt: ${refreshed.mpesaReceiptNumber || "recorded"}.`);
              onSuccess?.({ transaction: refreshed });
              return;
            }
            if (refreshed?.status === "failed") {
              setStatus("error");
              setMessage(refreshed.resultDescription || "M-PESA payment was not completed.");
              return;
            }
          } catch {}
        }
        if (attempts >= 30) {
          setMessage("The STK request is still pending. The server will continue accepting the Safaricom callback; you can safely close this window.");
          return;
        }
        window.setTimeout(poll, 2000);
      } catch {}
    };
    poll();
    return () => { stopped = true; };
  }, [transactionId, status, method, onSuccess]);

  const openPayment = async () => {
    setStatus("checking");
    setMessage("");
    try {
      const { data } = await API.get("/payments/config");
      const manual = Boolean(data?.manualCollectionReady || (data?.manualPaybill && data?.manualAccountNumber));
      const stk = Boolean(data?.enabled && data?.stkConfigured && data?.configured);
      setStkConfigured(stk);
      setManualReady(manual);
      setMpesaConfig({
        shortCode: String(data?.shortCode || ""),
        manualPaybill: String(data?.manualPaybill || "247247"),
        manualAccountNumber: String(data?.manualAccountNumber || ""),
        accountReference: String(data?.accountReference || ""),
        environment: String(data?.environment || "production"),
      });
      setMethod(stk ? "stk" : "manual");
      setStatus("idle");
      setOpen(true);
    } catch (error) {
      setStkConfigured(false);
      setManualReady(false);
      setStatus("idle");
      setOpen(true);
      setMessage(error?.response?.data?.message || "Payment configuration could not be loaded. You can retry shortly.");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    const normalizedPhone = normalizePhone(phone);
    if (!numericAmount || numericAmount <= 0) { setMessage("Enter a valid amount."); return; }
    if (maxAmount && numericAmount > Number(maxAmount)) { setMessage(`Maximum allowed is ${money(maxAmount)}.`); return; }
    if (method === "stk" && !/^254\d{9}$|^0[17]\d{8}$/.test(normalizedPhone)) { setMessage("Enter a valid Kenyan M-PESA number, e.g. 0712345678."); return; }
    if (method === "manual" && normalizedPhone && !/^254\d{9}$|^0[17]\d{8}$/.test(normalizedPhone)) { setMessage("Enter a valid Kenyan M-PESA number, or leave it blank for manual PayBill verification."); return; }
    if (method === "manual" && !transactionCode.trim()) { setMessage("Enter the M-PESA transaction code shown on your payment confirmation."); return; }

    try {
      setStatus("sending");
      setMessage("");
      if (method === "manual") {
        const { data } = await API.post("/payments/manual", { purpose, referenceId, amount: numericAmount, phoneNumber: normalizedPhone || undefined, transactionCode: transactionCode.trim() });
        setStatus("manualPending");
        setTransactionId(String(data?.transaction?._id || ""));
        setMessage(data?.message || "Payment recorded as pending. An authorised administrator must verify it before the contribution is counted.");
        toast.success("Payment recorded for verification.");
        onSuccess?.({ transaction: data?.transaction, manual: true });
        return;
      }
      const { data } = await API.post("/payments/stk", { purpose, referenceId, amount: numericAmount, phoneNumber: normalizedPhone });
      if (!data?.success) throw new Error(data?.message || "M-PESA request could not be submitted.");
      setTransactionId(String(data?.transactionId || ""));
      setStatus("sent");
      setMessage(data?.message || "Safaricom accepted the STK request. Check your phone for the M-PESA prompt and enter your PIN.");
    } catch (error) {
      const friendly = method === "manual" ? (error?.response?.data?.message || error?.message || "Manual M-PESA payment could not be recorded.") : mpesaFriendlyError(error);
      setStatus("error");
      setMessage(friendly);
      toast.error(friendly);
    }
  };

  return (
    <>
      <button type="button" className="mpesa-pay-btn" onClick={openPayment} disabled={disabled || status === "checking"}>
        {status === "checking" ? <Loader2 size={16} className="mpesa-spin" /> : <Smartphone size={16} />}
        {status === "checking" ? "Checking…" : label}
      </button>
      {open && (
        <div className="mpesa-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <section className="mpesa-modal" role="dialog" aria-modal="true" aria-label="M-PESA payment">
            <div className="mpesa-modal-head"><div><span>M-PESA PAYMENT</span><h2>Choose how you will pay</h2></div><button type="button" className="mpesa-close" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            {!stkConfigured && !manualReady && <div className="mpesa-alert warning">No live M-PESA collection method is configured. Ask an administrator to configure Daraja STK or the manual Equity PayBill collection details.</div>}
            {message && <div className={`mpesa-alert ${["error"].includes(status) ? "error" : ["sent", "success", "manualPending"].includes(status) ? "success" : "warning"}`}>{["sent", "success", "manualPending"].includes(status) ? <CheckCircle2 size={17} /> : status === "error" ? <XCircle size={17} /> : status === "checking" ? <Clock3 size={17} /> : null}<span>{message}</span></div>}
            <div className="mpesa-methods" role="group" aria-label="M-PESA payment method">
              <button type="button" className={method === "stk" ? "mpesa-method active" : "mpesa-method"} onClick={() => { setMethod("stk"); setStatus("idle"); setMessage(""); }} disabled={!stkConfigured}>STK Push{stkConfigured ? "" : " (unavailable)"}</button>
              <button type="button" className={method === "manual" ? "mpesa-method active" : "mpesa-method"} onClick={() => { setMethod("manual"); setStatus("idle"); setMessage(""); }} disabled={!manualReady}>PayBill 247247</button>
            </div>
            <form onSubmit={submit} className="mpesa-form" aria-label="M-PESA payment form">
              <label htmlFor="mpesa-payment-amount">Amount (KES)<input id="mpesa-payment-amount" name="amount" type="number" autoComplete="transaction-amount" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={status === "sending" || (!stkConfigured && !manualReady)} /></label>
              <label htmlFor="mpesa-payment-phone">M-PESA number{method === "manual" ? " (optional)" : ""}<input id="mpesa-payment-phone" name="phoneNumber" type="tel" inputMode="numeric" autoComplete="tel" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={status === "sending"} /></label>
              {method === "manual" && <label htmlFor="mpesa-payment-code">M-PESA transaction code<input id="mpesa-payment-code" name="transactionCode" type="text" inputMode="text" autoComplete="off" placeholder="e.g. QHX123ABC" value={transactionCode} onChange={(e) => setTransactionCode(e.target.value.toUpperCase())} disabled={status === "sending"} /></label>}
              <div className="mpesa-account-note">Equity M-PESA collection: PayBill <strong>{mpesaConfig.manualPaybill || "247247"}</strong> • Account / Reference <strong>{mpesaConfig.manualAccountNumber || "0650186528835"}</strong></div>
              {method === "stk" && <div className="mpesa-account-note">{mpesaConfig.environment === "sandbox" ? "Sandbox" : "Production"} STK merchant shortcode <strong>{mpesaConfig.shortCode || "not configured"}</strong>{mpesaConfig.accountReference ? <> • Backend reference <strong>{mpesaConfig.accountReference}</strong></> : null}</div>}
              {method === "manual" && <div className="mpesa-small">After paying through the displayed Equity PayBill, enter the transaction code here. The payment is <strong>Pending</strong> until an authorised administrator verifies it. A member confirmation alone never marks a payment as successful.</div>}
              <button className="mpesa-submit" type="submit" disabled={status === "sending" || (method === "stk" ? !stkConfigured : !manualReady)}>{status === "sending" ? <><Loader2 size={17} className="mpesa-spin" /> Recording…</> : method === "stk" ? "Send STK Push" : "I have paid — submit for verification"}</button>
              {method === "stk" && <p className="mpesa-small">Your M-PESA PIN is entered only on the M-PESA prompt. Final payment status is confirmed by the server callback.</p>}
            </form>
          </section>
        </div>
      )}
    </>
  );
}
