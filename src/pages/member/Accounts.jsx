import { useCallback, useEffect, useState } from "react";
import { HandHeart, Landmark, RefreshCw, Smartphone, CircleDollarSign } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import MpesaPaymentButton from "../../components/payments/MpesaPaymentButton";
import { MpesaStatusBadge, MpesaTransactionButton } from "../../components/accounts/MpesaTransactionViewer";
import LedgerControls from "../../components/accounts/LedgerControls";
import ConstitutionLedgerTable from "../../components/accounts/ConstitutionLedgerTable";
import "../../styles/portalModule.css";
import { getDefaultLedgerRange, normalizeLedgerDateRange } from "../../utils/ledgerDateRange";
import { normalizeBookBalanceResponse } from "../../utils/bookBalance";
import "./Accounts.css";

const money = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const amount = Number(v);
  return Number.isFinite(amount) ? new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount) : "—";
};
const TABS = [["constitution", "Benevolent Constitution", Landmark], ["mpesa", "M-Pesa Accounts", Smartphone], ["community", "Community M-Pesa Support", HandHeart]];
const { start: yearStart, end: today } = getDefaultLedgerRange();

export default function MemberAccounts() {
  const [tab, setTab] = useState("constitution");
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState(null);
  const [community, setCommunity] = useState(null);
  const [communityLedger, setCommunityLedger] = useState(null);
  const [bookBalance, setBookBalance] = useState(null);
  const [constitution, setConstitution] = useState(null);
  const [dates, setDates] = useState(getDefaultLedgerRange());
  const [busy, setBusy] = useState(false);
  const [ledgerBusy, setLedgerBusy] = useState(false);
  const [loadErrors, setLoadErrors] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadBase = useCallback(async () => {
    setBusy(true);
    const results = await Promise.allSettled([
      API.get("/member/summary"),
      API.get("/payments/mine"),
      API.get("/payments/community-assistance"),
      API.get("/payments/community-assistance/mine/ledger"),
      API.get("/finance/book-balance"),
    ]);
    const [summaryRes, paymentsRes, communityRes, ledgerRes, balanceRes] = results;
    const messageFor = (result, fallback) => result.status === "rejected"
      ? result.reason?.response?.data?.message || result.reason?.message || fallback
      : null;
    setLoadErrors((current) => ({
      ...current,
      summary: messageFor(summaryRes, "Unable to load your account summary."),
      payments: messageFor(paymentsRes, "Unable to load your M-PESA records."),
      community: messageFor(communityRes, "Unable to load community support."),
      communityLedger: messageFor(ledgerRes, "Unable to load your support collection ledger."),
      bookBalance: messageFor(balanceRes, "Unable to load the scheme book balance."),
    }));
    if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.data?.summary || null);
    if (paymentsRes.status === "fulfilled") setPayments(Array.isArray(paymentsRes.value.data?.transactions) ? paymentsRes.value.data.transactions : []);
    if (communityRes.status === "fulfilled") setCommunity(Array.isArray(communityRes.value.data?.campaigns) ? communityRes.value.data.campaigns : []);
    if (ledgerRes.status === "fulfilled") setCommunityLedger(Array.isArray(ledgerRes.value.data?.cases) ? ledgerRes.value.data.cases : []);
    if (balanceRes.status === "fulfilled") setBookBalance(normalizeBookBalanceResponse(balanceRes.value.data));
    setBusy(false);
  }, []);

  const loadConstitution = useCallback(async (range) => {
    const selectedRange = range || { start: yearStart, end: today };
    const normalized = normalizeLedgerDateRange(selectedRange);
    if (!normalized.ok) {
      setError(normalized.message);
      return false;
    }
    setDates((current) => current.start === normalized.start && current.end === normalized.end
      ? current
      : { ...current, start: normalized.start, end: normalized.end });
    setLedgerBusy(true);
    setLoadErrors((current) => ({ ...current, constitution: null }));
    try {
      const { data } = await API.get("/finance/constitution-ledger", {
        params: { startDate: normalized.start, endDate: normalized.end },
      });
      setConstitution(data);
      return true;
    } catch (e) {
      setLoadErrors((current) => ({
        ...current,
        constitution: e.response?.data?.message || e.message || "Unable to load the constitution ledger.",
      }));
      return false;
    } finally {
      setLedgerBusy(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setMessage("");
    setError("");
    await Promise.all([loadBase(), loadConstitution(dates)]);
  }, [loadBase, loadConstitution, dates]);

  useEffect(() => {
    loadBase();
    loadConstitution({ start: yearStart, end: today });
  }, [loadBase, loadConstitution]);

  const paymentList = Array.isArray(payments) ? payments : [];
  const successful = paymentList.filter((p) => p.status === "successful").reduce((n, p) => n + Number(p.amount || 0), 0);
  const pending = paymentList.filter((p) => ["pending", "initiated", "processing", "unknown"].includes(p.status)).reduce((n, p) => n + Number(p.amount || 0), 0);
  return <DashboardLayout><main className="portal-page account-page">
    <header className="portal-module-header account-hero"><div><span>PERSONAL FINANCIAL CENTRE</span><h1>Accounts</h1><p>Your scheme account information is separated by purpose so members can understand what each balance and payment record represents.</p></div><div className="portal-actions"><button className="portal-btn secondary" onClick={refreshAll} disabled={busy}><RefreshCw size={16}/> Refresh</button></div></header>
    {message && <div className="portal-alert success">{message}</div>}{error && <div className="portal-alert error">{error}</div>}{loadErrors.summary && <div className="portal-alert error">Account summary: {loadErrors.summary}</div>}
    <nav className="account-tabs" aria-label="Account sections" role="tablist">{TABS.map(([id,label,Icon]) => <button key={id} type="button" role="tab" aria-selected={tab===id} className={tab===id?"active":""} onClick={() => {setTab(id);setMessage("");setError("");}}><Icon size={17}/>{label}</button>)}</nav>

    {tab === "constitution" && <>
      <section className="account-grid four"><div className="portal-panel account-card"><span>Scheme Current Book Balance</span><strong>{bookBalance === null ? (loadErrors.bookBalance ? "Unavailable" : "Loading…") : money(bookBalance?.balance)}</strong><small>{loadErrors.bookBalance || (bookBalance === null ? "Waiting for the authoritative response" : bookBalance?.asOf ? `As of ${new Date(bookBalance.asOf).toLocaleString("en-KE")}` : "Timestamp unavailable")}</small><div className="account-live-flow" style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:8}}><small>Money in: {bookBalance === null ? (loadErrors.bookBalance ? "Unavailable" : "Loading…") : money(bookBalance?.moneyIn)}</small><small>Money out: {bookBalance === null ? (loadErrors.bookBalance ? "Unavailable" : "Loading…") : money(bookBalance?.moneyOut)}</small></div></div><div className="portal-panel account-card"><span>Your contributions</span><strong>{summary === null ? "Loading…" : money(summary?.totalContributed)}</strong><small>Recorded member contributions</small></div><div className="portal-panel account-card"><span>Contribution status</span><strong>{summary === null ? "Loading…" : summary?.contributionStatus || "Not available"}</strong><small>Your personal contribution position</small></div><div className="portal-panel account-card"><span>What this balance means</span><strong style={{fontSize:14}}>Scheme funds</strong><small>Based on approved financial transactions</small></div></section>
      <section className="portal-panel"><div className="account-panel-head"><div><span>BENOVELENT CONSTITUTION</span><h2>Constitution Ledger</h2><p>The Constitution Book Balance represents the current recorded scheme funds based on approved financial transactions. A selected date range changes the ledger view, not the historical opening balance.</p></div><Landmark size={23}/></div><LedgerControls data={constitution} dates={{start:dates.start,end:dates.end,setStart:(v)=>setDates(d=>({...d,start:v})),setEnd:(v)=>setDates(d=>({...d,end:v}))}} onLoad={loadConstitution} busy={ledgerBusy} currentBalanceLabel="Scheme Current Book Balance" personalContributionTotal={summary?.totalContributed} contributionStatus={summary?.contributionStatus} />{loadErrors.constitution ? <div className="portal-alert error">{loadErrors.constitution}</div> : constitution?.entries && <ConstitutionLedgerTable entries={constitution.entries || []} />}</section>
    </>}

    {tab === "mpesa" && <>
      <section className="account-grid four"><div className="portal-panel account-card"><span>M-Pesa successful</span><strong>{payments === null ? "Loading…" : money(successful)}</strong><small>Confirmed successful payment records</small></div><div className="portal-panel account-card"><span>M-Pesa pending</span><strong>{payments === null ? "Loading…" : money(pending)}</strong><small>Awaiting final status</small></div><div className="portal-panel account-card"><span>Membership</span><strong>{summary === null ? "Loading…" : summary?.status || "—"}</strong><small>{summary === null ? "Waiting for member profile" : summary?.memberNumber || "Employee number unavailable"}</small></div><div className="portal-panel account-card"><span>M-Pesa number</span><strong>{summary === null ? "Loading…" : summary?.phone || "—"}</strong><small>Used for payment requests where applicable</small></div></section>
      <section className="account-grid two"><div className="portal-panel account-panel"><div className="account-panel-head"><div><span>PAYROLL CONTRIBUTIONS</span><h2>Your ordinary contribution records</h2><p>Ordinary Benevolent contributions are recorded through the authorised contribution process. This view is separate from the Constitution scheme ledger.</p></div><Landmark size={23}/></div><div className="account-grid two"><div className="account-card compact"><span>Monthly contribution</span><strong>{summary === null ? "Loading…" : money(summary?.monthlyContribution)}</strong><small>Current configured contribution</small></div><div className="account-card compact"><span>Total contributed</span><strong>{summary === null ? "Loading…" : money(summary?.totalContributed)}</strong><small>Recorded contribution history</small></div></div></div><div className="portal-panel account-panel"><div className="account-panel-head"><div><span>SUPPORT COLLECTION LEDGER</span><h2>Your support collection cases</h2><p>Successful community contributions and later disbursements are shown separately.</p></div><CircleDollarSign size={23}/></div>{communityLedger===null?<div className="portal-empty">Loading your support collection ledger…</div>:loadErrors.communityLedger?<div className="portal-alert error">{loadErrors.communityLedger}</div>:communityLedger.length===0?<div className="portal-empty">No community support request has been opened for you.</div>:communityLedger.map(({campaign,totals})=><div className="ledger-summary-card" key={campaign._id}><strong>{campaign.title}</strong><span>Successful M-Pesa records: <b>{money(totals.totalSuccessful)}</b></span><span>Disbursement: <b>{money(totals.disbursement)}</b></span><span>Remaining: <b>{money(totals.balance)}</b></span><small>{campaign.payoutStatus || campaign.status || "—"}</small></div>)}</div></section>
      <section className="portal-panel"><div className="account-panel-head"><div><span>TRANSACTION HISTORY</span><h2>Pending and successful M-Pesa records</h2><p>Use View to inspect an exact transaction's status and reference.</p></div></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date/time</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Receipt</th><th>View</th></tr></thead><tbody>{payments===null?<tr><td colSpan="6">Loading M-Pesa transactions…</td></tr>:loadErrors.payments?<tr><td colSpan="6">{loadErrors.payments}</td></tr>:payments.length===0?<tr><td colSpan="6">No M-Pesa transactions have been recorded.</td></tr>:payments.map((x)=><tr key={x._id}><td>{x.createdAt?new Date(x.createdAt).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}):"—"}</td><td>{String(x.purpose||"payment").replace(/_/g," ")}</td><td>{money(x.amount)}</td><td><MpesaStatusBadge status={x.status}/></td><td>{x.mpesaReceiptNumber || x.manualTransactionCode || "—"}</td><td><MpesaTransactionButton transaction={x}/></td></tr>)}</tbody></table></div></section>
    </>}

    {tab === "community" && <section className="portal-panel"><div className="account-panel-head"><div><span>COMMUNITY M-PESA SUPPORT</span><h2>Available community support</h2><p>Eligible community members can use this area to assist a beneficiary through an open support request. Personal information shown here is limited to what is needed for the support purpose.</p></div><HandHeart size={23}/></div>{community.length===0?<div className="portal-empty">There are no open community M-Pesa support requests right now.</div>:<div className="community-support-grid">{community.map(c=><article className="community-support-card" key={c._id}><div><span>SUPPORT REQUEST</span><h3>{c.title}</h3><p>{c.description}</p></div><div className="support-progress"><strong>{money(c.raisedAmount)} / {money(c.targetAmount)}</strong><small>{c.recipientMember?.fullName || "Member"}</small></div>{c.canContribute ? <MpesaPaymentButton purpose="community_assistance" referenceId={c._id} label="Contribute via M-Pesa" defaultAmount={Math.max(1, Number(c.targetAmount||0)-Number(c.raisedAmount||0))} onSuccess={refreshAll}/> : <div className="manual-note">This is your own support request. You cannot contribute to your own case.</div>}<div className="manual-note">Manual PayBill verification, where enabled, should only use the M-Pesa transaction code returned by the provider.</div></article>)}</div>}</section>}
  </main></DashboardLayout>;
}
