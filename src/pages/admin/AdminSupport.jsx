import { confirmAction } from "../../utils/modernDialog";

import { useEffect, useState } from "react";
import { BellRing, Mail, Phone, UserPlus, Megaphone, MessageSquareText, ClipboardList, Reply, Archive, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import { createAdminMember, getAdminMembers } from "../../services/adminService";
import "../../styles/portalModule.css";

export default function AdminSupport() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = String(role || "").toLowerCase() === "superadmin";
  const [members, setMembers] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [permissionRequests, setPermissionRequests] = useState([]);
  const [selectedPermission, setSelectedPermission] = useState(null);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [permissionReviewReason, setPermissionReviewReason] = useState("");
  const [selectedSupport, setSelectedSupport] = useState(null);
  const [supportDetailLoading, setSupportDetailLoading] = useState(false);
  const [supportStage, setSupportStage] = useState("");
  const [supportApprovedAmount, setSupportApprovedAmount] = useState("");
  const [supportSettlementOptions, setSupportSettlementOptions] = useState([]);
  const [supportSettlementTransactionId, setSupportSettlementTransactionId] = useState("");
  const [supportRemarks, setSupportRemarks] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [supportReviewError, setSupportReviewError] = useState("");
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
  const [contactReplyId, setContactReplyId] = useState("");
  const [contactReply, setContactReply] = useState("");
  const [contactBusy, setContactBusy] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const [membersRes, contactsRes, supportRes, permissionsRes] = await Promise.all([
        getAdminMembers({ page: 1, limit: 100 }),
        API.get("/contact"),
        API.get("/member/support-requests"),
        API.get("/member/support-requests/permissions"),
      ]);

      setMembers(Array.isArray(membersRes?.members) ? membersRes.members : []);
      setContactMessages(Array.isArray(contactsRes?.data?.messages) ? contactsRes.data.messages : []);
      setSupportRequests(Array.isArray(supportRes?.data?.requests) ? supportRes.data.requests : []);
      setPermissionRequests(Array.isArray(permissionsRes?.data?.permissionRequests) ? permissionsRes.data.permissionRequests : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to load support data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openSupportRequest = async (request) => {
    if (!request?._id) return;
    setSupportReviewError("");
    setSupportStage(request.status || "");
    setSupportApprovedAmount(request.approvedAmount ?? "");
    setSupportSettlementTransactionId(String(request.settlementTransactionId || ""));
    setSupportSettlementOptions([]);
    setSupportRemarks("");
    setSelectedSupport(request);
    setSupportDetailLoading(true);
    try {
      const { data } = await API.get(`/member/support-requests/${request._id}`);
      if (data?.success && data.request) {
        const detail = data.request;
        setSelectedSupport(detail);
        setSupportStage(detail.status || "");
        setSupportApprovedAmount(detail.approvedAmount ?? "");
        setSupportSettlementTransactionId(String(detail.settlementTransactionId || ""));
        const settlementResponse = await API.get(`/claims/support/${detail._id}/settlements`).catch(() => ({ data:{ settlements:[] } }));
        setSupportSettlementOptions(Array.isArray(settlementResponse.data?.settlements) ? settlementResponse.data.settlements : []);
      }
    } catch (e) {
      setSupportReviewError(e.response?.data?.message || e.message || "Unable to load the complete support request.");
    } finally {
      setSupportDetailLoading(false);
    }
  };

  useEffect(() => {
    const requestId = new URLSearchParams(location.search).get("requestId");
    if (!requestId) {
      setSelectedSupport(null);
      return;
    }
    const existing = supportRequests.find((item) => String(item._id) === String(requestId));
    if (existing) {
      openSupportRequest(existing);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await API.get(`/member/support-requests/${requestId}`);
        if (!cancelled && data?.success && data.request) openSupportRequest(data.request);
      } catch (e) {
        if (!cancelled) setSupportReviewError(e.response?.data?.message || e.message || "Unable to open this support request.");
      }
    })();
    return () => { cancelled = true; };
  }, [location.search, supportRequests]);

  useEffect(() => {
    if (!selectedSupport && !selectedPermission) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape" || permissionBusy || supportBusy) return;
      if (selectedSupport) setSelectedSupport(null);
      if (selectedPermission) setSelectedPermission(null);
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [selectedSupport, selectedPermission, permissionBusy, supportBusy]);

  const saveSupportReview = async () => {
    if (!selectedSupport?._id || !supportStage) return;
    try {
      setSupportBusy(true);
      setSupportReviewError("");
      const payload = {
        status: supportStage,
        approvedAmount: supportStage === "Approved" ? Number(supportApprovedAmount || selectedSupport.requestedAmount || 0) : selectedSupport.approvedAmount,
        remarks: supportRemarks.trim(),
      };
      if (supportStage === "Paid" || supportStage === "Completed") payload.settlementTransactionId = supportSettlementTransactionId;
      if (supportStage === "Rejected") payload.rejectionReason = supportRemarks.trim();
      const { data } = await API.put(`/member/support-requests/${selectedSupport._id}`, payload);
      if (!data?.success) throw new Error(data?.message || "Unable to update support request.");
      setSuccess(data.message || `Support request moved to ${supportStage}.`);
      setSelectedSupport(null);
      navigate(location.pathname, { replace: true });
      await load();
      window.dispatchEvent(new Event("benovelent:refresh-action-center"));
    } catch (e) {
      setSupportReviewError(e.response?.data?.message || e.message || "Unable to update support request.");
    } finally {
      setSupportBusy(false);
    }
  };

  useEffect(() => {
    const permissionRequestId = new URLSearchParams(location.search).get("permissionRequestId");
    if (!permissionRequestId) {
      setSelectedPermission(null);
      return;
    }
    const existing = permissionRequests.find((item) => String(item._id) === String(permissionRequestId));
    if (existing) {
      setSelectedPermission(existing);
      setPermissionReviewReason("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await API.get(`/member/support-requests/permissions/${permissionRequestId}`);
        if (!cancelled && data?.success) {
          setSelectedPermission(data.permissionRequest || null);
          setPermissionReviewReason("");
        }
      } catch (e) {
        if (!cancelled) setPermissionError(e.response?.data?.message || "Unable to open this permission request.");
      }
    })();
    return () => { cancelled = true; };
  }, [location.search, permissionRequests]);

  const reviewPermission = async (decision) => {
    if (!selectedPermission?._id) return;
    if (decision === "reject" && !permissionReviewReason.trim()) {
      setPermissionError("A rejection reason is required.");
      return;
    }
    try {
      setPermissionBusy(true);
      setPermissionError("");
      const path = decision === "approve" ? "approve" : "reject";
      const { data } = await API.put(`/member/support-requests/permissions/${selectedPermission._id}/${path}`, { reviewReason: permissionReviewReason.trim() });
      if (!data?.success) throw new Error(data?.message || "Unable to review permission request.");
      setSuccess(data.message || (decision === "approve" ? "Permission approved." : "Permission rejected."));
      setSelectedPermission(null);
      window.history.replaceState({}, "", window.location.pathname);
      await load();
      window.dispatchEvent(new Event("benovelent:refresh-action-center"));
    } catch (e) {
      setPermissionError(e.response?.data?.message || e.message || "Unable to review permission request.");
    } finally {
      setPermissionBusy(false);
    }
  };

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

  const updateContactStatus = async (id, status) => {
    if (!id || !status) return;
    try {
      setContactBusy(id); setError(""); setSuccess("");
      await API.patch(`/contact/${id}`, { status });
      setSuccess(status === "archived" ? "Contact submission archived." : status === "replied" ? "Contact marked replied." : "Contact marked read.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to update contact message.");
    } finally { setContactBusy(""); }
  };

  const replyContactMessage = async (id) => {
    const body = contactReply.trim();
    if (!id || !body) { setError("Enter a reply before sending."); return; }
    try {
      setContactBusy(id); setError(""); setSuccess("");
      const { data } = await API.post(`/contact/${id}/reply`, { message: body });
      setContactReply(""); setContactReplyId("");
      setSuccess(data?.message || "Reply saved.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Unable to send the contact reply.");
    } finally { setContactBusy(""); }
  };

  const archiveContactMessage = async (id) => {
    if (!id) return;
    if (!await confirmAction("Archive this contact submission? Its message and reply history will be retained.")) return;
    await updateContactStatus(id, "archived");
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
          <div className="portal-panel-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={18} />
            <div>
              <h2 style={{ margin: 0 }}>Support edit/delete permissions</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b" }}>Review member requests before any support request can be changed or removed.</p>
            </div>
          </div>
          {permissionRequests.length === 0 ? (
            <div className="portal-empty">No pending support permission requests.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {permissionRequests.map((item) => {
                const member = item.member || {};
                const request = item.sourceRequest || {};
                return (
                  <article key={item._id} className="portal-card" style={{ border: "1px solid rgba(15,23,42,.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div>
                        <strong>{member.fullName || "Member"}{member.memberNumber ? ` • ${member.memberNumber}` : ""}</strong>
                        <div style={{ marginTop: 5, color: "#64748b" }}>{request.supportType || "Support request"} • {String(item.requestedAction || "").toUpperCase()} • {item.sourceId}</div>
                        <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>{item.reason || "No reason supplied."}</p>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="portal-badge">{item.status}</span>
                        <button type="button" className="portal-btn secondary" onClick={() => { setPermissionError(""); setPermissionReviewReason(""); setSelectedPermission(item); }}><ShieldCheck size={15} /> Review</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
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
                        <button type="button" className="portal-btn secondary" onClick={() => openSupportRequest(request)}>Review</button>
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
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {item.status === "new" && <button type="button" className="portal-btn secondary" disabled={contactBusy===item._id} onClick={() => updateContactStatus(item._id, "read")}>Mark read</button>}
                      {item.status !== "archived" && <button type="button" className="portal-btn secondary" disabled={contactBusy===item._id} onClick={() => { setContactReplyId(item._id); setContactReply(""); }}> <Reply size={15}/> Reply</button>}
                      {item.status !== "replied" && item.status !== "archived" && <button type="button" className="portal-btn secondary" disabled={contactBusy===item._id} onClick={() => updateContactStatus(item._id, "replied")}><CheckCircle2 size={15}/> Mark replied</button>}
                      {item.status !== "archived" && <button type="button" className="portal-btn danger" disabled={contactBusy===item._id} onClick={() => archiveContactMessage(item._id)}><Archive size={15}/> Archive</button>}
                    </div>
                  </div>
                  <p style={{ marginTop: 8, lineHeight: 1.7 }}>{item.message}</p>
                  <small style={{ color: "#94a3b8" }}>{new Date(item.createdAt).toLocaleString()} · Status: {item.status || "new"}</small>
                  {Array.isArray(item.replies) && item.replies.length > 0 && (
                    <div style={{ marginTop: 12, borderTop: "1px solid rgba(15,23,42,.08)", paddingTop: 12 }}>
                      <strong>Reply history</strong>
                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        {item.replies.map((reply, index) => <div key={`${item._id}-reply-${index}`} style={{ padding: 10, borderRadius: 10, background: "#f8fafc" }}><div style={{ lineHeight: 1.6 }}>{reply.body}</div><small style={{ color: "#64748b" }}>{reply.repliedAt ? new Date(reply.repliedAt).toLocaleString() : ""} · {reply.emailAccepted ? `Email accepted${reply.emailProvider ? ` by ${reply.emailProvider}` : ""}` : `Email not accepted: ${reply.emailError || "not configured"}`}</small></div>)}
                      </div>
                    </div>
                  )}
                  {contactReplyId === item._id && (
                    <div className="portal-card" style={{ marginTop: 12, background: "#f8fafc" }}>
                      <div className="portal-field"><label htmlFor={`contact-reply-${item._id}`}>Reply to {item.email}</label><textarea id={`contact-reply-${item._id}`} rows="5" value={contactReply} onChange={(e) => setContactReply(e.target.value)} placeholder="Write the response that should be saved and emailed." /></div>
                      <div className="portal-actions"><button type="button" className="portal-btn primary" disabled={contactBusy===item._id} onClick={() => replyContactMessage(item._id)}>{contactBusy===item._id ? "Sending..." : "Send reply"}</button><button type="button" className="portal-btn secondary" disabled={contactBusy===item._id} onClick={() => { setContactReplyId(""); setContactReply(""); }}>Cancel</button></div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedSupport && (
          <div className="portal-modal-backdrop claim-review-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !supportBusy) setSelectedSupport(null); }}>
            <section className="portal-modal-card claim-review-dialog" role="dialog" aria-modal="true" aria-labelledby="support-review-title">
              <div className="portal-modal-head claim-review-header">
                <div>
                  <span>SUPPORT REQUEST REVIEW</span>
                  <h2 id="support-review-title">Review support request</h2>
                  <p>{selectedSupport.member?.fullName || "Member"} • {selectedSupport.supportType || "Support"} • {selectedSupport._id}</p>
                </div>
                <button type="button" className="portal-btn secondary" disabled={supportBusy} onClick={() => { setSelectedSupport(null); navigate(location.pathname, { replace: true }); }}>Close</button>
              </div>
              <div className="claim-review-body">
                {supportDetailLoading && <div className="portal-empty">Loading complete request details…</div>}
                <div className="portal-form-grid">
                  <div><strong>Member</strong><div>{selectedSupport.member?.fullName || "—"}</div></div>
                  <div><strong>Employee number</strong><div>{selectedSupport.member?.memberNumber || "—"}</div></div>
                  <div><strong>Support type</strong><div>{selectedSupport.supportType || "—"}</div></div>
                  <div><strong>Policy</strong><div>{selectedSupport.policyName || selectedSupport.policySlug || "—"}</div></div>
                  <div><strong>Current status</strong><div>{selectedSupport.status || "—"}</div></div>
                  <div><strong>Requested amount</strong><div>{money(selectedSupport.requestedAmount)}</div></div>
                  <div><strong>Approved amount</strong><div>{selectedSupport.approvedAmount === null || selectedSupport.approvedAmount === undefined ? "Unavailable" : money(selectedSupport.approvedAmount)}</div></div>
                  <div><strong>Submitted</strong><div>{selectedSupport.createdAt ? new Date(selectedSupport.createdAt).toLocaleString() : "—"}</div></div>
                  <div><strong>Last updated</strong><div>{selectedSupport.updatedAt ? new Date(selectedSupport.updatedAt).toLocaleString() : "—"}</div></div>
                  {selectedSupport.settlementTransactionId && <div><strong>Settlement transaction</strong><div>{supportSettlementOptions.find((row) => String(row._id) === String(selectedSupport.settlementTransactionId))?.transactionNumber || "Linked authoritative finance transaction"}</div></div>}
                </div>

                <div className="portal-card" style={{ marginTop: 14, background: "#f8fafc" }}>
                  <strong>Description</strong>
                  <p style={{ margin: "8px 0 0", lineHeight: 1.7 }}>{selectedSupport.description || "No description supplied."}</p>
                </div>

                {Array.isArray(selectedSupport.documents) && selectedSupport.documents.length > 0 && (
                  <div className="portal-card" style={{ marginTop: 14 }}>
                    <strong>Documents</strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                      {selectedSupport.documents.map((doc, index) => {
                        const href = doc?.fileUrl || doc?.url || doc?.path || (typeof doc === "string" ? doc : "");
                        return href ? <a key={`${selectedSupport._id}-review-doc-${index}`} href={href.startsWith("http") ? href : `${API.defaults.baseURL.replace(/\/api$/, "")}${href}`} target="_blank" rel="noreferrer" className="portal-btn secondary">{doc?.label || doc?.fileName || `Document ${index + 1}`}</a> : null;
                      })}
                    </div>
                  </div>
                )}

                {Array.isArray(selectedSupport.timeline) && selectedSupport.timeline.length > 0 && (
                  <div className="portal-card" style={{ marginTop: 14 }}>
                    <strong>Workflow timeline</strong>
                    <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
                      {[...selectedSupport.timeline].reverse().map((entry, index) => (
                        <div key={`${selectedSupport._id}-timeline-${index}`} style={{ padding: 10, borderRadius: 10, background: "#f8fafc" }}>
                          <strong>{entry.status || "Workflow update"}</strong>
                          <div style={{ marginTop: 4, lineHeight: 1.6 }}>{entry.remarks || entry.reason || "—"}</div>
                          {entry.updatedAt && <small style={{ color: "#64748b" }}>{new Date(entry.updatedAt).toLocaleString()}</small>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="portal-form-grid" style={{ marginTop: 14 }}>
                  <div className="portal-field">
                    <label htmlFor="support-review-stage">Workflow stage</label>
                    <select id="support-review-stage" value={supportStage} onChange={(event) => setSupportStage(event.target.value)}>
                      {['Pending','Under Review','Documents Required','Eligibility Review','Approval Review','Approved','Disbursement Pending','Paid','Completed','Rejected','Cancelled','Closed'].map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  {supportStage === "Approved" && (
                    <div className="portal-field">
                      <label htmlFor="support-review-approved-amount">Approved amount</label>
                      <input id="support-review-approved-amount" type="number" min="0" inputMode="decimal" value={supportApprovedAmount} onChange={(event) => setSupportApprovedAmount(event.target.value)} />
                    </div>
                  )}
                  {(supportStage === "Paid" || supportStage === "Completed") && (
                    <div className="portal-field">
                      <label htmlFor="support-review-settlement">Authoritative settlement</label>
                      <select id="support-review-settlement" value={supportSettlementTransactionId} onChange={(event) => setSupportSettlementTransactionId(event.target.value)} required>
                        <option value="">Select a completed claim-finance settlement</option>
                        {supportSettlementOptions.map((row) => <option key={row._id} value={row._id}>{row.transactionNumber} • {money(row.amount)} • {row.paymentMethod || "—"}</option>)}
                      </select>
                      {supportSettlementOptions.length === 0 && <small>No completed linked claim-finance settlement is available.</small>}
                    </div>
                  )}
                </div>
                <div className="portal-field" style={{ marginTop: 14 }}>
                  <label htmlFor="support-review-remarks">Review notes {supportStage === "Rejected" ? "(required for rejection)" : ""}</label>
                  <textarea id="support-review-remarks" rows="5" value={supportRemarks} onChange={(event) => setSupportRemarks(event.target.value)} placeholder="Record the decision, missing evidence, or processing notes." />
                </div>
                {supportReviewError && <div className="portal-alert" role="alert">{supportReviewError}</div>}
              </div>
              <footer className="claim-review-footer">
                <button type="button" className="portal-btn primary" disabled={supportBusy || supportDetailLoading} onClick={saveSupportReview}>{supportBusy ? "Saving…" : "Save review"}</button>
                <button type="button" className="portal-btn secondary" disabled={supportBusy} onClick={() => { setSelectedSupport(null); navigate(location.pathname, { replace: true }); }}>Cancel</button>
              </footer>
            </section>
          </div>
        )}

        {selectedPermission && (
          <div className="portal-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !permissionBusy) setSelectedPermission(null); }}>
            <section className="portal-modal-card claim-review-dialog" role="dialog" aria-modal="true" aria-labelledby="support-permission-review-title">
              <div className="portal-modal-head claim-review-header">
                <div>
                  <span>PERMISSION REVIEW</span>
                  <h2 id="support-permission-review-title">Support {selectedPermission.requestedAction} permission</h2>
                  <p>{selectedPermission.member?.fullName || "Member"} • Request {selectedPermission.sourceId}</p>
                </div>
                <button type="button" className="portal-btn secondary" disabled={permissionBusy} onClick={() => setSelectedPermission(null)}>Close</button>
              </div>
              <div className="claim-review-body">
                <div className="portal-form-grid">
                  <div><strong>Member</strong><div>{selectedPermission.member?.fullName || "—"}</div></div>
                  <div><strong>Employee number</strong><div>{selectedPermission.member?.memberNumber || "—"}</div></div>
                  <div><strong>Request type</strong><div>{selectedPermission.sourceRequest?.supportType || "Support"}</div></div>
                  <div><strong>Current status</strong><div>{selectedPermission.sourceRequest?.status || "—"}</div></div>
                  <div><strong>Requested action</strong><div>{selectedPermission.requestedAction}</div></div>
                  <div><strong>Permission requested</strong><div>{selectedPermission.requestedAt ? new Date(selectedPermission.requestedAt).toLocaleString() : "—"}</div></div>
                </div>
                <div className="portal-card" style={{ marginTop: 14, background: "#f8fafc" }}>
                  <strong>Member reason</strong>
                  <p style={{ margin: "8px 0 0", lineHeight: 1.7 }}>{selectedPermission.reason || "No reason supplied."}</p>
                </div>
                <div className="portal-field" style={{ marginTop: 14 }}>
                  <label htmlFor="support-permission-review-reason">Review reason {selectedPermission.requestedAction === "delete" ? "(optional for approval, required for rejection)" : "(optional for approval, required for rejection)"}</label>
                  <textarea id="support-permission-review-reason" rows="4" value={permissionReviewReason} onChange={(event) => setPermissionReviewReason(event.target.value)} placeholder="Explain the decision for the audit trail." />
                </div>
                {permissionError && <div className="portal-alert" role="alert">{permissionError}</div>}
              </div>
              <footer className="claim-review-footer">
                <button type="button" className="portal-btn primary" disabled={permissionBusy} onClick={() => reviewPermission("approve")}><CheckCircle2 size={15} /> {permissionBusy ? "Working…" : "Approve"}</button>
                <button type="button" className="portal-btn danger" disabled={permissionBusy} onClick={() => reviewPermission("reject")}><XCircle size={15} /> Reject</button>
                <button type="button" className="portal-btn secondary" disabled={permissionBusy} onClick={() => setSelectedPermission(null)}>Cancel</button>
              </footer>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const money=v=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:0}).format(Number(v||0));
