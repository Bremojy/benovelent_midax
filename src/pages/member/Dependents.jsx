import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "./Support.css";

const empty = { fullName: "", relationship: "", gender: "", dateOfBirth: "", nationalId: "", birthCertificateNumber: "", phone: "", email: "", county: "", address: "", school: "", admissionNumber: "", educationLevel: "", occupation: "", employer: "", medicalConditions: "", isNextOfKin: false };
const relationships = ["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Guardian", "Other"];
const documentTypes = [
  ["dependent-id-front", "Dependent ID — Front"], ["dependent-id-back", "Dependent ID — Back"],
  ["birth-certificate", "Birth Certificate"],
  ["supporting-document", "Supporting Document"],
  ["profile-photo", "Profile Photo"],
  ["other", "Other"],
];

export default function Dependents() {
  const [dependents, setDependents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(empty);
  const [requestDependent, setRequestDependent] = useState("");
  const [requestFields, setRequestFields] = useState(empty);
  const [reason, setReason] = useState("");
  const [requestFiles, setRequestFiles] = useState([]);
  const [documentType, setDocumentType] = useState("dependent-id");
  const [filesByDependent, setFilesByDependent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    try {
      setLoading(true); setError("");
      const [depRes, reqRes] = await Promise.all([
        API.get("/dependents/my"),
        API.get("/dependents/edit-requests/mine"),
      ]);
      if (!depRes.data?.success) throw new Error(depRes.data?.message || "Unable to load dependents.");
      if (!reqRes.data?.success) throw new Error(reqRes.data?.message || "Unable to load edit requests.");
      setDependents(Array.isArray(depRes.data.dependents) ? depRes.data.dependents : []);
      setRequests(Array.isArray(reqRes.data.requests) ? reqRes.data.requests : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load dependent records.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setRequest = (key, value) => setRequestFields((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    if (!form.fullName || !form.relationship || !form.gender || !form.dateOfBirth) {
      setError("Full name, relationship, gender and date of birth are required."); return;
    }
    try {
      setSaving(true);
      const { data } = await API.post("/dependents", form);
      if (!data?.success) throw new Error(data?.message || "Unable to add dependent.");
      setSuccess("Dependent added successfully. Upload supporting documents below.");
      setForm(empty); await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to add dependent."); }
    finally { setSaving(false); }
  };

  const startRequest = (dependent) => {
    setRequestDependent(dependent._id);
    setRequestFields({ ...empty, ...Object.fromEntries(Object.keys(empty).map((key) => [key, dependent[key] ?? ""])) });
    setReason("");
    setRequestFiles([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitRequest = async (e) => {
    e.preventDefault(); setError(""); setSuccess("");
    const requestedChanges = {};
    Object.keys(requestFields).forEach((key) => {
      if (key === "isNextOfKin") return;
      const value = requestFields[key];
      if (value !== "" && value !== null && value !== undefined) requestedChanges[key] = value;
    });
    if (requestFields.isNextOfKin) requestedChanges.isNextOfKin = true;
    if (!requestDependent) { setError("Select a dependent for the edit request."); return; }
    if (!reason.trim()) { setError("Please explain why the record needs to change."); return; }
    if (!Object.keys(requestedChanges).length) { setError("Describe at least one requested change."); return; }
    try {
      setRequestSaving(true);
      const fd = new FormData();
      fd.append("dependentId", requestDependent);
      fd.append("requestedChanges", JSON.stringify(requestedChanges));
      fd.append("reason", reason.trim());
      requestFiles.forEach((file) => fd.append("supportingFiles", file));
      const { data } = await API.post("/dependents/edit-requests", fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (!data?.success) throw new Error(data?.message || "Unable to submit edit request.");
      setSuccess("Edit request submitted. An administrator will review it.");
      setRequestDependent(""); setRequestFields(empty); setReason(""); setRequestFiles([]); await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to submit edit request."); }
    finally { setRequestSaving(false); }
  };

  const upload = async (dependentId) => {
    const files = Array.from(filesByDependent[dependentId] || []);
    if (!files.length) { setError("Choose at least one file to upload."); return; }
    try {
      setUploadingId(dependentId); setError(""); setSuccess("");
      const fd = new FormData();
      fd.append("documentType", documentType);
      files.forEach((file) => fd.append("documents", file));
      const { data } = await API.post(`/dependents/${dependentId}/documents`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (!data?.success) throw new Error(data?.message || "Unable to upload documents.");
      setSuccess("Supporting document(s) uploaded successfully.");
      setFilesByDependent((old) => ({ ...old, [dependentId]: [] }));
      await load();
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to upload documents."); }
    finally { setUploadingId(""); }
  };

  const selectedRequestDependent = useMemo(() => dependents.find((d) => String(d._id) === String(requestDependent)), [dependents, requestDependent]);

  return (
    <DashboardLayout>
      <div className="member-support-page">
        <section className="member-page-header">
          <span>MEMBER RECORDS</span>
          <h1>Dependents</h1>
          <p>Add a dependent, keep supporting documents together, and request approved record changes without editing the stored record directly.</p>
        </section>

        {error && <div className="support-alert error">{error}</div>}
        {success && <div className="support-alert success">{success}</div>}

        <div className="support-layout">
          <section className="support-form-card">
            <div className="support-section-heading"><span>NEW RECORD</span><h2>Add Dependent</h2></div>
            <form onSubmit={submit}>
              <Field label="Full Name"><input type="text" value={form.fullName} onChange={(e)=>set("fullName",e.target.value)} required /></Field>
              <div className="support-two-col">
                <Field label="Relationship"><select value={form.relationship} onChange={(e)=>set("relationship",e.target.value)} required><option value="">Select</option>{relationships.map((x)=><option key={x}>{x}</option>)}</select></Field>
                <Field label="Gender"><select value={form.gender} onChange={(e)=>set("gender",e.target.value)} required><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
              </div>
              <div className="support-two-col">
                <Field label="Date of Birth"><input type="date" value={form.dateOfBirth} onChange={(e)=>set("dateOfBirth",e.target.value)} required /></Field>
                <Field label="Phone"><input type="tel" inputMode="tel" value={form.phone} onChange={(e)=>set("phone",e.target.value)} /></Field>
              </div>
              <div className="support-two-col">
                <Field label="National ID"><input type="text" value={form.nationalId} onChange={(e)=>set("nationalId",e.target.value)} /></Field>
                <Field label="County"><input type="text" value={form.county} onChange={(e)=>set("county",e.target.value)} /></Field>
              </div>
              <Field label="Birth Certificate Number"><input type="text" value={form.birthCertificateNumber} onChange={(e)=>set("birthCertificateNumber",e.target.value)} /></Field>
              <Field label="School / Institution"><input type="text" value={form.school} onChange={(e)=>set("school",e.target.value)} /></Field>
              <div className="support-two-col">
                <Field label="Admission Number"><input type="text" value={form.admissionNumber} onChange={(e)=>set("admissionNumber",e.target.value)} /></Field>
                <Field label="Education Level"><select value={form.educationLevel} onChange={(e)=>set("educationLevel",e.target.value)}><option value="">Select</option>{["Primary","Junior Secondary","Secondary","College","University","TVET","Other"].map((x)=><option key={x}>{x}</option>)}</select></Field>
              </div>
              <div className="support-two-col">
                <Field label="Occupation"><input type="text" value={form.occupation} onChange={(e)=>set("occupation",e.target.value)} /></Field>
                <Field label="Employer"><input type="text" value={form.employer} onChange={(e)=>set("employer",e.target.value)} /></Field>
              </div>
              <Field label="Address"><input type="text" value={form.address} onChange={(e)=>set("address",e.target.value)} /></Field>
              <button className="support-submit-button" type="submit" disabled={saving}>{saving ? "Adding..." : "Add Dependent"}</button>
            </form>

            <div className="support-divider" />
            <div className="support-section-heading"><span>CONTROLLED CHANGES</span><h2>Request a Record Edit</h2></div>
            <p className="support-muted">Existing dependents cannot be edited or deleted directly by members. Submit the requested change and an authorized administrator will review it.</p>
            <form onSubmit={submitRequest}>
              <Field label="Dependent"><select value={requestDependent} onChange={(e)=>{ const id=e.target.value; setRequestDependent(id); const d=dependents.find((x)=>String(x._id)===String(id)); if(d) setRequestFields({...empty,...d,dateOfBirth:d.dateOfBirth?String(d.dateOfBirth).slice(0,10):""}); }}><option value="">Select dependent</option>{dependents.map((d)=><option key={d._id} value={d._id}>{d.fullName} — {d.relationship}</option>)}</select></Field>
              {selectedRequestDependent && <>
                <div className="support-two-col">
                  <Field label="Full Name"><input type="text" value={requestFields.fullName} onChange={(e)=>setRequest("fullName",e.target.value)} /></Field>
                  <Field label="Relationship"><select value={requestFields.relationship} onChange={(e)=>setRequest("relationship",e.target.value)}><option value="">Select</option>{relationships.map((x)=><option key={x}>{x}</option>)}</select></Field>
                </div>
                <div className="support-two-col">
                  <Field label="Gender"><select value={requestFields.gender} onChange={(e)=>setRequest("gender",e.target.value)}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
                  <Field label="Date of Birth"><input type="date" value={requestFields.dateOfBirth} onChange={(e)=>setRequest("dateOfBirth",e.target.value)} /></Field>
                </div>
                <div className="support-two-col">
                  <Field label="National ID"><input type="text" value={requestFields.nationalId} onChange={(e)=>setRequest("nationalId",e.target.value)} /></Field>
                  <Field label="Phone"><input type="tel" value={requestFields.phone} onChange={(e)=>setRequest("phone",e.target.value)} /></Field>
                </div>
                <Field label="Reason for change"><textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3} /></Field><Field label="Optional supporting files"><input type="file" multiple onChange={(e)=>setRequestFiles(Array.from(e.target.files || []))} /><small className="support-muted">Add evidence that helps the reviewer understand the requested change.</small></Field>
                <button className="support-submit-button" type="submit" disabled={requestSaving}>{requestSaving ? "Submitting..." : "Submit Edit Request"}</button>
              </>}
            </form>
          </section>

          <section className="support-history-card">
            <div className="support-section-heading"><span>MY FAMILY RECORDS</span><h2>Active Dependents</h2></div>
            {loading ? <div className="support-loading">Loading dependents...</div> : dependents.length === 0 ? <div className="support-empty"><h3>No dependents added</h3><p>Add a dependent so eligible support workflows can reference them.</p></div> : <div className="support-list">{dependents.map((d)=>(
              <article className="support-item" key={d._id} style={{display:"block"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}><div><strong>{d.fullName}</strong><span>{d.relationship} • {d.verified ? "Verified" : "Pending verification"}</span></div><button type="button" className="support-mini-button" onClick={()=>startRequest(d)}>Request Edit</button></div>
                <div className="support-document-list">
                  <div className="support-section-heading" style={{marginTop:12}}><span>DOCUMENTS</span><h3>Supporting Files</h3></div>
                  {Array.isArray(d.documents) && d.documents.length ? d.documents.map((doc)=><a key={doc._id} href={doc.url} target="_blank" rel="noreferrer" className="support-mini-link"><strong>{doc.filename || doc.documentType}</strong><span>{doc.verificationStatus || "pending"}</span></a>) : <p className="support-muted">No supporting documents uploaded yet.</p>}
                  <div className="support-two-col" style={{alignItems:"end"}}>
                    <Field label="Document Type"><select value={documentType} onChange={(e)=>setDocumentType(e.target.value)}>{documentTypes.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
                    <Field label="Choose File(s)"><input type="file" multiple onChange={(e)=>setFilesByDependent((old)=>({...old,[d._id]:Array.from(e.target.files || [])}))} /></Field>
                  </div>
                  <button type="button" className="support-mini-button" disabled={uploadingId===d._id} onClick={()=>upload(d._id)}>{uploadingId===d._id ? "Uploading..." : "Upload Documents"}</button>
                </div>
              </article>
            ))}</div>}

            <div className="support-divider" />
            <div className="support-section-heading"><span>REVIEW HISTORY</span><h2>Edit Requests</h2></div>
            {requests.length === 0 ? <p className="support-muted">No dependent edit requests submitted.</p> : <div className="support-list">{requests.map((r)=><div className="support-item" key={r._id}><div><strong>{r.dependent?.fullName || "Dependent"}</strong><span>{r.status} • {r.reason}</span></div><div className="support-item-right"><span>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}</span></div></div>)}</div>}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }) { return <div className="support-field"><label>{label}</label>{children}</div>; }
