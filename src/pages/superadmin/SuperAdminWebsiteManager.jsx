import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, FileText, GalleryHorizontal, Globe2, Image, Landmark, Newspaper, RefreshCw, ShieldCheck, Users } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "./SuperAdminWebsiteManager.css";

const number = (value) => new Intl.NumberFormat("en-KE").format(Number(value || 0));

export default function SuperAdminWebsiteManager() {
  const [state, setState] = useState({ loading: true, error: "", overview: null, content: [], slides: [], leaders: [], gallery: [], policies: [] });
  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    const results = await Promise.allSettled([
      API.get("/superadmin/overview"), API.get("/website/manage"), API.get("/carousel/manage"),
      API.get("/leaders/manage"), API.get("/website/gallery"), API.get("/policies/admin"),
    ]);
    const [overview, content, slides, leaders, gallery, policies] = results;
    const failures = results.filter((item) => item.status === "rejected").length;
    setState({
      loading: false,
      error: failures ? "Some Website Manager data could not be loaded. No placeholder values were inserted." : "",
      overview: overview.status === "fulfilled" ? overview.value.data : null,
      content: content.status === "fulfilled" ? (content.value.data?.content || []) : [],
      slides: slides.status === "fulfilled" ? (Array.isArray(slides.value.data) ? slides.value.data : []) : [],
      leaders: leaders.status === "fulfilled" ? (Array.isArray(leaders.value.data) ? leaders.value.data : []) : [],
      gallery: gallery.status === "fulfilled" ? (gallery.value.data?.section?.content?.galleryItems || []) : [],
      policies: policies.status === "fulfilled" ? (policies.value.data?.policies || []) : [],
    });
  };
  useEffect(() => { load(); }, []);
  const publishedSections = useMemo(() => state.content.filter((item) => item?.published !== false).length, [state.content]);
  const draftSections = useMemo(() => state.content.filter((item) => item?.published === false).length, [state.content]);
  const activeSlides = state.slides.filter((item) => item?.isActive !== false).length;
  const activeLeaders = state.leaders.filter((item) => item?.isActive !== false).length;
  const activeGallery = state.gallery.filter((item) => item?.published !== false).length;
  const enabledPolicies = state.policies.filter((item) => item?.enabled !== false).length;
  const news = state.overview?.content?.publishedNews ?? 0;
  return (<DashboardLayout><main className="website-manager-page">
    <header className="website-manager-hero"><div><span className="website-manager-kicker">WEBSITE MANAGER</span><h1><Globe2 size={31} /> Manage Benevolent MIDAX without coding.</h1><p>One professional workspace for approved public content, media, publishing and website-facing configuration. The browser is never given raw database access.</p></div><button type="button" className="wm-refresh" onClick={load} disabled={state.loading}><RefreshCw size={17} /> {state.loading ? "Loading…" : "Refresh live data"}</button></header>
    {state.error && <div className="wm-alert"><ShieldCheck size={18} /> {state.error}</div>}
    <section className="wm-metrics" aria-label="Website manager live metrics">
      <Metric icon={<FileText />} label="Published sections" value={state.loading ? "—" : number(publishedSections)} detail={`${draftSections} draft/unpublished`} />
      <Metric icon={<Newspaper />} label="Published news" value={state.loading ? "—" : number(news)} detail="live public newsroom" />
      <Metric icon={<GalleryHorizontal />} label="Active carousel" value={state.loading ? "—" : number(activeSlides)} detail={`${state.slides.length} stored records`} />
      <Metric icon={<Users />} label="Active leaders" value={state.loading ? "—" : number(activeLeaders)} detail={`${state.leaders.length} stored records`} />
      <Metric icon={<Image />} label="Gallery" value={state.loading ? "—" : number(activeGallery)} detail={`${state.gallery.length} configured items`} />
      <Metric icon={<Landmark />} label="Enabled policies" value={state.loading ? "—" : number(enabledPolicies)} detail={`${state.policies.length} stored records`} />
    </section>
    <section className="wm-section"><div className="wm-section-heading"><div><span>CONTENT</span><h2>Manage the public experience.</h2><p>Use the existing live editors for each supported website resource.</p></div></div><div className="wm-card-grid">
      <ManagerCard icon={<FileText />} title="Pages & Content" text="Home, About, Services, Contact, Footer, legal pages and approved assistant guidance." href="/superadmin/settings?tab=website" />
      <ManagerCard icon={<GalleryHorizontal />} title="Home / Carousel" text="Upload, edit, reorder and archive homepage slides." href="/superadmin/settings?tab=carousel" />
      <ManagerCard icon={<Users />} title="Leadership" text="Maintain public leadership records, photos, order and visibility." href="/superadmin/leaders" />
      <ManagerCard icon={<Image />} title="Gallery" text="Manage public gallery images, captions, ordering and visibility." href="/superadmin/settings?tab=gallery" />
      <ManagerCard icon={<Newspaper />} title="News & Events" text="Create drafts, publish updates, unpublish and archive newsroom items." href="/superadmin/news" />
      <ManagerCard icon={<ShieldCheck />} title="Policies" text="Manage enabled/disabled policy records used by the public/member experience." href="/superadmin/policies" />
      <ManagerCard icon={<Landmark />} title="Constitution" text="Review the current constitution and preserve earlier versions safely." href="/superadmin/constitution" />
      <ManagerCard icon={<ShieldCheck />} title="Audit History" text="Trace important Website Manager mutations through the existing audit system." href="/superadmin/audit" />
    </div></section>
    <section className="wm-section wm-publish-strip"><div><span>PUBLISH CENTRE</span><h2>Drafts stay private until the backend confirms publication.</h2><p>Public pages continue to read published/active records. Archive actions retain records rather than deleting content by default.</p></div><div className="wm-publish-actions"><a href="/superadmin/settings?tab=website">Edit pages <ArrowUpRight size={16} /></a><a href="/superadmin/news">Open newsroom <ArrowUpRight size={16} /></a><a href="/superadmin/audit">Review audit history <ArrowUpRight size={16} /></a></div></section>
    <section className="wm-footer-note"><ShieldCheck size={17} /><span>High-risk business data such as finance, support decisions, authentication and audit records remains behind its dedicated business APIs.</span></section>
  </main></DashboardLayout>);
}
function Metric({ icon, label, value, detail }) { return <article className="wm-metric"><div className="wm-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></article>; }
function ManagerCard({ icon, title, text, href }) { return <a className="wm-card" href={href}><span className="wm-card-icon">{icon}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={17} /></a>; }
