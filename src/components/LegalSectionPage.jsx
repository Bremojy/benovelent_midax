import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import API from "../services/api";
import "./LegalSectionPage.css";

function LegalSectionPage({
  section,
  title,
  subtitle,
  intro,
  accent = "Trust, clarity and accountability",
}) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data } = await API.get(`/website/${section}`);
        if (active) setPage(data?.section || null);
      } catch {
        if (active) setPage(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [section]);

  const legalContent = useMemo(() => {
    const source = page?.content;
    if (!source) return [];

    if (Array.isArray(source)) {
      return source
        .map((item, index) => ({
          title: item?.title || item?.heading || `Clause ${index + 1}`,
          body: item?.body || item?.text || String(item),
        }))
        .filter((item) => item.body);
    }

    if (typeof source === "object") {
      const entries = [];
      for (const [key, value] of Object.entries(source)) {
        if (typeof value === "string" && value.trim()) {
          entries.push({ title: beautifyLabel(key), body: value.trim() });
        } else if (Array.isArray(value)) {
          entries.push({ title: beautifyLabel(key), body: value.join(" • ") });
        }
      }
      if (entries.length) return entries;
      return [{ title: page?.title || title, body: JSON.stringify(source, null, 2) }];
    }

    return [{ title: page?.title || title, body: String(source) }];
  }, [page, title]);

  return (
    <main className="legal-page">
      <section className="legal-hero">
        <div className="legal-hero-copy">
          <span className="legal-kicker">{accent}</span>
          <h1>{page?.title || title}</h1>
          <p>{page?.subtitle || subtitle || intro}</p>
        </div>

        <div className="legal-hero-card">
          <div className="legal-pill">
            <ShieldCheck size={18} />
            Protected member information
          </div>
          <div className="legal-pill">
            <BadgeCheck size={18} />
            Reviewable by superadmin
          </div>
          <div className="legal-pill">
            <Sparkles size={18} />
            Clear, modern presentation
          </div>
        </div>
      </section>

      <section className="legal-body">
        <div className="legal-toolbar">
          <span>{loading ? "Loading content..." : "Current policy"}</span>
          <Link to="/contact" className="legal-contact-link">
            Ask a question <ArrowRight size={16} />
          </Link>
        </div>

        <div className="legal-grid">
          <article className="legal-panel">
            <h2>{page?.subtitle || subtitle}</h2>
            <p className="legal-intro">{page?.description || intro}</p>

            <div className="legal-block-list">
              {loading ? (
                <div className="legal-skeleton">Loading policy content...</div>
              ) : legalContent.length ? (
                legalContent.map((item, index) => (
                  <section className="legal-block" key={`${item.title}-${index}`}>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </section>
                ))
              ) : (
                <section className="legal-block">
                  <h3>{title}</h3>
                  <p>This section is ready for superadmin editing from Website Settings.</p>
                </section>
              )}
            </div>
          </article>

          <aside className="legal-aside">
            <div className="legal-side-card">
              <h3>Why this matters</h3>
              <p>
                A clear policy page builds confidence, reduces confusion and helps every member understand the rules before they join or use the portal.
              </p>
            </div>

            <div className="legal-side-card">
              <h3>What to update</h3>
              <p>
                The superadmin can update the content, publish changes and keep the public website aligned with the constitution and portal rules.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function beautifyLabel(value = "") {
  return String(value)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default LegalSectionPage;
