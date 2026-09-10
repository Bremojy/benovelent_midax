import { useCallback, useEffect, useState } from "react";
import { HandHeart, Landmark, RefreshCw, Smartphone, WalletCards, Loader2, CircleDollarSign } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import MpesaPaymentButton from "../../components/payments/MpesaPaymentButton";
import { MpesaStatusBadge, MpesaTransactionButton } from "../../components/accounts/MpesaTransactionViewer";
import ConstitutionLedgerTable from "../../components/accounts/ConstitutionLedgerTable";
import "../../styles/portalModule.css";
import "./Accounts.css";

const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const TABS = [["mpesa", "M-PESA Accounts", Smartphone], ["constitution", "Benovelent Constitution", Landmark], ["community", "Community M-PESA Support", HandHeart]];

export default function MemberAccounts() {
  const [tab, setTab] = useState("mpesa");
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [community, setCommunity] = useState([]);
  const [communityLedger, setCommunityLedger] = useState([]);
  const [constitution, setConstitution] = useState(null);
  const [dates, setDates] = useState({ start: "", end: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBase = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [summaryRes, paymentsRes, communityRes, ledgerRes] = await Promise.all([
        API.get("/member/summary"), API.get("/payments/mine"), API.get("/payments/community-assistance"), API.get("/payments/community-assistance/mine/ledger"),
      ]);
      setSummary(summaryRes.data?.summary || null);
      setPayments(Array.isArray(paymentsRes.data?.transactions) ? paymentsRes.data.transactions : []);
      setCommunity(Array.isArray(communityRes.data?.campaigns) ? communityRes.data.campaigns : []);
      setCommunityLedger(Array.isArray(ledgerRes.data?.cases) ? ledgerRes.data.cases : []);
    } catch (e) { setError(e.response?.data?.message || e.message || "Unable to load your Accounts data."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => { loadBase(); }, [loadBase]);

  const loadConstitution = async () => {
    if (!dates.start || !dates.end) { setError("Select both a start date and end date first."); return; }
    setBusy(true); setError("");
    try { const { data } = await API.get("/finance/constitution-ledger", { params: { startDate: dates.start, endDate: dates.end } }); setConstitution(data); }
    catch (e) { setError(e.response?.data?.message || e.message || "Unable to load the constitution ledger."); }
    finally { setBusy(false); }
  };

  const successful = payments.filter((p) => p.status === "successful").reduce((n, p) => n + Number(p.amount || 0), 0);
  const pending = payments.filter((p) => ["pending", "initiated", "processing", "unknown"].includes(p.status)).reduce((n, p) => n + Number(p.amount || 0), 0);
  return <DashboardLayout><main className="portal-page account-page">
    <header className="portal-module-header account-hero"><div><span>PERSONAL FINANCIAL CENTRE</span><h1>Accounts</h1><p>M-PESA payments, the Benovelent Constitution ledger, and community support — kept separate by purpose.</p></div><div className="portal-actions"><button className="portal-btn secondary" onClick={loadBase} disabled={busy}><RefreshCw size={16}/> Refresh</button></div></header>
    {message && <div className="portal-alert success">{message}</div>}{error && <div className="portal-alert error">{error}</div>}
    <nav className="account-tabs" aria-label="Account sections">{TABS.map(([id,label,Icon]) => <button key={id} className={tab===id?"active":""} onClick={() => {setTab(id);setMessage("");setError("");}}><Icon size={17}/>{label}</button>)}</nav>

    {tab === "mpesa" && <>
      <section className="account-grid four"><div className="portal-panel account-card"><span>M-PESA successful</span><strong>{money(successful)}</strong><small>Confirmed successful records</small></div><div className="portal-panel account-card"><span>M-PESA pending</span><strong>{money(pending)}</strong><small>Awaiting final status</small></div><div className="portal-panel account-card"><span>Membership</span><strong>{summary?.status || "Active"}</strong><small>{summary?.memberNumber || "Member number"}</small></div><div className="portal-panel account-card"><span>M-PESA number</span><strong>{summary?.phone || "—"}</strong><small>Used for payment requests</small></div></section>
      <section className="account-grid two"><div className="portal-panel account-panel"><div className="account-panel-head"><div><span>PAYROLL CONTRIBUTIONS</span><h2>Your ordinary contribution records</h2><p>Ordinary Benevolent MIDAX contributions are deducted through payroll. This page shows the resulting contribution ledger; there is no personal M-PESA contribution flow.</p></div><Landmark size={23}/></div><div className="account-card compact"><span>Monthly payroll deduction</span><strong>{money(summary?.monthlyContribution)}</strong><small>Managed by the authorised payroll process</small></div><div className="account-card compact"><span>Total contributed</span><strong>{money(summary?.totalContributed)}</strong><small>Recorded payroll contributions</small></div></div><div className="portal-panel account-panel"><div className="account-panel-head"><div><span>SUPPORT COLLECTION LEDGER</span><h2>Successful contributions → disbursement</h2><p>For support cases you requested, successful M-PESA collections and the eventual disbursement are shown separately.</p></div><CircleDollarSign size={23}/></div>{communityLedger.length===0?<div className="portal-empty">No community support request has been opened for you.</div>:communityLedger.map(({campaign,totals})=><div className="ledger-summary-card" key={campaign._id}><strong>{campaign.title}</strong><span>Successful M-PESA records: <b>{money(totals.totalSuccessful)}</b></span><span>Disbursement: <b>{money(totals.disbursement)}</b></span><span>Remaining: <b>{money(totals.balance)}</b></span><small>{campaign.payoutStatus || campaign.status || "—"}</small></div>)}</div></section>
      <section className="portal-panel"><div className="account-panel-head"><div><span>TRANSACTION HISTORY</span><h2>Pending and successful M-PESA records</h2><p>Use View on any transaction to inspect its exact status and date/time.</p></div></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date/time</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Receipt</th><th>View</th></tr></thead><tbody>{payments.length===0?<tr><td colSpan="6">No M-PESA transactions have been recorded.</td></tr>:payments.map((x)=><tr key={x._id}><td>{x.createdAt?new Date(x.createdAt).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"—"}</td><td>{String(x.purpose||"payment").replace(/_/g," ")}</td><td>{money(x.amount)}</td><td><MpesaStatusBadge status={x.status}/></td><td>{x.mpesaReceiptNumber || x.manualTransactionCode || "—"}</td><td><MpesaTransactionButton transaction={x}/></td></tr>)}</tbody></table></div></section>
    </>}

    {tab === "constitution" && <section className="portal-panel"><div className="account-panel-head"><div><span>BENOVELENT CONSTITUTION</span><h2>Community ledger book</h2><p>Choose a date range to view the constitution's inflows and money out. Your personal contribution totals are not displayed here.</p></div></div><div className="date-filter-row"><label>From<input type="date" value={dates.start} onChange={(e)=>setDates(d=>({...d,start:e.target.value}))}/></label><label>To<input type="date" value={dates.end} onChange={(e)=>setDates(d=>({...d,end:e.target.value}))}/></label><button className="portal-btn" onClick={loadConstitution} disabled={busy}>{busy?<Loader2 className="spin" size={16}/>:<WalletCards size={16}/>} Load ledger</button></div>{constitution && <><div className="account-grid three"><div className="account-card compact"><span>Money in</span><strong>{money(constitution.totals?.credit)}</strong></div><div className="account-card compact"><span>Money out</span><strong>{money(constitution.totals?.debit)}</strong></div><div className="account-card compact"><span>Balance</span><strong>{money(constitution.totals?.balance)}</strong></div></div><ConstitutionLedgerTable entries={constitution.entries || []}/></>}</section>}

    {tab === "community" && <section className="portal-panel"><div className="account-panel-head"><div><span>COMMUNITY M-PESA SUPPORT</span><h2>Available declined-claim requests</h2><p>Choose an open support request, pay through M-PESA, then paste your M-PESA code for verification when manual payment is used.</p></div><HandHeart size={23}/></div>{community.length===0?<div className="portal-empty">There are no open community M-PESA requests right now.</div>:<div className="community-support-grid">{community.map(c=><article className="community-support-card" key={c._id}><div><span>SUPPORT REQUEST</span><h3>{c.title}</h3><p>{c.description}</p></div><div className="support-progress"><strong>{money(c.raisedAmount)} / {money(c.targetAmount)}</strong><small>{c.recipientMember?.fullName || "Member"}</small></div>{c.canContribute ? <MpesaPaymentButton purpose="community_assistance" referenceId={c._id} label="Contribute via M-PESA" defaultAmount={Math.max(1, Number(c.targetAmount||0)-Number(c.raisedAmount||0))} onSuccess={loadBase}/> : <div className="manual-note">This is your support request. You cannot contribute to your own case.</div>}<div className="manual-note">After paying by PayBill, use the payment form's manual verification option and enter the M-PESA transaction code.</div></article>)}</div>}</section>}
  </main></DashboardLayout>;
}
