import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Images, RefreshCw } from "lucide-react";
import api, { resolveApiUrl } from "../services/api";
import "./Gallery.css";

const galleryVideoSources = ["/videos/benevolent-community-loop.mp4"];
const shouldSkipBackgroundVideo = typeof navigator !== "undefined" && (navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || ""));

function Gallery() {
  const [videoFailed, setVideoFailed] = useState(false);
  const [images, setImages] = useState([]);
  const [section, setSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeIndex, setActiveIndex] = useState(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    (async () => {
      try {
        const { data } = await api.get("/website/gallery");
        const sectionData = data?.section || null;
        const configuredItems = sectionData?.content?.galleryItems;
        const nextImages = Array.isArray(configuredItems) && configuredItems.length
          ? configuredItems.filter((item) => item?.published !== false && item?.url).map((item) => ({ ...item, url: item.url }))
          : (Array.isArray(sectionData?.images || data?.gallery)
            ? (sectionData?.images || data?.gallery).filter(Boolean).map((url, index) => typeof url === "string"
              ? ({ id: `legacy-${index}`, url, altText: "Benevolent MIDAX community photo", title: "", caption: "" })
              : url)
            : []);
        if (active) {
          setSection(sectionData);
          setImages(nextImages);
        }
      } catch (requestError) {
        if (active) {
          setImages([]);
          setError(requestError.response?.data?.message || "Unable to load published gallery images. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [reloadVersion]);

  useEffect(() => {
    if (activeIndex === null) return undefined;
    const restoreFocus = triggerRef.current;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setActiveIndex(null);
      } else if (event.key === "ArrowRight" && images.length > 1) {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % images.length);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + images.length) % images.length);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreFocus?.focus?.();
    };
  }, [activeIndex, images.length]);

  const closeLightbox = () => setActiveIndex(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];
  const activeRawUrl = typeof activeImage === "string" ? activeImage : activeImage?.url;
  const activeSrc = activeRawUrl ? resolveApiUrl(activeRawUrl) : "";
  const activeAlt = typeof activeImage === "string" ? "Benevolent MIDAX community photo" : activeImage?.altText || activeImage?.title || "Benevolent MIDAX community photo";

  return (
    <main className="gallery-page">
      <section className={`gallery-hero gallery-video-hero ${videoFailed ? "video-failed" : ""}`}>
        {!videoFailed && <video
          className="gallery-background-video"
          autoPlay={!shouldSkipBackgroundVideo}
          muted
          loop
          playsInline
          preload={shouldSkipBackgroundVideo ? "none" : "metadata"}
          poster="/hero.jpg"
          onError={() => setVideoFailed(true)}
          aria-hidden="true"
        >
          {galleryVideoSources.map((src) => <source key={src} src={src} type="video/mp4" />)}
        </video>}
        <div className="gallery-video-overlay" />
        <div className="section-container">
          <span className="page-badge">COMMUNITY GALLERY</span>
          <h1>{section?.title || "Our Community Gallery"}</h1>
          <p>{section?.subtitle || section?.description || "Published moments of unity, leadership and support shared by the Benevolent MIDAX community."}</p>
        </div>
      </section>

      <section className="gallery-grid" aria-label="Published community photos">
        <div className="section-container">
          {loading ? (
            <div className="portal-empty" role="status">Loading published gallery…</div>
          ) : error ? (
            <div className="gallery-load-error" role="alert"><p>{error}</p><button type="button" onClick={() => setReloadVersion((version) => version + 1)}><RefreshCw size={16} /> Try again</button></div>
          ) : images.length ? (
            images.map((item, index) => {
              const raw = typeof item === "string" ? item : item?.url;
              const src = raw ? resolveApiUrl(raw) : "";
              const title = typeof item === "string" ? "" : item?.title || "";
              const caption = typeof item === "string" ? "" : item?.caption || "";
              const alt = typeof item === "string" ? "Benevolent MIDAX community photo" : item?.altText || title || "Benevolent MIDAX community photo";
              return (
                <article className="gallery-card" key={item?.id || `${raw}-${index}`}>
                  <button
                    type="button"
                    className="gallery-image-trigger"
                    onClick={(event) => { triggerRef.current = event.currentTarget; setActiveIndex(index); }}
                    aria-label={`View photo ${index + 1}${title ? `: ${title}` : ""}`}
                  >
                    <img src={src} alt={alt} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />
                    <span className="gallery-image-open-label">View image</span>
                  </button>
                  {(title || caption) && <div className="gallery-card-copy">{title && <strong>{title}</strong>}{caption && <p>{caption}</p>}</div>}
                </article>
              );
            })
          ) : (
            <div className="portal-empty gallery-empty-state"><Images size={28} /><h2>No gallery items have been published yet.</h2><p>Published community images will appear here automatically.</p></div>
          )}
        </div>
      </section>

      {activeImage && activeSrc && (
        <div className="gallery-lightbox-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeLightbox(); }}>
          <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label="Gallery image viewer">
            <button type="button" className="gallery-lightbox-close" ref={closeButtonRef} onClick={closeLightbox} aria-label="Close image viewer"><X size={23} /></button>
            {images.length > 1 && <button type="button" className="gallery-lightbox-arrow gallery-lightbox-previous" onClick={() => setActiveIndex((index) => (index - 1 + images.length) % images.length)} aria-label="Previous image"><ChevronLeft size={29} /></button>}
            <figure>
              <img src={activeSrc} alt={activeAlt} />
              {(activeImage?.title || activeImage?.caption) && <figcaption>{activeImage?.title && <strong>{activeImage.title}</strong>}{activeImage?.caption && <span>{activeImage.caption}</span>}</figcaption>}
              <p className="gallery-lightbox-count">{activeIndex + 1} of {images.length} photos</p>
            </figure>
            {images.length > 1 && <button type="button" className="gallery-lightbox-arrow gallery-lightbox-next" onClick={() => setActiveIndex((index) => (index + 1) % images.length)} aria-label="Next image"><ChevronRight size={29} /></button>}
          </div>
        </div>
      )}
    </main>
  );
}

export default Gallery;
