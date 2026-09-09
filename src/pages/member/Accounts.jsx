import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, CheckCircle2, FileText, HandHeart, KeyRound, Loader2, RefreshCw, ShieldCheck, Smartphone, UserRound, Wallet, Landmark, ChevronRight } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import MpesaPaymentButton from "../../components/payments/MpesaPaymentButton";
import "../../styles/portalModule.css";
import "./Accounts.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
const dateText = (value) => value ? new Date(value).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }) : "—";

const TABS = [
  ["overview", "Overview", Wallet],
  ["contributions", "Contributions", Landmark],
  ["payments", "Payments", Smartphone],
  ["support", "Support & loans", HandHeart],
  ["account", "Account & security", ShieldCheck],
];

export default function Accounts() {
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [claims, setClaims] = useState([]);
  const [education, setEducation] = useState([]);
  const [settings, setSettings] = useState(null);
  const [mpesaConfig, setMpesaConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const [summaryRes, contributionRes, paymentRes, claimRes, educationRes, settingsRes, configRes] = await Promise.all([
        API.get("/member/summary"),
        API.get(`/member/contributions?year=${new Date().getFullYear()}`),
        API.get("/payments/mine"),
        API.get("/member/claims"),
        API.get("/education/my-applications"),
        API.get("/member/settings"),
        API.get("/payments/config"),
      ]);
      setSummary(summaryRes.data?.summary || null);
      setContributions(Array.isArray(contributionRes.data?.contributions) ? contributionRes.data.contributions : []);
      setPayments(Array.isArray(paymentRes.data?.transactions) ? paymentRes.data.transactions : []);
      setClaims(Array.isArray(claimRes.data?.claims) ? claimRes.data.claims : []);
      setEducation(Array.isArray(educationRes.data?.applications) ? educationRes.data.applications : []);
      setSettings(settingsRes.data?.settings || settingsRes.data || null);
      setMpesaConfig(configRes.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load your account.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const contributionSummary = useMemo(() => ({
    expected: contributions.reduce((n, x) => n + Number(x.expectedAmount || 0), 0),
    paid: contributions.reduce((n, x) => n + Number(x.paidAmount || 0), 0),
    balance: contributions.reduce((n, x) => n + Math.max(0, Number(x.expectedAmount || 0) - Number(x.paidAmount || 0)), 0),
  }), [contributions]);

  const outstandingEducation = education.reduce((sum, item) => sum + Math.max(0, Number(item.balance || item.outstandingBalance || 0)), 0);
  const repayableSupport = claims.filter((claim) => claim?.repaymentEnabled && Number(claim.balance || 0) > 0 && ["Approved", "Disbursement Pending", "Paid"].includes(claim.status));
  const outstandingSupport = repayableSupport.reduce((sum, item) => sum + Number(item.balance || 0), 0);

  const go = (path) => navigate(path);

  if (loading) return <DashboardLayout><main className="portal-page"><div className="portal-empty"><Loader2 className="spin" size={20} /> Loading your Accounts…</div></main></DashboardLayout>;
  if (error) return <DashboardLayout><main className="portal-page"><div className="portal-alert error">{error}</div><button className="portal-btn" onClick={load}><RefreshCw size={16}/> Retry</button></main></DashboardLayout>;

  return (
    <DashboardLayout>
      <main className="portal-page account-page">
        <header className="portal-module-header account-hero">
          <div><span>MY BENOVELENT MIDAX ACCOUNT</span><h1>Accounts</h1><p>Your personal membership, contribution, payment, support and security centre.</p></div>
          <div className="portal-actions"><button className="portal-btn secondary" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
        </header>

        <nav className="account-tabs" aria-label="Account sections">
          {TABS.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={17}/>{label}</button>)}
        </nav>

        {tab === "overview" && <>
          <section className="account-grid four">
            <div className="portal-panel account-card"><span>Membership</span><strong>{summary?.status || "Active"}</strong><small>{summary?.memberNumber || "Member number not available"}</small></div>
            <div className="portal-panel account-card"><span>This year paid</span><strong>{money(contributionSummary.paid)}</strong><small>{money(contributionSummary.balance)} outstanding</small></div>
            <div className="portal-panel account-card"><span>Loan balance</span><strong>{money(outstandingEducation)}</strong><small>Education policy</small></div>
            <div className="portal-panel account-card"><span>Profile</span><strong>{Number(summary?.profileCompletionPercentage || 0)}%</strong><small>{summary?.dependents || 0} active dependents</small></div>
          </section>
          <section className="account-grid two">
            <div className="portal-panel account-panel"><div className="account-panel-head"><div><span>QUICK PAYMENT</span><h2>Make a contribution</h2><p>Use the configured M-PESA collection method. Your final status is confirmed by the backend callback.</p></div><Smartphone size={23}/></div><MpesaPaymentButton purpose="contribution" label="Make a contribution" defaultAmount={Math.max(0, contributionSummary.balance) || ""} phoneNumber={summary?.phone || ""} onSuccess={load}/></div>
            <div className="portal-panel account-panel"><div className="account-panel-head"><div><span>ACCOUNT HEALTH</span><h2>{summary?.profileCompletionPercentage || 0}% complete</h2><p>Keep your contact, beneficiary and required document information current.</p></div><CheckCircle2 size={23}/></div><button className="portal-btn secondary" onClick={() => go("/member/profile")}><UserRound size={16}/> Manage profile <ArrowRight size={16}/></button></div>
          </section>
          <section className="portal-panel"><div className="account-panel-head"><div><span>RECENT ACTIVITY</span><h2>Your latest payment activity</h2></div><button className="portal-btn secondary" onClick={() => setTab("payments")}>View all <ArrowRight size={15}/></button></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>{payments.slice(0,6).map((x)=><tr key={x._id}><td>{dateText(x.createdAt)}</td><td>{String(x.purpose || "Payment").replace(/_/g," ")}</td><td>{money(x.amount)}</td><td><span className="portal-badge">{x.status || "—"}</span></td><td>{x.mpesaReceiptNumber || "Pending"}</td></tr>)}{payments.length===0&&<tr><td colSpan="5">No payments recorded yet.</td></tr>}</tbody></table></div></section>
        </>}

        {tab === "contributions" && <section className="portal-panel"><div className="account-panel-head"><div><span>MY CONTRIBUTIONS</span><h2>Personal contribution history</h2><p>Only your own contribution records are shown.</p></div><div className="account-inline-stats"><strong>{money(contributionSummary.paid)}</strong><small>paid</small></div></div><div className="account-grid three"><div className="account-card compact"><span>Expected</span><strong>{money(contributionSummary.expected)}</strong></div><div className="account-card compact"><span>Paid</span><strong>{money(contributionSummary.paid)}</strong></div><div className="account-card compact"><span>Outstanding</span><strong>{money(contributionSummary.balance)}</strong></div></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Month</th><th>Expected</th><th>Paid</th><th>Balance</th><th>Payment</th></tr></thead><tbody>{contributions.map((x)=><tr key={x._id}><td>{String(x.month).padStart(2,"0")}/{x.year}</td><td>{money(x.expectedAmount)}</td><td>{money(x.paidAmount)}</td><td>{money(Math.max(0, Number(x.expectedAmount||0)-Number(x.paidAmount||0)))}</td><td>{x.mpesaCode || x.receiptNumber || x.paymentMethod || "—"}</td></tr>)}{contributions.length===0&&<tr><td colSpan="5">No contribution records are available for your account.</td></tr>}</tbody></table></div></section>}

        {tab === "payments" && <section className="portal-panel"><div className="account-panel-head"><div><span>PAYMENT CENTRE</span><h2>M-PESA payments & statements</h2><p>Review successful, pending and failed payment requests linked to your account.</p></div><button className="portal-btn secondary" onClick={() => go("/member/mpesa-records")}>Full records <ArrowRight size={15}/></button></div><div className="portal-alert success"><ShieldCheck size={16}/> Payment status is server-controlled. A member confirmation never marks a transaction successful by itself.</div><div className="account-payment-box"><MpesaPaymentButton purpose="contribution" label="Start M-PESA payment" phoneNumber={summary?.phone || ""} onSuccess={load}/>{mpesaConfig?.manualPaybill && <p>Manual option: PayBill <strong>{mpesaConfig.manualPaybill}</strong> · Account <strong>{mpesaConfig.manualAccountNumber || "configured by administrator"}</strong></p>}</div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Receipt</th><th>Reference</th></tr></thead><tbody>{payments.map((x)=><tr key={x._id}><td>{dateText(x.createdAt)}</td><td>{String(x.purpose || "payment").replace(/_/g," ")}</td><td>{money(x.amount)}</td><td><span className="portal-badge">{x.status || "—"}</span></td><td>{x.mpesaReceiptNumber || "Pending"}</td><td>{x.accountReference || x.requestReference || "—"}</td></tr>)}{payments.length===0&&<tr><td colSpan="6">No payment records yet.</td></tr>}</tbody></table></div></section>}

        {tab === "support" && <section className="portal-panel"><div className="account-panel-head"><div><span>SUPPORT & LOANS</span><h2>Your assistance obligations</h2><p>Track education-policy balances and any repayable support linked to your claims.</p></div></div><div className="account-grid two"><div className="account-card"><span>Education policy balance</span><strong>{money(outstandingEducation)}</strong><button className="portal-btn secondary" onClick={() => go("/member/education")}>Open education support <ChevronRight size={15}/></button></div><div className="account-card"><span>Repayable support</span><strong>{money(outstandingSupport)}</strong><button className="portal-btn secondary" onClick={() => go("/member/claims")}>Open support history <ChevronRight size={15}/></button></div></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Type</th><th>Status</th><th>Amount / balance</th><th>Date</th></tr></thead><tbody>{education.map((x)=><tr key={x._id}><td>Education policy</td><td>{x.status || "—"}</td><td>{money(x.balance || x.outstandingBalance || x.approvedAmount)}</td><td>{dateText(x.updatedAt || x.createdAt)}</td></tr>)}{repayableSupport.map((x)=><tr key={`claim-${x._id}`}><td>{x.supportType || "Repayable support"}</td><td>{x.status || "—"}</td><td>{money(x.balance)}</td><td>{dateText(x.updatedAt || x.createdAt)}</td></tr>)}{education.length===0&&repayableSupport.length===0&&<tr><td colSpan="4">No outstanding support or loan records.</td></tr>}</tbody></table></div></section>}

        {tab === "account" && <section className="account-grid two"><div className="portal-panel"><div className="account-panel-head"><div><span>PERSONAL INFORMATION</span><h2>Profile & dependants</h2><p>Keep your member information and family records up to date.</p></div></div><button className="portal-btn secondary" onClick={() => go("/member/profile")}><UserRound size={16}/> Profile</button><button className="portal-btn secondary" onClick={() => go("/member/dependents")}><HandHeart size={16}/> Dependants</button><button className="portal-btn secondary" onClick={() => go("/member/settings")}><KeyRound size={16}/> Account settings</button></div><div className="portal-panel"><div className="account-panel-head"><div><span>SECURITY & NOTIFICATIONS</span><h2>Protect this account</h2><p>Manage password, notification preferences and portal alerts.</p></div><ShieldCheck size={23}/></div><div className="account-security-row"><Bell size={18}/><div><strong>Notifications</strong><small>{settings?.notifications === false ? "Disabled" : "Use the notification centre and settings to manage alerts."}</small></div><button className="portal-btn secondary" onClick={() => go("/member/notifications")}>Open <ChevronRight size={15}/></button></div><div className="account-security-row"><KeyRound size={18}/><div><strong>Password & security</strong><small>Change your password and review security preferences.</small></div><button className="portal-btn secondary" onClick={() => go("/member/settings")}>Manage <ChevronRight size={15}/></button></div><div className="account-security-row"><FileText size={18}/><div><strong>Documents</strong><small>Your sensitive documents stay within protected member routes.</small></div><button className="portal-btn secondary" onClick={() => go("/member/profile")}>Review <ChevronRight size={15}/></button></div></div></section>}
      </main>
    </DashboardLayout>
  );
}
