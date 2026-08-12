import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Pause,
  Play,
} from "lucide-react";
import api, { resolveUploadUrl } from "../services/api";

const FALLBACK_SLIDE = {
  _id: "welcome-fallback",
  imageUrl: "/hero.jpg",
  title: "Standing Together. Supporting One Another.",
  description:
    "A welcoming community built around compassion, dignity and practical support for members and their families.",
  buttonText: "Discover More",
  buttonLink: "/about",
};

function Hero() {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const touchStart = useRef(null);

  const fetchSlides = async () => {
    try {
      const response = await api.get("/carousel/active", {
        params: { _ts: Date.now() },
      });

      const freshSlides = Array.isArray(response.data)
        ? response.data.filter((slide) => slide?.imageUrl)
        : [];

      setSlides(freshSlides);
      setCurrentSlide(0);
    } catch (error) {
      console.error("Failed to load carousel:", error);
      setSlides([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const visibleSlides = slides.length ? slides : [FALLBACK_SLIDE];
  const current = visibleSlides[currentSlide] || visibleSlides[0];

  useEffect(() => {
    if (visibleSlides.length <= 1 || paused || loading) return undefined;
    const timer = window.setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % visibleSlides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [visibleSlides.length, paused, loading]);

  useEffect(() => {
    // Warm the next image so transitions feel instant on mobile networks.
    const next = visibleSlides[(currentSlide + 1) % visibleSlides.length];
    if (!next?.imageUrl) return;
    const image = new Image();
    image.src = buildImageUrl(next.imageUrl, next.updatedAt);
  }, [currentSlide, visibleSlides]);

  const imageUrl = useMemo(
    () => buildImageUrl(current?.imageUrl, current?.updatedAt),
    [current?.imageUrl, current?.updatedAt]
  );

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  const nextSlide = () => setCurrentSlide((previous) => (previous + 1) % visibleSlides.length);
  const previousSlide = () => setCurrentSlide((previous) => (previous - 1 + visibleSlides.length) % visibleSlides.length);

  const handleTouchStart = (event) => {
    touchStart.current = event.changedTouches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const start = touchStart.current;
    const end = event.changedTouches?.[0]?.clientX ?? null;
    touchStart.current = null;
    if (start == null || end == null || Math.abs(start - end) < 45) return;
    if (start > end) nextSlide();
    else previousSlide();
  };

  return (
    <section
      className="hero modern-hero"
      aria-label="Benovelent Midax welcome carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="hero-media" aria-hidden="true">
        <img
          key={imageUrl}
          className="hero-image modern-hero-image"
          src={imageFailed ? "/hero.jpg" : imageUrl}
          alt=""
          fetchPriority="high"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
        {imageFailed && (
          <div className="hero-image-fallback" aria-hidden="true" />
        )}
        <div className="hero-image-wash" />
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
      </div>

      <div className="modern-hero-inner">
        <div className="modern-hero-copy" key={current?._id || currentSlide}>
          <div className="hero-welcome-pill">
            <HeartHandshake size={16} />
            <span>WELCOME TO Benovelent MIDAX</span>
          </div>

          <p className="hero-label">COMMUNITY · COMPASSION · SUPPORT</p>

          <h1>{current?.title || FALLBACK_SLIDE.title}</h1>

          <p className="hero-description">
            {current?.description || FALLBACK_SLIDE.description}
          </p>

          <div className="hero-buttons">
            <Link
              to={current?.buttonLink || "/about"}
              className="primary-button modern-primary-button"
            >
              {current?.buttonText || "Discover More"}
              <ArrowRight size={19} />
            </Link>
            <Link to="/contact" className="secondary-button modern-secondary-button">
              Get in Touch
            </Link>
          </div>
        </div>

        <div className="modern-hero-side-card">
          <span className="side-card-kicker">HERE FOR EACH OTHER</span>
          <strong>Support that feels like community.</strong>
          <p>Explore our services, meet the leadership team and stay connected.</p>
          <Link to="/services">Explore services <ArrowRight size={15} /></Link>
        </div>
      </div>

      {visibleSlides.length > 1 && (
        <div className="modern-hero-controls">
          <div className="modern-hero-progress" aria-hidden="true">
            {visibleSlides.map((slide, index) => (
              <span
                key={slide._id || index}
                className={index === currentSlide ? "active" : ""}
              />
            ))}
          </div>

          <div className="modern-hero-control-row">
            <button type="button" className="hero-arrow modern-arrow" onClick={previousSlide} aria-label="Previous slide">
              <ChevronLeft size={21} />
            </button>
            <button type="button" className="hero-arrow modern-arrow" onClick={nextSlide} aria-label="Next slide">
              <ChevronRight size={21} />
            </button>
            <button
              type="button"
              className="hero-play-toggle"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Resume carousel" : "Pause carousel"}
              title={paused ? "Resume carousel" : "Pause carousel"}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </button>
            <span className="hero-slide-counter">
              {String(currentSlide + 1).padStart(2, "0")} / {String(visibleSlides.length).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      <div className="hero-scroll modern-hero-scroll">
        <span>Scroll to explore</span>
        <span className="scroll-line" />
      </div>

      {loading && (
        <div className="hero-loading-indicator" aria-label="Loading latest carousel">
          <span />
        </div>
      )}
    </section>
  );
}

function buildImageUrl(value, version) {
  const raw = String(value || "/hero.jpg").trim();
  const base = raw === "/hero.jpg" ? raw : resolveUploadUrl(raw);
  return version ? `${base}${base.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}` : base;
}

export default Hero;
