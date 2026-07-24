import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Send,
} from "lucide-react";

function Contact() {
  return (
    <main className="contact-page">

      {/* HERO */}

      <section className="contact-hero">

        <div className="hero-overlay"></div>

        <div className="section-container">

          <p className="section-label">
            CONTACT US
          </p>

          <h1>
            We'd Love
            <br />
            To Hear From You
          </h1>

          <p className="hero-description">
            Whether you have questions, suggestions, or need
            assistance, our team is always ready to help.
            Reach out and we'll respond as soon as possible.
          </p>

        </div>

      </section>


      {/* CONTENT */}

      <section className="section">

        <div className="section-container">

          <div className="contact-wrapper">

            {/* LEFT */}

            <div className="contact-info">

              <p className="section-label">
                GET IN TOUCH
              </p>

              <h2>
                Let's Start A Conversation
              </h2>

              <p className="contact-intro">
                Benevolent Midax exists to serve and support our
                members. Feel free to contact us through any of
                the channels below.
              </p>


              <div className="contact-card">

                <div className="contact-icon">
                  <Phone size={22} />
                </div>

                <div>

                  <h4>Phone</h4>

                  <p>
                    +254 700 000 000
                  </p>

                </div>

              </div>


              <div className="contact-card">

                <div className="contact-icon">
                  <Mail size={22} />
                </div>

                <div>

                  <h4>Email</h4>

                  <p>
                    info@benevolentmidax.com
                  </p>

                </div>

              </div>


              <div className="contact-card">

                <div className="contact-icon">
                  <MessageCircle size={22} />
                </div>

                <div>

                  <h4>WhatsApp</h4>

                  <p>
                    +254 700 000 000
                  </p>

                </div>

              </div>


              <div className="contact-card">

                <div className="contact-icon">
                  <MapPin size={22} />
                </div>

                <div>

                  <h4>Location</h4>

                  <p>
                    Nairobi, Kenya
                  </p>

                </div>

              </div>

            </div>


            {/* RIGHT */}

            <div className="contact-form-card">

              <h2>
                Send Us A Message
              </h2>

              <p>
                Fill in the form below and we'll get back to you.
              </p>

              <form className="contact-form">

                <div className="input-grid">

                  <input
                    type="text"
                    placeholder="Full Name"
                  />

                  <input
                    type="email"
                    placeholder="Email Address"
                  />

                </div>

                <input
                  type="text"
                  placeholder="Phone Number"
                />

                <input
                  type="text"
                  placeholder="Subject"
                />

                <textarea
                  rows="7"
                  placeholder="Write your message here..."
                ></textarea>

                <button type="submit">

                  <Send size={18} />

                  Send Message

                </button>

              </form>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Contact;