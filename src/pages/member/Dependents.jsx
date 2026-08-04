import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "./Support.css";

const empty = { fullName: "", relationship: "", gender: "", dateOfBirth: "", nationalId: "", phone: "", school: "", admissionNumber: "", educationLevel: "", occupation: "", county: "", address: "" };

export default function Dependents() {
  const [dependents, setDependents] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await API.get("/dependents/my");
      if (!data?.success) throw new Error(data?.message || "Unable to load dependents.");
      setDependents(data.dependents || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load dependents.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.fullName || !form.relationship || !form.gender || !form.dateOfBirth) {
      setError("Full name, relationship and date of birth are required.");
      return;
    }
    try {
      setSaving(true);
      const { data } = editing
        ? await API.put(`/dependents/${editing._id}`, form)
        : await API.post("/dependents", form);
      if (!data?.success) throw new Error(data?.message || "Unable to save dependent.");
      setSuccess(editing ? "Dependent updated successfully." : "Dependent added successfully.");
      setEditing(null); setForm(empty); await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save dependent.");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this dependent from your active list?")) return;
    try {
      const { data } = await API.delete(`/dependents/${id}`);
      if (!data?.success) throw new Error(data?.message || "Unable to remove dependent.");
      await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to remove dependent."); }
  };

  const edit = (d) => {
    setEditing(d);
    setForm({ ...empty, ...d, dateOfBirth: d.dateOfBirth ? String(d.dateOfBirth).slice(0,10) : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <DashboardLayout>
      <div className="member-support-page">
        <section className="member-page-header">
          <span>MEMBER RECORDS</span>
          <h1>Dependents</h1>
          <p>Keep the people covered by your Benevolent Midax membership up to date.</p>
        </section>

        {error && <div className="support-alert error">{error}</div>}
        {success && <div className="support-alert success">{success}</div>}

        <div className="support-layout">
          <section className="support-form-card">
            <div className="support-section-heading"><span>{editing ? "EDIT RECORD" : "NEW RECORD"}</span><h2>{editing ? "Update Dependent" : "Add Dependent"}</h2></div>
            <form onSubmit={submit}>
              <Field label="Full Name"><input value={form.fullName} onChange={(e)=>set("fullName",e.target.value)} required /></Field>
              <div className="support-two-col">
                <Field label="Relationship"><select value={form.relationship} onChange={(e)=>set("relationship",e.target.value)} required><option value="">Select</option>{["Spouse","Son","Daughter","Father","Mother","Brother","Sister","Guardian","Other"].map(x=><option key={x}>{x}</option>)}</select></Field>
                <Field label="Gender"><select value={form.gender} onChange={(e)=>set("gender",e.target.value)} required><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
              </div>
              <div className="support-two-col">
                <Field label="Date of Birth"><input type="date" value={form.dateOfBirth} onChange={(e)=>set("dateOfBirth",e.target.value)} required /></Field>
                <Field label="Phone"><input value={form.phone} onChange={(e)=>set("phone",e.target.value)} /></Field>
              </div>
              <div className="support-two-col">
                <Field label="National ID"><input value={form.nationalId} onChange={(e)=>set("nationalId",e.target.value)} /></Field>
                <Field label="County"><input value={form.county} onChange={(e)=>set("county",e.target.value)} /></Field>
              </div>
              <Field label="School / Institution"><input value={form.school} onChange={(e)=>set("school",e.target.value)} /></Field>
              <div className="support-two-col">
                <Field label="Admission Number"><input value={form.admissionNumber} onChange={(e)=>set("admissionNumber",e.target.value)} /></Field>
                <Field label="Education Level"><select value={form.educationLevel} onChange={(e)=>set("educationLevel",e.target.value)}><option value="">Select</option>{["Primary","Junior Secondary","Secondary","College","University","TVET","Other"].map(x=><option key={x}>{x}</option>)}</select></Field>
              </div>
              <Field label="Address"><input value={form.address} onChange={(e)=>set("address",e.target.value)} /></Field>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <button className="support-submit-button" type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Update Dependent" : "Add Dependent"}</button>
                {editing && <button type="button" className="support-cancel-button" onClick={()=>{setEditing(null);setForm(empty);}}>Cancel</button>}
              </div>
            </form>
          </section>

          <section className="support-history-card">
            <div className="support-section-heading"><span>MY FAMILY RECORDS</span><h2>Active Dependents</h2></div>
            {loading ? <div className="support-loading">Loading dependents...</div> :
              dependents.length === 0 ? <div className="support-empty"><h3>No dependents added</h3><p>Add a dependent so support applications can reference them.</p></div> :
              <div className="support-list">{dependents.map(d => (
                <div className="support-item" key={d._id}>
                  <div><strong>{d.fullName}</strong><span>{d.relationship} {d.verified ? "• Verified" : "• Pending verification"}</span></div>
                  <div className="support-item-right"><button className="support-mini-button" onClick={()=>edit(d)}>Edit</button><button className="support-mini-button danger" onClick={()=>remove(d._id)}>Remove</button></div>
                </div>
              ))}</div>}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
function Field({label,children}) { return <div className="support-field"><label>{label}</label>{children}</div>; }
