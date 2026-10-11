import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import API, { resolveApiUrl } from "../services/api";
import {
  ArrowRight, Bell, CalendarDays, ClipboardCheck, Download,
  FileText, Heart, Images, MapPin, MessageCircle, Newspaper, ShieldCheck,
  Smartphone, Users, Wallet,
} from "lucide-react";
import Hero from "../components/Hero";
import { usePublicSettings } from "../hooks/usePublicSettings";
import { usePublicWebsiteSection } from "../hooks/usePublicWebsiteSection";
import "../styles/public-modern.css";

const emptyListState = { items: [], loading: true, error: "" };

export default function Home() {
  const [leaders, setLeaders] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [policyError, setPolicyError] = useState("");
  const [leadershipError, setLeadershipError] = useState("");
  const [newsState, setNewsState] = useState(emptyListState);
  const [eventsState, setEventsState] = useState(emptyListState);
  const [galleryState, setGalleryState] = useState(emptyListState);
  const [resourcesState, setResourcesState] = useState(emptyListState);
  const { settings, loading: settingsLoading, error: settingsError } = usePublicSettings();
  const { section: homeSection, loading: homeLoading, error: homeError } = usePublicWebsiteSection("home");

  useEffect(() => {
    let active = true;
    const requests = [
      API.get("/leaders/active"),
      API.get("/policies/public"),
      API.get("/news/public"),
      API.get("/platform/public/events"),
      API.get("/website/gallery"),
      API.get("/platform/public/documents"),
    ];

    Promise.allSettled(requests).then(([leadersResult, policiesResult, newsResult, eventsResult, galleryResult, resourcesResult]) => {
      if (!active) return;

      if (leadersResult.status === "fulfilled") {
        const payload = leadersResult.value.data;
        setLeaders(Array.isArray(payload) ? payload : []);
        setLeadershipError("");
      } else {
        setLeadershipError(leadersResult.reason?.response?.data?.message || "Unable to load current published leadership records.");
      }

      if (policiesResult.status === "fulfilled") {
        setPolicies(Array.isArray(policiesResult.value.data?.policies) ? policiesResult.value.data.policies : []);
        setPolicyError("");
      } else {
        setPolicyError(policiesResult.reason?.response?.data?.message || "Unable to load current support policies.");
      }

      if (newsResult.status === "fulfilled") {
        setNewsState({ items: Array.isArray(newsResult.value.data?.news) ? newsResult.value.data.news : [], loading: false, error: "" });
      } else {
        setNewsState({ items: [], loading: false, error: newsResult.reason?.response?.data?.message || "Unable to load published news." });
      }

      if (eventsResult.status === "fulfilled") {
        setEventsState({ items: Array.isArray(eventsResult.value.data?.events) ? eventsResult.value.data.events : [], loading: false, error: "" });
      } else {
        setEventsState({ items: [], loading: false, error: eventsResult.reason?.response?.data?.message || "Unable to load public events." });
      }

      if (galleryResult.status === "fulfilled") {
        const payload = galleryResult.value.data;
        const section = payload?.section;
        const configuredItems = section?.content?.galleryItems;
        const sourceItems = Array.isArray(configuredItems) && configuredItems.length
          ? configuredItems.filter((item) => item && item.published !== false && item.url)
          : (Array.isArray(section?.images || payload?.gallery)
            ? (section?.images || payload.gallery).filter(Boolean).map((url, index) => typeof url === "string" ? ({ id: `published-${index}`, url, altText: "Benevolent MIDAX community photo" }) : url)
            : []);
        setGalleryState({ items: sourceItems, loading: false, error: "" });
      } else {
        setGalleryState({ items: [], loading: false, error: galleryResult.reason?.response?.data?.message || "Unable to load published gallery items." });
      }

      if (resourcesResult.status === "fulfilled") {
        setResourcesState({ items: Array.isArray(resourcesResult.value.data?.documents) ? resourcesResult.value.data.documents : [], loading: false, error: "" });
      } else {
        setResourcesState({ items: [], loading: false, error: resourcesResult.reason?.response?.data?.message || "Unable to load public resources." });
      }
    });

    return () => { active = false; };
  }, []);

  const scheme = settings?.scheme || {};
  const publicPolicies = useMemo(() => policies.filter((policy) => policy?.enabled !== false).slice(0, 4), [policies]);
  const featuredNews = useMemo(() => newsState.items.find((item) => item?.featured || item?.pinned) || newsState.items[0] || null, [newsState.items]);
  const additionalNews = useMemo(() => newsState.items.filter((item) => String(item?._id || "") !== String(featuredNews?._id || "")).slice(0, 2), [newsState.items, featuredNews]);
  const configured = (value, formatter = (v) => `Ksh ${Number(v).toLocaleString("en-KE")}`) => value === null || value === undefined || value === "" ? "Information unavailable" : formatter(value);

  return (
    <>
      <Hero homeContent={homeSection} />
      <main className="public-modern-page home-modern-page" id="main-content">
        <section className="modern-section home-intro-section">
          <div className="modern-section-head">
            <span className="eyebrow">BENEVOLENT FUND SCHEME</span>
            <h2>{homeSection?.title || "Better life is better when we stand together."}</h2>
            {homeLoading || settingsLoading
              ? <p aria-live="polite">Loading current scheme information…</p>
              : (homeError || settingsError)
                ? <p role="alert">{homeError || settingsError}</p>
                : <p>{homeSection?.subtitle || homeSection?.description || settings?.website?.subtitle || settings?.organization?.displayName || "Explore the published scheme information, available support guidance and community updates."}</p>}
            <div className="modern-trust-band home-scheme-facts" aria-label="Current scheme settings">
              <Chip icon={Wallet} title={configured(scheme.monthlyContribution)} text="Monthly contribution" />
              <Chip icon={ShieldCheck} title={configured(scheme.minimumBookBalance)} text="Minimum book balance" />
              <Chip icon={ClipboardCheck} title={configured(scheme.gracePeriodDays, (value) => `${Number(value)} days`)} text="Grace period" />
            </div>
          </div>
          {policyError && <p role="alert" className="home-state home-state-error">{policyError}</p>}
          <div className="modern-card-grid home-service-grid">
            {publicPolicies.length ? publicPolicies.map((policy) => (
              <article className="modern-card home-service-card" key={policy._id || policy.slug || policy.name}>
                <span className="home-card-icon"><Heart size={23} /></span>
                <h3>{policy.name || "Support service"}</h3>
                <p>{policyText(policy)}</p>
                <Link to={safeServicePath(policy.applicationPath)}>{policy.applicationPath ? "View service guidance" : "Read service guidance"} <ArrowRight size={16} /></Link>
              </article>
            )) : (
              <article className="modern-card home-service-card">
                <span className="home-card-icon"><ShieldCheck size={23} /></span>
                <h3>Support policies</h3>
                <p>{policyError ? "Current support policies could not be loaded." : "No enabled public support policies are currently available."}</p>
                <Link to="/services">View services <ArrowRight size={16} /></Link>
              </article>
            )}
          </div>
          <Link className="modern-btn home-section-cta" to="/constitution">Read the Constitution <ArrowRight size={17} /></Link>
        </section>

        <section className="modern-section home-process-section">
          <div className="modern-section-head">
            <span className="eyebrow">HOW TO GET STARTED</span>
            <h2>Find the guidance you need, then take the right next step.</h2>
            <p>Start with the published scheme rules and support guidance. Members can sign in to submit requests and follow their own records.</p>
          </div>
          <div className="home-process-grid">
            <ProcessStep number="01" title="Understand the scheme" text="Read the Constitution and current published policy details." icon={FileText} to="/constitution" />
            <ProcessStep number="02" title="Explore support services" text="Review the information and requirements published for each service." icon={Heart} to="/services" />
            <ProcessStep number="03" title="Sign in securely" text="Use the member portal for private records, requests and notifications." icon={ShieldCheck} to="/login" />
          </div>
        </section>

        <section className="modern-section home-news-section">
          <SectionHeading eyebrow="NEWSROOM" title="Latest news and announcements" description="Read updates published through the official newsroom." to="/news" linkText="All news" />
          {newsState.loading ? <LoadingState label="Loading published news…" /> : newsState.error ? <ErrorState message={newsState.error} /> : featuredNews ? (
            <div className="home-news-layout">
              <article className="home-featured-news">
                {featuredNews.coverImage && <img src={resolveApiUrl(featuredNews.coverImage)} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
                <div className="home-featured-news-copy">
                  <span className="home-content-tag">{featuredNews.category || "News"}</span>
                  <h3>{featuredNews.title}</h3>
                  <p>{featuredNews.summary || previewText(featuredNews.content, 220)}</p>
                  <div className="home-content-meta">{formatDate(featuredNews.publishDate || featuredNews.createdAt)}</div>
                  <Link to={newsHref(featuredNews)} className="home-text-link">Read full update <ArrowRight size={16} /></Link>
                </div>
              </article>
              <div className="home-news-list">
                {additionalNews.map((item) => (
                  <article className="home-news-item" key={item._id || item.slug || item.title}>
                    {item.coverImage && <img src={resolveApiUrl(item.coverImage)} alt="" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
                    <div><span className="home-content-meta">{formatDate(item.publishDate || item.createdAt)}</span><h3>{item.title}</h3><p>{previewText(item.summary || item.content, 125)}</p><Link to={newsHref(item)} aria-label={`Read ${item.title}`}>Read update <ArrowRight size={15} /></Link></div>
                  </article>
                ))}
              </div>
            </div>
          ) : <EmptyState icon={Newspaper} title="No published updates yet" text="News and announcements will appear here after publication." />}
        </section>

        <section className="modern-section home-events-section">
          <SectionHeading eyebrow="COMMUNITY CALENDAR" title="Events and activities" description="Only events marked for public viewing appear here." to="/news?tab=events" linkText="View events" />
          {eventsState.loading ? <LoadingState label="Loading public events…" /> : eventsState.error ? <ErrorState message={eventsState.error} /> : eventsState.items.length ? (
            <div className="home-event-grid">
              {eventsState.items.slice(0, 3).map((event) => (
                <article className="home-event-card" key={event._id || `${event.title}-${event.startAt}`}>
                  {event.coverImage && <img src={resolveApiUrl(event.coverImage)} alt="" loading="lazy" onError={(error) => { error.currentTarget.hidden = true; }} />}
                  <div className="home-event-card-body">
                    <span className="home-content-tag">{event.type || "Community activity"}</span>
                    <h3>{event.title}</h3>
                    <p>{previewText(event.description, 150) || "Read the published event details for more information."}</p>
                    <div className="home-event-meta"><CalendarDays size={16} /> {formatDate(event.startAt, "Date to be announced")}</div>
                    {event.location && <div className="home-event-meta"><MapPin size={16} /> {event.location}</div>}
                    {event._id && <Link to={`/events/${encodeURIComponent(event._id)}`} className="home-text-link">Event details <ArrowRight size={15} /></Link>}
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState icon={CalendarDays} title="No public events published" text="Events approved for public viewing will appear here." />}
        </section>

        <section className="modern-section home-gallery-section">
          <SectionHeading eyebrow="COMMUNITY MOMENTS" title="Our community gallery" description="A selection of photos made available in the published gallery." to="/gallery" linkText="Explore gallery" />
          {galleryState.loading ? <LoadingState label="Loading published gallery…" /> : galleryState.error ? <ErrorState message={galleryState.error} /> : galleryState.items.length ? (
            <div className="home-gallery-grid">
              {galleryState.items.slice(0, 4).map((item, index) => {
                const image = typeof item === "string" ? item : item?.url;
                const title = typeof item === "string" ? "Benevolent MIDAX community photo" : item?.title || item?.altText || "Benevolent MIDAX community photo";
                return <Link to="/gallery" className="home-gallery-item" key={item?.id || `${image}-${index}`} aria-label={`Open gallery: ${title}`}>
                  <img src={resolveApiUrl(image)} alt={typeof item === "string" ? "Benevolent MIDAX community photo" : (item?.altText || item?.title || "Benevolent MIDAX community photo")} loading="lazy" />
                  {(item?.title || item?.caption) && <span>{item.title || item.caption}</span>}
                </Link>;
              })}
            </div>
          ) : <EmptyState icon={Images} title="No gallery photos published" text="Approved community photos will appear here when available." />}
        </section>

        <section className="modern-section home-resources-section">
          <SectionHeading eyebrow="OFFICIAL INFORMATION" title="Constitution and resources" description="Use the published Constitution and public documents as authoritative scheme references." to="/news?tab=resources" linkText="Browse resources" />
          <div className="home-resource-feature">
            <span className="home-card-icon"><LandmarkIcon /></span>
            <div><h3>Benevolent MIDAX Constitution</h3><p>Read the current authoritative rules and governance document.</p></div>
            <Link to="/constitution" className="modern-btn-secondary home-resource-button">Open Constitution <ArrowRight size={16} /></Link>
          </div>
          {resourcesState.loading ? <LoadingState label="Loading public resources…" /> : resourcesState.error ? <ErrorState message={resourcesState.error} /> : resourcesState.items.length ? (
            <div className="home-resource-list">
              {resourcesState.items.slice(0, 3).map((resource) => (
                <a href={resolveApiUrl(resource.url)} target="_blank" rel="noreferrer" className="home-resource-item" key={resource.url || resource.name}>
                  <FileText size={21} /><span><strong>{resource.title || resource.name || "Public document"}</strong><small>{resource.size ? `${Math.max(1, Math.round(Number(resource.size) / 1024))} KB` : "Published resource"}</small></span><Download size={17} />
                </a>
              ))}
            </div>
          ) : <p className="home-resource-empty">No additional public documents are currently available.</p>}
        </section>

        <section className="modern-section home-leadership-section">
          <SectionHeading eyebrow="LEADERSHIP" title="Meet the current scheme leadership" description="Profiles are loaded from current leadership records." to="/leaders" linkText="Full directory" />
          {leadershipError && <ErrorState message={leadershipError} />}
          {leaders.length ? <div className="modern-card-grid four-v3 home-leader-grid">
            {leaders.slice(0, 4).map((leader) => (
              <article className="modern-card leader-card" key={String(leader._id || leader.name)}>
                <div className="leader-avatar-wrap">{(leader.imageUrl || leader.profileImage) ? <img src={resolveApiUrl(leader.imageUrl || leader.profileImage)} alt={leader.name || "Leader"} className="leader-avatar" loading="lazy" /> : <div className="leader-avatar-fallback" aria-hidden="true">{String(leader.name || "B").charAt(0).toUpperCase()}</div>}</div>
                <h3>{leader.name || "Leadership representative"}</h3><p><strong>{leader.position || leader.roleLabel || "Scheme leadership"}</strong></p>
              </article>
            ))}
          </div> : !leadershipError && <EmptyState icon={Users} title="No leadership profiles available" text="Published leadership profiles will appear here when they are configured." />}
        </section>

        <section className="modern-section home-member-section">
          <div className="home-member-cta-copy"><span className="eyebrow">MEMBER PORTAL</span><h2>Keep your member tools close at hand.</h2><p>Sign in to view your private records, manage dependants, submit support requests, follow claim progress and receive scheme updates.</p><Link className="modern-btn" to="/login"><ShieldCheck size={17} /> Open the member portal <ArrowRight size={17} /></Link></div>
          <div className="home-member-tool-grid"><Tool icon={MessageCircle} title="Private chat" text="Communicate after sign-in" /><Tool icon={Bell} title="Notifications" text="Check portal updates" /><Tool icon={Wallet} title="Accounts" text="View permitted records" /><Tool icon={Smartphone} title="Mobile access" text="Responsive web app and PWA" /></div>
        </section>

        <section className="modern-section home-contact-strip">
          <div><span className="eyebrow">QUESTIONS OR FEEDBACK?</span><h2>Use the official contact channel.</h2><p>For service questions, use the published contact details or send a message through the website form.</p></div>
          <Link to="/contact" className="modern-btn-secondary">Contact BENEvolent MIDAX <ArrowRight size={17} /></Link>
        </section>
      </main>
    </>
  );
}

function policyText(policy) {
  const parts = [];
  if (policy.minAmount !== null && policy.minAmount !== undefined && Number(policy.minAmount) > 0) parts.push(`Minimum: Ksh ${Number(policy.minAmount).toLocaleString("en-KE")}`);
  if (policy.maxAmount !== null && policy.maxAmount !== undefined && Number(policy.maxAmount) > 0) parts.push(`Maximum: Ksh ${Number(policy.maxAmount).toLocaleString("en-KE")}`);
  if (policy.repaymentEnabled) parts.push(`Repayment: ${Number(policy.repaymentMonths || 12)} months`);
  return parts.join(" • ") || policy.description || policy.summary || "Read the current published service guidance for details.";
}

function previewText(value, limit = 160) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

function formatDate(value, fallback = "Date not provided") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function SectionHeading({ eyebrow, title, description, to, linkText }) {
  return <div className="home-section-heading"><div className="modern-section-head"><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>{to && <Link to={to} className="home-heading-link">{linkText} <ArrowRight size={16} /></Link>}</div>;
}

function Chip({ icon: Icon, title, text }) {
  return <div className="trust-chip"><Icon size={19} /><strong>{title}</strong><span>{text}</span></div>;
}

function ProcessStep({ number, title, text, icon: Icon, to }) {
  return <Link to={to} className="home-process-step"><span className="home-step-number">{number}</span><span className="home-card-icon"><Icon size={23} /></span><h3>{title}</h3><p>{text}</p><span className="home-process-link">Learn more <ArrowRight size={15} /></span></Link>;
}

function LoadingState({ label }) {
  return <div className="home-state" role="status"><span className="home-loading-dot" />{label}</div>;
}

function ErrorState({ message }) {
  return <div className="home-state home-state-error" role="alert">{message}</div>;
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="home-empty-state"><Icon size={26} /><div><h3>{title}</h3><p>{text}</p></div></div>;
}

function Tool({ icon: Icon, title, text }) {
  return <div className="home-tool"><Icon size={21} /><strong>{title}</strong><span>{text}</span></div>;
}

function LandmarkIcon() {
  return <FileText size={23} />;
}

function safeServicePath(value) {
  const path = String(value || "").trim();
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/services";
}

function newsHref(item) {
  return item?._id ? `/news?newsId=${encodeURIComponent(item._id)}` : "/news";
}
