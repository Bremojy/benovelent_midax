import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import API from "../../services/api";
import "./MpesaPaymentButton.css";

const normalizePhone = (value) => String(value || "").replace(/\s+/g, "").replace(/^\+/, "");
const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));

const mpesaFriendlyError = (error) => {
  const status = Number(error?.response?.status || 0);
  const body = error?.response?.data || {};
  const message = String(body?.message || error?.message || "M-PESA request failed.");
  if (body?.code === "MPESA_STK_FAILED" || body?.paymentStage === "daraja") {
    if (status === 400 || Number(body?.upstreamStatus) === 400) return "Safaricom rejected the STK request. Check the M-PESA phone number, shortcode, passkey and production Daraja credentials, then try again.";
    if (status === 401 || Number(body?.upstreamStatus) === 401) return "M-PESA authentication was rejected by Safaricom. The Daraja consumer key/secret or environment needs to be checked by the administrator.";
    if (status === 403 || Number(body?.upstreamStatus) === 403) return "Safaricom denied this M-PESA request. Please ask the administrator to verify the production app, shortcode and Daraja permissions.";
    if (status === 502) return "M-PESA service could not be reached correctly. Your account has not been logged out; try the payment again later.";
  }
  return message;
};

export default function MpesaPaymentButton({ purpose, referenceId, label = "Pay with M-PESA", defaultAmount = "", maxAmount = 0, phoneNumber = "", disabled = false, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount || "");
  const [phone, setPhone] = useState(phoneNumber || "");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [configured, setConfigured] = useState(false);
  const [mpesaConfig, setMpesaConfig] = useState({ shortCode: "", accountReference: "", environment: "production" });
  const [transactionId, setTransactionId] = useState("");
  useEffect(() => setPhone(phoneNumber || ""), [phoneNumber]);
  useEffect(() => setAmount(defaultAmount || ""), [defaultAmount]);

  useEffect(() => {
    if (!transactionId || status !== "sent") return undefined;
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
        if (attempts >= 30) {
          setMessage("The STK request is still pending. You can close this window; the server will record the final M-PESA callback automatically.");
          return;
        }
        window.setTimeout(poll, 2000);
      } catch {}
    };
    poll();
    return () => { stopped = true; };
  }, [transactionId, status]);

  const openPayment = async () => {
    setStatus("checking"); setMessage("");
    try {
      const { data } = await API.get("/payments/config");
      setConfigured(Boolean(data?.configured));
      setMpesaConfig({
        shortCode: String(data?.shortCode || ""),
        accountReference: String(data?.accountReference || ""),
        environment: String(data?.environment || "production"),
      });
      setStatus("idle"); setOpen(true);
    } catch { setConfigured(false); setMpesaConfig({ shortCode: "", accountReference: "", environment: "production" }); setStatus("idle"); setOpen(true); }
  };

  const submit = async (event) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    const normalizedPhone = normalizePhone(phone);
    if (!numericAmount || numericAmount <= 0) { setMessage("Enter a valid amount."); return; }
    if (maxAmount && numericAmount > Number(maxAmount)) { setMessage(`Maximum allowed is ${money(maxAmount)}.`); return; }
    if (!/^254\d{9}$|^0[17]\d{8}$/.test(normalizedPhone)) { setMessage("Enter a valid Kenyan M-PESA number, e.g. 0712345678."); return; }
    try {
      setStatus("sending"); setMessage("");
      const payload = { purpose, referenceId, amount: numericAmount, phoneNumber: normalizedPhone };
      const { data } = await API.post("/payments/stk", payload);
      if (!data?.success) throw new Error(data?.message || "M-PESA request could not be submitted.");
      setTransactionId(String(data?.transactionId || ""));
      setStatus("sent"); setMessage(data?.message || "STK Push sent. Check your phone and enter your M-PESA PIN.");
    } catch (error) {
      const statusCode = error.response?.status;
      const body = error.response?.data || {};
      const friendly = mpesaFriendlyError(error);
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
            <div className="mpesa-modal-head"><div><span>M-PESA PAYMENT</span><h2>Secure payment request</h2></div><button type="button" className="mpesa-close" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
            {!configured && <div className="mpesa-alert warning">M-PESA production credentials are not configured yet. Add Daraja credentials to the backend before collecting live money.</div>}
            {message && <div className={`mpesa-alert ${["error"].includes(status) ? "error" : ["sent", "success"].includes(status) ? "success" : "warning"}`}>{["sent", "success"].includes(status) ? <CheckCircle2 size={17} /> : status === "error" ? <XCircle size={17} /> : null}<span>{message}</span></div>}
            <form onSubmit={submit} className="mpesa-form">
              <label>Amount (KES)<input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!configured || status === "sending"} /></label>
              <label>M-PESA number<input type="tel" inputMode="numeric" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!configured || status === "sending"} /></label>
              <div className="mpesa-account-note">Scheme collection: PayBill <strong>247247</strong> • Account <strong>0650186528835</strong></div>
              {configured && <div className="mpesa-account-note">{mpesaConfig.environment === "sandbox" ? "Sandbox" : "Production"} STK merchant shortcode <strong>{mpesaConfig.shortCode || "configured"}</strong>{mpesaConfig.accountReference ? <> • Backend reference <strong>{mpesaConfig.accountReference}</strong></> : null}</div>}
              <button className="mpesa-submit" type="submit" disabled={!configured || status === "sending"}>{status === "sending" ? <><Loader2 size={17} className="mpesa-spin" /> Sending STK Push…</> : "Send STK Push"}</button>
              <p className="mpesa-small">Your M-PESA PIN is entered only on the M-PESA prompt. Final payment status is confirmed by the server callback.</p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
