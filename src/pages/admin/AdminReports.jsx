import { useEffect, useMemo, useState } from "react";
import { BarChart3, ClipboardList, Download, FileText, HandHeart, Landmark, Paperclip, Printer, RefreshCw, Users, Wallet } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portal-redesign.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value || 0));
const isoToday = () => new Date().toISOString().slice(0, 10);
const dateMinusDays = (days) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const yearStart = () => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().slice(0, 10); };

export default function AdminReports() {
  const [dates, setDates] = useState({ start: yearStart(), end: isoToday() });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");

  const load = async (range = dates) => {
    setLoading(true); setError("");
    try {
      const { data } = await API.get("/admin/reports", { params: { startDate: range.start, endDate: range.end } });
      if (!data?.success) throw new Error(data?.message || "Unable to load management reports.");
      setReport(data);
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to load management reports."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const setPreset = (name) => {
    const end = isoToday();
    const start = name === "today" ? end : name === "week" ? dateMinusDays(6) : name === "month" ? monthStart() : name === "prev-month" ? (() => { const d = new Date(); d.setMonth(d.getMonth()-1,1); return d.toISOString().slice(0,10); })() : name === "quarter" ? (() => { const d=new Date(); d.setMonth(Math.floor(d.getMonth()/3)*3,1); return d.toISOString().slice(0,10); })() : name === "year" ? yearStart() : dates.start;
    setDates({ start, end }); load({ start, end });
  };

  const download = async (kind) => {
    setExporting(kind); setError("");
    try {
      const response = await API.get(`/admin/reports/export.${kind}`, { params: dates, responseType: "blob" });
      const contentType = kind === "pdf" ? "application/pdf" : "text/csv;charset=utf-8";
      const blob = new Blob([response.data], { type: contentType });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `benevolent-report-${dates.start}-to-${dates.end}.${kind}`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.response?.data?.message || "Unable to download report."); }
    finally { setExporting(""); }
  };

  const sections = useMemo(() => [
    ["Financial Reports", Wallet, [
      ["Opening balance", money(report?.financial?.openingBalance)], ["Money in", money(report?.financial?.moneyIn)], ["Money out", money(report?.financial?.moneyOut)], ["Closing balance", money(report?.financial?.closingBalance)], ["Current book balance", money(report?.financial?.currentBookBalance)], ["Constitution transactions", report?.financial?.transactions || 0], ["Contributions", money(report?.financial?.contributions)], ["Support payments", money(report?.financial?.supportPayments)],
    ]],
    ["Member Reports", Users, [["Total members", report?.members?.total || 0], ["Active", report?.members?.active || 0], ["Inactive", report?.members?.inactive || 0], ["Suspended", report?.members?.suspended || 0], ["Administrators", report?.members?.administrators || 0]]],
    ["Contributions Reports", Landmark, [["Expected", money(report?.contributions?.expected)], ["Paid", money(report?.contributions?.paid)], ["Outstanding", money(report?.contributions?.outstanding)], ["Members charged", report?.contributions?.membersCharged || 0]]],
    ["Support / Claims Reports", HandHeart, [["Total cases", report?.support?.total || 0], ["Pending", report?.support?.pending || 0], ["Approved", report?.support?.approved || 0], ["Declined", report?.support?.declined || 0], ["Requested", money(report?.support?.requested)], ["Approved amount", money(report?.support?.approvedAmount)], ["Disbursed amount", money(report?.support?.disbursedAmount)]]],
    ["Dependent Reports", ClipboardList, [["Registered dependents", report?.dependents?.total || 0], ["Requiring verification", report?.dependents?.requiringVerification || 0], ["Pending edit requests", report?.dependents?.pendingEditRequests || 0]]],
    ["Activity / Audit Reports", FileText, [["Audit events", report?.activity?.auditEvents || 0], ["News created", report?.activity?.newsCreated || 0], ["News published", report?.activity?.newsPublished || 0]]],
  ], [report]);

  return <DashboardLayout><main className="portal-page report-page">
    <header className="portal-module-header"><div><span>REPORTS & RECORDS</span><h1>Management Reports</h1><p>Filter the Benevolent Constitution record by period, then print or download the same authoritative figures used by Accounts.</p></div><div className="portal-actions"><button className="portal-btn secondary" type="button" onClick={()=>load()} disabled={loading}><RefreshCw size={16}/> {loading?"Refreshing…":"Refresh"}</button><button className="portal-btn" type="button" onClick={()=>window.print()} disabled={!report}><Printer size={16}/> Print</button><button className="portal-btn secondary" type="button" onClick={()=>download("pdf")} disabled={!report || exporting}>{exporting==="pdf"?"Preparing…":<><Download size={16}/> PDF</>}</button><button className="portal-btn secondary" type="button" onClick={()=>download("csv")} disabled={!report || exporting}>{exporting==="csv"?"Preparing…":<><Download size={16}/> CSV</>}</button></div></header>
    {error && <div className="portal-alert error">{error}</div>}
    <section className="portal-panel"><div className="account-panel-head"><div><span>REPORT PERIOD</span><h2>Choose a reporting window</h2><p>Totals are calculated for the selected range. The current book balance remains the live balance as of generation time.</p></div><BarChart3 size={22}/></div><div className="report-period-controls"><div className="report-presets">{[["today","Today"],["week","This week"],["month","This month"],["prev-month","Previous month"],["quarter","This quarter"],["year","This year"]].map(([k,l])=><button key={k} type="button" className="portal-btn secondary compact" onClick={()=>setPreset(k)}>{l}</button>)}</div><div className="date-filter-row"><label>From<input type="date" value={dates.start} onChange={(e)=>setDates(d=>({...d,start:e.target.value}))}/></label><label>To<input type="date" value={dates.end} onChange={(e)=>setDates(d=>({...d,end:e.target.value}))}/></label><button className="portal-btn" type="button" onClick={()=>load()} disabled={loading}>Load report</button></div></div></section>

    {loading && !report ? <section className="portal-panel"><p>Loading reports…</p></section> : report && <>
      <section className="portal-kpi-grid"><div className="portal-kpi"><div className="portal-kpi-head"><span>Live book balance</span><div className="portal-kpi-icon"><Wallet size={17}/></div></div><div className="portal-kpi-value">{money(report.financial.currentBookBalance)}</div><small className="portal-kpi-note">As of {new Date(report.ledger.asOf).toLocaleString()}</small></div><div className="portal-kpi"><div className="portal-kpi-head"><span>Money in</span><div className="portal-kpi-icon"><Landmark size={17}/></div></div><div className="portal-kpi-value">{money(report.financial.moneyIn)}</div><small className="portal-kpi-note">Selected period</small></div><div className="portal-kpi"><div className="portal-kpi-head"><span>Money out</span><div className="portal-kpi-icon"><HandHeart size={17}/></div></div><div className="portal-kpi-value">{money(report.financial.moneyOut)}</div><small className="portal-kpi-note">Selected period</small></div><div className="portal-kpi"><div className="portal-kpi-head"><span>Outstanding contributions</span><div className="portal-kpi-icon"><Users size={17}/></div></div><div className="portal-kpi-value">{money(report.contributions.outstanding)}</div><small className="portal-kpi-note">Selected period</small></div></section>
      <div className="report-card-grid">{sections.map(([title, Icon, rows])=><section className="portal-table-card" key={title}><div className="panel-heading"><div><span className="panel-kicker">{title.toUpperCase()}</span><h2>{title}</h2></div><Icon size={19}/></div><table className="portal-table"><tbody>{rows.map(([label,value])=><tr key={label}><th>{label}</th><td>{value}</td></tr>)}</tbody></table></section>)}</div>
      <section className="portal-table-card"><div className="panel-heading"><div><span className="panel-kicker">CONSTITUTION LEDGER</span><h2>Ledger report</h2></div><span>{report.ledger.entries.length} entries</span></div><div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Date</th><th>Transaction</th><th>Description</th><th>Category</th><th>Direction</th><th>Amount</th><th>Running balance</th><th>Status</th></tr></thead><tbody>{!report.ledger.entries.length ? <tr><td colSpan="8">No valid accounting transactions occurred during the selected period.</td></tr> : report.ledger.entries.map((entry)=><tr key={entry._id || `${entry.date}-${entry.transactionNumber}`}><td>{entry.date?new Date(entry.date).toLocaleDateString("en-KE"):"—"}</td><td>{entry.transactionNumber || entry.referenceNumber || "—"}</td><td>{entry.description || "—"}</td><td>{entry.category || "—"}</td><td>{entry.direction}</td><td>{money(entry.amount)}</td><td>{money(entry.runningBalance)}</td><td>{entry.status || "—"}</td></tr>)}</tbody></table></div></section>
      <section className="portal-panel"><div className="portal-info-strip"><FileText size={16}/> Meeting minutes can be preserved by publishing them through the existing News system. Authorized staff can use the “Publish Meeting Minutes as News” workspace below.</div><MinutesToNews /></section>
    </>}
  </main></DashboardLayout>;
}

function MinutesToNews() {
  const [form, setForm] = useState({ meetingDate: "", title: "", location: "", attendees: "", agenda: "", body: "", resolutions: "", actionPoints: "", closingRemarks: "", publicationDate: isoToday(), coverImage: null });
  const [state, setState] = useState({ busy: false, error: "", success: "" });
  const set = (key, value) => setForm((f)=>({...f,[key]:value}));
  const previewText = useMemo(() => [
    form.title && `# ${form.title}`,
    form.meetingDate && `Meeting date: ${form.meetingDate}`,
    form.location && `Location: ${form.location}`,
    form.attendees && `Attendees: ${form.attendees}`,
    form.agenda && `Agenda:\n${form.agenda}`,
    form.body && `Minutes:\n${form.body}`,
    form.resolutions && `Resolutions:\n${form.resolutions}`,
    form.actionPoints && `Action points:\n${form.actionPoints}`,
    form.closingRemarks && `Closing remarks:\n${form.closingRemarks}`,
  ].filter(Boolean).join("\n\n"), [form]);
  const submit = async (mode) => {
    setState({busy:true,error:"",success:""});
    try {
      if (!form.title.trim() || !form.body.trim() || !form.meetingDate) throw new Error("Meeting date, title and minutes/body are required.");
      const content = [
        `Meeting date: ${form.meetingDate}`, form.location && `Location: ${form.location}`, form.attendees && `Attendees: ${form.attendees}`, form.agenda && `Agenda:\n${form.agenda}`, `Minutes:\n${form.body}`, form.resolutions && `Resolutions:\n${form.resolutions}`, form.actionPoints && `Action points:\n${form.actionPoints}`, form.closingRemarks && `Closing remarks:\n${form.closingRemarks}`,
      ].filter(Boolean).join("\n\n");
      const payload = new FormData(); payload.append("title", form.title.trim()); payload.append("summary", `Meeting Minutes — ${form.meetingDate}`); payload.append("content", content); payload.append("category", "Meeting"); payload.append("published", mode === "publish" ? "true" : "false"); payload.append("status", mode === "publish" ? "published" : "draft"); payload.append("publishDate", form.publicationDate || form.meetingDate); payload.append("sourceModel", "BenevolentMeetingMinutes");
      const { data } = await API.post("/news", payload, { headers: { "Content-Type": "multipart/form-data" } });
      if (!data?.success) throw new Error(data?.message || "Unable to save meeting minutes.");
      setState({busy:false,error:"",success:mode === "publish" ? "Meeting minutes published to News." : "Meeting minutes saved as a draft in News."});
    } catch (err) { setState({busy:false,error:err.response?.data?.message || err.message || "Unable to save meeting minutes.",success:""}); }
  };
  return <div className="minutes-news-workspace"><div className="account-panel-head"><div><span>COMMUNICATION RECORDS</span><h2>Publish Meeting Minutes as News</h2><p>Uses the existing News API and database. Members receive the item through the normal member-facing News experience.</p></div><FileText size={22}/></div>{state.error&&<div className="portal-alert error">{state.error}</div>}{state.success&&<div className="portal-alert success">{state.success}</div>}<div className="portal-form-grid"><label className="portal-field"><span>Meeting date</span><input type="date" value={form.meetingDate} onChange={(e)=>set("meetingDate",e.target.value)}/></label><label className="portal-field"><span>Publication date</span><input type="date" value={form.publicationDate} onChange={(e)=>set("publicationDate",e.target.value)}/></label><label className="portal-field"><span>Meeting title</span><input type="text" value={form.title} onChange={(e)=>set("title",e.target.value)} placeholder="e.g. Benevolent Constitution General Meeting"/></label><label className="portal-field"><span>Location</span><input type="text" value={form.location} onChange={(e)=>set("location",e.target.value)}/></label><label className="portal-field"><span>Attendees</span><textarea rows="2" value={form.attendees} onChange={(e)=>set("attendees",e.target.value)}/></label><label className="portal-field"><span>Agenda</span><textarea rows="3" value={form.agenda} onChange={(e)=>set("agenda",e.target.value)}/></label><label className="portal-field" style={{gridColumn:"1 / -1"}}><span>Minutes / body</span><textarea rows="8" value={form.body} onChange={(e)=>set("body",e.target.value)} required/></label><label className="portal-field"><span>Resolutions</span><textarea rows="4" value={form.resolutions} onChange={(e)=>set("resolutions",e.target.value)}/></label><label className="portal-field"><span>Action points</span><textarea rows="4" value={form.actionPoints} onChange={(e)=>set("actionPoints",e.target.value)}/></label><label className="portal-field"><span>Closing remarks</span><textarea rows="4" value={form.closingRemarks} onChange={(e)=>set("closingRemarks",e.target.value)}/></label><label className="portal-field"><span><Paperclip size={14}/> Optional news image</span><input type="file" accept="image/*" onChange={(e)=>set("coverImage",e.target.files?.[0] || null)}/></label></div><div className="portal-panel" style={{marginTop:16}}><div className="account-panel-head"><div><span>PREVIEW</span><h3>{form.title || "Meeting Minutes"}</h3><p>{form.meetingDate ? `Meeting date: ${form.meetingDate}` : "Add a meeting date to preview the final news item."}</p></div></div><pre style={{whiteSpace:"pre-wrap",margin:0,fontFamily:"inherit",lineHeight:1.65}}>{previewText || "Start entering the meeting minutes to see a preview here."}</pre></div><div className="portal-actions"><button className="portal-btn secondary" type="button" disabled={state.busy} onClick={()=>submit("draft")}>{state.busy?"Saving…":"Save Draft"}</button><button className="portal-btn" type="button" disabled={state.busy} onClick={()=>submit("publish")}>{state.busy?"Publishing…":"Publish to News"}</button></div></div>;
}
