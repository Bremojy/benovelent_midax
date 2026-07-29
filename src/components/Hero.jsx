import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import api, { UPLOAD_URL } from "../services/api";

function Hero() {
  const [slides, setSlides] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  // ========================================
  // FETCH CAROUSEL
  // ========================================

  const fetchSlides = async () => {
    try {
      const response = await api.get("/carousel/active");

      if (Array.isArray(response.data)) {
        setSlides(response.data);
      } else {
        setSlides([]);
      }
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

  // ========================================
  // AUTO SLIDE
  // ========================================

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((previous) => (previous + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [slides]);

  // ========================================
  // NAVIGATION
  // ========================================

  const nextSlide = () => {
    setCurrentSlide((previous) => (previous + 1) % slides.length);
  };

  const previousSlide = () => {
    setCurrentSlide(
      (previous) => (previous - 1 + slides.length) % slides.length
    );
  };

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (loading) {
    return (
      <section className="hero">
        <div className="hero-overlay"></div>

        <div className="hero-content">
          <p className="hero-label">BENEVOLENT MIDAX</p>

          <h1>
            Standing Together.
            <br />
            Supporting One Another.
          </h1>

          <p className="hero-description">
            A community dedicated to supporting our members and their families.
          </p>
        </div>
      </section>
    );
  }

  // ========================================
  // CURRENT SLIDE
  // ========================================

  const current =
    slides.length > 0
      ? slides[currentSlide]
      : {
          imageUrl: "/hero-default.jpg",
          title: "Standing Together.",
          description:
            "A community dedicated to supporting our members and their families during life's most difficult moments.",
          buttonText: "Discover More",
          buttonLink: "/about",
        };

  // Build full image URL
  const backgroundImage = current.imageUrl.startsWith("http")
    ? current.imageUrl
    : `${UPLOAD_URL}${current.imageUrl}`;

  return (
    <section
      className="hero"
      style={{
        backgroundImage: `url(${backgroundImage})`,
      }}
    >
      <div className="hero-overlay"></div>

      <div className="hero-content">
        <p className="hero-label">BENEVOLENT MIDAX</p>

        <h1>{current.title}</h1>

        <p className="hero-description">
          {current.description}
        </p>

        <div className="hero-buttons">
          <Link
            to={current.buttonLink || "/about"}
            className="primary-button"
          >
            {current.buttonText || "Discover More"}

            <ArrowRight size={20} />
          </Link>

          <Link
            to="/contact"
            className="secondary-button"
          >
            Get in Touch
          </Link>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            className="hero-arrow hero-arrow-left"
            onClick={previousSlide}
            aria-label="Previous Slide"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            className="hero-arrow hero-arrow-right"
            onClick={nextSlide}
            aria-label="Next Slide"
          >
            <ChevronRight size={28} />
          </button>

          <div className="hero-dots">
            {slides.map((slide, index) => (
              <button
                key={slide._id || index}
                className={
                  index === currentSlide
                    ? "hero-dot active"
                    : "hero-dot"
                }
                onClick={() =>
                  setCurrentSlide(index)
                }
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="hero-scroll">
        <span>Scroll to explore</span>
      </div>
    </section>
  );
}

export default Hero;