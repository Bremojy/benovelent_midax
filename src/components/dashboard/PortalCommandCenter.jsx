import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowUpRight, Bell, CheckSquare, FileText, HandHeart, Search, ShieldCheck, Users, WalletCards, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API, { resolveApiUrl } from "../../services/api";
import "./PortalCommandCenter.css";

const GROUP_META = {
  members: { label: "People", icon: Users },
  claims: { label: "Claims & support", icon: HandHeart },
  contributions: { label: "Contributions", icon: WalletCards },
  transactions: { label: "Transactions", icon: WalletCards },
  messages: { label: "Messages", icon: Bell },
  notifications: { label: "Notifications", icon: Bell },
  news: { label: "News", icon: FileText },
  documents: { label: "Public documents", icon: FileText },
  policies: { label: "Policies", icon: ShieldCheck },
  audits: { label: "Audit records", icon: ShieldCheck },
};

const emptyResults = {
  members: [], claims: [], contributions: [], transactions: [], messages: [],
  notifications: [], news: [], documents: [], policies: [], audits: [],
};

const normalizeRole = (value) => String(value || "member").toLowerCase();

const formatMoney = (value) => new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function PortalCommandCenter({ role: providedRole }) {
  const { user, role: contextRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = normalizeRole(providedRole || contextRole || user?.role);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [activity, setActivity] = useState({ notifications: [], attention: [], attentionCount: 0, conversations: [], audits: [] });
  const [loading, setLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [error, setError] = useState("");
  const [activityError, setActivityError] = useState("");

  const totalResults = useMemo(() => Object.values(results).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0), [results]);
  const unreadActivity = Number(activity.attentionCount || (Array.isArray(activity.attention) ? activity.attention.length : 0));

  const openCenter = useCallback((nextMode = "search", initialQuery = "") => {
    setMode(nextMode);
    setQuery(String(initialQuery || ""));
    setError("");
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const closeCenter = useCallback(() => {
    setOpen(false);
    setError("");
    setActivityError("");
  }, []);

  useEffect(() => {
    const onOpen = (event) => openCenter("search", event?.detail?.term || "");
    const onAction = () => openCenter("attention", "");
    const onKeyDown = (event) => {
      const key = String(event.key || "").toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        openCenter("search", "");
      }
      if (key === "escape" && open) closeCenter();
    };
    window.addEventListener("benovelent:open-command-center", onOpen);
    window.addEventListener("benovelent:open-action-center", onAction);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("benovelent:open-command-center", onOpen);
      window.removeEventListener("benovelent:open-action-center", onAction);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeCenter, open, openCenter]);

  useEffect(() => {
    closeCenter();
  }, [location.pathname, closeCenter]);

  const loadActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      setActivityError("");
      const { data } = await API.get("/platform/activity");
      const payload = data?.data || {};
      setActivity({
        notifications: Array.isArray(payload.notifications) ? payload.notifications : [],
        attention: Array.isArray(payload.attention) ? payload.attention : [],
        attentionCount: Number(payload.attentionCount || 0),
        conversations: Array.isArray(payload.conversations) ? payload.conversations : [],
        audits: Array.isArray(payload.audits) ? payload.audits : [],
      });
    } catch (requestError) {
      setActivityError(requestError?.response?.data?.message || "Your attention items could not be loaded right now.");
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    const onRefresh = () => { loadActivity(); };
    window.addEventListener("benovelent:refresh-action-center", onRefresh);
    return () => window.removeEventListener("benovelent:refresh-action-center", onRefresh);
  }, [loadActivity]);

  const runSearch = useCallback(async (value) => {
    const term = String(value || "").trim();
    setQuery(value);
    if (term.length < 2) {
      setResults(emptyResults);
      setError(term ? "Enter at least 2 characters to search." : "");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/platform/search", { params: { q: term } });
      setResults({ ...emptyResults, ...(data?.data || {}) });
    } catch (requestError) {
      setResults(emptyResults);
      setError(requestError?.response?.data?.message || "Search is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && mode === "attention") loadActivity();
  }, [open, mode, loadActivity]);

  const goTo = useCallback((target) => {
    if (!target) return;
    closeCenter();
    navigate(target);
  }, [closeCenter, navigate]);

  const memberTarget = role === "superadmin" ? "/superadmin/members" : "/admin/members";
  const claimsTarget = role === "member" ? "/member/claims" : role === "superadmin" ? "/superadmin/claims" : "/admin/claims";
  const financeTarget = role === "member" ? "/member/contributions" : role === "superadmin" ? "/superadmin/accounts" : "/admin/accounts";
  const notificationsTarget = role === "member" ? "/member/notifications" : role === "superadmin" ? "/superadmin/notifications" : "/admin/notifications";
  const messageTarget = role === "member" ? "/member/messages" : "/admin/messages";

  const resultTarget = (group, item) => {
    if (group === "members") return item?._id ? `${memberTarget}?memberId=${item._id}` : memberTarget;
    if (group === "claims") {
      const source = String(item?.source || item?.sourceType || "").toLowerCase();
      if (role !== "member" && source === "supportrequest") return `${role === "superadmin" ? "/superadmin" : "/admin"}/support?requestId=${item._id}`;
      return `${claimsTarget}?claimId=${item?._id || ""}&claimType=${source || "support"}`;
    }
    if (group === "contributions") return role === "member" ? "/member/contributions" : (role === "superadmin" ? "/superadmin/contributions" : "/admin/contributions");
    if (group === "transactions") return financeTarget;
    if (group === "notifications") return item?.link || notificationsTarget;
    if (group === "messages") return messageTarget;
    if (group === "news") return "/news";
    if (group === "policies") return "/superadmin/policies";
    if (group === "audits") return "/superadmin/audit";
    return "";
  };

  const renderResultTitle = (group, item) => {
    if (group === "members") return item.fullName || item.memberNumber || "Member";
    if (group === "claims") return item.title || item.policyName || item.supportType || item.hospitalName || item.deceasedName || item.school || "Support case";
    if (group === "contributions") return `${item.month || "—"}/${item.year || "—"} contribution`;
    if (group === "transactions") return item.transactionNumber || item.referenceNumber || item.receiptNumber || "Finance transaction";
    if (group === "messages") return item.lastMessageText || "Conversation";
    if (group === "notifications") return item.title || "Notification";
    if (group === "news") return item.title || "News update";
    if (group === "documents") return item.name || "Document";
    if (group === "policies") return item.name || item.slug || "Policy";
    if (group === "audits") return `${item.module || "System"} · ${item.action || "Activity"}`;
    return "Result";
  };

  const renderResultMeta = (group, item) => {
    if (group === "members") return [item.memberNumber, item.department, item.position].filter(Boolean).join(" · ") || "Active member";
    if (group === "claims") return [item.source, item.member?.fullName || item.member?.memberNumber, item.status, item.requestedAmount ? formatMoney(item.requestedAmount) : null].filter(Boolean).join(" · ");
    if (group === "contributions") return [item.status, formatMoney(item.paidAmount), formatDate(item.paymentDate)].join(" · ");
    if (group === "transactions") return [item.type, item.status, formatMoney(item.amount), formatDate(item.transactionDate)].join(" · ");
    if (group === "messages") return formatDate(item.lastMessageTime);
    if (group === "notifications") return [item.type, item.read ? "Read" : "Unread", formatDate(item.createdAt)].join(" · ");
    if (group === "news") return [item.category, formatDate(item.publishDate)].filter(Boolean).join(" · ");
    if (group === "documents") return "Public document";
    if (group === "policies") return [item.category, item.enabled ? "Enabled" : "Disabled"].filter(Boolean).join(" · ");
    if (group === "audits") return [item.userRole, item.status, formatDate(item.createdAt)].filter(Boolean).join(" · ");
    return "";
  };

  if (!open) return null;

  const groups = Object.keys(GROUP_META).filter((key) => Array.isArray(results[key]) && results[key].length > 0);
  const attentionRows = Array.isArray(activity.attention) ? activity.attention : [];

  return (
    <div className="command-center-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCenter(); }}>
      <div className="command-center" role="dialog" aria-modal="true" aria-labelledby="command-center-title">
        <header className="command-center-header">
          <div className="command-center-title">
            <div className="command-center-icon"><Search size={18} /></div>
            <div>
              <span>BENEVOLENT MIDAX</span>
              <h2 id="command-center-title">Search & Attention</h2>
            </div>
          </div>
          <button type="button" className="command-center-close" onClick={closeCenter} aria-label="Close search and attention centre"><X size={20} /></button>
        </header>

        <div className="command-center-tabs" role="tablist" aria-label="Command centre mode">
          <button type="button" role="tab" aria-selected={mode === "search"} className={mode === "search" ? "active" : ""} onClick={() => { setMode("search"); window.setTimeout(() => inputRef.current?.focus(), 20); }}><Search size={16} /> Search</button>
          <button type="button" role="tab" aria-selected={mode === "attention"} className={mode === "attention" ? "active" : ""} onClick={() => setMode("attention")}><CheckSquare size={16} /> Attention {unreadActivity > 0 && <b>{unreadActivity > 99 ? "99+" : unreadActivity}</b>}</button>
        </div>

        {mode === "search" ? (
          <>
            <div className="command-search-row">
              <Search size={18} />
              <input
                ref={inputRef}
                value={query}
                type="search"
                autoComplete="off"
                placeholder="Search the records you can access…"
                onChange={(event) => { setQuery(event.target.value); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") runSearch(query);
                }}
                aria-label="Search authorized portal records"
              />
              <span className="command-shortcut">Enter</span>
            </div>
            <div className="command-center-body">
              {loading && <div className="command-state">Searching authorized records…</div>}
              {!loading && error && <div className="command-state error"><AlertCircle size={18} /> {error}</div>}
              {!loading && !error && query.trim().length < 2 && <div className="command-state"><Search size={28} /><strong>Start with a name, number, claim, document or keyword.</strong><span>Only records your current role is allowed to see are returned.</span></div>}
              {!loading && !error && query.trim().length >= 2 && totalResults === 0 && <div className="command-state"><FileText size={28} /><strong>No matching records.</strong><span>Try a different spelling, employee number, status or transaction reference.</span></div>}
              {!loading && groups.map((group) => {
                const meta = GROUP_META[group];
                const Icon = meta.icon;
                return (
                  <section className="command-result-group" key={group}>
                    <div className="command-result-heading"><span><Icon size={15} /> {meta.label}</span><b>{results[group].length}</b></div>
                    <div className="command-result-list">
                      {results[group].slice(0, 8).map((item, index) => {
                        const target = resultTarget(group, item);
                        const isDocument = group === "documents";
                        const label = renderResultTitle(group, item);
                        const metaText = renderResultMeta(group, item);
                        return (
                          <button type="button" className="command-result" key={`${group}-${item?._id || item?.name || item?.transactionNumber || index}`} onClick={() => isDocument ? window.open(resolveApiUrl(item.url), "_blank", "noopener,noreferrer") : goTo(target)}>
                            <span className="command-result-copy"><strong>{label}</strong><small>{metaText || "Open record"}</small></span>
                            <ArrowUpRight size={16} />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        ) : (
          <div className="command-center-body attention-body">
            {activityLoading && <div className="command-state">Loading your current attention items…</div>}
            {!activityLoading && activityError && <div className="command-state error"><AlertCircle size={18} /> {activityError}</div>}
            {!activityLoading && !activityError && attentionRows.length === 0 && <div className="command-state"><CheckSquare size={28} /><strong>Nothing needs your attention right now.</strong><span>This state is based on current authorized workflow records and unread notifications.</span></div>}
            {!activityLoading && !activityError && attentionRows.map((item, index) => {
              const target = item.link || (item.sourceModel === "SupportRequest" ? `${role === "superadmin" ? "/superadmin" : "/admin"}/support?requestId=${item.sourceId}` : notificationsTarget);
              const isPermission = item.attentionType === "support_permission";
              const isClaim = String(item.attentionType || "").includes("claim");
              const Icon = isPermission ? ShieldCheck : isClaim ? HandHeart : item.attentionType === "notification" ? Bell : CheckSquare;
              return (
                <button type="button" className="attention-row" key={item.id || `${item.attentionType}-${item.sourceId || index}`} onClick={() => goTo(target)}>
                  <div className="attention-icon"><Icon size={17} /></div>
                  <div className="attention-copy"><strong>{item.title || "Attention item"}</strong><span>{item.description || "Review this workflow item."}</span><small>{item.updatedAt ? formatDate(item.updatedAt) : "Current"} · {item.status || "Action required"}</small></div>
                  <ArrowUpRight size={16} />
                </button>
              );
            })}
          </div>
        )}

        <footer className="command-center-footer">
          <span>Search is permission-aware and server-backed.</span>
          <span>Ctrl + K</span>
        </footer>
      </div>
    </div>
  );
}
