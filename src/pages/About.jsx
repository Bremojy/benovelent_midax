import {
  Target,
  Eye,
  HeartHandshake,
  Users,
  ShieldCheck,
  Award,
  ArrowRight,
} from "lucide-react";

import { Link } from "react-router-dom";

function About() {
  return (
    <main className="about-page">

      {/* HERO */}

      <section className="about-hero about-video-hero">
        <video
          className="about-background-video"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero.jpg"
          aria-hidden="true"
        >
          <source
            src={import.meta.env.VITE_ABOUT_VIDEO_URL || "/videos/benevolent-community-loop.mp4"}
            type="video/mp4"
          />
        </video>
        <div className="about-video-overlay" />

        <div className="about-hero-content">

          <p className="about-label">
            ABOUT BENEVOLENT MIDAX
          </p>

          <h1>
            Together We Protect.
            <br />
            Together We Thrive.
          </h1>

          <p className="about-hero-text">
            Building a dependable community where members
            stand together during life's most important moments.
          </p>

          <Link
            to="/contact"
            className="about-primary-btn"
          >
            Join the Community
            <ArrowRight size={18} />
          </Link>

        </div>

      </section>

      {/* STATISTICS */}

      <section className="about-stats">

        <div className="about-container">

          <div className="about-stats-grid">

            <div className="about-stat">
              <h2>500+</h2>
              <p>Active Members</p>
            </div>

            <div className="about-stat">
              <h2>100%</h2>
              <p>Transparency</p>
            </div>

            <div className="about-stat">
              <h2>24/7</h2>
              <p>Community Support</p>
            </div>

            <div className="about-stat">
              <h2>10+</h2>
              <p>Years of Unity</p>
            </div>

          </div>

        </div>

      </section>

      {/* WHO WE ARE */}

      <section className="about-section">

        <div className="about-container">

          <div className="about-grid">

            <div className="about-image">

              <img
                src="/about-welcome.svg"
                alt="Benevolent Midax community welcome"
                onError={(e) => { e.currentTarget.src = "/hero.jpg"; }}
              />

            </div>

            <div>

              <p className="about-label">
                WHO WE ARE
              </p>

              <h2>
                A Strong Community Built on Care
              </h2>

              <p className="about-large-text">
                Benevolent Midax is a member-driven
                support scheme committed to ensuring
                that no family faces difficult moments
                alone.
              </p>

              <p>
                Through collective responsibility,
                compassion and accountability,
                members contribute towards building
                a reliable support system that creates
                confidence, unity and lasting impact.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* VALUES */}

      <section className="about-values">

        <div className="about-container">

          <div className="about-title">

            <p className="about-label">
              OUR FOUNDATION
            </p>

            <h2>
              Guided by Purpose
            </h2>

          </div>

          <div className="about-cards">

            <div className="about-card">

              <div className="about-icon">

                <Target size={34} />

              </div>

              <h3>Mission</h3>

              <p>
                Supporting members and their
                families through compassionate,
                reliable and timely assistance.
              </p>

            </div>

            <div className="about-card">

              <div className="about-icon">

                <Eye size={34} />

              </div>

              <h3>Vision</h3>

              <p>
                Creating a trusted community
                where everyone feels secure,
                valued and supported.
              </p>

            </div>

            <div className="about-card">

              <div className="about-icon">

                <HeartHandshake size={34} />

              </div>

              <h3>Values</h3>

              <p>
                Compassion, integrity,
                accountability and unity
                define everything we do.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* WHY CHOOSE US */}

      <section className="about-features">

        <div className="about-container">

          <div className="about-title">

            <p className="about-label">
              WHY MIDAX
            </p>

            <h2>
              More Than a Benevolent Scheme
            </h2>

          </div>

          <div className="about-feature-grid">

            <div className="feature-box">

              <Users size={38} />

              <h3>Community First</h3>

              <p>
                Every member belongs to a caring
                family that stands together.
              </p>

            </div>

            <div className="feature-box">

              <ShieldCheck size={38} />

              <h3>Transparency</h3>

              <p>
                Every contribution is managed
                with accountability and trust.
              </p>

            </div>

            <div className="feature-box">

              <Award size={38} />

              <h3>Reliable Support</h3>

              <p>
                Assistance when it matters most,
                giving members peace of mind.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* CTA */}

      <section className="about-cta">

        <div className="about-container">

          <h2>
            Join a Community That Cares
          </h2>

          <p>
            Become part of a dependable family
            built on compassion, unity and support.
          </p>

          <Link
            to="/contact"
            className="about-primary-btn"
          >
            Contact Us
          </Link>

        </div>

      </section>

    </main>
  );
}

export default About;