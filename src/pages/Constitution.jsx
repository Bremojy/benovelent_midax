import { useEffect, useState } from "react";
import "./Constitution.css";
import API, { resolveApiUrl } from "../services/api";
import {
  ShieldCheck,
  Scale,
  BookOpen,
  Users,
  Eye,
  Printer,
  Download,
} from "lucide-react";

const constitutionFile = "/documents/benevolent-midax-constitution.pdf";
const constitutionVideoSources = ["/videos/benevolent-community-loop.mp4"];

function Constitution() {
  const [videoFailed, setVideoFailed] = useState(false);
  const [fileUrl, setFileUrl] = useState(constitutionFile);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await API.get("/website/constitution");
        if (!active) return;
        const content = data?.section?.content || data?.file || {};
        setFileUrl(resolveApiUrl(content.fileUrl || constitutionFile));
      } catch {
        if (active) setFileUrl(resolveApiUrl(constitutionFile));
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <main className="constitution-page">
      <section className={`constitution-hero constitution-video-hero ${videoFailed ? "video-failed" : ""}`}>
        <video
          className="constitution-background-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero.jpg"
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        >
          {constitutionVideoSources.map((src) => (
            <source key={src} src={src} type="video/mp4" />
          ))}
        </video>
        <div className="constitution-video-overlay" />

        <div className="section-container">
          <span className="page-badge">BENEVOLENT MIDAX</span>

          <h1>Constitution & Governance</h1>

          <p>
            Our Constitution is the foundation of Benevolent Midax. It promotes fairness, transparency, accountability and equal treatment of every member.
          </p>
        </div>
      </section>

      <section className="constitution-grid section">
        <div className="section-container">
          <div className="constitution-card">
            <ShieldCheck size={45} />
            <h2>Transparency</h2>
            <p>Every contribution and every support process follows approved constitutional procedures.</p>
          </div>

          <div className="constitution-card">
            <Scale size={45} />
            <h2>Fairness</h2>
            <p>Every eligible member receives equal consideration according to the constitution.</p>
          </div>

          <div className="constitution-card">
            <BookOpen size={45} />
            <h2>Rules & Policies</h2>
            <p>Members are expected to understand their rights and responsibilities.</p>
          </div>

          <div className="constitution-card">
            <Users size={45} />
            <h2>Community</h2>
            <p>Unity and compassion remain our strongest values.</p>
          </div>
        </div>
      </section>

      <section className="constitution-download">
        <div className="section-container">
          <h2>Read Our Constitution</h2>
          <p>View, download or print the official Benevolent Midax Constitution.</p>
          <div className="constitution-actions">
            <a className="primary-button" href={fileUrl} target="_blank" rel="noreferrer">
              <Eye size={18} /> View file
            </a>
            <a className="primary-button secondary" href={fileUrl} download>
              <Download size={18} /> Download PDF
            </a>
            <button className="primary-button tertiary" type="button" onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")?.focus?.()}>
              <Printer size={18} /> Print
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Constitution;
