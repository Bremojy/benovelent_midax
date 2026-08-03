
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

const EMPTY_FORM = {
  member: "",
  type: "contribution",
  category: "",
  amount: "",
  description: "",
  paymentMethod: "",
  referenceNumber: "",
  receiptNumber: "",
  notes: "",
};

export default function AdminFinance() {
  const [summary, setSummary] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [contributions, setContributions] = useState([]);
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
      const [s, t, c] = await Promise.all([
        API.get("/finance/summary/dashboard"),
        API.get("/finance"),
        API.get("/contributions"),
      ]);
      setSummary(s.data?.summary || s.data || {});
      setTransactions(Array.isArray(t.data?.transactions) ? t.data.transactions : []);
      setContributions(Array.isArray(c.data?.contributions) ? c.data.contributions : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load finance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const number = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
  const first = (...keys) => { for (const key of keys) if (summary?.[key] !== undefined) return summary[key]; return 0; };

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (transaction) => {
    setEditing(transaction);
    setForm({
      member: transaction?.member?._id || transaction.member || "",
      type: transaction?.type || "contribution",
      category: transaction?.category || "",
      amount: transaction?.amount || "",
      description: transaction?.description || "",
      paymentMethod: transaction?.paymentMethod || "",
      referenceNumber: transaction?.referenceNumber || "",
      receiptNumber: transaction?.receiptNumber || "",
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

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div><span>FINANCIAL CONTROL</span><h1>Finance</h1><p>Monitor contributions, transactions and the Benevolent Midax financial position.</p></div>
          <div className="portal-actions">
            <button className="portal-btn secondary" onClick={startCreate}><Plus size={16} /> New transaction</button>
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
            <label className="portal-field"><span>Member ID</span><input value={form.member} onChange={(e) => setForm({ ...form, member: e.target.value })} placeholder="Member ObjectId" required /></label>
            <label className="portal-field"><span>Type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="contribution">Contribution</option><option value="support">Support</option><option value="expense">Expense</option><option value="income">Income</option></select></label>
            <label className="portal-field"><span>Category</span><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Salary, funeral support, etc." /></label>
            <label className="portal-field"><span>Amount</span><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
            <label className="portal-field"><span>Payment Method</span><input value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} /></label>
            <label className="portal-field"><span>Reference Number</span><input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} /></label>
            <label className="portal-field"><span>Receipt Number</span><input value={form.receiptNumber} onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })} /></label>
            <label className="portal-field"><span>Description</span><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label className="portal-field"><span>Notes</span><textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
            <div className="portal-actions">
              <button className="portal-btn" disabled={saving} type="submit">{saving ? "Saving..." : editing ? "Update transaction" : "Save transaction"}</button>
              {editing && <button type="button" className="portal-btn secondary" onClick={startCreate}>Cancel edit</button>}
            </div>
          </form>
        </section>

        <section className="portal-panel">
          <h2>Recent Transactions</h2>
          {transactions.length === 0 ? <div className="portal-empty">No finance transactions returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {transactions.slice(0, 30).map((x, i) => <tr key={x._id || i}><td>{date(x.date || x.createdAt)}</td><td>{x.type || "—"}</td><td>{x.description || x.reference || "—"}</td><td>{number(x.amount)}</td><td><span className="portal-badge">{x.status || "Recorded"}</span></td><td><div className="portal-actions"><button className="portal-btn secondary" onClick={() => startEdit(x)}><Edit3 size={14} /> Edit</button><button className="portal-btn danger" onClick={() => removeTransaction(x)}><Trash2 size={14} /> Delete</button></div></td></tr>)}
            </tbody></table></div>}
        </section>

        <section className="portal-panel">
          <h2>Contributions</h2>
          {contributions.length === 0 ? <div className="portal-empty">No contribution records returned.</div> :
            <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Member</th><th>Period</th><th>Expected</th><th>Paid</th><th>Status</th></tr></thead><tbody>
              {contributions.slice(0, 30).map((x, i) => <tr key={x._id || i}><td>{x.member?.fullName || x.member?.memberNumber || "Member"}</td><td>{x.month || "—"} {x.year || ""}</td><td>{number(x.expectedAmount)}</td><td>{number(x.paidAmount)}</td><td><span className="portal-badge">{x.status || "Recorded"}</span></td></tr>)}
            </tbody></table></div>}
        </section>
      </div>
    </DashboardLayout>
  );
}
function Stat({ label, value }) { return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>; }
function date(v) { const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB"); }
