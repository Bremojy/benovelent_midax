import { useEffect, useState } from "react";
import { confirmAction } from "../../utils/modernDialog";
import API, { resolveUploadUrl } from "../../services/api";

const editFields = [
  ["fullName", "Full Name", "text"], ["relationship", "Relationship", "select"], ["gender", "Gender", "gender"],
  ["dateOfBirth", "Date of Birth", "date"], ["nationalId", "National ID", "text"], ["phone", "Phone", "tel"],
  ["email", "Email", "email"], ["county", "County", "text"], ["address", "Address", "text"],
];
const relationshipOptions = ["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Guardian", "Other"];
const docTypes = [["dependent-id-front", "Dependent ID — Front"], ["dependent-id-back", "Dependent ID — Back"], ["birth-certificate", "Birth Certificate"], ["supporting-document", "Supporting Document"], ["profile-photo", "Profile Photo"], ["other", "Other"]];

export default function DependentManagementPanel({ member }) {
  const [dependents, setDependents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [docType, setDocType] = useState("dependent-id");
  const [docFiles, setDocFiles] = useState({});

  const load = async () => {
    if (!member?._id) return;
    try {
      setLoading(true); setError("");
      const [depRes, reqRes] = await Promise.all([
        API.get(`/dependents/admin/member/${member._id}`),
        API.get(`/dependents/edit-requests/admin?memberId=${member._id}`),
      ]);
      if (!depRes.data?.success) throw new Error(depRes.data?.message || "Unable to load dependents.");
      if (!reqRes.data?.success) throw new Error(reqRes.data?.message || "Unable to load dependent edit requests.");
      setDependents(Array.isArray(depRes.data.dependents) ? depRes.data.dependents : []);
      setRequests(Array.isArray(reqRes.data.requests) ? reqRes.data.requests : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load dependent records.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [member?._id]);

  const beginEdit = (dependent) => {
    setEditing(dependent._id);
    setEditForm({ fullName: dependent.fullName || "", relationship: dependent.relationship || "", gender: dependent.gender || "", dateOfBirth: dependent.dateOfBirth ? String(dependent.dateOfBirth).slice(0, 10) : "", nationalId: dependent.nationalId || "", phone: dependent.phone || "", email: dependent.email || "", county: dependent.county || "", address: dependent.address || "" });
  };
  const update = async (e) => {
    e.preventDefault();
    try {
      setBusy(`edit:${editing}`); setError("");
      const { data } = await API.put(`/dependents/${editing}`, editForm);
      if (!data?.success) throw new Error(data?.message || "Unable to update dependent.");
      setEditing(null); await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to update dependent."); }
    finally { setBusy(""); }
  };
  const archive = async (dependent) => {
    if (!await confirmAction(`Archive ${dependent.fullName} from the active dependent list?`)) return;
    try {
      setBusy(`delete:${dependent._id}`); setError("");
      const { data } = await API.delete(`/dependents/${dependent._id}`);
      if (!data?.success) throw new Error(data?.message || "Unable to archive dependent.");
      await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to archive dependent."); }
    finally { setBusy(""); }
  };
  const verify = async (id) => {
    try {
      setBusy(`verify:${id}`); setError("");
      const { data } = await API.put(`/dependents/${id}/verify`);
      if (!data?.success) throw new Error(data?.message || "Unable to verify dependent.");
      await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to verify dependent."); }
    finally { setBusy(""); }
  };
  const upload = async (id) => {
    const files = Array.from(docFiles[id] || []);
    if (!files.length) { setError("Choose at least one document first."); return; }
    try {
      setBusy(`upload:${id}`); setError("");
      const fd = new FormData(); fd.append("documentType", docType); files.forEach((file) => fd.append("documents", file));
      const { data } = await API.post(`/dependents/${id}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (!data?.success) throw new Error(data?.message || "Unable to upload documents.");
      setDocFiles((old) => ({ ...old, [id]: [] })); await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to upload documents."); }
    finally { setBusy(""); }
  };
  const verifyDoc = async (dependentId, documentId, status) => {
    try {
      setBusy(`doc:${documentId}`); setError("");
      const { data } = await API.patch(`/dependents/${dependentId}/documents/${documentId}/verify`, { status });
      if (!data?.success) throw new Error(data?.message || "Unable to update document verification.");
      await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to update document verification."); }
    finally { setBusy(""); }
  };
  const review = async (requestId, decision) => {
    try {
      setBusy(`request:${requestId}`); setError("");
      const { data } = await API.post(`/dependents/edit-requests/${requestId}/review`, { decision });
      if (!data?.success) throw new Error(data?.message || "Unable to review edit request.");
      await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to review edit request."); }
    finally { setBusy(""); }
  };

  return <section className="admin-member-dependent-panel" style={{ marginTop: 20, padding: 18, border: "1px solid rgba(15,23,42,.08)", borderRadius: 16 }}>
    <div style={{ marginBottom: 14 }}><span style={{ fontSize: 11, letterSpacing: ".14em", fontWeight: 700, opacity: .65 }}>DEPENDENTS & DOCUMENTS</span><h3 style={{ margin: "5px 0 4px" }}>Managed Family Records</h3><p style={{ margin: 0, opacity: .7 }}>Review dependent information, verify documents, and action member edit requests.</p></div>
    {error && <div className="support-alert error" style={{ marginBottom: 12 }}>{error}</div>}
    {loading ? <p>Loading dependent records…</p> : !dependents.length ? <p style={{ opacity: .7 }}>No active dependents are recorded for this member.</p> : <div style={{ display: "grid", gap: 14 }}>
      {dependents.map((d) => <article key={d._id} style={{ padding: 14, borderRadius: 14, background: "rgba(15,23,42,.035)" }}>
        {editing === d._id ? <form onSubmit={update} style={{ display: "grid", gap: 10 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 }}>{editFields.map(([key, label, type]) => <label key={key}><span style={{ display: "block", fontSize: 12, marginBottom: 4 }}>{label}</span>{type === "select" ? <select value={editForm[key] || ""} onChange={(e)=>setEditForm((f)=>({...f,[key]:e.target.value}))}><option value="">Select</option>{relationshipOptions.map((x)=><option key={x}>{x}</option>)}</select> : type === "gender" ? <select value={editForm[key] || ""} onChange={(e)=>setEditForm((f)=>({...f,[key]:e.target.value}))}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select> : <input type={type} value={editForm[key] || ""} onChange={(e)=>setEditForm((f)=>({...f,[key]:e.target.value}))} />}</label>)}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="submit" className="support-mini-button" disabled={busy===`edit:${d._id}`}>{busy===`edit:${d._id}` ? "Saving…" : "Save Managed Changes"}</button><button type="button" className="support-mini-button" onClick={()=>setEditing(null)}>Cancel</button></div></form> : <>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}><div><strong>{d.fullName}</strong><div style={{ opacity: .72, marginTop: 3 }}>{d.relationship} • {d.gender} • {d.verified ? "Verified" : "Pending verification"}</div></div><div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}><button type="button" className="support-mini-button" onClick={()=>beginEdit(d)}>Edit</button>{!d.verified && <button type="button" className="support-mini-button" disabled={busy===`verify:${d._id}`} onClick={()=>verify(d._id)}>{busy===`verify:${d._id}` ? "Verifying…" : "Verify"}</button>}<button type="button" className="support-mini-button danger" disabled={busy===`delete:${d._id}`} onClick={()=>archive(d)}>{busy===`delete:${d._id}` ? "Archiving…" : "Archive"}</button></div></div>
          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>{d.documents?.length ? d.documents.map((doc)=><div key={doc._id} style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}><a href={resolveUploadUrl(doc.url)} target="_blank" rel="noreferrer"><strong>{doc.filename || doc.documentType}</strong></a><span style={{ opacity: .72 }}>{doc.verificationStatus || "pending"}</span><div style={{ display: "flex", gap: 5 }}><button type="button" className="support-mini-button" disabled={busy===`doc:${doc._id}`} onClick={()=>verifyDoc(d._id, doc._id, "verified")}>Verify</button><button type="button" className="support-mini-button" disabled={busy===`doc:${doc._id}`} onClick={()=>verifyDoc(d._id, doc._id, "rejected")}>Reject</button></div></div>) : <span style={{ opacity: .65 }}>No documents uploaded.</span>}</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "180px 1fr auto", gap: 8, alignItems: "end" }}><label><span style={{ display:"block",fontSize:12,marginBottom:4 }}>Document type</span><select value={docType} onChange={(e)=>setDocType(e.target.value)}>{docTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label><span style={{ display:"block",fontSize:12,marginBottom:4 }}>Choose file(s)</span><input type="file" multiple onChange={(e)=>setDocFiles((old)=>({...old,[d._id]:Array.from(e.target.files || [])}))} /></label><button type="button" className="support-mini-button" disabled={busy===`upload:${d._id}`} onClick={()=>upload(d._id)}>{busy===`upload:${d._id}` ? "Uploading…" : "Upload"}</button></div>
        </>}
      </article>)}
    </div>}
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(15,23,42,.08)" }}><span style={{ fontSize: 11, letterSpacing: ".14em", fontWeight: 700, opacity: .65 }}>EDIT REQUESTS</span><h3 style={{ margin: "5px 0 10px" }}>Member Requests</h3>{requests.length ? <div style={{ display: "grid", gap: 8 }}>{requests.map((r)=><div key={r._id} style={{ padding: 10, border: "1px solid rgba(15,23,42,.08)", borderRadius: 10 }}><div style={{ display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap" }}><strong>{r.dependent?.fullName || "Dependent"}</strong><span>{r.status}</span></div><p style={{ margin:"5px 0",opacity:.75 }}>{r.reason}</p>{r.supportingFiles?.length ? <div style={{display:"grid",gap:4,marginBottom:8}}><small style={{opacity:.65}}>Supporting files</small>{r.supportingFiles.map((file)=><a key={file.url} href={resolveUploadUrl(file.url)} target="_blank" rel="noreferrer">{file.fileName || "Supporting file"}</a>)}</div> : null}{r.status === "pending" && <div style={{ display:"flex",gap:7 }}><button type="button" className="support-mini-button" disabled={busy===`request:${r._id}`} onClick={()=>review(r._id,"approved")}>Approve</button><button type="button" className="support-mini-button danger" disabled={busy===`request:${r._id}`} onClick={()=>review(r._id,"rejected")}>Reject</button></div>}</div>)}</div> : <p style={{ opacity: .7, margin: 0 }}>No edit requests for this member.</p>}</div>
  </section>;
}
