import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
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
  repaymentPeriodMonths: "",
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
  customCategory: "",
  file: null,
});

export default function Support() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (new URLSearchParams(location.search).get("view") === "requests") navigate("/member/support/requests", { replace: true });
  }, [location.search, navigate]);
  const [form, setForm] = useState(initialForm);
  const [dependents, setDependents] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attachments, setAttachments] = useState([newAttachment()]);
  const [policies, setPolicies] = useState([]);
  const [requiredFiles, setRequiredFiles] = useState({
    feeStructure: null,
    admissionLetter: null,
    burialPermitChiefLetter: null,
  });

  const load = async () => {
    try {
      setError("");
      const [dependentsRes, policiesRes] = await Promise.allSettled([
        API.get("/dependents/my"),
        API.get("/policies/public"),
      ]);
      const dependentsData = dependentsRes.status === "fulfilled" ? dependentsRes.value : null;
      const policiesData = policiesRes.status === "fulfilled" ? policiesRes.value : null;
      setDependents(Array.isArray(dependentsData?.data?.dependents) ? dependentsData.data.dependents : (Array.isArray(dependentsData?.dependents) ? dependentsData.dependents : []));
      setPolicies(Array.isArray(policiesData?.data?.policies) ? policiesData.data.policies : (Array.isArray(policiesData?.policies) ? policiesData.policies : []));
      const failures = [
        [dependentsRes, "dependents"], [policiesRes, "support policies"],
      ].filter(([result]) => result.status === "rejected").map(([, label]) => label);
      if (failures.length) {
        const first = [dependentsRes, policiesRes].find((result) => result.status === "rejected")?.reason;
        setError(`${first?.response?.data?.message || "Some support data could not be loaded."} Failed: ${failures.join(", ")}.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load your support centre.");
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
    const documentCustomCategories = [];

    activeAttachments.forEach((item) => {
      formData.append("documents", item.file);
      documentCategories.push(item.category || "Other");
      documentLabels.push(item.label || item.file?.name || "Document");
      documentCustomCategories.push(item.customCategory || "");
    });

    formData.append("documentCategories", JSON.stringify(documentCategories));
    formData.append("documentLabels", JSON.stringify(documentLabels));
    formData.append("documentCustomCategories", JSON.stringify(documentCustomCategories));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      const validateGeneralAttachments = () => {
        if (activeAttachments.length < 2) throw new Error("Please upload at least two supporting documents.");
        const categories = new Set(activeAttachments.map((item) => {
          const category = String(item.category || "Other").trim().toLowerCase();
          return category === "other" && item.customCategory ? item.customCategory.trim().toLowerCase() : category;
        }));
        if (categories.size < 2) throw new Error("Please use at least two different document categories.");
        if (activeAttachments.some((item) => String(item.category || "").toLowerCase() === "other" && !String(item.customCategory || "").trim())) {
          throw new Error("For documents marked Other, provide a custom category name.");
        }
      };
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
        validateGeneralAttachments();
        attachFiles(formData);
      } else if (form.type === "funeral") {
        if (!form.deceasedName || !form.relationship || !form.dateOfDeath || !form.burialDate || !form.burialLocation || Number(form.requestedAmount) <= 0) {
          throw new Error("Please complete the funeral support details and requested amount.");
        }

        endpoint = "/funeral/apply";
        if (form.deceasedType === "Dependent" && !form.dependentId) throw new Error("Select the dependent linked to the funeral case.");
        if (!requiredFiles.burialPermitChiefLetter) throw new Error("Burial Permit / Chief or Local Authority Letter is required.");
        Object.entries({
          deceasedType: form.deceasedType,
          deceasedName: form.deceasedName.trim(),
          relationship: form.relationship.trim(),
          dateOfDeath: form.dateOfDeath,
          burialDate: form.burialDate,
          burialLocation: form.burialLocation.trim(),
          requestedAmount: Number(form.requestedAmount),
          ...(form.deceasedType === "Dependent" ? { dependent: form.dependentId } : {}),
        }).forEach(([key, value]) => formData.append(key, String(value)));
        formData.append("burialPermitChiefLetter", requiredFiles.burialPermitChiefLetter);
        activeAttachments.forEach((item) => formData.append("supportingDocuments", item.file));
      } else if (form.type === "education") {
        const educationPolicy = policies.find((policy) => policy.slug === "education-policy");
        if (!educationPolicy) throw new Error("The Education Policy is not currently configured or enabled.");
        const educationMinimum = educationPolicy.minAmount == null ? null : Number(educationPolicy.minAmount);
        const educationMaximum = educationPolicy.maxAmount == null ? null : Number(educationPolicy.maxAmount);
        if (!form.dependentId || !form.purpose || !form.school || !form.admissionNumber || (educationMinimum !== null && Number(form.requestedAmount) < educationMinimum)) {
          throw new Error(educationMinimum === null ? "Please complete the education policy details." : `Please complete the education policy details. Minimum requested amount is KES ${educationMinimum.toLocaleString("en-KE")}.`);
        }
        if (educationMaximum !== null && educationMaximum > 0 && Number(form.requestedAmount) > educationMaximum) {
          throw new Error(`Requested amount cannot exceed KES ${educationMaximum.toLocaleString("en-KE")}.`);
        }

        endpoint = "/education/apply";
        if (!requiredFiles.feeStructure || !requiredFiles.admissionLetter) throw new Error("Fee structure and admission letter are required for Education Support.");
        Object.entries({
          dependentId: form.dependentId,
          school: form.school.trim(),
          admissionNumber: form.admissionNumber.trim(),
          purpose: form.purpose.trim(),
          requestedAmount: Number(form.requestedAmount),
          repaymentPeriodMonths: form.repaymentPeriodMonths === "" ? undefined : Number(form.repaymentPeriodMonths),
        }).forEach(([key, value]) => value !== undefined && formData.append(key, String(value)));
        formData.append("feeStructure", requiredFiles.feeStructure);
        formData.append("admissionLetter", requiredFiles.admissionLetter);
        activeAttachments.forEach((item) => formData.append("supportingDocuments", item.file));
      } else {
        const selectedPolicy = policies.find((policy) => `policy:${policy.slug}` === form.type);
        if (!selectedPolicy?.name || !selectedPolicy.enabled) {
          throw new Error("Please select an enabled support policy.");
        }
        if (!form.caseDescription?.trim() || Number(form.requestedAmount) <= 0) {
          throw new Error("Please complete the support description and amount.");
        }

        endpoint = "/member/support-requests";
        formData.append("supportType", selectedPolicy?.name || form.customType.trim());
        if (selectedPolicy) {
          formData.append("policySlug", selectedPolicy.slug);
          formData.append("policyName", selectedPolicy.name);
        }
        formData.append("description", form.caseDescription.trim());
        formData.append("requestedAmount", String(Number(form.requestedAmount)));
        validateGeneralAttachments();
        attachFiles(formData);
      }

      const { data } = await API.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!data?.success) throw new Error(data?.message || "Unable to submit the application.");

      setSuccess("Your support application and supporting documents were submitted successfully.");
      setForm({ ...initialForm, type: form.type });
      setAttachments([newAttachment()]);
      setRequiredFiles({ feeStructure: null, admissionLetter: null, burialPermitChiefLetter: null });
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
                <select value={form.type} onChange={(e) => {
                  const nextType = e.target.value;
                  const selectedPolicy = policies.find((policy) => `policy:${policy.slug}` === nextType);
                  setForm((current) => ({ ...current, type: nextType, customType: selectedPolicy?.name || current.customType }));
                }}>
                  <option value="medical">Medical Support</option>
                  <option value="funeral">Funeral Support</option>
                  {policies.some((policy) => policy.slug === "education-policy" && policy.enabled) && <option value="education">Education Policy</option>}
                  {policies.filter((policy) => !["medical-support", "funeral-support", "education-policy"].includes(policy.slug)).map((policy) => (
                    <option key={policy._id} value={`policy:${policy.slug}`}>{policy.name}</option>
                  ))}
                  
                </select>
                {policies.find((policy) => `policy:${policy.slug}` === form.type) && (
                  <small className="support-policy-hint">{policies.find((policy) => `policy:${policy.slug}` === form.type)?.description}</small>
                )}
              </div>

              {form.type === "other" && (
                <>
                  <Field label="Your support type">
                    <input type="text" value={form.customType || ""} onChange={(e) => set("customType", e.target.value)} required />
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
                  <Field label="Hospital Name"><input type="text" value={form.hospitalName} onChange={(e) => set("hospitalName", e.target.value)} /></Field>
                  <Field label="Hospital Location"><input type="text" value={form.hospitalLocation} onChange={(e) => set("hospitalLocation", e.target.value)} /></Field>
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
                  {form.deceasedType === "Dependent" && (
                    <Field label="Dependent">
                      <select value={form.dependentId} onChange={(e) => {
                        const id = e.target.value;
                        const dep = dependents.find((d) => String(d._id) === String(id));
                        setForm((current) => ({ ...current, dependentId: id, deceasedName: dep?.fullName || current.deceasedName, relationship: dep?.relationship || current.relationship }));
                      }}>
                        <option value="">Select dependent</option>
                        {dependents.map((d) => <option key={d._id} value={d._id}>{d.fullName || "Dependent"}</option>)}
                      </select>
                    </Field>
                  )}
                  <Field label="Deceased Name"><input type="text" value={form.deceasedName} onChange={(e) => set("deceasedName", e.target.value)} /></Field>
                  <Field label="Relationship"><input type="text" value={form.relationship} onChange={(e) => set("relationship", e.target.value)} /></Field>
                  <div className="support-two-col">
                    <Field label="Date of Death"><input type="date" value={form.dateOfDeath} onChange={(e) => set("dateOfDeath", e.target.value)} /></Field>
                    <Field label="Burial Date"><input type="date" value={form.burialDate} onChange={(e) => set("burialDate", e.target.value)} /></Field>
                  </div>
                  <Field label="Burial Location"><input type="text" value={form.burialLocation} onChange={(e) => set("burialLocation", e.target.value)} /></Field>
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
                  <Field label="School"><input type="text" value={form.school} onChange={(e) => set("school", e.target.value)} /></Field>
                  <Field label="Admission Number"><input type="text" value={form.admissionNumber} onChange={(e) => set("admissionNumber", e.target.value)} /></Field>
                  <Field label="Purpose"><textarea rows="4" value={form.purpose} onChange={(e) => set("purpose", e.target.value)} /></Field>
                  <Field label="Repayment Period (months)"><input type="number" inputMode="numeric" min="1" step="1" value={form.repaymentPeriodMonths} onChange={(e) => set("repaymentPeriodMonths", e.target.value)} /></Field>
                </>
              )}

              {(form.type === "education" || form.type === "funeral") ? (
                <div className="support-documents-panel">
                  <div className="support-documents-panel-header">
                    <div>
                      <span>REQUIRED DOCUMENTS</span>
                      <h3>{form.type === "education" ? "Education application documents" : "Funeral case documents"}</h3>
                    </div>
                  </div>
                  {form.type === "education" ? (
                    <>
                      <RequiredFileField label="Fee Structure" file={requiredFiles.feeStructure} onChange={(file) => setRequiredFiles((x) => ({ ...x, feeStructure: file }))} />
                      <RequiredFileField label="Admission Letter" file={requiredFiles.admissionLetter} onChange={(file) => setRequiredFiles((x) => ({ ...x, admissionLetter: file }))} />
                    </>
                  ) : (
                    <>
                      <RequiredFileField label="Burial Permit / Chief or Local Authority Letter" file={requiredFiles.burialPermitChiefLetter} onChange={(file) => setRequiredFiles((x) => ({ ...x, burialPermitChiefLetter: file }))} />
                    </>
                  )}
                  <small className="support-file-hint">These required files are sent using the backend field names for this support type.</small>
                  <div className="support-documents-panel-header" style={{ marginTop: 16 }}>
                    <div><span>OPTIONAL SUPPORTING DOCUMENTS</span></div>
                    <button type="button" className="support-mini-button" onClick={addAttachment}><Plus size={14} /> Add file</button>
                  </div>
                  <div className="support-attachment-list">
                    {attachments.map((item, index) => (
                      <div className="support-attachment-row" key={item.id}>
                        <div className="support-attachment-index">{index + 1}</div>
                        <div className="support-attachment-fields">
                          <label><span>Category</span><select value={item.category} onChange={(e) => updateAttachment(item.id, { category: e.target.value })}>{DOCUMENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                          <label><span>Label</span><input value={item.label} onChange={(e) => updateAttachment(item.id, { label: e.target.value })} placeholder="Supporting document" /></label>
                          {item.category === "Other" && <label><span>Custom category</span><input value={item.customCategory} onChange={(e) => updateAttachment(item.id, { customCategory: e.target.value })} /></label>}
                          <label><span>File</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => updateAttachment(item.id, { file: e.target.files?.[0] || null })} /></label>
                        </div>
                        <button type="button" className="support-mini-button danger" onClick={() => removeAttachment(item.id)} aria-label="Remove file"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="support-documents-panel">
                  <div className="support-documents-panel-header">
                    <div><span>DOCUMENTS</span><h3>Upload as many files as needed</h3></div>
                    <button type="button" className="support-mini-button" onClick={addAttachment}><Plus size={14} /> Add file</button>
                  </div>
                  <div className="support-attachment-list">
                    {attachments.map((item, index) => (
                      <div className="support-attachment-row" key={item.id}>
                        <div className="support-attachment-index">{index + 1}</div>
                        <div className="support-attachment-fields">
                          <label><span>Category</span><select value={item.category} onChange={(e) => updateAttachment(item.id, { category: e.target.value })}>{DOCUMENT_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
                          <label><span>Label</span><input value={item.label} onChange={(e) => updateAttachment(item.id, { label: e.target.value })} placeholder="Receipt, report, letter..." /></label>
                          {item.category === "Other" && <label><span>Custom category</span><input value={item.customCategory} onChange={(e) => updateAttachment(item.id, { customCategory: e.target.value })} placeholder="e.g. Employer letter" maxLength={120} required /></label>}
                          <label><span>File</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => updateAttachment(item.id, { file: e.target.files?.[0] || null })} /></label>
                        </div>
                        <button type="button" className="support-mini-button danger" onClick={() => removeAttachment(item.id)} aria-label="Remove file"><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                  <small className="support-file-hint">Each file is stored separately with its category so admins and superadmins can review them later.</small>
                </div>
              )}

              <Field label="Requested Amount (KES)">
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.requestedAmount} onChange={(e) => set("requestedAmount", e.target.value)} />
              </Field>

              <button className="support-submit-button" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          </section>

        </div>

      </div>
    </DashboardLayout>
  );
}

function RequiredFileField({ label, file, onChange }) {
  return (
    <div className="support-field">
      <label>{label} *</label>
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(e) => onChange(e.target.files?.[0] || null)} required={!file} />
      <small className="support-file-hint">{file ? file.name : "Choose a file"}</small>
    </div>
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

