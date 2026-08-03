import { useState } from "react";
import "./Constitution.css";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Scale,
  BookOpen,
  Users,
} from "lucide-react";

const constitutionVideoSources = [
  import.meta.env.VITE_CONSTITUTION_VIDEO_URL,
  "https://videos.pexels.com/video-files/36410725/15439556_2160_3840_30fps.mp4",
  "https://videos.pexels.com/video-files/6774382/6774382-uhd_2160_3840_30fps.mp4",
  "https://videos.pexels.com/video-files/34848129/14483720_1920_1080_30fps.mp4",
  "/videos/benevolent-community-loop.mp4",
].filter(Boolean);

function Constitution() {
  const [videoFailed, setVideoFailed] = useState(false);
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
          <p>Download and understand the complete Benevolent Midax Constitution.</p>
          <Link className="primary-button" to="/contact">
            Request Constitution
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Constitution;
