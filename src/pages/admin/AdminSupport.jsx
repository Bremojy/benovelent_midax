
import { useEffect, useState } from "react";
import { BellRing, Mail, Phone, UserPlus } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import { createAdminMember, getAdminMembers } from "../../services/adminService";
import "../../styles/portalModule.css";

export default function AdminSupport() {
  const { role } = useAuth();
  const isSuperAdmin = String(role || "").toLowerCase() === "superadmin";
  const [members, setMembers] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [form, setForm] = useState({ recipient: "", title: "", message: "" });
  const [invite, setInvite] = useState({ memberNumber: "", fullName: "", username: "", phone: "", email: "", department: "", position: "", monthlyContribution: "" });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [broadcast, setBroadcast] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [membersRes, contactsRes, supportRes] = await Promise.allSettled([
        getAdminMembers({ page: 1, limit: 100 }),
        API.get("/contact"),
        API.get("/member/support-requests"),
      ]);

      setMembers(
        membersRes.status === "fulfilled"
          ? (membersRes.value?.members || [])
          : []
      );

      setContactMessages(
        contactsRes.status === "fulfilled"
          ? (contactsRes.value?.data?.messages || [])
          : []
      );
      setSupportRequests(
        supportRes.status === "fulfilled"
          ? (supportRes.value?.data?.requests || [])
          : []
      );
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to load support data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const send = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title || !form.message) {
      setError("Complete the subject and message.");
      return;
    }

    try {
      setSending(true);
      const payload = broadcast
        ? { title: form.title, message: form.message, smsText: form.message, broadcastSms: smsEnabled, inApp: true }
        : { recipient: form.recipient, recipientModel: "Member", title: form.title, message: form.message, type: "system", senderModel: "Admin" };

      if (!broadcast && !form.recipient) {
        setError("Select a member or enable broadcast.");
        return;
      }

      const url = broadcast ? "/notifications/broadcast" : "/notifications";
      const { data } = await API.post(url, payload);
      if (!data?.success) throw new Error(data?.message || "Unable to send support message.");

      const emailSent = data?.result?.emailResult?.sent || 0;
      const smsSent = data?.result?.smsResult?.sent || 0;
      const inAppSent = data?.result?.inAppNotifications || data?.result?.membersCount || 0;
      const emailSkipped = data?.result?.emailResult?.skipped;
      const smsSkipped = data?.result?.smsResult?.skipped;

      setSuccess(
        broadcast
          ? `Broadcast processed. In-app: ${inAppSent}. Email: ${emailSent}${emailSkipped ? ` (skipped: ${emailSkipped})` : ""}. SMS: ${smsSent}${smsSkipped ? ` (skipped: ${smsSkipped})` : ""}.`
          : "Message sent successfully."
      );
      setForm({ recipient: "", title: "", message: "" });
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const deleteContactMessage = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this contact submission?")) return;
    try {
      setError("");
      setSuccess("");
      await API.delete(`/contact/${id}`);
      setSuccess("Contact submission deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to delete contact submission.");
    }
  };

  const deleteSupportRequest = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this support request permanently?")) return;
    try {
      setError("");
      setSuccess("");
      await API.delete(`/member/support-requests/${id}`);
      setSuccess("Support request deleted.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to delete support request.");
    }
  };

  const inviteMember = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      setInviting(true);

      const payload = {
        memberNumber: invite.memberNumber.trim(),
        fullName: invite.fullName.trim(),
        username: invite.username.trim(),
        phone: invite.phone.trim(),
        email: invite.email.trim(),
        department: invite.department.trim(),
        position: invite.position.trim(),
        monthlyContribution: invite.monthlyContribution || 0,
      };

      const { data } = await createAdminMember(payload);
      const tempPassword = data?.temporaryPassword || "Check the success response";
      const emailStatus = data?.delivery?.email?.sent ? "email sent" : data?.delivery?.email?.reason ? `email skipped (${data.delivery.email.reason})` : "email status unknown";
      const smsStatus = data?.delivery?.sms?.sent ? "sms sent" : data?.delivery?.sms?.reason ? `sms skipped (${data.delivery.sms.reason})` : "sms status unknown";

      setSuccess(`Member invited successfully. Temporary password: ${tempPassword}. Delivery: ${emailStatus}, ${smsStatus}.`);
      setInvite({ memberNumber: "", fullName: "", username: "", phone: "", email: "", department: "", position: "", monthlyContribution: "" });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to create member invite.");
    } finally {
      setInviting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>MEMBER COMMUNICATION</span>
            <h1>Support</h1>
            <p>Send direct support and service messages, invite members, and review contact form submissions.</p>
          </div>
        </header>

        {error && <div className="portal-alert">{error}</div>}
        {success && <div className="portal-alert success">{success}</div>}

        <section className="portal-panel">
          <div className="portal-panel-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Mail size={18} />
            <h2 style={{ margin: 0 }}>Broadcast or direct message</h2>
          </div>
          <form onSubmit={send}>
            <div className="portal-form-grid">
              <div className="portal-field">
                <label>Member</label>
                <select value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} disabled={loading || broadcast}>
                  <option value="">Select member</option>
                  {members.map(m => <option key={m._id} value={m._id}>{m.fullName} — {m.memberNumber}</option>)}
                </select>
              </div>
              <div className="portal-field">
                <label>Subject</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Claim update" />
              </div>
              <div className="portal-field" style={{ marginTop: 12 }}>
                <label>
                  <input type="checkbox" checked={broadcast} onChange={e => setBroadcast(e.target.checked)} style={{ marginRight: 8 }} />
                  Broadcast to all active members
                </label>
              </div>
              <div className="portal-field">
                <label>
                  <input type="checkbox" checked={smsEnabled} onChange={e => setSmsEnabled(e.target.checked)} style={{ marginRight: 8 }} />
                  Send SMS when recipients have phone numbers
                </label>
              </div>
            </div>
            <div className="portal-field" style={{ marginTop: 14 }}>
              <label>Message</label>
              <textarea rows="7" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder={broadcast ? "Write the message for all members..." : "Write the message to the member..."} />
            </div>
            <button className="portal-btn" disabled={sending}>{sending ? "Sending..." : broadcast ? "Send Broadcast" : "Send Support Message"}</button>
          </form>
          <p style={{ marginTop: 12, color: "#64748b" }}>
            Broadcasts can create in-app notifications and send email/SMS when SMTP and SMS settings are configured.
          </p>
        </section>

        <section className="portal-panel" style={{ marginTop: 18 }}>
          <div className="portal-panel-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <UserPlus size={18} />
            <h2 style={{ margin: 0 }}>Invite a member</h2>
          </div>
          <form onSubmit={inviteMember}>
            <div className="portal-form-grid">
              {[
                ["memberNumber", "Member Number"],
                ["fullName", "Full Name"],
                ["username", "Username"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["department", "Department"],
                ["position", "Position"],
                ["monthlyContribution", "Monthly Contribution"],
              ].map(([key, label]) => (
                <div className="portal-field" key={key}>
                  <label>{label}</label>
                  <input
                    value={invite[key]}
                    onChange={(e) => setInvite({ ...invite, [key]: e.target.value })}
                    placeholder={label}
                    type={key === "email" ? "email" : key === "monthlyContribution" ? "number" : "text"}
                  />
                </div>
              ))}
            </div>
            <button className="portal-btn primary" disabled={inviting}>{inviting ? "Creating..." : "Create member invite"}</button>
          </form>
        </section>

        <section className="portal-panel" style={{ marginTop: 18 }}>
          <div className="portal-panel-header"><h2>Other support requests</h2></div>
          {supportRequests.length === 0 ? (
            <div className="portal-empty">No custom support requests.</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {supportRequests.map((request) => {
                const member = request.member || {};
                const docs = Array.isArray(request.documents) ? request.documents : [];
                return (
                  <article key={request._id} className="portal-card" style={{ border: "1px solid rgba(15,23,42,.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <strong>{member.fullName || "Member"}{member.memberNumber ? ` • ${member.memberNumber}` : ""}</strong>
                        <div style={{ color: "#64748b", marginTop: 6 }}>{member.phone || "No phone"}{member.email ? ` • ${member.email}` : ""}</div>
                        <div style={{ fontWeight: 700, marginTop: 8 }}>{request.supportType}</div>
                        <div style={{ marginTop: 4 }}>{money(request.requestedAmount)}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="portal-badge">{request.status}</span>
                        {isSuperAdmin && (
                          <button type="button" className="portal-btn danger" onClick={() => deleteSupportRequest(request._id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    <p style={{ marginTop: 10, lineHeight: 1.7 }}>{request.description}</p>

                    <div className="portal-form-grid" style={{ marginTop: 10 }}>
                      <div><strong>Passport</strong><div>{member.passportPhoto ? "Uploaded" : "Missing"}</div></div>
                      <div><strong>ID Front</strong><div>{member.documents?.nationalIdFront || member.nationalIdFront ? "Uploaded" : "Missing"}</div></div>
                      <div><strong>ID Back</strong><div>{member.documents?.nationalIdBack || member.nationalIdBack ? "Uploaded" : "Missing"}</div></div>
                      <div><strong>Signature</strong><div>{member.documents?.signature || member.signature ? "Uploaded" : "Missing"}</div></div>
                      <div><strong>Constitution</strong><div>{member.acceptedConstitution ? "Accepted" : "Pending"}</div></div>
                      <div><strong>Privacy Policy</strong><div>{member.acceptedPrivacyPolicy ? "Accepted" : "Pending"}</div></div>
                      <div><strong>Declaration</strong><div>{member.acceptedDeclaration ? "Accepted" : "Pending"}</div></div>
                      <div><strong>Profile completion</strong><div>{member.profileCompletion ?? member.profileCompletion === 0 ? `${member.profileCompletion}%` : "—"}</div></div>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      <div><strong>Phone:</strong> {member.phone || "—"} | <strong>Email:</strong> {member.email || "—"}</div>
                      <div><strong>National ID:</strong> {member.nationalId || "—"} | <strong>Gender:</strong> {member.gender || "—"} | <strong>DOB:</strong> {member.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : "—"}</div>
                      <div><strong>Address:</strong> {member.physicalAddress || "—"}</div>
                      <div><strong>Site station:</strong> {member.siteStation === "None of above" ? member.customSiteStation || "—" : member.siteStation || "—"}</div>
                      <div><strong>Occupation:</strong> {member.occupation || "—"} | <strong>Employer:</strong> {member.employer || "—"} | <strong>Income:</strong> {member.monthlyIncome || "—"}</div>
                      <div><strong>M-Pesa:</strong> {member.mpesaNumber || "—"} | <strong>Bank:</strong> {member.bankName || "—"} / {member.bankBranch || "—"} | <strong>Account:</strong> {member.accountNumber || "—"}</div>
                      <div><strong>Emergency contact:</strong> {member.emergencyContact?.fullName || "—"} {member.emergencyContact?.phone ? `(${member.emergencyContact.phone})` : ""}</div>
                      <div><strong>Next of kin:</strong> {member.nextOfKin?.fullName || "—"} {member.nextOfKin?.phone ? `(${member.nextOfKin.phone})` : ""}</div>
                    </div>

                    {docs.length > 0 && (
                      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {docs.map((doc, index) => (
                          <a key={`${request._id}-${index}`} href={doc.startsWith("http") ? doc : `${API.defaults.baseURL.replace(/\/api$/, "")}${doc}`} target="_blank" rel="noreferrer">
                            Doc {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="portal-panel" style={{ marginTop: 18 }}>
          <div className="portal-panel-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Phone size={18} />
            <h2 style={{ margin: 0 }}>Website contact submissions</h2>
          </div>
          {contactMessages.length === 0 ? (
            <div className="portal-empty">No contact messages yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {contactMessages.map((item) => (
                <article key={item._id} className="portal-card" style={{ border: "1px solid rgba(15,23,42,.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <strong>{item.phone || "No phone provided"}{item.email ? ` • ${item.email}` : ""}</strong>
                      <div style={{ color: "#64748b", marginTop: 6 }}>{item.fullName}</div>
                      <div style={{ fontWeight: 700, marginTop: 8 }}>{item.subject}</div>
                    </div>
                    <button type="button" className="portal-btn danger" onClick={() => deleteContactMessage(item._id)}>Delete</button>
                  </div>
                  <p style={{ marginTop: 8, lineHeight: 1.7 }}>{item.message}</p>
                  <small style={{ color: "#94a3b8" }}>{new Date(item.createdAt).toLocaleString()}</small>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

const money=v=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:0}).format(Number(v||0));
