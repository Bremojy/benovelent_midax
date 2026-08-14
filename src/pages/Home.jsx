
import { Link } from "react-router-dom";
import { Heart, Stethoscope, MessageCircle, FileText, Users, Images, ArrowRight, ShieldCheck, Wallet, Bell, Sparkles, ClipboardCheck, Smartphone, Headphones, CheckCircle2 } from "lucide-react";
import Hero from "../components/Hero";
import "../styles/public-modern.css";

export default function Home() {
  return (
    <>
      <Hero />
      <main className="public-modern-page">
        <section className="modern-section">
          <div className="modern-section-head">
            <span className="eyebrow">Benovelent FUND SCHEME</span>
            <h2>Better life is better when you stand together.</h2>
            <p>The constitution says the scheme supports members and families by supplementing last-expense budgets for funerals and medical bills. Members contribute Ksh 500 and the agreed minimum book balance is Ksh 500,000.</p>
          </div>
          <div className="modern-card-grid">
            <Card icon={Heart} title="Funeral support" text="Ksh 100,000 per eligible funeral claim; qualifying sibling funeral expenses are Ksh 30,000." />
            <Card icon={Stethoscope} title="Medical support" text="Inpatient support follows the constitutional bill thresholds and family claim limits." />
            <Card icon={ShieldCheck} title="Accountability" text="The Treasurer is responsible for accounting, accountability, integrity and transparency." />
          </div>
          <Link className="modern-btn" to="/constitution">Read the Constitution <ArrowRight size={17} /></Link>
        </section>

        <section className="modern-section">
          <div className="modern-section-head">
            <span className="eyebrow">QUICK ACCESS</span>
            <h2>Explore the scheme</h2>
            <p>Quick navigation is styled like a modern floating family-platform menu and fades out naturally on small screens.</p>
          </div>
          <div className="modern-card-grid">
            <Quick icon={Users} title="See our leaders" text="Meet the leadership representatives." to="/leaders" />
            <Quick icon={Images} title="Benovelent gallery" text="View community collections." to="/gallery" />
            <Quick icon={FileText} title="Constitution" text="Read the official scheme rules." to="/constitution" />
            <Quick icon={MessageCircle} title="Contact us" text="Send a question or request." to="/contact" />
          </div>
        </section>

        <section className="modern-section">
          <div className="modern-section-head">
            <span className="eyebrow">MEMBER EXPERIENCE</span>
            <h2>What members can do in the portal</h2>
            <p>Members can complete their profile, manage dependants, view Accounts, request support, follow claims, chat, receive notifications and vote in polls.</p>
          </div>
          <div className="modern-trust-band">
            <Chip icon={Wallet} title="Accounts" text="Ledger and contribution records" />
            <Chip icon={Heart} title="Support" text="Submit assistance requests" />
            <Chip icon={Bell} title="Updates" text="Claim and scheme notifications" />
            <Chip icon={MessageCircle} title="Chat" text="Private member and leader communication" />
          </div>
        </section>

        <section className="modern-section v3-experience-section">
          <div className="modern-section-head">
            <span className="eyebrow">DIGITAL EXPERIENCE</span>
            <h2>Everything important, in one member space.</h2>
            <p>Inspired by modern member-service portals, Benovelent MIDAX keeps key actions, updates and help close to the member without turning the site into a financial-banking clone.</p>
          </div>
          <div className="modern-card-grid four-v3">
            <Card icon={ClipboardCheck} title="Track support" text="Follow submitted support requests from your authenticated portal." />
            <Card icon={Smartphone} title="Mobile-ready" text="Install the portal as a PWA and keep important communication close at hand." />
            <Card icon={Headphones} title="Guided help" text="Use the MIDAX Assistant for published website and portal guidance." />
            <Card icon={CheckCircle2} title="Clear accountability" text="Use the Constitution and published updates as the source of truth for scheme procedures." />
          </div>
        </section>

        <section className="modern-section">
          <div className="modern-section-head">
            <span className="eyebrow">LEADERSHIP</span>
            <h2>People facilitating the scheme</h2>
          </div>
          <div className="modern-card-grid">
            <Card title="Moses Machila" text="Chairperson" />
            <Card title="Immaculate" text="Treasurer" />
            <Card title="Secretary seat — coming soon" text="Open for all members" />
          </div>
          <Link className="modern-btn-secondary" to="/leaders">See all leaders</Link>
        </section>

        <section className="modern-section v3-portal-cta">
          <div className="portal-cta-copy">
            <span className="eyebrow">MEMBER PORTAL</span>
            <h2>Need a faster way to your member tools?</h2>
            <p>Sign in to chat privately, view contributions, manage dependants, follow support requests, receive updates and take part in polls.</p>
            <Link className="modern-btn" to="/login"><ShieldCheck size={17} /> Open the portal <ArrowRight size={17} /></Link>
          </div>
          <div className="portal-cta-grid">
            <div><MessageCircle size={21}/><strong>Chat</strong><span>Members & leaders</span></div>
            <div><Bell size={21}/><strong>Notifications</strong><span>Stay up to date</span></div>
            <div><Wallet size={21}/><strong>Accounts</strong><span>Contribution records</span></div>
            <div><HelpIcon/><strong>Assistant</strong><span>Quick guidance</span></div>
          </div>
        </section>

        <div className="quick-pop modern-quick-pop">
          <span><Sparkles size={14} /> Quick link</span>
          <Link to="/leaders">See our leaders</Link>
          <Link to="/gallery">See our Benovelent gallery collections</Link>
        </div>
      </main>
    </>
  );
}

function Card({ icon: Icon, title, text }) {
  return <article className="modern-card">{Icon && <Icon size={25} />}<h3>{title}</h3><p>{text}</p></article>;
}

function Quick({ icon: Icon, title, text, to }) {
  return <Link to={to} className="modern-card quick-link-card"><Icon size={25} /><h3>{title}</h3><p>{text}</p><ArrowRight size={18} /></Link>;
}

function Chip({ icon: Icon, title, text }) {
  return <div className="trust-chip"><Icon size={19} /><strong>{title}</strong><span>{text}</span></div>;
}

function HelpIcon() { return <MessageCircle size={21} />; }
