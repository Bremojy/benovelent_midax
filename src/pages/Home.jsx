import { Heart, Stethoscope, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import Hero from "../components/Hero";

function Home() {
  return (
    <main>

      <Hero />

      {/* ABOUT PREVIEW */}

      <section className="about-preview section">

        <div className="section-container">

          <div className="section-heading">

            <p className="section-label">
              WHO WE ARE
            </p>

            <h2>
              Together, We Stand Stronger
            </h2>

          </div>

          <div className="about-grid">

            <div>
              <p className="large-text">
                Benevolent Midax is committed to creating
                a supportive community where members and
                their families can find assistance during
                challenging times.
              </p>
            </div>

            <div>
              <p>
                Through our benevolent support scheme, we
                aim to provide assistance for eligible
                funeral, medical and education support. while promoting
                unity, accountability and compassion among
                our members.
              </p>

              <Link to="/about" className="text-link">
                Learn more about us →
              </Link>
            </div>

          </div>

        </div>

      </section>


      {/* SERVICES */}

      <section className="services-preview section">

        <div className="section-container">

          <div className="center-heading">

            <p className="section-label">
              HOW WE HELP
            </p>

            <h2>
              Support When It Matters Most
            </h2>

            <p>
              Our scheme is designed to provide support
              to eligible members and their families.
            </p>

          </div>


          <div className="service-grid">

            <div className="service-card">

              <div className="service-icon">
                <Heart size={32} />
              </div>

              <h3>
                Funeral Support
              </h3>

              <p>
                Supporting eligible members and families
                with funeral expenses during difficult
                moments.
              </p>

              <Link to="/services">
                Learn More →
              </Link>

            </div>


            <div className="service-card">

              <div className="service-icon">
                <Stethoscope size={32} />
              </div>

              <h3>
                Medical Support
              </h3>

              <p>
                Providing assistance towards eligible
                inpatient medical expenses according to
                the scheme guidelines.
              </p>

              <Link to="/services">
                Learn More →
              </Link>

            </div>


            <div className="service-card">

              <div className="service-icon">
                <GraduationCap size={32} />
              </div>

              <h3>
                Education Support
              </h3>

              <p>
                Building a united community that stands
                together and supports members when help
                is needed.
              </p>

              <Link to="/services">
                Learn More →
              </Link>

            </div>

          </div>

        </div>

      </section>


      {/* CTA */}

      <section className="cta-section">

        <div>

          <p className="section-label">
            NEED TO REACH US?
          </p>

          <h2>
            We Are Here to Listen
          </h2>

          <p>
            Have a question or need more information
            about Benevolent Midax?
          </p>

          <Link to="/contact" className="primary-button">
            Contact Us
          </Link>

        </div>

      </section>

    </main>
  );
}

export default Home;