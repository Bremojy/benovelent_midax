import { confirmAction } from "../../utils/modernDialog";

import { useEffect, useState } from "react";
import { BellRing, Mail, Phone, UserPlus, Megaphone, MessageSquareText, ClipboardList } from "lucide-react";
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
  const [invite, setInvite] = useState({ memberNumber: "", fullName: "", username: "", phone: "", email: "", department: "", position: "",  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [broadcast, setBroadcast] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [broadcastRequestId, setBroadcastRequestId] = useState(() => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const [deliveryResult, setDeliveryResult] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const [membersRes, contactsRes, supportRes] = await Promise.all([
        getAdminMembers({ page: 1, limit: 100 }),
        API.get("/contact"),
        API.get("/member/support-requests"),
      ]);

      setMembers(Array.isArray(membersRes?.members) ? membersRes.members : []);
      setContactMessages(Array.isArray(contactsRes?.data?.messages) ? contactsRes.data.messages : []);
      setSupportRequests(Array.isArray(supportRes?.data?.requests) ? supportRes.data.requests : []);
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
    setDeliveryResult(null);

    if (!form.title || !form.message) {
      setError("Complete the subject and message.");
      return;
    }

    try {
      setSending(true);
      const payload = broadcast
        ? { requestId: broadcastRequestId, title: form.title, message: form.message, smsText: form.message, broadcastSms: smsEnabled, inApp: true }
        : { recipient: form.recipient, recipientModel: "Member", title: form.title, message: form.message, type: "system", senderModel: "Admin" };

      if (!broadcast && !form.recipient) {
        setError("Select a member or enable broadcast.");
        return;
      }

      const url = broadcast ? "/notifications/broadcast" : "/notifications";
      const { data } = await API.post(url, payload);
      if (!data?.success) throw new Error(data?.message || "Unable to send support message.");

      const result = data?.result || {};
      const broadcastResult = data?.broadcast || result?.broadcast || {};
      const inAppSent = Number(data?.inAppNotifications ?? broadcastResult.inAppSent ?? 0);
      const emailSent = Number(result?.emailResult?.sent ?? broadcastResult.emailSent ?? 0);
      const emailAttempted = Number(result?.emailResult?.attempted ?? broadcastResult.emailAttempted ?? 0);
      const emailFailed = Number(result?.emailResult?.failed ?? broadcastResult.emailFailed ?? 0);
      const emailSkipped = Number(result?.emailResult?.skipped ?? broadcastResult.emailSkipped ?? Math.max(0, emailAttempted - emailSent - emailFailed));
      const smsSent = Number(result?.smsResult?.sent ?? broadcastResult.smsSent ?? 0);
      const smsAttempted = Number(result?.smsResult?.attempted ?? broadcastResult.smsAttempted ?? 0);
      const smsFailed = Number(result?.smsResult?.failed ?? broadcastResult.smsFailed ?? 0);
      const smsSkipped = Number(result?.smsResult?.skipped ?? broadcastResult.smsSkipped ?? Math.max(0, smsAttempted - smsSent - smsFailed));
      const pushResult = result?.pushResult || {};
      const pushSent = Number(pushResult.sent ?? broadcastResult.pushSent ?? 0);
      const pushSkipped = Number(pushResult.skipped ?? broadcastResult.pushSkipped ?? 0);
      const pushFailed = Number(pushResult.failed ?? broadcastResult.pushFailed ?? 0);

      setDeliveryResult({
        targetedUsers: Number(broadcastResult.targetedUsers ?? 0),
        inAppSent,
        pushSent,
        pushSkipped,
        pushFailed,
        emailSent,
        emailAttempted,
        emailSkipped,
        emailFailed,
        smsSent,
        smsAttempted,
        smsSkipped,
        smsFailed,
        duplicate: Boolean(data?.duplicate),
      });
      setSuccess(
        broadcast
          ? `${data?.duplicate ? "Broadcast already processed. Existing delivery results:" : "Broadcast processed."} In-app: ${inAppSent}. Push: ${pushSent} sent, ${pushSkipped} skipped, ${pushFailed} failed. Email: ${emailSent}/${emailAttempted} sent${emailFailed ? `, ${emailFailed} failed` : ""}. SMS: ${smsSent}/${smsAttempted} sent${smsFailed ? `, ${smsFailed} failed` : ""}${emailSkipped || smsSkipped ? ` (${emailSkipped} email / ${smsSkipped} SMS skipped)` : ""}.`
          : "Message sent successfully."
      );
      setForm({ recipient: "", title: "", message: "" });
      if (broadcast) setBroadcastRequestId(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const deleteContactMessage = async (id) => {
    if (!id) return;
    if (!await confirmAction("Delete this contact submission?")) return;
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
    if (!await confirmAction("Delete this support request permanently?")) return;
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
        memberNumber: invite.memberNumber.trim().toUpperCase(),
        fullName: invite.fullName.trim(),
        username: invite.username.trim(),
        phone: invite.phone.trim(),
        email: invite.email.trim(),
        department: invite.department.trim(),
        position: invite.position.trim(),
      };

      const { data } = await createAdminMember(payload);
      const tempPassword = data?.temporaryPassword || "Check the success response";
      const emailStatus = data?.delivery?.email?.sent ? "email sent" : data?.delivery?.email?.reason ? `email skipped (${data.delivery.email.reason})` : "email status unknown";
      const smsStatus = data?.delivery?.sms?.sent ? "sms sent" : data?.delivery?.sms?.reason ? `sms skipped (${data.delivery.sms.reason})` : "sms status unknown";

      setSuccess(`Member invited successfully. Temporary password: ${tempPassword}. Delivery: ${emailStatus}, ${smsStatus}.`);
      setInvite({ memberNumber: "", fullName: "", username: "", phone: "", email: "", department: "", position: "",  });
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
            <span>ADMIN COMMUNICATIONS</span>
            <h1>Support &amp; Broadcast Centre</h1>
            <p>Separate broadcast delivery, direct messages, support requests and website inbox work so each workflow is auditable.</p>
          </div>
        </header>

        {error && <div className="portal-alert">{error}</div>}
        {success && <div className="portal-alert success">{success}</div>}

        <section className="portal-panel">
          <div className="portal-panel-header" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <Mail size={18} />
            <h2 style={{ margin: 0 }}>Broadcast / Direct message</h2>
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
                <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Claim update" />
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
            <button className="portal-btn" type="submit" disabled={sending}>{sending ? "Sending..." : broadcast ? "Send Broadcast" : "Send Direct Message"}</button>
          </form>
          <p style={{ marginTop: 12, color: "#64748b" }}>
            Broadcasts create auditable in-app delivery records. Email and SMS delivery are provider-dependent; each result is reported separately.
          </p>
          {deliveryResult && (
            <div className="portal-card" style={{ marginTop: 14 }}>
              <strong>Delivery results</strong>
              <div className="portal-form-grid" style={{ marginTop: 10 }}>
                <div><small>Targeted recipients</small><div>{deliveryResult.targetedUsers}</div></div>
                <div><small>In-app sent</small><div>{deliveryResult.inAppSent}</div></div>
                <div><small>Push</small><div>{deliveryResult.pushSent} sent · {deliveryResult.pushSkipped} skipped · {deliveryResult.pushFailed} failed</div></div>
                <div><small>Email</small><div>{deliveryResult.emailSent}/{deliveryResult.emailAttempted} sent · {deliveryResult.emailFailed} failed</div></div>
                <div><small>SMS</small><div>{deliveryResult.smsSent}/{deliveryResult.smsAttempted} sent · {deliveryResult.smsFailed} failed</div></div>
              </div>
            </div>
          )}
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
              ].map(([key, label]) => (
                <div className="portal-field" key={key}>
                  <label>{label}</label>
                  <input
                    value={invite[key]}
                    onChange={(e) => setInvite({ ...invite, [key]: e.target.value })}
                    placeholder={label}
                    type={key === "email" ? "email" : "text"}
                  />
                </div>
              ))}
            </div>
            <button className="portal-btn primary" type="submit" disabled={inviting}>{inviting ? "Creating..." : "Create member invite"}</button>
          </form>
        </section>

        <section className="portal-panel" style={{ marginTop: 18 }}>
          <div className="portal-panel-header"><h2>Support requests</h2></div>
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
                      <div><strong>Position:</strong> {member.position || "—"} | <strong>Employer:</strong> {member.employer || "—"}</div>
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
            <h2 style={{ margin: 0 }}>Contact / inbox</h2>
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
