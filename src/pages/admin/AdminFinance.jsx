import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Trash2 } from "lucide-react";
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

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [s, t, c, l] = await Promise.all([
        API.get("/finance/summary/dashboard"),
        API.get("/finance"),
        API.get("/contributions"),
        API.get(`/finance/ledger?year=${new Date().getFullYear()}`),
      ]);
      setSummary(s.data?.summary || s.data || {});
      setTransactions(Array.isArray(t.data?.transactions) ? t.data.transactions : []);
      setContributions(Array.isArray(c.data?.contributions) ? c.data.contributions : []);
      setLedger(l.data || null);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load finance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
    setForm(EMPTY_FORM);
  };

  const startEdit = (transaction) => {
    setEditing(transaction);
    setForm({
      employeeNumber: transaction?.member?.memberNumber || transaction.employeeNumber || "",
      type: transaction?.type || "contribution",
      category: transaction?.category || "",
      amount: transaction?.amount || "",
      description: transaction?.description || "",
      paymentMethod: transaction?.paymentMethod || "",
      referenceNumber: transaction?.referenceNumber || "",
      receiptNumber: transaction?.receiptNumber || "",
      transactionDate: transaction?.transactionDate ? new Date(transaction.transactionDate).toISOString().slice(0, 10) : today,
      notes: transaction?.notes || "",
    });
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

  const removeTransaction = async (transaction) => {
    if (!window.confirm("Delete this transaction?")) return;
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

  const printLedger = () => {
    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) return;
    const rows = Array.isArray(ledger?.entries) ? ledger.entries : [];
    const totals = ledger?.totals || {};
    win.document.write(`
      <html><head><title>Benovelent Midax Ledger</title>${printHeadStyles()}</head><body>
      ${buildPrintHeadHtml({ title: `Benovelent Fund Ledger — ${ledger?.year || new Date().getFullYear()}`, subtitle: "Official scheme financial ledger." })}
      <p class="print-note">Credits: ${number(totals.credit)} • Debits: ${number(totals.debit)} • Balance: ${number(totals.balance)}</p>
      <table><thead><tr><th>Date</th><th>Employee number</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${date(row.transactionDate || row.createdAt)}</td><td>${escapeHtml(row.employeeNumber || "—")}</td><td>${escapeHtml(row.description || row.category || row.type || "—")}</td><td>${number(row.debit)}</td><td>${number(row.credit)}</td><td>${number(row.runningBalance)}</td></tr>`).join("")}
      <tr class="ledger-total-row"><td colspan="3">Totals</td><td>${number(totals.debit)}</td><td>${number(totals.credit)}</td><td>${number(totals.balance)}</td></tr>
      </tbody></table><script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div><span>FINANCIAL CONTROL</span><h1>Accounts</h1><p>Monitor contributions, transactions and the Benovelent Midax financial position.</p></div>
          <div className="portal-actions">
            <button className="portal-btn secondary" onClick={startCreate}><Plus size={16} /> New transaction</button>
            <button className="portal-btn secondary" onClick={printLedger} disabled={!ledger}><span>Print ledger</span></button>
            <button className="portal-btn" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
        </header>

        {message && <div className="portal-alert success">{message}</div>}
        {error && <div className="portal-alert">{error}</div>}

        <div className="portal-stat-grid">
          <Stat label="Total Income" value={number(first("totalIncome", "income", "totalContributions"))} />
          <Stat label="Total Expenses" value={number(first("totalExpenses", "expenses"))} />
          <Stat label="Balance" value={number(first("balance", "netBalance", "currentBalance"))} />
          <Stat label="Support Disbursed / Claims" value={number(first("totalClaims", "claims"))} />
        </div>

        <section className="portal-panel">
          <h2>{editing ? "Edit Transaction" : "Add Transaction"}</h2>
          <form onSubmit={saveTransaction} className="portal-form-grid">
            <label className="portal-field"><span>Employee number</span><input type="text" autoComplete="off" value={form.employeeNumber} onChange={(e) => setForm({ ...form, employeeNumber: e.target.value })} placeholder="Enter employee number" inputMode="text" required={form.type === "contribution" || form.type === "claim" || form.type === "refund"} /></label>
            <label className="portal-field"><span>Date</span><input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })} required /></label>
            <label className="portal-field"><span>Type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="contribution">Contribution</option><option value="claim">Support / Claim</option><option value="expense">Expense</option><option value="income">Income</option></select></label>
            <label className="portal-field"><span>Category</span><input type="text" inputMode="text" autoComplete="off" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Salary, funeral support, etc." /></label>
            <label className="portal-field"><span>Amount</span><input type="number" inputMode="decimal" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label className="portal-field"><span>Payment Method</span><select value={form.paymentMethod || "M-PESA"} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="M-PESA">M-PESA</option><option value="Bank">Bank</option><option value="Cash">Cash</option><option value="Cheque">Cheque</option></select></label>
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
          <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Employee number</th><th>Description</th><th>Debit</th><th>Credit</th><th>Running balance</th></tr></thead><tbody>
            {(ledger?.entries || []).map((x, i) => <tr key={x._id || i}><td>{date(x.transactionDate || x.createdAt)}</td><td>{x.employeeNumber || "—"}</td><td>{x.description || x.category || x.type || "—"}</td><td>{x.debit ? number(x.debit) : "—"}</td><td>{x.credit ? number(x.credit) : "—"}</td><td>{number(x.runningBalance)}</td></tr>)}
            {!ledger?.entries?.length && <tr><td colSpan="6" className="ledger-muted">No approved/completed transactions for this year.</td></tr>}
          </tbody></table></div>
        </section>

        <section className="portal-panel">
          <h2>Recent Transactions</h2>
          {sortedTransactions.length === 0 ? <div className="portal-empty">No finance transactions returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {sortedTransactions.slice(0, 30).map((x, i) => <tr key={x._id || i}><td>{date(x.transactionDate || x.createdAt)}</td><td>{x.type || "—"}</td><td>{x.description || x.reference || "—"}</td><td>{number(x.amount)}</td><td><span className="portal-badge">{x.status || "Recorded"}</span></td><td><div className="portal-actions"><button className="portal-btn secondary" onClick={() => startEdit(x)}><Edit3 size={14} /> Edit</button><button className="portal-btn danger" onClick={() => removeTransaction(x)}><Trash2 size={14} /> Delete</button></div></td></tr>)}
            </tbody></table></div>}
        </section>

        <section className="portal-panel">
          <h2>Contributions</h2>
          {sortedContributions.length === 0 ? <div className="portal-empty">No contribution records returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Member</th><th>Period</th><th>Expected</th><th>Paid</th><th>Status</th></tr></thead><tbody>
              {sortedContributions.slice(0, 30).map((x, i) => <tr key={x._id || i}><td>{date(x.paymentDate || x.createdAt)}</td><td>{x.member?.fullName || x.member?.memberNumber || "Member"}</td><td>{x.month || "—"} {x.year || ""}</td><td>{number(x.expectedAmount)}</td><td>{number(x.paidAmount)}</td><td><span className="portal-badge">{x.status || "Recorded"}</span></td></tr>)}
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
