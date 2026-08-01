import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Scale,
  BookOpen,
  Users,
} from "lucide-react";

function Constitution() {
  return (
    <main className="constitution-page">

      <section className="constitution-hero">

        <div className="section-container">

          <span className="page-badge">
            BENEVOLENT MIDAX
          </span>

          <h1>
            Constitution &
            Governance
          </h1>

          <p>
            Our Constitution is the foundation of
            Benevolent Midax. It promotes fairness,
            transparency, accountability and equal
            treatment of every member.
          </p>

        </div>

      </section>

      <section className="constitution-grid section">

        <div className="section-container">

          <div className="constitution-card">

            <ShieldCheck size={45} />

            <h2>Transparency</h2>

            <p>
              Every contribution and every support
              process follows approved constitutional
              procedures.
            </p>

          </div>

          <div className="constitution-card">

            <Scale size={45} />

            <h2>Fairness</h2>

            <p>
              Every eligible member receives equal
              consideration according to the
              constitution.
            </p>

          </div>

          <div className="constitution-card">

            <BookOpen size={45} />

            <h2>Rules & Policies</h2>

            <p>
              Members are expected to understand
              their rights and responsibilities.
            </p>

          </div>

          <div className="constitution-card">

            <Users size={45} />

            <h2>Community</h2>

            <p>
              Unity and compassion remain our
              strongest values.
            </p>

          </div>

        </div>

      </section>

      <section className="constitution-download">

        <div className="section-container">

          <h2>
            Read Our Constitution
          </h2>

          <p>
            Download and understand the complete
            Benevolent Midax Constitution.
          </p>

          <Link
            className="primary-button"
            to="/contact"
          >
            Request Constitution
          </Link>

        </div>

      </section>

    </main>
  );
}

export default Constitution;