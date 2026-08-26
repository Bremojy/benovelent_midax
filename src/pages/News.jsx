import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Newspaper,
  Search,
  Calendar,
  ArrowRight,
  Vote,
  BarChart3,
  CalendarDays,
  MapPin,
  FileText,
  Download,
  ChevronRight,
} from "lucide-react";
import api, { UPLOAD_URL, resolveApiUrl } from "../services/api";
import "./News.css";

const newsVideoSources = ["/videos/benevolent-news-loop.mp4", "/videos/benevolent-community-loop.mp4"];

const tabs = [
  { key: "all", label: "All updates" },
  { key: "news", label: "News" },
  { key: "events", label: "Events" },
  { key: "resources", label: "Resources" },
];

const shouldSkipBackgroundVideo = typeof navigator !== "undefined" && (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || ""));

function News() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [news, setNews] = useState([]);
  const [events, setEvents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [videoFailed, setVideoFailed] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [reportBusy, setReportBusy] = useState(false);

  const activeTab = tabs.some((item) => item.key === searchParams.get("tab")) ? searchParams.get("tab") : "all";

  useEffect(() => {
    const fetchNewsroom = async () => {
      setLoading(true);
      const [newsResponse, pollResponse, eventsResponse, documentsResponse] = await Promise.allSettled([
        api.get("/news/public"),
        api.get("/polls/public"),
        api.get("/platform/public/events"),
        api.get("/platform/public/documents"),
      ]);
      if (newsResponse.status === "fulfilled") setNews(Array.isArray(newsResponse.value.data?.news) ? newsResponse.value.data.news : []);
      if (pollResponse.status === "fulfilled") setPolls(Array.isArray(pollResponse.value.data?.polls) ? pollResponse.value.data.polls : []);
      if (eventsResponse.status === "fulfilled") setEvents(Array.isArray(eventsResponse.value.data?.events) ? eventsResponse.value.data.events : []);
      if (documentsResponse.status === "fulfilled") setDocuments(Array.isArray(documentsResponse.value.data?.documents) ? documentsResponse.value.data.documents : []);
      setLoading(false);
    };
    fetchNewsroom();
  }, []);

  const imageFor = (item) => {
    const image = item?.coverImage || item?.imageUrl || "";
    if (!image) return "/news-placeholder.svg";
    if (image.startsWith("http")) return image;
    return `${UPLOAD_URL}${image.startsWith("/") ? "" : "/"}${image}`;
  };
  const formatDate = (date) => date ? new Date(date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : "Recent update";
  const eventDate = (date) => date ? new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Date to be announced";

  const featured = useMemo(() => news.find((item) => item.featured || item.pinned) || news[0] || null, [news]);
  const filteredNews = useMemo(() => {
    const q = search.trim().toLowerCase();
    return news.filter((item) => !q || `${item.title || ""} ${item.content || ""} ${item.summary || ""} ${item.category || ""}`.toLowerCase().includes(q));
  }, [news, search]);
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((item) => !q || `${item.title || ""} ${item.description || ""} ${item.location || ""} ${item.type || ""}`.toLowerCase().includes(q));
  }, [events, search]);
  const filteredDocuments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((item) => !q || String(item.name || "").toLowerCase().includes(q));
  }, [documents, search]);

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "all") next.delete("tab"); else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const downloadPublishedReport = async (newsItem, format) => {
    if (!newsItem?.feedbackReportId) return;
    try {
      const user = (() => { try { return JSON.parse(sessionStorage.getItem("user") || "null"); } catch { return null; } })();
      if (!user) { window.location.href = "/login"; return; }
      setReportBusy(true);
      const response = await api.get(`/feedback/published/${newsItem.feedbackReportId}/download`, { params: { format }, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a"); a.href = url; a.download = `feedback-report.${format}`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); } finally { setReportBusy(false); }
  };

  const printSelectedNews = () => { window.print(); };

  return (
    <main className="news-page newsroom-v8">
      <section className={`news-video-hero ${videoFailed ? "video-failed" : ""}`}>
        {!videoFailed && <video className="news-video" autoPlay={!shouldSkipBackgroundVideo} muted loop playsInline preload={shouldSkipBackgroundVideo ? "none" : "metadata"} poster="/hero.jpg" onError={() => setVideoFailed(true)} aria-hidden="true">{newsVideoSources.map((src) => <source key={src} src={src} type="video/mp4" />)}</video>}
        <div className="news-video-overlay" />
        <div className="news-header"><Newspaper size={55} className="news-icon" /><span className="news-kicker">Benovelent MIDAX • COMMUNITY CENTRE</span><h1>News, events & resources in one place.</h1><p>Stay informed about community updates, upcoming activities and the documents that help members understand the scheme.</p></div>
      </section>

      <div className="news-content-wrap">
        <div className="newsroom-v8-toolbar">
          <div className="news-search"><Search size={20} /><input type="text" placeholder="Search news, events and resources..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search news, events and resources" /></div>
          <div className="newsroom-v8-tabs" role="tablist" aria-label="Newsroom content types">
            {tabs.map((tab) => <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key} className={activeTab === tab.key ? "active" : ""} onClick={() => setTab(tab.key)}>{tab.label}</button>)}
          </div>
        </div>

        {loading ? <div className="news-grid">{[1, 2, 3, 4].map((item) => <div key={item} className="news-card skeleton" />)}</div> : (
          <>
            {(activeTab === "all" || activeTab === "news") && featured && (
              <article className="featured-news newsroom-featured-v8">
                <img src={imageFor(featured)} alt={featured.title} onError={(e) => { e.currentTarget.src = "/news-placeholder.svg"; }} />
                <div className="featured-content"><span className="featured-tag">Featured update</span><h2>{featured.title}</h2><p>{featured.summary || featured.content}</p><div className="featured-date"><Calendar size={17} /> {formatDate(featured.publishDate || featured.createdAt)}</div><button className="read-more-btn" type="button" onClick={() => setSelectedNews(featured)}>Read full update <ArrowRight size={17} /></button></div>
              </article>
            )}

            {(activeTab === "all" || activeTab === "news") && <section className="newsroom-v8-section"><div className="news-section-title"><div><span>NEWSROOM</span><h2>Latest updates</h2></div><strong>{filteredNews.length}</strong></div>{filteredNews.length ? <div className="news-grid">{filteredNews.map((item) => <article className="news-card" key={item._id}><div className="news-image"><img src={imageFor(item)} alt={item.title} loading="lazy" onError={(e) => { e.currentTarget.src = "/news-placeholder.svg"; }} /></div><div className="news-content"><div className="news-date"><Calendar size={15} /> {formatDate(item.publishDate || item.createdAt)}</div><h3>{item.title}</h3><p>{(item.summary || item.content || "").slice(0, 170)}{(item.summary || item.content || "").length > 170 ? "..." : ""}</p><button className="read-more-btn" type="button" onClick={() => setSelectedNews(item)}>Read More <ArrowRight size={17} /></button></div></article>)}</div> : <div className="empty-news"><Newspaper size={38}/><h2>No news matches your search</h2><p>Published announcements will appear here automatically.</p></div>}</section>}

            {(activeTab === "all" || activeTab === "events") && <section className="newsroom-v8-section"><div className="news-section-title"><div><span>UPCOMING ACTIVITIES</span><h2>What's happening</h2></div><CalendarDays size={25}/></div>{filteredEvents.length ? <div className="newsroom-event-grid">{filteredEvents.map((event) => <article className="newsroom-event-card" key={event._id}><div className="newsroom-event-date"><strong>{event.startAt ? new Date(event.startAt).toLocaleDateString("en-GB", { day: "2-digit" }) : "—"}</strong><span>{event.startAt ? new Date(event.startAt).toLocaleDateString("en-GB", { month: "short" }) : "TBC"}</span></div><div className="newsroom-event-copy"><span>{event.type || "Community event"}</span><h3>{event.title}</h3><p>{event.description || "See the event details in the member portal."}</p><small>{event.location && <><MapPin size={13}/> {event.location} · </>}{eventDate(event.startAt)}</small></div></article>)}</div> : <div className="empty-news compact"><CalendarDays size={32}/><p>No public events have been published yet.</p></div>}</section>}

            {(activeTab === "all" || activeTab === "resources") && <section className="newsroom-v8-section"><div className="news-section-title"><div><span>RESOURCES</span><h2>Documents, forms & guides</h2></div><FileText size={25}/></div>{filteredDocuments.length ? <div className="newsroom-resource-grid">{filteredDocuments.map((doc) => <a className="newsroom-resource-card" key={doc.name} href={resolveApiUrl(doc.url)} target="_blank" rel="noreferrer"><span className="resource-icon"><FileText size={23}/></span><span className="resource-copy"><strong>{doc.name}</strong><small>{Math.max(1, Math.round((doc.size || 0) / 1024))} KB · Updated {formatDate(doc.updatedAt)}</small></span><Download size={18}/></a>)}</div> : <div className="empty-news compact"><FileText size={32}/><p>No published resources are available yet.</p></div>}</section>}
          </>
        )}

        <section className="public-polls-section newsroom-v8-section"><div className="news-section-title"><div><span>MEMBER VOICE</span><h2>Live community polls</h2></div><Vote size={25}/></div>{polls.length === 0 ? <div className="empty-news compact"><Vote size={32}/><p>No active community poll right now.</p></div> : <div className="public-poll-grid">{polls.map((poll) => <article className="public-poll-card" key={poll._id}><div className="public-poll-title"><BarChart3 size={22}/><div><span>LIVE POLL</span><h3>{poll.title}</h3></div></div><p>{poll.description}</p><div className="public-poll-options">{(poll.options || []).map((option) => { const percent = poll.totalVotes ? Math.round((option.votes / poll.totalVotes) * 100) : 0; return <div className="public-poll-option" key={option._id}><div><span>{option.text}</span><b>{percent}%</b></div><i><em style={{ width: `${percent}%` }}/></i></div>; })}</div><small>{poll.totalVotes || 0} votes • Members vote inside the secure portal</small></article>)}</div>}</section>

        {selectedNews && <div className="news-modal-backdrop" onClick={() => setSelectedNews(null)}><div className="news-modal" onClick={(e) => e.stopPropagation()}><button type="button" className="news-modal-close" onClick={() => setSelectedNews(null)} aria-label="Close update">×</button><img src={imageFor(selectedNews)} alt={selectedNews.title} onError={(e) => { e.currentTarget.src = "/news-placeholder.svg"; }}/><span className="featured-tag">Full update</span><h2>{selectedNews.title}</h2><p style={{ whiteSpace: "pre-wrap" }}>{selectedNews.content}</p>{selectedNews.feedbackReportId && <div className="feedback-report-actions"><strong>Feedback report</strong><div><button type="button" className="read-more-btn" disabled={reportBusy} onClick={() => downloadPublishedReport(selectedNews,"csv")}><Download size={16}/> Download CSV</button><button type="button" className="read-more-btn" disabled={reportBusy} onClick={() => downloadPublishedReport(selectedNews,"json")}><Download size={16}/> Download JSON</button><button type="button" className="read-more-btn" onClick={printSelectedNews}><Printer size={16}/> Print</button></div><small>Members and authorised portal users must be signed in to download the full response file.</small></div>}{Array.isArray(selectedNews.attachments) && selectedNews.attachments.length > 0 && <div className="news-attachments"><strong>Attachments</strong>{selectedNews.attachments.map((attachment,index)=>{const url=typeof attachment === "string" ? attachment : attachment?.fileUrl || attachment?.url;if(!url)return null;const fullUrl=url.startsWith("http")?url:`${UPLOAD_URL}${url.startsWith("/")?"":"/"}${url}`;return <a href={fullUrl} target="_blank" rel="noreferrer" key={`${fullUrl}-${index}`}>Open attachment {index+1}</a>;})}</div>}<button type="button" className="read-more-btn" onClick={()=>setSelectedNews(null)}>Close <ChevronRight size={16}/></button></div></div>}
      </div>
    </main>
  );
}

export default News;
