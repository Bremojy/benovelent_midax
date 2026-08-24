import { useEffect, useState } from "react";
import api, { resolveApiUrl } from "../services/api";
import "./Gallery.css";

const galleryVideoSources = ["/videos/benevolent-community-loop.mp4"];

function Gallery() {
  const [videoFailed, setVideoFailed] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/website/gallery");
        const sectionImages = data?.section?.images || data?.gallery || [];
        if (active) setImages(Array.isArray(sectionImages) ? sectionImages.filter(Boolean) : []);
      } catch {
        if (active) setImages([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <main className="gallery-page">
      <section className={`gallery-hero gallery-video-hero ${videoFailed ? "video-failed" : ""}`}>
        <video
          className="gallery-background-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/hero.jpg"
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        >
          {galleryVideoSources.map((src) => (
            <source key={src} src={src} type="video/mp4" />
          ))}
        </video>
        <div className="gallery-video-overlay" />

        <div className="section-container">
          <span className="page-badge">COMMUNITY GALLERY</span>

          <h1>Our Journey Together</h1>

          <p>
            Moments of unity, compassion, leadership and support shared through Benovelent Midax.
          </p>
        </div>
      </section>

      <section className="gallery-grid">
        <div className="section-container">
          {loading ? (
            <div className="portal-empty">Loading gallery...</div>
          ) : images.length ? (
            images.map((img, index) => (
              <div className="gallery-card" key={index}>
                <img
                  src={img.startsWith("/uploads/") || img.startsWith("http") ? resolveApiUrl(img) : img}
                  alt="Benovelent Midax community moment"
                  onError={(e) => {
                    e.currentTarget.src = "/gallery-placeholder.svg";
                  }}
                />
              </div>
            ))
          ) : (
            <div className="portal-empty">
              <h2>No gallery items have been published yet.</h2>
              <p>Published community images will appear here automatically.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Gallery;
