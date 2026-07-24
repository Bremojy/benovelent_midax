import {
  Heart,
  Stethoscope,
  AlertTriangle
} from "lucide-react";

function Services() {
  return (
    <main className="inner-page">
{/* =========================================
    MODERN HERO
========================================= */}

<section className="services-hero">

  <div className="hero-background">

    <div className="hero-circle hero-circle-1"></div>

    <div className="hero-circle hero-circle-2"></div>

    <div className="hero-circle hero-circle-3"></div>

  </div>

  <div className="section-container">

    <div className="services-hero-content">

      <div className="hero-badge">

        OUR SUPPORT SERVICES

      </div>

      <h1>

        Standing With You
        <br />

        <span>When You Need Us Most</span>

      </h1>

      <p>

        Benevolent Midax exists to provide compassionate,
        dependable and timely support to our members and
        their families. Explore the services available
        under our benevolent scheme.

      </p>

      <div className="hero-buttons">

        <a href="#services">

          Explore Services

        </a>

        <a
          href="/contact"
          className="secondary"
        >

          Contact Us

        </a>

      </div>

      <div className="hero-stats">

        <div>

          <strong>3</strong>

          <span>
            Core Support Programs
          </span>

        </div>

        <div>

          <strong>24/7</strong>

          <span>
            Emergency Response
          </span>

        </div>

        <div>

          <strong>100%</strong>

          <span>
            Member Focused
          </span>

        </div>

      </div>

    </div>

  </div>

</section>


      <section
  className="section"
  id="services"
>

        <div className="section-container">

          <div className="center-heading">

            <p className="section-label">
              OUR SERVICES
            </p>

            <h2>
              How We Support Our Members
            </h2>

          </div>


          <div
  className="services-modern-grid"
  id="services"
>

  {/* =====================================
      FUNERAL SUPPORT
  ===================================== */}

  <div className="modern-service-card">

    <div className="service-top">

      <div className="service-icon-box orange">

        <Heart size={34} />

      </div>

      <span className="service-tag">
        Most Requested
      </span>

    </div>

    <h2>
      Funeral Support
    </h2>

    <p>

      Benevolent Midax provides funeral
      support to eligible beneficiaries in
      accordance with the scheme
      constitution.

    </p>

    <ul>

      <li>
        ✓ Support for eligible parents
      </li>

      <li>
        ✓ Support for husband or wife
      </li>

      <li>
        ✓ Support for eligible children
      </li>

      <li>
        ✓ Support for eligible siblings
      </li>

    </ul>

  </div>

  {/* =====================================
      MEDICAL SUPPORT
  ===================================== */}

  <div className="modern-service-card featured">

    <div className="service-top">

      <div className="service-icon-box blue">

        <Stethoscope size={34} />

      </div>

      <span className="service-tag">
        Essential Care
      </span>

    </div>

    <h2>
      Medical Support
    </h2>

    <p>

      Financial assistance towards eligible
      inpatient hospital bills according to
      the Benevolent Midax guidelines.

    </p>

    <ul>

      <li>
        ✓ Support for contributors
      </li>

      <li>
        ✓ Support for spouses
      </li>

      <li>
        ✓ Support for children
      </li>

      <li>
        ✓ Subject to claim requirements
      </li>

    </ul>

  </div>

  {/* =====================================
      EMERGENCY SUPPORT
  ===================================== */}

  <div className="modern-service-card">

    <div className="service-top">

      <div className="service-icon-box red">

        <AlertTriangle size={34} />

      </div>

      <span className="service-tag">
        Emergency
      </span>

    </div>

    <h2>
      Emergency Support
    </h2>

    <p>

      Immediate assistance for urgent
      situations where members require
      additional support under the scheme.

    </p>

    <ul>

      <li>
        ✓ Urgent cases assessed quickly
      </li>

      <li>
        ✓ Assistance subject to resources
      </li>

      <li>
        ✓ Transparent review process
      </li>

    </ul>

  </div>

</div>


         {/* =========================================
    IMPORTANT NOTICE
========================================= */}

<div className="important-card">

  <div className="important-icon">

    <AlertTriangle size={42} />

  </div>

  <div>

    <p className="section-label">

      IMPORTANT NOTICE

    </p>

    <h2>

      Member Eligibility

    </h2>

    <p>

      All benefits, financial assistance and
      emergency support are provided in accordance
      with the Benevolent Midax Constitution,
      membership eligibility requirements,
      available funds and approved claim procedures.

    </p>

  </div>

</div>

{/* =========================================
    CALL TO ACTION
========================================= */}

<section className="services-cta">

  <div className="cta-box">

    <p className="section-label">

      NEED ASSISTANCE?

    </p>

    <h2>

      We're Ready To Support You

    </h2>

    <p>

      Our committee is committed to ensuring every
      eligible member receives timely guidance and
      support whenever assistance is required.

    </p>

    <div className="cta-buttons">

      <a
        href="/contact"
        className="cta-primary"
      >
        Contact Us
      </a>

      <a
        href="/members"
        className="cta-secondary"
      >
        Member Portal
      </a>

    </div>

  </div>

</section>

        </div>

      </section>

    </main>
  );
}

export default Services;