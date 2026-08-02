import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { getMemberClaims } from "../../services/memberService";
import "./Support.css";

const initialForm = {
  type: "medical",
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

export default function Support() {
  const [form, setForm] = useState(initialForm);
  const [dependents, setDependents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [documents, setDocuments] = useState([]);

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

  useEffect(() => { load(); }, []);

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

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
        documents.forEach((file) => formData.append("documents", file));
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

        if (documents[0]) formData.append("deathCertificate", documents[0]);
        documents.slice(1, 2).forEach((file) => formData.append("burialPermit", file));
        documents.slice(2, 3).forEach((file) => formData.append("chiefLetter", file));
        documents.slice(3).forEach((file) => formData.append("supportingDocuments", file));
      } else {
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

        if (documents[0]) formData.append("feeStructure", documents[0]);
        if (documents[1]) formData.append("admissionLetter", documents[1]);
        documents.slice(2).forEach((file) => formData.append("supportingDocuments", file));
      }

      const { data } = await API.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!data?.success) throw new Error(data?.message || "Unable to submit the application.");

      setSuccess("Your support application and supporting documents were submitted successfully.");
      setForm({ ...initialForm, type: form.type });
      setDocuments([]);
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

            <form onSubmit={submit}>
              <div className="support-field">
                <label>Assistance Type</label>
                <select value={form.type} onChange={(e) => set("type", e.target.value)}>
                  <option value="medical">Medical Support</option>
                  <option value="funeral">Funeral Support</option>
                  <option value="education">Education Support</option>
                </select>
              </div>

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

              <Field label="Supporting documents">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  onChange={(e) => setDocuments(Array.from(e.target.files || []))}
                />
                <small className="support-file-hint">
                  {documents.length
                    ? `${documents.length} document(s) selected`
                    : form.type === "funeral"
                      ? "Order: death certificate, burial permit, chief letter, then other documents."
                      : form.type === "education"
                        ? "Order: fee structure, admission letter, then other documents."
                        : "You can select multiple medical supporting documents. Maximum 8MB each."}
                </small>
              </Field>

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
              <div className="support-empty"><h3>No applications yet</h3><p>Your submitted assistance requests will appear here.</p></div>
            ) : (
              <div className="support-list">
                {claims.map((claim) => (
                  <div className="support-item" key={`${claim.supportType}-${claim._id}`}>
                    <div>
                      <strong>{title(claim.supportType)} Support</strong>
                      <span>{formatDate(claim.createdAt || claim.applicationDate)}</span>
                    </div>
                    <div className="support-item-right">
                      <strong>{money(claim.amount)}</strong>
                      <span className={`claim-status ${String(claim.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>{claim.status || "Pending"}</span>
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
  return <div className="support-field"><label>{label}</label>{children}</div>;
}
const title = (v) => String(v || "").replace(/^./, (c) => c.toUpperCase());
const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const formatDate = (v) => v ? new Date(v).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—";
