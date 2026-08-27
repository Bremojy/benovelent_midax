import { confirmAction } from "../../utils/modernDialog";
import { useEffect, useMemo, useState } from "react";
import { Edit3, Layers3, Plus, RefreshCw, Trash2, ShieldCheck, LockKeyhole, WalletCards } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { buildPrintHeadHtml, printHeadStyles } from "../../utils/printHead";
import "../../styles/portalModule.css";

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  employeeNumber: "",
  type: "contribution",
  category: "",
  amount: "",
  description: "",
  paymentMethod: "M-PESA",
  referenceNumber: "",
  receiptNumber: "",
  transactionDate: today,
  notes: "",
};

export default function AdminFinance() {
  const { role } = useAuth();
  const isSuperAdmin = String(role || "").toLowerCase() === "superadmin";
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingContribution, setEditingContribution] = useState(null);
  const [contributionForm, setContributionForm] = useState({ expectedAmount: "", paidAmount: "", paymentMethod: "M-PESA", receiptNumber: "", mpesaCode: "", paymentDate: today, notes: "" });
  const [bulkForm, setBulkForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), amount: "500", paymentDate: today, recordAsCollected: true, notes: "Monthly payroll deduction" });
  const [bulkSaving, setBulkSaving] = useState(false);
  const [community, setCommunity] = useState([]);
  const [mpesaConfig, setMpesaConfig] = useState(null);
  const [communityBusy, setCommunityBusy] = useState("");
  const [b2cHistory, setB2cHistory] = useState([]);
  const [b2cForm, setB2cForm] = useState({ memberNumber: "", phoneNumber: "", amount: "", occasion: "BENEVOLENT", remarks: "" });
  const [b2cBusy, setB2cBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const requests = [
        API.get("/finance/summary/dashboard"),
        API.get("/finance"),
        API.get("/contributions"),
        API.get(`/finance/ledger?year=${new Date().getFullYear()}`),
        API.get("/payments/community-assistance/admin"),
        API.get("/payments/config"),
        ...(isSuperAdmin ? [API.get("/payments/b2c/history")] : []),
      ];
      const [s, t, c, l, communityRes, mpesaRes, b2cRes] = await Promise.all(requests);
      setSummary(s.data?.summary || s.data || {});
      setTransactions(Array.isArray(t.data?.transactions) ? t.data.transactions : []);
      setContributions(Array.isArray(c.data?.contributions) ? c.data.contributions : []);
      setLedger(l.data || null);
      setCommunity(Array.isArray(communityRes.data?.campaigns) ? communityRes.data.campaigns : []);
      setMpesaConfig(mpesaRes.data || null);
      if (isSuperAdmin) setB2cHistory(Array.isArray(b2cRes?.data?.transactions) ? b2cRes.data.transactions : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load finance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!editing && !editingContribution) return;
    const timer = window.setTimeout(() => {
      document.getElementById("finance-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [editing, editingContribution]);

  const number = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
  const first = (...keys) => { for (const key of keys) if (summary?.[key] !== undefined) return summary[key]; return 0; };

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.transactionDate || b.createdAt || 0) - new Date(a.transactionDate || a.createdAt || 0));
  }, [transactions]);

  const sortedContributions = useMemo(() => {
    return [...contributions].sort((a, b) => new Date(b.paymentDate || b.createdAt || 0) - new Date(a.paymentDate || a.createdAt || 0));
  }, [contributions]);

  const startCreate = () => {
    setEditing(null);
    setEditingContribution(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (transaction) => {
    setEditingContribution(null);
    setEditing(transaction);
    setForm({
      employeeNumber: transaction?.member?.memberNumber || transaction.employeeNumber || "",
      type: transaction?.type || "contribution",
      category: transaction?.category || "",
      amount: transaction?.amount || "",
      description: transaction?.description || "",
      paymentMethod: transaction?.paymentMethod || "M-PESA",
      referenceNumber: transaction?.referenceNumber || "",
      receiptNumber: transaction?.receiptNumber || "",
      transactionDate: transaction?.transactionDate ? new Date(transaction.transactionDate).toISOString().slice(0, 10) : today,
      notes: transaction?.notes || "",
    });
  };

  const startEditContribution = (contribution) => {
    setEditing(null);
    setEditingContribution(contribution);
    setContributionForm({
      expectedAmount: contribution?.expectedAmount ?? "",
      paidAmount: contribution?.paidAmount ?? "",
      paymentMethod: contribution?.paymentMethod || "M-PESA",
      receiptNumber: contribution?.receiptNumber || "",
      mpesaCode: contribution?.mpesaCode || "",
      paymentDate: contribution?.paymentDate ? new Date(contribution.paymentDate).toISOString().slice(0, 10) : today,
      notes: contribution?.notes || "",
    });
    setError("");
    setMessage("");
  };

  const saveContribution = async (event) => {
    event.preventDefault();
    if (!editingContribution?._id) return;
    try {
      setSaving(true);
      setError("");
      const response = await API.put(`/contributions/${editingContribution._id}`, {
        expectedAmount: Number(contributionForm.expectedAmount),
        paidAmount: Number(contributionForm.paidAmount),
        paymentMethod: contributionForm.paymentMethod,
        receiptNumber: contributionForm.receiptNumber,
        mpesaCode: contributionForm.mpesaCode,
        paymentDate: contributionForm.paymentDate || today,
        notes: contributionForm.notes,
      });
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to update contribution.");
      setMessage("Contribution updated and its linked finance record synchronized.");
      setEditingContribution(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update contribution.");
    } finally {
      setSaving(false);
    }
  };

  const saveTransaction = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const payload = {
        ...form,
        amount: Number(form.amount),
        transactionDate: form.transactionDate || today,
      };
      const response = editing
        ? await API.put(`/finance/${editing._id}`, payload)
        : await API.post("/finance", payload);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Unable to save transaction.");
      }

      setMessage(editing ? "Transaction updated." : "Transaction added.");
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save transaction.");
    } finally {
      setSaving(false);
    }
  };

  const runBulkPayroll = async (event) => {
    event.preventDefault();
    try {
      setBulkSaving(true);
      setError("");
      setMessage("");
      const response = await API.post("/contributions/bulk", {
        month: Number(bulkForm.month),
        year: Number(bulkForm.year),
        amount: Number(bulkForm.amount),
        paymentDate: bulkForm.paymentDate,
        recordAsCollected: Boolean(bulkForm.recordAsCollected),
        notes: bulkForm.notes,
      });
      if (!response.data?.success) throw new Error(response.data?.message || "Unable to complete payroll contribution run.");
      const run = response.data.run || {};
      setMessage(`${response.data.message || "Payroll contribution run completed."} Created: ${run.created || 0}, updated: ${run.updated || 0}, collected: ${run.collected || 0}, failed: ${run.failed || 0}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to complete payroll contribution run.");
    } finally {
      setBulkSaving(false);
    }
  };

  const payoutCommunity = async (campaign) => {
    if (!isSuperAdmin || !Number(campaign?.raisedAmount)) return;
    if (!await confirmAction(`Disburse ${number(campaign.raisedAmount)} to ${campaign.recipientMember?.fullName || "the registered recipient"}?`)) return;
    try {
      setCommunityBusy(`payout-${campaign._id}`);
      setError("");
      const { data } = await API.post(`/payments/community-assistance/${campaign._id}/payout`);
      if (!data?.success) throw new Error(data?.message || "Unable to submit community payout.");
      setMessage("Community payout submitted to M-PESA for processing. The final status will be updated by the callback.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to submit community payout.");
    } finally {
      setCommunityBusy("");
    }
  };

  const submitB2C = async (event) => {
    event.preventDefault();
    if (!isSuperAdmin) return;
    try {
      setB2cBusy(true); setError(""); setMessage("");
      const { data } = await API.post("/payments/b2c/disburse", { memberNumber: b2cForm.memberNumber.trim() || undefined, phoneNumber: b2cForm.phoneNumber.trim() || undefined, amount: Number(b2cForm.amount), occasion: b2cForm.occasion.trim() || "BENEVOLENT", remarks: b2cForm.remarks.trim() || undefined });
      if (!data?.success) throw new Error(data?.message || "Unable to submit B2C disbursement.");
      setMessage("B2C disbursement submitted to M-PESA. The final status will be updated by the Safaricom callback.");
      setB2cForm({ memberNumber: "", phoneNumber: "", amount: "", occasion: "BENEVOLENT", remarks: "" });
      await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to submit B2C disbursement."); }
    finally { setB2cBusy(false); }
  };

  const closeCommunity = async (campaign) => {
    if (!isSuperAdmin) return;
    if (!await confirmAction(`Close the M-PESA collection for “${campaign.title}”? No further member contributions will be accepted.`)) return;
    try {
      setCommunityBusy(`close-${campaign._id}`);
      setError("");
      const { data } = await API.post(`/payments/community-assistance/${campaign._id}/close`);
      if (!data?.success) throw new Error(data?.message || "Unable to close community request.");
      setMessage("Community M-PESA collection closed successfully.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to close community request.");
    } finally {
      setCommunityBusy("");
    }
  };

  const removeTransaction = async (transaction) => {
    if (!await confirmAction("Delete this transaction permanently?")) return;
    try {
      setSaving(true);
      await API.delete(`/finance/${transaction._id}`);
      setMessage("Transaction deleted.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to delete transaction.");
    } finally {
      setSaving(false);
    }
  };

  const toggleTransactionVisibility = async (transaction) => {
    if (!isSuperAdmin) return;
    const nextHidden = !Boolean(transaction.hidden);
    if (!await confirmAction(nextHidden ? "Hide this transaction from the community ledger?" : "Restore this transaction to the community ledger?")) return;
    try {
      setSaving(true);
      const { data } = await API.patch(`/finance/${transaction._id}/visibility`, { hidden: nextHidden });
      if (!data?.success) throw new Error(data?.message || "Unable to update transaction visibility.");
      setMessage(nextHidden ? "Transaction hidden from the community ledger." : "Transaction restored to the community ledger.");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update transaction visibility.");
    } finally {
      setSaving(false);
    }
  };

  const printLedger = () => {
    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) return;
    const rows = Array.isArray(ledger?.entries) ? ledger.entries : [];
    const totals = ledger?.totals || {};
    win.document.write(`
      <html><head><title>Benovelent Midax Ledger</title>${printHeadStyles()}</head><body>
      ${buildPrintHeadHtml({ title: `Benovelent Fund Ledger — ${ledger?.year || new Date().getFullYear()}`, subtitle: "Official scheme financial ledger." })}
      <p class="print-note">Credits: ${number(totals.credit)} • Debits: ${number(totals.debit)} • Balance: ${number(totals.balance)}</p>
      <table><thead><tr><th>Date</th><th>Benovelent MIDAX Number</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${date(row.transactionDate || row.createdAt)}</td><td>${escapeHtml(row.employeeNumber || "—")}</td><td>${escapeHtml(row.description || row.category || row.type || "—")}</td><td>${number(row.debit)}</td><td>${number(row.credit)}</td><td>${number(row.runningBalance)}</td></tr>`).join("")}
      <tr class="ledger-total-row"><td colspan="3">Totals</td><td>${number(totals.debit)}</td><td>${number(totals.credit)}</td><td>${number(totals.balance)}</td></tr>
      </tbody></table><script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header accounts-professional-header">
          <div><span>{isSuperAdmin ? "SUPERADMIN FINANCIAL CONTROL" : "ADMIN FINANCIAL CONTROL"}</span><h1>Accounts</h1><p>{isSuperAdmin ? "Full scheme financial oversight with M-PESA collection controls, community disbursement controls, ledger management and audit-friendly records." : "Professional scheme accounts view for contributions, approved transactions, support disbursements and the shared ledger."}</p></div>
          <div className="portal-actions"><span className="portal-badge"><ShieldCheck size={14} /> {isSuperAdmin ? "SuperAdmin authority" : "Admin access"}</span></div>
          <div className="portal-actions">
            <button type="button" className="portal-btn secondary" onClick={startCreate}><Plus size={16} /> New transaction</button>
            <button type="button" className="portal-btn secondary" onClick={printLedger} disabled={!ledger}><span>Print ledger</span></button>
            <button type="button" className="portal-btn" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
        </header>

        {message && <div className="portal-alert success">{message}</div>}
        {error && <div className="portal-alert">{error}</div>}

        <section className="portal-panel accounts-trust-panel">
          <div className="portal-module-header compact-header"><div><span>PAYMENT TRUST CENTRE</span><h2>M-PESA status & collection details</h2><p>Live configuration is read from the secure backend. Secrets are never displayed in the portal.</p></div></div>
          <div className="portal-stat-grid">
            <Stat label="STK status" value={mpesaConfig?.configured ? "Ready" : "Not configured"} />
            <Stat label="B2C payout status" value={mpesaConfig?.b2cConfigured ? "Ready" : "Not configured"} />
            <Stat label="Daraja shortcode" value={mpesaConfig?.shortCode || "650014"} />
            <Stat label="Manual account" value={mpesaConfig?.manualAccountNumber || "Not configured"} />
            <Stat label="Manual PayBill" value={mpesaConfig?.manualPaybill || "Not configured"} />
          </div>
          <div className={`portal-alert ${mpesaConfig?.configured ? "success" : ""}`}><strong>{mpesaConfig?.configured ? "STK Push is enabled on the backend." : "STK Push is not ready."}</strong> {mpesaConfig?.message || "Complete the production Daraja configuration before processing live payments."}</div>
        </section>

        {isSuperAdmin && <section className="portal-panel">
          <div className="portal-module-header compact-header"><div><span>SUPERADMIN B2C DISBURSEMENT</span><h2>Send funds to a specific M-PESA account</h2><p>Only SuperAdmin can submit a direct B2C payout. Use a member number to use the saved member M-PESA number, or enter a specific M-PESA account.</p></div><span className="portal-badge"><ShieldCheck size={14} /> SuperAdmin only</span></div>
          <form onSubmit={submitB2C} className="portal-form-grid">
            <label className="portal-field"><span>Member number (optional)</span><input value={b2cForm.memberNumber} onChange={(e) => setB2cForm({ ...b2cForm, memberNumber: e.target.value.toUpperCase() })} placeholder="BM001" /></label>
            <label className="portal-field"><span>M-PESA account</span><input value={b2cForm.phoneNumber} onChange={(e) => setB2cForm({ ...b2cForm, phoneNumber: e.target.value })} placeholder="0712345678 or 254712345678" /></label>
            <label className="portal-field"><span>Amount (KES)</span><input type="number" min="1" step="0.01" value={b2cForm.amount} onChange={(e) => setB2cForm({ ...b2cForm, amount: e.target.value })} required /></label>
            <label className="portal-field"><span>Occasion</span><input value={b2cForm.occasion} onChange={(e) => setB2cForm({ ...b2cForm, occasion: e.target.value })} maxLength={100} /></label>
            <label className="portal-field portal-field-wide"><span>Reason / remarks</span><textarea rows="3" value={b2cForm.remarks} onChange={(e) => setB2cForm({ ...b2cForm, remarks: e.target.value })} placeholder="Approved education, medical, funeral or other scheme disbursement" /></label>
            <div className="portal-actions"><button className="portal-btn primary" type="submit" disabled={b2cBusy || !mpesaConfig?.b2cConfigured}><WalletCards size={16} />{b2cBusy ? "Submitting…" : "Submit B2C disbursement"}</button><span className="portal-badge">Backend enforced: SuperAdmin only</span></div>
          </form>
          <div className="portal-table-wrap" style={{ marginTop: 18 }}><table className="portal-table"><thead><tr><th>Date</th><th>Recipient</th><th>Amount</th><th>Status</th><th>Receipt / conversation</th><th>Remarks</th></tr></thead><tbody>{b2cHistory.length === 0 ? <tr><td colSpan="6">No direct B2C disbursements recorded.</td></tr> : b2cHistory.map((x, i) => <tr key={x._id || i}><td>{date(x.createdAt)}</td><td>{x.member?.fullName || x.phoneNumber}</td><td>{number(x.amount)}</td><td><span className={`portal-badge ${x.status === "successful" ? "approved" : ""}`}>{x.status}</span></td><td>{x.transactionReceipt || x.conversationId || x.originatorConversationId || "Pending callback"}</td><td>{x.remarks || "—"}</td></tr>)}</tbody></table></div>
        </section>}

        <section className="portal-panel community-control-panel">
          <div className="portal-module-header compact-header"><div><span>COMMUNITY M-PESA CONTROL</span><h2>Collection requests</h2><p>Monitor every verified community collection. Only SuperAdmin can disburse collected funds or close a collection request.</p></div><span className="portal-badge"><LockKeyhole size={14} /> {isSuperAdmin ? "Controls enabled" : "Monitoring only"}</span></div>
          {community.length === 0 ? <div className="portal-empty">No community M-PESA requests have been created.</div> : <div className="portal-grid two">{community.map((campaign) => {
            const pct = Math.min(100, Math.round((Number(campaign.raisedAmount || 0) / Math.max(1, Number(campaign.targetAmount || 1))) * 100));
            const active = ["open", "target_reached"].includes(String(campaign.status));
            return <article className="portal-panel community-account-card" key={campaign._id}>
              <div className="claim-card-head"><div><span className="portal-badge">{campaign.referenceModel}</span><h3>{campaign.title}</h3><p>{campaign.recipientMember?.fullName || "Member"} · {campaign.recipientMember?.memberNumber || "—"}</p></div><span className={`portal-badge ${["paid","closed"].includes(campaign.status) ? "approved" : ""}`}>{campaign.status}</span></div>
              <p>{campaign.description}</p>
              <div className="portal-stat-grid compact"><Stat label="Target" value={number(campaign.targetAmount)} /><Stat label="Collected" value={number(campaign.raisedAmount)} /><Stat label="Progress" value={`${pct}%`} /></div>
              <div className="community-progress"><div className="community-progress-track"><span style={{ width: `${pct}%` }} /></div><div className="community-progress-meta"><span>{pct}% funded</span><span>{number(Math.max(0, Number(campaign.targetAmount || 0) - Number(campaign.raisedAmount || 0)))} remaining</span></div></div>
              <div className="portal-actions">
                {isSuperAdmin && Number(campaign.raisedAmount) > 0 && active && <button className="portal-btn primary" onClick={() => payoutCommunity(campaign)} disabled={communityBusy === `payout-${campaign._id}`}><WalletCards size={15} />{communityBusy === `payout-${campaign._id}` ? "Submitting…" : "Disburse collected funds"}</button>}
                {isSuperAdmin && active && <button className="portal-btn danger" onClick={() => closeCommunity(campaign)} disabled={communityBusy === `close-${campaign._id}`}><LockKeyhole size={15} />{communityBusy === `close-${campaign._id}` ? "Closing…" : "Close M-PESA request"}</button>}
                {!isSuperAdmin && <span className="portal-badge">SuperAdmin action required for disbursement / close</span>}
              </div>
            </article>;
          })}</div>}
        </section>

        <div className="portal-stat-grid">
          <Stat label="Total Income" value={number(first("totalIncome", "income", "totalContributions"))} />
          <Stat label="Total Expenses" value={number(first("totalExpenses", "expenses"))} />
          <Stat label="Balance" value={number(first("balance", "netBalance", "currentBalance"))} />
          <Stat label="Support Disbursed / Claims" value={number(first("totalClaims", "claims"))} />
        </div>

        <section className="portal-panel payroll-run-panel">
          <div className="portal-module-header">
            <div><span>PAYROLL CONTRIBUTION RUN</span><h2>Record the common deduction for all active members</h2><p>The Admin records one approved monthly amount for every active member. Re-running the same month updates the existing contribution records instead of creating duplicates.</p></div>
            <div className="portal-stat"><span>Model</span><strong>One amount</strong><small>shared by all members</small></div>
          </div>
          <form onSubmit={runBulkPayroll} className="portal-form-grid">
            <label className="portal-field"><span>Month</span><select value={bulkForm.month} onChange={(e) => setBulkForm({ ...bulkForm, month: e.target.value })}>{Array.from({length:12}, (_, i) => <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString("en-KE", { month: "long" })}</option>)}</select></label>
            <label className="portal-field"><span>Year</span><input type="number" min="2020" max="2100" value={bulkForm.year} onChange={(e) => setBulkForm({ ...bulkForm, year: e.target.value })} /></label>
            <label className="portal-field"><span>Standard deduction</span><input type="number" min="1" step="1" value={bulkForm.amount} onChange={(e) => setBulkForm({ ...bulkForm, amount: e.target.value })} required /></label>
            <label className="portal-field"><span>Payslip / payroll date</span><input type="date" value={bulkForm.paymentDate} onChange={(e) => setBulkForm({ ...bulkForm, paymentDate: e.target.value })} required /></label>
            <label className="portal-field portal-field-wide"><span>Notes</span><input type="text" value={bulkForm.notes} onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })} placeholder="Monthly payroll deduction" /></label>
            <label className="portal-check"><input type="checkbox" checked={bulkForm.recordAsCollected} onChange={(e) => setBulkForm({ ...bulkForm, recordAsCollected: e.target.checked })} /><span><strong>Mark as deducted / collected</strong><small>Creates a new monthly payroll event when none exists. An already-paid month is preserved and never overwritten by a repeat run.</small></span></label>
            <div className="portal-actions"><button className="portal-btn" type="submit" disabled={bulkSaving}><Layers3 size={16} /> {bulkSaving ? "Running payroll…" : "Run contribution for all active members"}</button><button type="button" className="portal-btn secondary" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh live figures</button></div>
          </form>
        </section>

        <section id="finance-editor" className="portal-panel">
          <h2>{editing ? "Edit Transaction" : "Add Transaction"}</h2>
          <form onSubmit={saveTransaction} className="portal-form-grid">
            <label className="portal-field"><span>Benovelent MIDAX Number</span><input type="text" autoComplete="off" value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} placeholder="Enter Benovelent MIDAX Number" inputMode="text" required={form.type === "contribution" || form.type === "claim" || form.type === "refund"} /></label>
            <label className="portal-field"><span>Date</span><input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required /></label>
            <label className="portal-field"><span>Type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="contribution">Contribution</option><option value="claim">Support / Claim</option><option value="expense">Expense</option><option value="income">Income</option><option value="refund">Refund</option><option value="withdrawal">Withdrawal</option><option value="adjustment">Adjustment</option></select></label>
            <label className="portal-field"><span>Category</span><input type="text" inputMode="text" autoComplete="off" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Salary, funeral support, etc." /></label>
            <label className="portal-field"><span>Amount</span><input type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label className="portal-field"><span>Payment Method</span><select value={form.paymentMethod || "M-PESA"} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="M-PESA">M-PESA</option><option value="Bank">Bank</option><option value="Cash">Cash</option><option value="Cheque">Cheque</option><option value="Payroll">Payroll / Payslip</option></select></label>
            <label className="portal-field"><span>Reference Number</span><input type="text" value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} /></label>
            <label className="portal-field"><span>Receipt Number</span><input type="text" value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} /></label>
            <label className="portal-field"><span>Description</span><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="portal-field"><span>Notes</span><textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <div className="portal-actions">
              <button className="portal-btn" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update transaction" : "Save transaction"}</button>
              {editing && <button type="button" className="portal-btn secondary" onClick={startCreate}>Cancel edit</button>}
            </div>
          </form>
        </section>


        <section className="portal-panel">
          <div className="portal-module-header"><div><span>DOUBLE-ENTRY STYLE VIEW</span><h2>Benovelent Fund Ledger</h2><p>Credits increase the fund balance; debits record support, expenses and withdrawals.</p></div></div>
          <div className="portal-stat-grid">
            <Stat label="Credits" value={number(ledger?.totals?.credit)} />
            <Stat label="Debits" value={number(ledger?.totals?.debit)} />
            <Stat label="Closing balance" value={number(ledger?.totals?.balance)} />
          </div>
          <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Benovelent MIDAX Number</th><th>Description</th><th>Debit</th><th>Credit</th><th>Running balance</th></tr></thead><tbody>
            {(ledger?.entries || []).map((x, i) => <tr key={x._id || i}><td>{date(x.transactionDate || x.createdAt)}</td><td>{x.employeeNumber || "—"}</td><td>{x.description || x.category || x.type || "—"}</td><td>{x.debit ? number(x.debit) : "—"}</td><td>{x.credit ? number(x.credit) : "—"}</td><td>{number(x.runningBalance)}</td></tr>)}
            {!ledger?.entries?.length && <tr><td colSpan="6" className="ledger-muted">No approved/completed transactions for this year.</td></tr>}
          </tbody></table></div>
        </section>

        {editingContribution && (
          <section id="finance-editor" className="portal-panel contribution-editor-panel">
            <div className="portal-module-header">
              <div><span>CONTRIBUTION EDITOR</span><h2>Edit contribution</h2><p>{editingContribution.member?.fullName || editingContribution.member?.memberNumber || "Member"} · {editingContribution.month || "—"}/{editingContribution.year || "—"}</p></div>
              <button type="button" className="portal-btn secondary" onClick={() => setEditingContribution(null)}>Cancel</button>
            </div>
            <form onSubmit={saveContribution} className="portal-form-grid">
              <label className="portal-field"><span>Expected amount</span><input type="number" min="0" step="0.01" value={contributionForm.expectedAmount} onChange={(e) => setContributionForm({ ...contributionForm, expectedAmount: e.target.value })} required /></label>
              <label className="portal-field"><span>Paid amount</span><input type="number" min="0" step="0.01" value={contributionForm.paidAmount} onChange={(e) => setContributionForm({ ...contributionForm, paidAmount: e.target.value })} required /></label>
              <label className="portal-field"><span>Payment method</span><select value={contributionForm.paymentMethod} onChange={(e) => setContributionForm({ ...contributionForm, paymentMethod: e.target.value })}><option>M-PESA</option><option>Bank</option><option>Cash</option><option>Cheque</option><option>Payroll</option></select></label>
              <label className="portal-field"><span>Payment date</span><input type="date" value={contributionForm.paymentDate} onChange={(e) => setContributionForm({ ...contributionForm, paymentDate: e.target.value })} /></label>
              <label className="portal-field"><span>Receipt number</span><input type="text" value={contributionForm.receiptNumber} onChange={(e) => setContributionForm({ ...contributionForm, receiptNumber: e.target.value })} /></label>
              <label className="portal-field"><span>M-PESA / reference code</span><input type="text" value={contributionForm.mpesaCode} onChange={(e) => setContributionForm({ ...contributionForm, mpesaCode: e.target.value })} /></label>
              <label className="portal-field portal-field-wide"><span>Notes</span><textarea rows="3" value={contributionForm.notes} onChange={(e) => setContributionForm({ ...contributionForm, notes: e.target.value })} /></label>
              <div className="portal-actions"><button className="portal-btn" disabled={saving} type="submit">{saving ? "Saving..." : "Update contribution"}</button></div>
            </form>
          </section>
        )}

        <section className="portal-panel">
          <h2>Recent Transactions</h2>
          {sortedTransactions.length === 0 ? <div className="portal-empty">No finance transactions returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {sortedTransactions.slice(0, 30).map((x, i) => <tr key={x._id || i}><td>{date(x.transactionDate || x.createdAt)}</td><td>{x.type || "—"}</td><td>{x.description || x.reference || "—"}</td><td>{number(x.amount)}</td><td><span className="portal-badge">{x.status || "Recorded"}</span></td><td><div className="portal-actions"><button type="button" className="portal-btn secondary" onClick={() => startEdit(x)}><Edit3 size={14} /> Edit</button>{isSuperAdmin && <button type="button" className="portal-btn secondary" onClick={() => toggleTransactionVisibility(x)}>{x.hidden ? "Show" : "Hide"}</button>}<button type="button" className="portal-btn danger" onClick={() => removeTransaction(x)}><Trash2 size={14} /> Delete</button></div></td></tr>)}
            </tbody></table></div>}
        </section>

        <section className="portal-panel">
          <div className="portal-module-header"><div><span>PAYROLL RECORDS</span><h2>Contributions</h2><p>These records are generated from the scheme-wide payroll contribution process.</p></div><div className="portal-stat"><span>Member count</span><strong>{sortedContributions.length ? new Set(sortedContributions.map((x) => String(x.member?._id || x.member?.memberNumber || x.member))).size : 0}</strong><small>records shown</small></div></div>
          {sortedContributions.length === 0 ? <div className="portal-empty">No contribution records returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Member</th><th>Period</th><th>Expected</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {sortedContributions.slice(0, 30).map((x, i) => <tr key={x._id || i}><td>{date(x.paymentDate || x.createdAt)}</td><td>{x.member?.fullName || x.member?.memberNumber || "Member"}</td><td>{x.month || "—"} {x.year || ""}</td><td>{number(x.expectedAmount)}</td><td>{number(x.paidAmount)}</td><td><span className="portal-badge">{x.status || "Recorded"}</span></td><td><button type="button" className="portal-btn secondary" onClick={() => startEditContribution(x)}><Edit3 size={14} /> Edit</button></td></tr>)}
            </tbody></table></div>}
        </section>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }) { return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>; }
function date(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB"); }

function escapeHtml(input) {
  return String(input ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
