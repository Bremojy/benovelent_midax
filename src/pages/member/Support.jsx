import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { getMemberClaims } from "../../services/memberService";
import { resolveApiUrl } from "../../services/api";
import "./Support.css";

const initialForm = {
  type: "medical",
  customType: "",
  caseDescription: "",
  dependentId: "",
  hospitalName: "",
  hospitalLocation: "",
  diagnosis: "",
  requestedAmount: "",
  deceasedType: "Member",
  deceasedName: "",
  relationship: "",
  dateOfDeath: "",
  burialDate: "",
  burialLocation: "",
  purpose: "",
  school: "",
  admissionNumber: "",
  repaymentPeriodMonths: 12,
};

const DOCUMENT_CATEGORIES = [
  "Identity",
  "Medical",
  "Funeral",
  "Education",
  "Letter",
  "Receipt",
  "Proof of Payment",
  "Other",
];

const newAttachment = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  category: "Other",
  label: "",
  file: null,
});

export default function Support() {
  const [form, setForm] = useState(initialForm);
  const [dependents, setDependents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attachments, setAttachments] = useState([newAttachment()]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [claimsRes, dependentsRes] = await Promise.all([
        getMemberClaims(),
        API.get("/dependents/my"),
      ]);
      setClaims(Array.isArray(claimsRes?.claims) ? claimsRes.claims : []);
      setDependents(Array.isArray(dependentsRes?.data?.dependents) ? dependentsRes.data.dependents : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load your support centre.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeAttachments = useMemo(
    () => attachments.filter((item) => item.file),
    [attachments]
  );

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const updateAttachment = (id, patch) => {
    setAttachments((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const addAttachment = () => {
    setAttachments((current) => [...current, newAttachment()]);
  };

  const removeAttachment = (id) => {
    setAttachments((current) => (current.length > 1 ? current.filter((item) => item.id !== id) : current));
  };

  const attachFiles = (formData) => {
    const documentCategories = [];
    const documentLabels = [];

    activeAttachments.forEach((item) => {
      formData.append("documents", item.file);
      documentCategories.push(item.category || "Other");
      documentLabels.push(item.label || item.file?.name || "Document");
    });

    formData.append("documentCategories", JSON.stringify(documentCategories));
    formData.append("documentLabels", JSON.stringify(documentLabels));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setSubmitting(true);

      let endpoint;
      const formData = new FormData();

      if (form.type === "medical") {
        if (!form.dependentId || !form.hospitalName || !form.diagnosis || Number(form.requestedAmount) <= 0) {
          throw new Error("Please provide the dependent, hospital, diagnosis and requested amount.");
        }

        endpoint = "/medical/apply";
        formData.append("dependent", form.dependentId);
        formData.append("hospitalName", form.hospitalName.trim());
        formData.append("hospitalLocation", form.hospitalLocation.trim());
        formData.append("diagnosis", form.diagnosis.trim());
        formData.append("requestedAmount", String(Number(form.requestedAmount)));
        attachFiles(formData);
      } else if (form.type === "funeral") {
        if (!form.deceasedName || !form.relationship || !form.dateOfDeath || !form.burialDate || !form.burialLocation || Number(form.requestedAmount) <= 0) {
          throw new Error("Please complete the funeral support details and requested amount.");
        }

        endpoint = "/funeral/apply";
        Object.entries({
          deceasedType: form.deceasedType,
          deceasedName: form.deceasedName.trim(),
          relationship: form.relationship.trim(),
          dateOfDeath: form.dateOfDeath,
          burialDate: form.burialDate,
          burialLocation: form.burialLocation.trim(),
          requestedAmount: Number(form.requestedAmount),
        }).forEach(([key, value]) => formData.append(key, String(value)));

        attachFiles(formData);
      } else if (form.type === "education") {
        if (!form.dependentId || !form.purpose || !form.school || !form.admissionNumber || Number(form.requestedAmount) < 1000) {
          throw new Error("Please complete the education support details. Minimum requested amount is KES 1,000.");
        }

        endpoint = "/education/apply";
        Object.entries({
          dependentId: form.dependentId,
          purpose: form.purpose.trim(),
          school: form.school.trim(),
          admissionNumber: form.admissionNumber.trim(),
          requestedAmount: Number(form.requestedAmount),
          repaymentPeriodMonths: Number(form.repaymentPeriodMonths) || 12,
        }).forEach(([key, value]) => formData.append(key, String(value)));

        attachFiles(formData);
      } else {
        if (!form.customType?.trim() || !form.caseDescription?.trim() || Number(form.requestedAmount) <= 0) {
          throw new Error("Please complete the support type, description and amount.");
        }

        endpoint = "/member/support-requests";
        formData.append("supportType", form.customType.trim());
        formData.append("description", form.caseDescription.trim());
        formData.append("requestedAmount", String(Number(form.requestedAmount)));
        attachFiles(formData);
      }

      const { data } = await API.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!data?.success) throw new Error(data?.message || "Unable to submit the application.");

      setSuccess("Your support application and supporting documents were submitted successfully.");
      setForm({ ...initialForm, type: form.type });
      setAttachments([newAttachment()]);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to submit support application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="member-support-page">
        <section className="member-page-header">
          <span>MEMBER SUPPORT</span>
          <h1>Support Centre</h1>
          <p>Request assistance and track every application from one secure place.</p>
        </section>

        {error && <div className="support-alert error">{error}</div>}
        {success && <div className="support-alert success">{success}</div>}

        <div className="support-layout">
          <section className="support-form-card">
            <div className="support-section-heading">
              <span>NEW APPLICATION</span>
              <h2>Request Assistance</h2>
            </div>

            <form onSubmit={submit} className="support-form">
              <div className="support-field">
                <label>Assistance Type</label>
                <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option value="medical">Medical Support</option>
                  <option value="funeral">Funeral Support</option>
                  <option value="education">Education Support</option>
                  <option value="other">None of above</option>
                </select>
              </div>

              {form.type === "other" && (
                <>
                  <Field label="Your support type">
                    <input value={form.customType || ""} onChange={(e) => set("customType", e.target.value)} required />
                  </Field>
                  <Field label="Brief description">
                    <textarea rows="4" value={form.caseDescription || ""} onChange={(e) => set("caseDescription", e.target.value)} required />
                  </Field>
                </>
              )}

              {form.type === "medical" && (
                <>
                  <Field label="Dependent">
                    <select value={form.dependentId} onChange={(e) => set("dependentId", e.target.value)}>
                      <option value="">Select dependent</option>
                      {dependents.map((d) => <option key={d._id} value={d._id}>{d.fullName || d.name || "Dependent"}</option>)}
                    </select>
                  </Field>
                  <Field label="Hospital Name"><input value={form.hospitalName} onChange={(e) => set("hospitalName", e.target.value)} /></Field>
                  <Field label="Hospital Location"><input value={form.hospitalLocation} onChange={(e) => set("hospitalLocation", e.target.value)} /></Field>
                  <Field label="Diagnosis"><textarea rows="4" value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} /></Field>
                </>
              )}

              {form.type === "funeral" && (
                <>
                  <Field label="Deceased Type">
                    <select value={form.deceasedType} onChange={(e) => set("deceasedType", e.target.value)}>
                      <option value="Member">Member</option>
                      <option value="Dependent">Dependent</option>
                    </select>
                  </Field>
                  <Field label="Deceased Name"><input value={form.deceasedName} onChange={(e) => set("deceasedName", e.target.value)} /></Field>
                  <Field label="Relationship"><input value={form.relationship} onChange={(e) => set("relationship", e.target.value)} /></Field>
                  <div className="support-two-col">
                    <Field label="Date of Death"><input type="date" value={form.dateOfDeath} onChange={(e) => set("dateOfDeath", e.target.value)} /></Field>
                    <Field label="Burial Date"><input type="date" value={form.burialDate} onChange={(e) => set("burialDate", e.target.value)} /></Field>
                  </div>
                  <Field label="Burial Location"><input value={form.burialLocation} onChange={(e) => set("burialLocation", e.target.value)} /></Field>
                </>
              )}

              {form.type === "education" && (
                <>
                  <Field label="Dependent">
                    <select value={form.dependentId} onChange={(e) => set("dependentId", e.target.value)}>
                      <option value="">Select dependent</option>
                      {dependents.map((d) => <option key={d._id} value={d._id}>{d.fullName || d.name || "Dependent"}</option>)}
                    </select>
                  </Field>
                  <Field label="School"><input value={form.school} onChange={(e) => set("school", e.target.value)} /></Field>
                  <Field label="Admission Number"><input value={form.admissionNumber} onChange={(e) => set("admissionNumber", e.target.value)} /></Field>
                  <Field label="Purpose"><textarea rows="4" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} /></Field>
                  <Field label="Repayment Period (months)"><input type="number" min="1" value={form.repaymentPeriodMonths} onChange={(e) => set("repaymentPeriodMonths", e.target.value)} /></Field>
                </>
              )}

              <div className="support-documents-panel">
                <div className="support-documents-panel-header">
                  <div>
                    <span>DOCUMENTS</span>
                    <h3>Upload as many files as needed</h3>
                  </div>
                  <button type="button" className="support-mini-button" onClick={addAttachment}>
                    <Plus size={14} /> Add file
                  </button>
                </div>

                <div className="support-attachment-list">
                  {attachments.map((item, index) => (
                    <div className="support-attachment-row" key={item.id}>
                      <div className="support-attachment-index">{index + 1}</div>
                      <div className="support-attachment-fields">
                        <label>
                          <span>Category</span>
                          <select value={item.category} onChange={(e) => updateAttachment(item.id, { category: e.target.value })}>
                            {DOCUMENT_CATEGORIES.map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span>Label</span>
                          <input
                            value={item.label}
                            onChange={(e) => updateAttachment(item.id, { label: e.target.value })}
                            placeholder="Receipt, report, letter..."
                          />
                        </label>
                        <label>
                          <span>File</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={(e) => updateAttachment(item.id, { file: e.target.files?.[0] || null })}
                          />
                        </label>
                      </div>
                      <button type="button" className="support-mini-button danger" onClick={() => removeAttachment(item.id)} aria-label="Remove file">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <small className="support-file-hint">
                  Each file is stored separately with its category so admins and superadmins can review them later.
                </small>
              </div>

              <Field label="Requested Amount (KES)">
                <input type="number" min="0" value={form.requestedAmount} onChange={(e) => set("requestedAmount", e.target.value)} />
              </Field>

              <button className="support-submit-button" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </section>

          <section className="support-history-card">
            <div className="support-section-heading">
              <span>APPLICATION HISTORY</span>
              <h2>My Requests</h2>
            </div>

            {loading ? (
              <div className="support-loading">Loading your applications...</div>
            ) : claims.length === 0 ? (
              <div className="support-empty">
                <h3>No applications yet</h3>
                <p>Your submitted assistance requests will appear here.</p>
              </div>
            ) : (
              <div className="support-list">
                {claims.map((claim) => (
                  <div className="support-item" key={`${claim.supportType}-${claim._id}`}>
                    <div className="support-item-main">
                      <strong>{title(claim.supportType)} Support</strong>
                      <span>{formatDate(claim.createdAt || claim.applicationDate)}</span>
                      <p>{claim.description || claim.purpose || "No description provided."}</p>

                      {Array.isArray(claim.documents) && claim.documents.length > 0 && (
                        <div className="claim-documents">
                          {claim.documents.map((doc, index) => {
                            const url = typeof doc === "string" ? doc : doc?.fileUrl;
                            if (!url) return null;
                            const fullUrl = url.startsWith("http") ? url : resolveApiUrl(url);
                            const category = typeof doc === "string" ? "General" : doc?.category || "General";
                            const label = typeof doc === "string" ? `Document ${index + 1}` : doc?.label || doc?.fileName || `Document ${index + 1}`;
                            return (
                              <a href={fullUrl} target="_blank" rel="noreferrer" key={`${url}-${index}`}>
                                <strong>{category}</strong>
                                <span>{label}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="support-item-right">
                      <strong>{money(claim.amount)}</strong>
                      <span className={`claim-status ${String(claim.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                        {claim.status || "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }) {
  return (
    <div className="support-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

const title = (v) => String(v || "").replace(/^./, (c) => c.toUpperCase());
const money = (v) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const formatDate = (v) =>
  v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
