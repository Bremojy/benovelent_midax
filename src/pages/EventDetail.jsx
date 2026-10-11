import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3, MapPin, RefreshCw, Video } from "lucide-react";
import API, { resolveApiUrl } from "../services/api";
import "../styles/public-modern.css";

function formatDate(value, fallback = "Date to be confirmed") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setEvent(null);
    API.get(`/platform/public/events/${encodeURIComponent(id || "")}`)
      .then(({ data }) => { if (active) setEvent(data?.event || null); })
      .catch((requestError) => { if (active) { setEvent(null); setError(requestError.response?.data?.message || "Unable to load this public event."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, reloadVersion]);

  useEffect(() => {
    if (!event?.title) return;
    const title = `${event.title} | BENEvolent MIDAX Events`;
    const description = String(event.description || "Read details for a public BENEvolent MIDAX event or community activity.").slice(0, 300);
    document.title = title;
    const upsertMeta = (selector, attribute, key, value) => {
      let meta = document.head.querySelector(selector);
      if (!meta) { meta = document.createElement("meta"); meta.setAttribute(attribute, key); document.head.appendChild(meta); }
      meta.setAttribute("content", value);
    };
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:type"]', "property", "og:type", "website");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", "index, follow");
    const canonical = `${window.location.origin}/events/${encodeURIComponent(event._id || id || "")}`;
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) { canonicalLink = document.createElement("link"); canonicalLink.setAttribute("rel", "canonical"); document.head.appendChild(canonicalLink); }
    canonicalLink.setAttribute("href", canonical);
  }, [event, id]);

  const virtualUrl = safeExternalUrl(event?.virtualUrl);

  return (
    <main className="public-modern-page event-detail-page" id="main-content">
      <div className="event-detail-container">
        <Link to="/news?tab=events" className="event-detail-back"><ArrowLeft size={17} /> Back to public events</Link>
        {loading ? <div className="home-state" role="status">Loading public event…</div> : error ? (
          <section className="event-detail-state" role="alert"><h1>Event unavailable</h1><p>{error}</p><div className="event-detail-actions"><button className="modern-btn" type="button" onClick={() => setReloadVersion((value) => value + 1)}><RefreshCw size={16} /> Try again</button><Link className="modern-btn-secondary" to="/news?tab=events">Browse other events</Link></div></section>
        ) : event ? (
          <article className="event-detail-article">
            {event.coverImage && <img className="event-detail-cover" src={resolveApiUrl(event.coverImage)} alt="" onError={(e) => { e.currentTarget.hidden = true; }} />}
            <div className="event-detail-copy">
              <span className="home-content-tag">{event.type || "Community activity"}</span>
              <h1>{event.title}</h1>
              <p className="event-detail-description">{event.description || "No additional description was provided for this event."}</p>
              <dl className="event-detail-meta">
                <div><dt><CalendarDays size={17} /> Starts</dt><dd>{formatDate(event.startAt)}</dd></div>
                {event.endAt && <div><dt><Clock3 size={17} /> Ends</dt><dd>{formatDate(event.endAt)}</dd></div>}
                {event.location && <div><dt><MapPin size={17} /> Location</dt><dd>{event.location}</dd></div>}
              </dl>
              {virtualUrl && <p className="event-detail-online"><Video size={18} /> Online event link: <a href={virtualUrl} target="_blank" rel="noopener noreferrer">Open meeting link</a></p>}
              <div className="event-detail-actions"><Link className="modern-btn" to="/news?tab=events">More public events <ArrowLeft size={16} /></Link></div>
            </div>
          </article>
        ) : <section className="event-detail-state"><h1>Event unavailable</h1><p>This event is not published for public viewing.</p><Link className="modern-btn" to="/news?tab=events">Browse public events</Link></section>}
      </div>
    </main>
  );
}
