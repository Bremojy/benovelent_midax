import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function Hero() {

  const [slides, setSlides] =
    useState([]);

  const [currentSlide, setCurrentSlide] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

    const fetchSlides = async () => {

    try {

      const response =
        await fetch(
          "http://localhost:5000/api/carousel/active"
        );

      const data =
        await response.json();

      setSlides(data);

    } catch (error) {

      console.error(
        "Failed to load carousel:",
        error
      );

    } finally {

      setLoading(false);

    }

  };
    useEffect(() => {

    fetchSlides();

  }, []);
  
    useEffect(() => {

    if (slides.length <= 1) {
      return;
    }

    const timer =
      setInterval(() => {

        setCurrentSlide(
          (previous) =>
            (previous + 1) %
            slides.length
        );

      }, 6000);

    return () =>
      clearInterval(timer);

  }, [slides.length]);

    const nextSlide = () => {

    setCurrentSlide(
      (previous) =>
        (previous + 1) %
        slides.length
    );

  };


  const previousSlide = () => {

    setCurrentSlide(
      (previous) =>
        (previous - 1 + slides.length) %
        slides.length
    );

  };
    if (loading) {

    return (

      <section className="hero">

        <div className="hero-overlay"></div>

        <div className="hero-content">

          <p className="hero-label">
            BENEVOLENT MIDAX
          </p>

          <h1>
            Standing Together.
            <br />
            Supporting One Another.
          </h1>

          <p className="hero-description">
            A community dedicated to supporting
            our members and their families.
          </p>

        </div>

      </section>

    );

  }
    const current =
    slides.length > 0
      ? slides[currentSlide]
      : {

          imageUrl:
            "/hero-default.jpg",

          title:
            "Standing Together.",

          description:
            "A community dedicated to supporting our members and their families during life's most difficult moments.",

          buttonText:
            "Discover More",

          buttonLink:
            "/about",

        };
  return (

    <section
      className="hero"
      style={{
        backgroundImage:
          `url(${current.imageUrl})`,
      }}
    >

      <div className="hero-overlay"></div>


      <div className="hero-content">

        <p className="hero-label">
          BENEVOLENT MIDAX
        </p>


        <h1>

          {current.title}

        </h1>


        <p className="hero-description">

          {current.description}

        </p>


        <div className="hero-buttons">

          <Link
            to={
              current.buttonLink ||
              "/about"
            }
            className="primary-button"
          >

            {current.buttonText ||
              "Discover More"}

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


      {/* PREVIOUS BUTTON */}

      {slides.length > 1 && (

        <button
          className="hero-arrow hero-arrow-left"
          onClick={
            previousSlide
          }
          aria-label="Previous slide"
        >

          <ChevronLeft
            size={28}
          />

        </button>

      )}


      {/* NEXT BUTTON */}

      {slides.length > 1 && (

        <button
          className="hero-arrow hero-arrow-right"
          onClick={
            nextSlide
          }
          aria-label="Next slide"
        >

          <ChevronRight
            size={28}
          />

        </button>

      )}


      {/* SLIDE INDICATORS */}

      {slides.length > 1 && (

        <div className="hero-dots">

          {slides.map(
            (slide, index) => (

              <button
                key={slide._id}
                className={
                  index === currentSlide
                    ? "hero-dot active"
                    : "hero-dot"
                }
                onClick={() =>
                  setCurrentSlide(index)
                }
                aria-label={
                  `Go to slide ${index + 1}`
                }
              />

            )
          )}

        </div>

      )}


      <div className="hero-scroll">

        <span>
          Scroll to explore
        </span>

      </div>

    </section>

  );
}

export default Hero;