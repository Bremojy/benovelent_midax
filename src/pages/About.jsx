import { Target, Eye, HeartHandshake } from "lucide-react";

function About() {
  return (
    <main className="inner-page">

      {/* PAGE HERO */}

      <section className="page-hero">
        <div>
          <p className="section-label">ABOUT BENEVOLENT MIDAX</p>

          <h1>
            Together, We Care.
            <br />
            Together, We Support.
          </h1>

          <p>
            Learn more about our purpose, mission and vision.
          </p>
        </div>
      </section>


      {/* WHO WE ARE */}

      <section className="section">

        <div className="section-container">

          <div className="about-content">

            <div>
              <p className="section-label">
                WHO WE ARE
              </p>

              <h2>
                A Community Built on Support
              </h2>
            </div>

            <div>

              <p className="large-text">
                Benevolent Midax is a benevolent support
                scheme established to support members and
                their families during challenging moments.
              </p>

              <p>
                Our purpose is rooted in compassion,
                unity and collective responsibility.
                Through the scheme, members come together
                to provide assistance where it is needed
                most.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* MISSION & VISION */}

      <section className="values-section">

        <div className="section-container">

          <div className="values-grid">

            <div className="value-card">

              <div className="value-icon">
                <Target size={32} />
              </div>

              <p className="section-label">
                OUR MISSION
              </p>

              <h3>
                Supporting Our Members
              </h3>

              <p>
                To provide meaningful support to eligible
                members and their families during difficult
                times while promoting unity, compassion
                and accountability.
              </p>

            </div>


            <div className="value-card">

              <div className="value-icon">
                <Eye size={32} />
              </div>

              <p className="section-label">
                OUR VISION
              </p>

              <h3>
                A Stronger Community
              </h3>

              <p>
                To build a united and dependable community
                where members can confidently stand together
                and support one another.
              </p>

            </div>


            <div className="value-card">

              <div className="value-icon">
                <HeartHandshake size={32} />
              </div>

              <p className="section-label">
                OUR VALUES
              </p>

              <h3>
                Compassion & Integrity
              </h3>

              <p>
                We believe in accountability, integrity,
                transparency and responsible leadership.
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}

export default About;