import { useEffect, useState } from "react";
import api, { resolveApiUrl } from "../services/api";
import "./Gallery.css";

const galleryVideoSources = ["/videos/benevolent-community-loop.mp4"];

const shouldSkipBackgroundVideo = typeof navigator !== "undefined" && (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || ""));

function Gallery() {
  const [videoFailed, setVideoFailed] = useState(false);
  const [images, setImages] = useState([]);
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await api.get("/website/gallery");
        const sectionData = data?.section || null;
        const configuredItems = sectionData?.content?.galleryItems;
        const nextImages = Array.isArray(configuredItems) && configuredItems.length
          ? configuredItems.filter((item) => item?.url).map((item) => ({ ...item, url: item.url }))
          : (Array.isArray(sectionData?.images || data?.gallery) ? (sectionData?.images || data?.gallery).filter(Boolean).map((url, index) => ({ id: `legacy-${index}`, url, altText: "Benevolent MIDAX community moment", title: "", caption: "" })) : []);
        if (active) { setSection(sectionData); setImages(nextImages); }
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

          <h1>{section?.title || "Our Journey Together"}</h1>

          <p>
            {section?.subtitle || section?.description || "Moments of unity, compassion, leadership and support shared through Benevolent Midax."}
          </p>
        </div>
      </section>

      <section className="gallery-grid">
        <div className="section-container">
          {loading ? (
            <div className="portal-empty">Loading gallery...</div>
          ) : images.length ? (
            images.map((item, index) => {
              const raw = typeof item === "string" ? item : item?.url;
              const src = raw?.startsWith("/uploads/") || raw?.startsWith("http") ? resolveApiUrl(raw) : raw;
              return (
                <article className="gallery-card" key={item?.id || `${raw}-${index}`}>
                  <img
                    src={src}
                    alt={item?.altText || item?.title || "Benevolent MIDAX community moment"}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/gallery-placeholder.svg";
                    }}
                  />
                  {(item?.title || item?.caption) && <div className="gallery-card-copy"><strong>{item?.title}</strong>{item?.caption && <p>{item.caption}</p>}</div>}
                </article>
              );
            })
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
