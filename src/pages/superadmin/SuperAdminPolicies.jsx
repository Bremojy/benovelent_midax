import { confirmAction } from "../../utils/modernDialog";
import { useEffect, useState } from "react";
import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

const blank = { name: "", category: "support", description: "", enabled: true, minAmount: 0, maxAmount: 0, interestRate: 0, repaymentEnabled: false, repaymentMonths: 12, communityAssistanceEnabled: false, applicationPath: "/member/support", order: 0 };
const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));

export default function SuperAdminPolicies() {
  const [policies, setPolicies] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try { setError(""); const { data } = await API.get("/policies/admin"); setPolicies(data?.policies || []); }
    catch (err) { setError(err.response?.data?.message || err.message || "Unable to load policies."); }
  };
  useEffect(() => { load(); }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true); setError(""); setMessage("");
      const request = editing ? API.put(`/policies/${editing}`, form) : API.post("/policies", form);
      const { data } = await request;
      setPolicies((current) => editing ? current.map((item) => item._id === editing ? data.policy : item) : [data.policy, ...current]);
      setForm(blank); setEditing(null); setMessage(editing ? "Policy updated everywhere.":"Policy created and published to eligible policy pages.");
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to save policy."); }
    finally { setBusy(false); }
  };
  const edit = (policy) => { setEditing(policy._id); setForm({ ...blank, ...policy }); setMessage(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const remove = async (id) => {
    if (!await confirmAction("Delete this policy? Existing records are retained, but the policy will no longer be available for new applications.")) return;
    try { setBusy(true); await API.delete(`/policies/${id}`); setPolicies((current) => current.filter((item) => item._id !== id)); setMessage("Policy deleted."); }
    catch (err) { setError(err.response?.data?.message || err.message || "Unable to delete policy."); }
    finally { setBusy(false); }
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header"><div><span>POLICY MANAGEMENT</span><h1>Policies</h1><p>SuperAdmin controls the live support and loan policies used across member and public pages.</p></div><button className="portal-btn" onClick={() => { setEditing(null); setForm(blank); }}><Plus size={17}/> New policy</button></header>
        {error && <div className="portal-alert">{error}</div>}{message && <div className="portal-alert success">{message}</div>}
        <section className="portal-panel">
          <form className="portal-grid two" onSubmit={submit}>
            <Field label="Policy name"><input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Education Policy" /></Field>
            <Field label="Category"><select value={form.category} onChange={(e) => set("category", e.target.value)}><option value="support">Support</option><option value="loan">Loan</option><option value="contribution">Contribution</option><option value="custom">Custom</option></select></Field>
            <Field label="Description"><textarea rows="4" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this policy provides..." /></Field>
            <Field label="Application page"><input value={form.applicationPath} onChange={(e) => set("applicationPath", e.target.value)} placeholder="/member/support" /></Field>
            <Field label="Minimum amount"><input type="number" min="0" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} /></Field>
            <Field label="Maximum amount"><input type="number" min="0" value={form.maxAmount} onChange={(e) => set("maxAmount", e.target.value)} /></Field>
            <Field label="Interest rate (%)"><input type="number" min="0" step="0.01" value={form.interestRate} onChange={(e) => set("interestRate", e.target.value)} /></Field>
            <Field label="Repayment months"><input type="number" min="1" value={form.repaymentMonths} onChange={(e) => set("repaymentMonths", e.target.value)} /></Field>
            <Field label="Display order"><input type="number" value={form.order} onChange={(e) => set("order", e.target.value)} /></Field>
            <div className="portal-panel" style={{ margin: 0 }}><label><input type="checkbox" checked={Boolean(form.enabled)} onChange={(e) => set("enabled", e.target.checked)} /> Enabled for members</label><label><input type="checkbox" checked={Boolean(form.repaymentEnabled)} onChange={(e) => set("repaymentEnabled", e.target.checked)} /> Has repayment/loan rules</label><label><input type="checkbox" checked={Boolean(form.communityAssistanceEnabled)} onChange={(e) => set("communityAssistanceEnabled", e.target.checked)} /> Allows community assistance after decline</label></div>
            <div className="portal-actions" style={{ gridColumn: "1 / -1" }}><button className="portal-btn" type="submit" disabled={busy}><Save size={17}/>{busy ? "Saving…" : editing ? "Update policy" : "Create policy"}</button>{editing && <button className="portal-btn secondary" type="button" onClick={() => { setEditing(null); setForm(blank); }}><X size={17}/>Cancel</button>}</div>
          </form>
        </section>
        <section className="portal-panel"><h2>Live policies</h2><div className="portal-grid two">{policies.map((policy) => <article className="portal-panel" key={policy._id} style={{ margin: 0 }}><div style={{ display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start" }}><div><span className="portal-badge">{policy.category}</span><h3>{policy.name}</h3><p>{policy.description || "No description."}</p></div><span className={`portal-badge ${policy.enabled ? "approved" : "rejected"}`}>{policy.enabled ? "Active" : "Disabled"}</span></div><div className="portal-stat-grid"><div className="portal-stat"><span>Limit</span><strong>{policy.maxAmount ? money(policy.maxAmount) : "No fixed limit"}</strong></div><div className="portal-stat"><span>Repayment</span><strong>{policy.repaymentEnabled ? `${policy.interestRate || 0}% / ${policy.repaymentMonths || 12} mo` : "No"}</strong></div></div><div className="portal-actions"><button className="portal-btn secondary" onClick={() => edit(policy)}><Edit3 size={16}/>Edit</button><button className="portal-btn danger" onClick={() => remove(policy._id)} disabled={busy}><Trash2 size={16}/>Delete</button></div></article>)}</div></section>
      </div>
    </DashboardLayout>
  );
}
function Field({ label, children }) { return <label style={{ display:"grid", gap:7, fontWeight:800, color:"#27303a", fontSize:13 }}>{label}{children}</label>; }
