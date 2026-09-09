import { useState } from "react";
import { Eye, X } from "lucide-react";

const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const dt = (v) => v ? new Date(v).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function MpesaTransactionButton({ transaction }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="portal-btn secondary compact" onClick={() => setOpen(true)}><Eye size={15}/> View</button>
    {open && <div className="account-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-label="M-PESA transaction details">
        <header><div><span>M-PESA TRANSACTION</span><h2>{money(transaction?.amount)}</h2></div><button className="icon-btn" onClick={() => setOpen(false)} aria-label="Close"><X size={19}/></button></header>
        <div className="account-detail-grid">
          <div><span>Status</span><strong>{String(transaction?.status || "—").replace(/_/g, " ")}</strong></div>
          <div><span>Initiated</span><strong>{dt(transaction?.initiatedAt || transaction?.createdAt)}</strong></div>
          <div><span>Completed</span><strong>{dt(transaction?.completedAt)}</strong></div>
          <div><span>Purpose</span><strong>{String(transaction?.purpose || "—").replace(/_/g, " ")}</strong></div>
          <div><span>M-PESA receipt</span><strong>{transaction?.mpesaReceiptNumber || "Pending / not issued"}</strong></div>
          <div><span>Checkout request</span><strong>{transaction?.checkoutRequestId || "—"}</strong></div>
          <div><span>Transaction code</span><strong>{transaction?.manualTransactionCode || "—"}</strong></div>
          <div><span>Account reference</span><strong>{transaction?.accountReference || "—"}</strong></div>
          <div><span>Result</span><strong>{transaction?.resultDescription || "Awaiting final result"}</strong></div>
          <div><span>Reconciled</span><strong>{transaction?.reconciled ? "Yes" : "No"}</strong></div>
        </div>
      </section>
    </div>}
  </>;
}

export function MpesaStatusBadge({ status }) {
  const value = String(status || "pending").toLowerCase();
  return <span className={`portal-badge status-${value}`}>{value.replace(/_/g, " ")}</span>;
}
