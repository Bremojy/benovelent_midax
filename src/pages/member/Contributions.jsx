import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import MpesaPaymentButton from "../../components/payments/MpesaPaymentButton";
import { buildPrintHeadHtml, printHeadStyles } from "../../utils/printHead";
import "../../styles/portalModule.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
const monthName = (month) => new Date(2000, Number(month) - 1, 1).toLocaleString("en-KE", { month: "long" });
const safe = (input) => String(input ?? "").replace(/[&<>\"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));

export default function Contributions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [educationLoans, setEducationLoans] = useState([]);
  const [repayableSupport, setRepayableSupport] = useState([]);
  const [mpesaTransactions, setMpesaTransactions] = useState([]);
  const [mpesaReady, setMpesaReady] = useState(false);
  const [mpesaConfig, setMpesaConfig] = useState({ shortCode: "", accountReference: "", environment: "production" });
  const [loanLoading, setLoanLoading] = useState(true);
  const year = new Date().getFullYear();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [response, loanResponse, claimResponse, mpesaResponse, mpesaConfigResponse] = await Promise.all([API.get(`/member/accounts?year=${year}`), API.get("/education/my-applications"), API.get("/member/claims"), API.get("/payments/mine"), API.get("/payments/config")]);
      setData(response.data || null);
      setEducationLoans(Array.isArray(loanResponse.data?.applications) ? loanResponse.data.applications : []);
      const allClaims = Array.isArray(claimResponse.data?.claims) ? claimResponse.data.claims : [];
      setRepayableSupport(allClaims.filter((claim) => claim?.supportType && !["medical", "funeral", "Medical", "Funeral"].includes(claim.supportType) && claim.repaymentEnabled && ["Approved", "Disbursement Pending", "Paid"].includes(claim.status) && Number(claim.balance || 0) > 0));
      setMpesaTransactions(Array.isArray(mpesaResponse.data?.transactions) ? mpesaResponse.data.transactions : []);
      setMpesaReady(Boolean(mpesaConfigResponse.data?.configured));
      setMpesaConfig(mpesaConfigResponse.data || {});
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load scheme accounts.");
    } finally {
      setLoading(false);
      setLoanLoading(false);
    }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const printPage = () => {
    if (!data) return;
    const win = window.open("", "_blank", "width=1100,height=800");
    if (!win) return;
    const totals = data.totals || {};
    win.document.write(`
      <html><head><title>Benovelent MIDAX Scheme Accounts</title>${printHeadStyles()}</head><body>
      ${buildPrintHeadHtml({ title: `Benovelent MIDAX Scheme Accounts — ${year}`, subtitle: "General Benovelent MIDAX scheme account statement." })}
      <p class="print-note">Standard monthly payroll deduction: ${money(data.standardMonthlyDeduction)} • Active members: ${Number(data.activeMembers || 0)} • Total collected: ${money(totals.totalCollected)} • Outstanding: ${money(totals.outstanding)}</p>
      <h3>Monthly scheme contribution summary</h3>
      <table><thead><tr><th>Month</th><th>Expected</th><th>Collected</th><th>Outstanding</th><th>Members charged</th></tr></thead><tbody>
      ${(data.monthly || []).map((m) => `<tr><td>${monthName(m.month)}</td><td>${money(m.expected)}</td><td>${money(m.collected)}</td><td>${money(m.outstanding)}</td><td>${Number(m.membersCharged || 0)}</td></tr>`).join("")}
      </tbody></table>
      <h3 style="margin-top:22px;">Support summary</h3>
      <p>Total cases: ${Number(data.support?.totalCases || 0)} • Approved cases: ${Number(data.support?.approvedCases || 0)} • Pending cases: ${Number(data.support?.pendingCases || 0)} • Approved support: ${money(data.support?.approvedSupportTotal)}</p>
      <h3 style="margin-top:22px;">Scheme ledger summary</h3>
      <p>Credits: ${money(data.totals?.ledgerCredits)} • Debits: ${money(data.totals?.ledgerDebits)} • Closing balance: ${money(data.totals?.ledgerBalance)}</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
      ${(data.ledger?.entries || []).map((x) => `<tr><td>${x.date ? new Date(x.date).toLocaleDateString("en-KE") : "—"}</td><td>${safe(x.type || "—")}</td><td>${safe(x.category || "—")}</td><td>${safe(x.description || "—")}</td><td>${money(x.debit)}</td><td>${money(x.credit)}</td><td>${money(x.runningBalance)}</td></tr>`).join("")}
      </tbody></table>
      <script>window.onload=()=>window.print();</script></body></html>
    `);
    win.document.close();
  };

  if (loading) return <DashboardLayout><div className="portal-empty">Loading scheme Accounts…</div></DashboardLayout>;
  if (error) return <DashboardLayout><div className="portal-alert">{error}</div></DashboardLayout>;

  const totals = data?.totals || {};
  const currentMonth = data?.monthly?.find((m) => Number(m.month) === Number(data.month));

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div><span>BENOVELENT SCHEME ACCOUNTS</span><h1>Accounts</h1><p>One transparent, scheme-wide account view shared consistently by every member.</p></div>
          <div className="portal-actions"><button className="portal-btn secondary" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button><button className="portal-btn" onClick={printPage} disabled={!data}>Print / Download</button></div>
        </header>

        <section className="portal-panel">
          <div className="portal-alert success"><strong>Payroll contribution model:</strong> the scheme applies one standard monthly deduction across the membership.</div>
        </section>

        <section className="portal-panel accounts-trust-panel">
          <div className="portal-module-header compact-header"><div><span>PAYMENT TRANSPARENCY</span><h2>M-PESA collection details</h2><p>Use the scheme payment details shown here and keep every M-PESA confirmation for your records.</p></div><span className={`portal-badge ${mpesaReady ? "approved" : ""}`}>{mpesaReady ? "Online payment ready" : "Online payment unavailable"}</span></div>
          <div className="portal-stat-grid">
            <Stat label="PayBill" value={mpesaConfig.manualPaybill || "Not configured"} />
            <Stat label="Account Number" value={mpesaConfig.manualAccountNumber || "Not configured"} />
            <Stat label="Payment gateway" value={mpesaReady ? "Daraja STK" : "Manual / pending setup"} />
            <Stat label="M-PESA records" value={mpesaTransactions.length} />
          </div>
          <div className="portal-alert"><strong>Important:</strong> use the collection PayBill and account number shown above. The STK Push button uses only the secure Daraja configuration held by the backend.</div>
        </section>

        <section className="portal-panel">
          <div className="portal-module-header"><div><span>EDUCATION POLICY REPAYMENTS</span><h2>My loans</h2><p>Repay any outstanding Education Policy balance securely through an M-PESA STK Push.</p></div></div>
          {loanLoading ? <div className="portal-empty">Loading loan balances…</div> : educationLoans.filter((loan) => Number(loan.balance || 0) > 0 && ["Approved","Disbursed","Defaulted"].includes(loan.status)).length === 0 ? <div className="portal-empty"><h3>No outstanding education loan</h3><p>Approved or disbursed education policy loans will appear here with their live repayment balance.</p></div> : <div className="portal-grid two">{educationLoans.filter((loan) => Number(loan.balance || 0) > 0 && ["Approved","Disbursed","Defaulted"].includes(loan.status)).map((loan) => <article className="portal-panel" key={loan._id} style={{ margin:0 }}><span className="portal-badge">Education Policy</span><h3>{loan.dependentName || "Education loan"}</h3><p>{loan.school || ""}</p><div className="portal-stat-grid"><Stat label="Total repayment" value={money(loan.totalRepayment)} /><Stat label="Paid" value={money(loan.amountPaid)} /><Stat label="Balance" value={money(loan.balance)} /><Stat label="Monthly instalment" value={money(loan.monthlyInstallment)} /></div><MpesaPaymentButton purpose="loan_repayment" referenceId={loan._id} defaultAmount={Math.min(Number(loan.monthlyInstallment || 0), Number(loan.balance || 0))} maxAmount={Number(loan.balance || 0)} label="Repay with M-PESA" /></article>)}</div>}
        </section>

        {repayableSupport.length > 0 && <section className="portal-panel">
          <div className="portal-module-header"><div><span>OTHER REPAYABLE SUPPORT</span><h2>Other support balances</h2><p>Only policies explicitly configured as repayable can be repaid through M-PESA here.</p></div></div>
          <div className="portal-grid two">{repayableSupport.map((claim) => <article className="portal-panel" key={claim._id} style={{margin:0}}><span className="portal-badge">{claim.policyName || claim.supportType}</span><h3>{claim.description || "Support balance"}</h3><div className="portal-stat-grid"><Stat label="Total repayment" value={money(claim.totalRepayment)} /><Stat label="Paid" value={money(claim.amountPaid)} /><Stat label="Balance" value={money(claim.balance)} /></div><MpesaPaymentButton purpose="support_repayment" referenceId={claim._id} defaultAmount={Math.min(Number(claim.balance || 0), Number(claim.monthlyInstallment || claim.balance || 0))} maxAmount={Number(claim.balance || 0)} label="Repay with M-PESA" /></article>)}</div>
        </section>}

        <div className="portal-stat-grid">
          <Stat label="Standard monthly deduction" value={money(data?.standardMonthlyDeduction)} />
          <Stat label="Active members" value={Number(data?.activeMembers || 0)} />
          <Stat label="Collected this year" value={money(totals.totalCollected)} />
          <Stat label="Outstanding" value={money(totals.outstanding)} />
          <Stat label="Support approved" value={money(totals.approvedSupportTotal)} />
          <Stat label="Scheme balance" value={money(totals.ledgerBalance)} />
        </div>

        <section className="portal-panel">
          <div className="portal-module-header"><div><span>MONTHLY PAYROLL PULSE</span><h2>{monthName(data?.month)} {year}</h2><p>Current scheme-wide deduction and collection status.</p></div></div>
          <div className="portal-stat-grid">
            <Stat label="Expected this month" value={money(currentMonth?.expected)} />
            <Stat label="Collected this month" value={money(currentMonth?.collected)} />
            <Stat label="Outstanding this month" value={money(currentMonth?.outstanding)} />
            <Stat label="Members charged" value={Number(currentMonth?.membersCharged || 0)} />
          </div>
        </section>

        <section className="portal-panel">
          <h2>Monthly scheme contribution summary</h2>
          <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Month</th><th>Expected</th><th>Collected</th><th>Outstanding</th><th>Members charged</th></tr></thead><tbody>
            {(data?.monthly || []).map((m) => <tr key={m.month}><td>{monthName(m.month)}</td><td>{money(m.expected)}</td><td>{money(m.collected)}</td><td>{money(m.outstanding)}</td><td>{m.membersCharged}</td></tr>)}
          </tbody></table></div>
        </section>

        <section className="portal-grid two">
          <article className="portal-panel"><h2>Support summary</h2><div className="portal-stat-grid"><Stat label="All support cases" value={data?.support?.totalCases || 0} /><Stat label="Approved cases" value={data?.support?.approvedCases || 0} /><Stat label="Pending cases" value={data?.support?.pendingCases || 0} /><Stat label="Approved support" value={money(data?.support?.approvedSupportTotal)} /></div></article>
          <article className="portal-panel"><h2>Scheme ledger</h2><div className="portal-stat-grid"><Stat label="Credits" value={money(data?.totals?.ledgerCredits)} /><Stat label="Debits" value={money(data?.totals?.ledgerDebits)} /><Stat label="Closing balance" value={money(data?.totals?.ledgerBalance)} /></div><p className="print-note">This is a shared scheme account view for members.</p></article>
        </section>

        <section className="portal-panel"><div className="portal-module-header compact-header"><div><span>M-PESA PAYMENT HISTORY</span><h2>Recent payment confirmations</h2><p>Server-recorded STK transactions linked to your member account.</p></div><button className="portal-btn secondary" onClick={load}>Refresh</button></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Purpose</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead><tbody>{mpesaTransactions.slice(0,20).map((x) => <tr key={x._id}><td>{x.createdAt ? new Date(x.createdAt).toLocaleString("en-KE") : "—"}</td><td>{String(x.purpose || "payment").replace(/_/g," ")}</td><td>{money(x.amount)}</td><td><span className="portal-badge">{x.status || "—"}</span></td><td>{x.mpesaReceiptNumber || "Pending"}</td></tr>)}{mpesaTransactions.length===0 && <tr><td colSpan="5">No M-PESA transactions have been recorded for your account.</td></tr>}</tbody></table></div></section>

        <section className="portal-panel"><h2>Recent scheme ledger activity</h2><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
          {(data?.ledger?.entries || []).slice(0, 40).map((x, i) => <tr key={i}><td>{x.date ? new Date(x.date).toLocaleDateString("en-KE") : "—"}</td><td>{x.type || "—"}</td><td>{x.category || "—"}</td><td>{x.description || "—"}</td><td>{x.debit ? money(x.debit) : "—"}</td><td>{x.credit ? money(x.credit) : "—"}</td><td>{money(x.runningBalance)}</td></tr>)}
          {!data?.ledger?.entries?.length && <tr><td colSpan="7">No approved scheme ledger activity for this year.</td></tr>}
        </tbody></table></div></section>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }) { return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>; }
