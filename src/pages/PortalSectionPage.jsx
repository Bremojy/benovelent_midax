import { ArrowRight, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { portalSections } from "../config/portalSections";
import "../styles/portal-section-page.css";

export default function PortalSectionPage({ role, sectionKey }) {
  const location = useLocation();
  const section = (portalSections[role] || []).find((item) => item.key === sectionKey);

  if (!section) {
    return <DashboardLayout><div className="portal-module"><h1>Section not found</h1><Link className="portal-btn" to={role === "admin" ? "/admin" : role === "superadmin" ? "/superadmin" : "/member"}>Back to dashboard</Link></div></DashboardLayout>;
  }

  const basePath = role === "admin" ? "/admin" : role === "superadmin" ? "/superadmin" : "/member";
  const Icon = section.icon;

  return (
    <DashboardLayout>
      <main className="portal-section-page">
        <header className="portal-section-hero">
          <div>
            <span className="portal-section-eyebrow">{section.eyebrow}</span>
            <div className="portal-section-title-row">
              <span className="portal-section-icon"><Icon size={26} /></span>
              <div>
                <h1>{section.title}</h1>
                <p>{section.description}</p>
              </div>
            </div>
          </div>
          <Link className="portal-section-back" to={basePath}>Dashboard</Link>
        </header>

        <section className="portal-section-grid" aria-label={`${section.title} subpages`}>
          {section.links.map(([title, text, path, LinkIcon]) => {
            const active = location.pathname === path.split("?")[0];
            return (
              <Link key={`${title}-${path}`} to={path} className={`portal-section-card ${active ? "is-active" : ""}`}>
                <span className="portal-section-card-icon"><LinkIcon size={21} /></span>
                <span className="portal-section-card-copy">
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
                <ChevronRight size={19} className="portal-section-card-arrow" />
              </Link>
            );
          })}
        </section>

        <div className="portal-section-tip">
          <ArrowRight size={17} />
          <span>Related tools live inside this section so the main portal navigation stays focused and easy to use.</span>
        </div>
      </main>
    </DashboardLayout>
  );
}
