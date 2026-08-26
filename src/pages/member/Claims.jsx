import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, HeartHandshake, RefreshCw, Smartphone, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

const STAGES = ["Pending", "Under Review", "Documents Required", "Eligibility Review", "Approval Review", "Approved", "Disbursement Pending", "Paid", "Completed", "Rejected", "Cancelled", "Closed"];
const stageCopy = {
  Pending: "Submitted and awaiting assignment.",
  "Under Review": "An administrator is checking the application and documents.",
  "Documents Required": "More or clearer supporting documents are needed.",
  "Eligibility Review": "Eligibility, membership and scheme rules are being checked.",
  "Approval Review": "The case is being considered for final approval.",
  Approved: "Approved. The next step is processing/disbursement.",
  "Disbursement Pending": "Approval is complete; funds are being prepared.",
  Paid: "Payment/disbursement has been recorded.",
  Completed: "The support process is complete.",
  Rejected: "The request was not approved. Community assistance may be available.",
  Cancelled: "This application has been cancelled.",
  Closed: "This application is closed.",
};
const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const fmt = (v) => v ? new Date(v).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Claims() {
  const [claims, setClaims] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentConfigured, setPaymentConfigured] = useState(false);
  const [busy, setBusy] = useState("");
  const [target, setTarget] = useState({});
  const [phone, setPhone] = useState({});
  const [paymentStatus, setPaymentStatus] = useState({});
  const [amount, setAmount] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const [claimsRes, casesRes, configRes] = await Promise.all([
        API.get("/member/claims"),
        API.get("/payments/community-assistance"),
        API.get("/payments/config"),
      ]);
      setClaims(Array.isArray(claimsRes.data?.claims) ? claimsRes.data.claims : []);
      setCampaigns(Array.isArray(casesRes.data?.campaigns) ? casesRes.data.campaigns : []);
      setPaymentConfigured(Boolean(configRes.data?.configured));
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Unable to load your claims.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const ownCampaigns = useMemo(() => new Set(claims.map((claim) => String(claim._id))), [claims]);
  const opportunities = useMemo(() => campaigns.filter((campaign) => campaign.enabled && ["open", "target_reached"].includes(campaign.status)), [campaigns]);
  const campaignFor = (claim) => campaigns.find((x) => String(x.referenceId) === String(claim._id) && String(x.referenceModel || "").toLowerCase().includes(String(claim.sourceType || "").toLowerCase()));

  const requestCommunity = async (claim) => {
    try {
      setBusy(`community-${claim._id}`);
      const t = Number(target[claim._id] || claim.requestedAmount || claim.amount || 0);
      const referenceModel = { medical: "MedicalSupport", funeral: "FuneralSupport", education: "EducationSupport", support: "SupportRequest" }[claim.sourceType];
      const { data } = await API.post("/claims/community/request", { referenceModel, referenceId: claim._id, targetAmount: t });
      if (!data?.success) throw new Error(data?.message || "Unable to create community support request.");
      toast.success("Community support request created. It can now receive voluntary M-PESA contributions.");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message || "Unable to create community support request.");
    } finally {
      setBusy("");
    }
  };

  const contribute = async (campaign) => {
    try {
      setBusy(`pay-${campaign._id}`);
      if (!paymentConfigured) throw new Error("M-PESA is not currently configured by the administrator.");
      const a = Number(amount[campaign._id] || 0);
      if (a <= 0) throw new Error("Enter a contribution amount.");
      const payload = { purpose: "community_assistance", referenceId: campaign._id, amount: a, phoneNumber: phone[campaign._id] || undefined };
      const { data } = await API.post("/payments/stk", payload);
      if (!data?.success) throw new Error(data?.message || "Unable to start M-PESA payment.");
      const transactionId = String(data?.transactionId || "");
      setPaymentStatus((current) => ({ ...current, [campaign._id]: { status: "pending", transactionId } }));
      toast.success(data?.message || "Safaricom accepted the STK request. Check the selected M-PESA phone for the payment prompt.");
      if (transactionId) {
        let attempts = 0;
        const poll = async () => {
          attempts += 1;
          try {
            const { data: transactionData } = await API.get(`/payments/transactions/${transactionId}`);
            const tx = transactionData?.transaction;
            if (tx?.status === "successful") {
              setPaymentStatus((current) => ({ ...current, [campaign._id]: { status: "successful", transactionId, receipt: tx.mpesaReceiptNumber || "recorded" } }));
              toast.success(`Community contribution confirmed. M-PESA receipt: ${tx.mpesaReceiptNumber || "recorded"}.`);
              await load();
              return;
            }
            if (tx?.status === "failed") {
              setPaymentStatus((current) => ({ ...current, [campaign._id]: { status: "failed", transactionId } }));
              toast.error(tx.resultDescription || "The M-PESA contribution was not completed.");
              return;
            }
          } catch {}
          if (attempts % 5 === 0) {
            try {
              const { data: queryData } = await API.post("/payments/stk-query", { transactionId });
              const queried = queryData?.transaction;
              if (queried?.status === "successful") {
                setPaymentStatus((current) => ({ ...current, [campaign._id]: { status: "successful", transactionId, receipt: queried.mpesaReceiptNumber || "recorded" } }));
                toast.success(`Community contribution confirmed. M-PESA receipt: ${queried.mpesaReceiptNumber || "recorded"}.`);
                await load();
                return;
              }
              if (queried?.status === "failed") {
                setPaymentStatus((current) => ({ ...current, [campaign._id]: { status: "failed", transactionId } }));
                toast.error(queried.resultDescription || "The M-PESA contribution was not completed.");
                return;
              }
            } catch {}
          }
          if (attempts < 30) window.setTimeout(poll, 2000);
        };
        window.setTimeout(poll, 2000);
      }
    } catch (e) {
      const status = Number(e?.response?.status || 0);
      const body = e?.response?.data || {};
      const apiMessage = body?.message || e?.message;
      const friendly = body?.paymentStage === "oauth"
        ? "M-PESA authentication with Safaricom failed. Ask the administrator to verify the production consumer credentials."
        : Number(body?.upstreamStatus) === 400
          ? "Safaricom rejected the STK request. Ask the administrator to verify the production shortcode, passkey, transaction type and callback URL."
          : apiMessage || "Unable to start M-PESA payment.";
      toast.error(status >= 400 ? friendly : apiMessage || friendly);
    } finally {
      setBusy("");
    }
  };

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>MEMBER CLAIMS</span>
            <h1>Claims & Community Support</h1>
            <p>Track every review stage and, where permitted, help another member through verified community M-PESA assistance.</p>
          </div>
          <button className="portal-btn" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? "Refreshing…" : "Refresh"}</button>
        </header>


        <section className="portal-panel community-member-intro">
          <div className="claim-card-head"><div><span>VERIFIED COMMUNITY SUPPORT</span><h2>Help with a rejected claim</h2><p>Administrators and SuperAdmin can open voluntary assistance for a declined case. Contributions are made through M-PESA and are tracked against a dedicated target.</p></div><ShieldCheck size={30} /></div>
          {!paymentConfigured && <div className="portal-alert" style={{ marginTop: 14 }}>Community cases are visible, but live M-PESA is currently unavailable because the administrator has not configured Daraja production credentials.</div>}
        </section>

        {opportunities.length > 0 && <section className="portal-panel">
          <div className="portal-module-header compact-header"><div><span>COMMUNITY M-PESA OPPORTUNITIES</span><h2>Members you can support</h2><p>Only active verified assistance cases are shown here. Never share private medical or identity information in payments.</p></div></div>
          <div className="portal-grid two">
            {opportunities.map((campaign) => {
              const isOwn = ownCampaigns.has(String(campaign.referenceId)) || false;
              const remaining = Math.max(0, Number(campaign.targetAmount || 0) - Number(campaign.raisedAmount || 0));
              return <article className="portal-panel" key={campaign._id} style={{ margin: 0 }}>
                <div className="claim-card-head"><div><span className="portal-badge">COMMUNITY M-PESA</span><h3>{campaign.title}</h3></div><span className={`portal-badge ${campaign.status === "target_reached" ? "approved" : ""}`}>{campaign.status === "target_reached" ? "Target reached" : "Open"}</span></div>
                <p>{campaign.description}</p>
                <div className="portal-stat-grid compact"><div className="portal-stat"><span>Target</span><strong>{money(campaign.targetAmount)}</strong></div><div className="portal-stat"><span>Raised</span><strong>{money(campaign.raisedAmount)}</strong></div></div>
                <div className="community-progress" aria-label={`Community assistance progress ${Math.min(100, Math.round((Number(campaign.raisedAmount || 0) / Math.max(1, Number(campaign.targetAmount || 1))) * 100))}%`}>
                  <div className="community-progress-track"><span style={{ width: `${Math.min(100, Math.round((Number(campaign.raisedAmount || 0) / Math.max(1, Number(campaign.targetAmount || 1))) * 100))}%` }} /></div>
                  <div className="community-progress-meta"><span>{Math.min(100, Math.round((Number(campaign.raisedAmount || 0) / Math.max(1, Number(campaign.targetAmount || 1))) * 100))}% funded</span><span>{money(Math.max(0, Number(campaign.targetAmount || 0) - Number(campaign.raisedAmount || 0)))} remaining</span></div>
                </div>
                {!isOwn && campaign.status === "open" && <div className="portal-form-grid">
                  <div className="portal-field"><label htmlFor={`community-phone-${campaign._id}`}>M-PESA phone</label><input id={`community-phone-${campaign._id}`} inputMode="tel" autoComplete="tel" value={phone[campaign._id] || ""} onChange={(e) => setPhone({ ...phone, [campaign._id]: e.target.value })} placeholder="07XXXXXXXX or +2547XXXXXXXX" /></div>
                  <div className="portal-field"><label htmlFor={`community-amount-${campaign._id}`}>Contribution (KSh)</label><input id={`community-amount-${campaign._id}`} type="number" inputMode="decimal" min="1" max={remaining} value={amount[campaign._id] || ""} onChange={(e) => setAmount({ ...amount, [campaign._id]: e.target.value })} placeholder={`Up to ${remaining.toLocaleString("en-KE")}`} /></div>
                </div>}
                <div className="portal-actions"><button className="portal-btn primary" disabled={isOwn || campaign.status !== "open" || !paymentConfigured || busy === `pay-${campaign._id}`} onClick={() => contribute(campaign)}><Smartphone size={16} />{isOwn ? "Your assistance case" : busy === `pay-${campaign._id}` ? "Starting…" : "Contribute via M-PESA"}</button></div>
                {paymentStatus[campaign._id]?.status === "pending" && <div className="community-payment-status pending"><Clock3 size={16} /><span>Payment initiated. Complete the M-PESA prompt; this page is checking for confirmation.</span></div>}
                {paymentStatus[campaign._id]?.status === "successful" && <div className="community-payment-status success"><CheckCircle2 size={16} /><span>Contribution confirmed. Receipt: {paymentStatus[campaign._id]?.receipt || "recorded"}.</span></div>}
                {paymentStatus[campaign._id]?.status === "failed" && <div className="community-payment-status error"><ShieldCheck size={16} /><span>Payment was not completed. You can retry when the case remains open.</span></div>}
              </article>;
            })}
          </div>
        </section>}

        {loading ? <div className="portal-empty">Loading your claims…</div> : claims.length === 0 ? <div className="portal-empty"><h3>No claims yet</h3><p>Submit a support request from Support and it will appear here.</p></div> : <div className="portal-grid two">
          {claims.map((claim) => {
            const status = claim.status || "Pending";
            const idx = STAGES.indexOf(status);
            const history = Array.isArray(claim.timeline) ? claim.timeline : [];
            const campaign = campaignFor(claim);
            return <article className="portal-panel" key={`${claim.sourceType}-${claim._id}`}>
              <div className="claim-card-head"><div><span className="portal-badge">{String(claim.supportType || "support").toUpperCase()}</span><h2>{claim.description || claim.purpose || claim.hospitalName || claim.deceasedName || "Support application"}</h2><p>Submitted {fmt(claim.createdAt || claim.applicationDate)}</p></div><span className={`portal-badge ${["Rejected", "Cancelled", "Closed"].includes(status) ? "rejected" : ["Approved", "Paid", "Completed"].includes(status) ? "approved" : ""}`}>{status}</span></div>
              <div className="portal-stat-grid compact"><div className="portal-stat"><span>Requested</span><strong>{money(claim.requestedAmount || claim.amount)}</strong></div><div className="portal-stat"><span>Approved</span><strong>{money(claim.approvedAmount)}</strong></div>{claim.repaymentEnabled && <div className="portal-stat"><span>Repayment balance</span><strong>{money(claim.balance)}</strong></div>}</div>
              {idx >= 0 && <div style={{ marginTop: 12 }}><strong>Review progress</strong><div style={{ display: "grid", gap: 8, marginTop: 8 }}>{STAGES.map((s, i) => <div key={s} style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 8, opacity: i <= idx ? 1 : .42 }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: i <= idx ? "#0f766e" : "#cbd5e1", marginTop: 3 }} /><div><strong>{s}</strong><div style={{ fontSize: 13 }}>{stageCopy[s]}</div></div></div>)}</div></div>}
              {status === "Rejected" && !campaign && <div className="portal-panel" style={{ marginTop: 14, background: "#fff7ed", border: "1px solid #fed7aa" }}><div className="claim-card-head"><div><h3 style={{ margin: 0 }}>Community support is available</h3><p>Request a voluntary M-PESA community assistance campaign for this declined case.</p></div><HeartHandshake size={22} /></div><div className="portal-field" style={{ marginTop: 10 }}><label htmlFor={`claim-target-${claim._id}`}>Community target (KSh)</label><input id={`claim-target-${claim._id}`} type="number" min="1" inputMode="decimal" value={target[claim._id] ?? (claim.requestedAmount || claim.amount || "")} onChange={(e) => setTarget({ ...target, [claim._id]: e.target.value })} /></div><button className="portal-btn primary" style={{ marginTop: 10 }} onClick={() => requestCommunity(claim)} disabled={busy === `community-${claim._id}`}>{busy === `community-${claim._id}` ? "Creating…" : "Request community support"}</button></div>}
              {campaign && <div className="portal-panel" style={{ marginTop: 14, background: "#f8fafc" }}><div className="claim-card-head"><div><span className="portal-badge">COMMUNITY M-PESA</span><h3>{campaign.title}</h3><p>{campaign.description}</p></div><strong>{money(campaign.raisedAmount)} / {money(campaign.targetAmount)}</strong></div><p style={{ color: "#667085", fontSize: 13 }}>Campaign status: {campaign.status}. Contributions are processed through the scheme's M-PESA account.</p></div>}
              {status === "Rejected" && <div className="portal-alert" style={{ marginTop: 12 }}><strong>Reason:</strong> {claim.rejectionReason || claim.remarks || "Your application was declined."}</div>}
              {history.length > 0 && <div style={{ marginTop: 14 }}><h3>Review history</h3>{history.slice().reverse().map((h, i) => <div key={`${h.date}-${i}`} style={{ padding: "10px 0", borderBottom: "1px solid #e5e7eb" }}><strong>{h.status}</strong><div>{h.remarks || "No additional note."}</div><small>{fmt(h.date)}</small></div>)}</div>}
            </article>;
          })}
        </div>}
      </div>
    </DashboardLayout>
  );
}
