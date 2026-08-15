import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, MapPinned, QrCode, Search, ShieldCheck, Activity, Users, BarChart3, WifiOff, RefreshCw } from "lucide-react";
import API, { resolveApiUrl, resolveUploadUrl } from "../services/api";
import "./PlatformCenter.css";

const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function PlatformCenter({ role = "member" }) {
  const [tab, setTab] = useState("activity");
  const [activity, setActivity] = useState(null);
  const [directory, setDirectory] = useState({ members: [], stations: [] });
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [card, setCard] = useState(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [station, setStation] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false), off = () => setOffline(true);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        API.get("/platform/activity"),
        API.get("/platform/directory", { params: station ? { station } : {} }),
        API.get("/platform/events"),
        API.get("/platform/documents"),
        API.get("/platform/membership-card"),
        ...(["admin", "superadmin"].includes(role) ? [API.get("/platform/analytics")] : []),
      ]);
      const value = (index) => results[index]?.status === "fulfilled" ? results[index].value.data : null;
      const activityData = value(0);
      const directoryData = value(1);
      const eventsData = value(2);
      const docsData = value(3);
      const cardData = value(4);
      setActivity(activityData?.data || null);
      setDirectory({ members: directoryData?.members || [], stations: directoryData?.stations || [] });
      setEvents(eventsData?.events || []);
      setDocuments(docsData?.documents || []);
      setCard(cardData?.card || null);
      if (["admin", "superadmin"].includes(role)) setAnalytics(value(5)?.data || null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load().catch(() => {}); }, [station, role]);

  useEffect(() => {
    const saved = localStorage.getItem("midax-platform-center") || "";
    if (saved) setTab(saved);
  }, []);

  const changeTab = (next) => { setTab(next); localStorage.setItem("midax-platform-center", next); };

  const doSearch = async (event) => {
    event?.preventDefault();
    if (search.trim().length < 2) { setSearchResults(null); return; }
    const { data } = await API.get("/platform/search", { params: { q: search.trim() } });
    setSearchResults(data?.data || { members: [], news: [], documents: [] });
    changeTab("search");
  };

  const rsvp = async (eventId, response) => {
    await API.post(`/platform/events/${eventId}/rsvp`, { response });
    await load();
  };

  const tabs = useMemo(() => [
    ["activity", "Activity", Activity],
    ["directory", "Directory", Users],
    ["events", "Calendar & RSVP", CalendarDays],
    ["documents", "Resources", FileText],
    ["card", "Digital Card", QrCode],
    ...(analytics ? [["analytics", "Analytics", BarChart3]] : []),
    ["search", "Search", Search],
  ], [analytics]);

  return <div className="platform-center">
    <div className="platform-hero">
      <div>
        <span className="platform-kicker">MIDAX PLATFORM CENTER</span>
        <h1>One place for your community tools.</h1>
        <p>Activity, people, events, resources, verification and insights in a mobile-first workspace.</p>
      </div>
      <button className="platform-refresh" onClick={() => load()} disabled={loading}><RefreshCw size={18} className={loading ? "spin" : ""}/> Refresh</button>
    </div>
    {offline && <div className="platform-offline"><WifiOff size={17}/> Offline mode: the app shell remains available and live data will refresh when connection returns.</div>}
    <div className="platform-tabs">{tabs.map(([key,label,Icon]) => <button key={key} className={tab===key?"active":""} onClick={()=>changeTab(key)}><Icon size={17}/><span>{label}</span></button>)}</div>

    {tab === "activity" && <section className="platform-grid two">
      <Panel title="Notifications & updates"><div className="activity-list">{activity?.notifications?.length ? activity.notifications.map(n => <article key={n._id}><span className="dot"/><div><strong>{n.title}</strong><p>{n.message}</p><small>{formatDate(n.createdAt)}</small></div></article>) : <Empty text="No recent notifications."/>}</div></Panel>
      <Panel title="Support timeline"><div className="activity-list">{activity?.support?.length ? activity.support.map(s => <article key={s._id}><span className="status-dot"/><div><strong>{s.supportType}</strong><p>{s.status} · {s.remarks || s.description}</p><small>{formatDate(s.updatedAt)}</small></div></article>) : <Empty text="No support updates yet."/>}</div></Panel>
      <Panel title="Recent activity" full><div className="activity-list compact">{activity?.audits?.length ? activity.audits.map(a => <article key={a._id}><span className="timeline-line"/><div><strong>{a.module} · {a.action}</strong><p>{a.description}</p><small>{formatDate(a.createdAt)}</small></div></article>) : <Empty text="Your activity timeline is clear."/>}</div></Panel>
    </section>}

    {tab === "directory" && <section className="platform-grid two"><Panel title="Station discovery"><div className="station-grid">{directory.stations.map(s => <button key={s._id || "none"} className={station === s._id ? "selected" : ""} onClick={() => setStation(s._id || "")}><span>{s._id || "Not specified"}</span><strong>{s.count}</strong><small>{s.online} online</small></button>)}</div><button className="text-button" onClick={()=>setStation("")}>Show all stations</button></Panel><Panel title="Member directory" full><div className="directory-grid">{directory.members.map(m => <article key={m._id}><div className="directory-avatar">{m.profileImage ? <img src={resolveUploadUrl(m.profileImage)} alt=""/> : (m.fullName||"M").slice(0,1)}</div><div><strong>{m.fullName}</strong><p>{m.memberNumber} · {m.department || "Community"}</p><small>{m.siteStation || "Station not specified"} · {m.position || "Member"}</small></div><span className={m.online ? "online" : "offline"}/></article>)}</div>{directory.members.length===0&&<Empty text="No members match this station/filter."/>}</Panel></section>}

    {tab === "events" && <section className="platform-grid two"><Panel title="Upcoming events" full><div className="event-grid">{events.map(e => <article key={e._id}><div className="event-date"><strong>{new Date(e.startAt).toLocaleDateString(undefined,{day:"2-digit"})}</strong><span>{new Date(e.startAt).toLocaleDateString(undefined,{month:"short"})}</span></div><div><span className="mini-badge">{e.type}</span><h3>{e.title}</h3><p>{e.description}</p><small>{formatDate(e.startAt)} {e.location ? `· ${e.location}` : ""}</small><div className="event-actions"><button onClick={()=>rsvp(e._id,"going")}>Going</button><button onClick={()=>rsvp(e._id,"maybe")}>Maybe</button><button onClick={()=>rsvp(e._id,"declined")} className="ghost">Can't go</button></div></div></article>)}{events.length===0&&<Empty text="No upcoming events have been published."/>}</div></Panel></section>}

    {tab === "documents" && <section className="platform-grid two"><Panel title="Resource Centre" full><div className="document-grid">{documents.map(d => <a key={d.name} href={resolveApiUrl(d.url)} target="_blank" rel="noreferrer"><FileText size={22}/><div><strong>{d.name}</strong><small>{Math.round((d.size||0)/1024)} KB · updated {formatDate(d.updatedAt)}</small></div></a>)}</div>{documents.length===0&&<Empty text="No resources are currently published."/>}</Panel></section>}

    {tab === "card" && <section className="platform-card-wrap"><div className="membership-card"><div className="membership-card-top"><span>BENOVELENT MIDAX</span><ShieldCheck size={20}/></div><div className="membership-card-body"><div className="card-avatar">{card?.member?.profileImage?<img src={resolveUploadUrl(card.member.profileImage)} alt=""/>:(card?.member?.fullName||"M").slice(0,1)}</div><div><small>MEMBER</small><h2>{card?.member?.fullName || "Your membership"}</h2><p>{card?.member?.memberNumber || "—"}</p><p>{card?.member?.siteStation || "Station not specified"} · {card?.member?.department || "Community"}</p></div><div className="card-qr">{card?.qrUrl?<img src={card.qrUrl} alt="Membership verification QR"/>:<QrCode size={76}/>}</div></div><div className="membership-card-foot"><span>{card?.verified ? "Verified member" : "Verification pending"}</span><a href={card?.verifyUrl || "#"} target="_blank" rel="noreferrer">Verify</a></div></div></section>}

    {tab === "analytics" && analytics && <section className="platform-grid three"><Metric title="Active online members" value={analytics.activeMembers}/><Metric title="Station groups" value={analytics.membersByStation?.length || 0}/><Metric title="Support categories" value={analytics.supportByStatus?.length || 0}/><Panel title="Contribution trend" full><div className="trend-grid">{(analytics.contributionTrend||[]).map(x=><div key={`${x._id.y}-${x._id.m}`}><span>{x._id.m}/{x._id.y}</span><strong>KES {Number(x.paid||0).toLocaleString()}</strong><small>expected {Number(x.expected||0).toLocaleString()}</small><div className="bar"><i style={{width:`${Math.min(100, Number(x.expected)?(Number(x.paid||0)/Number(x.expected))*100:0)}%`}}/></div></div>)}</div></Panel><Panel title="Support status" full><div className="station-grid">{(analytics.supportByStatus||[]).map(x=><div key={x._id}><span>{x._id}</span><strong>{x.count}</strong></div>)}</div></Panel></section>}

    {tab === "search" && <section className="platform-grid one"><Panel title="Advanced search" full><form className="platform-search" onSubmit={doSearch}><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search members, news or documents..."/><button>Search</button></form>{searchResults ? <div className="search-results"><ResultGroup title="Members" items={searchResults.members} render={m=><div><strong>{m.fullName}</strong><small>{m.memberNumber} · {m.siteStation || ""}</small></div>}/><ResultGroup title="News" items={searchResults.news} render={n=><div><strong>{n.title}</strong><small>{n.category} · {formatDate(n.publishDate)}</small></div>}/><ResultGroup title="Documents" items={searchResults.documents} render={d=><a href={resolveApiUrl(d.url)} target="_blank" rel="noreferrer"><strong>{d.name}</strong></a>}/></div>:<Empty text="Search across your available platform information."/>}</Panel></section>}
  </div>;
}

function Panel({ title, children, full=false }) { return <article className={`platform-panel ${full?"full":""}`}><div className="platform-panel-head"><h2>{title}</h2></div>{children}</article>; }
function Empty({ text }) { return <div className="platform-empty">{text}</div>; }
function Metric({ title, value }) { return <div className="platform-metric"><small>{title}</small><strong>{Number(value||0).toLocaleString()}</strong></div>; }
function ResultGroup({ title, items, render }) { return <section className="result-group"><h3>{title}</h3>{items?.length?items.map((item,i)=><div className="result-item" key={item._id||item.name||i}>{render(item)}</div>):<Empty text="No results."/>}</section>; }
