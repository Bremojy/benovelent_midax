import { ArrowRight, BookOpen, CheckCircle2, HandHeart, MessageCircle, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";

const sections = [
  ["Complete your profile", "Update the required personal, contact, site-station and next-of-kin information. The portal uses the saved record to determine when profile completion requirements are met.", CheckCircle2, "/member/profile"],
  ["Manage dependants", "Add eligible dependants from the Dependants page. Existing dependent records are not edited directly by members; use Request Edit to select the correct person, explain the change and send any supporting files for administrator review.", Users, "/member/dependents"],
  ["Review account records", "Use Accounts, Contributions and M-PESA Records to view the financial records that your role is authorised to see. Do not assume a missing figure is zero when a page is still loading or reports an error.", ReceiptText, "/member/accounts"],
  ["Request support", "Open Support to submit the assistance details required by the selected workflow. Follow the form's required fields and upload only the supporting documents requested for that case.", HandHeart, "/member/support"],
  ["Track claims and requests", "Claims and Support pages show the current status available for your records. A pending request means it is still in the review workflow; keep the reference shown by the portal when contacting Benevolent.", ShieldCheck, "/member/claims"],
  ["Use community tools", "Use Messages for private conversations, Notifications for alerts, Polls for eligible votes and Feedback for the available feedback forms. Chat/call availability depends on authorised access and browser/device permissions.", MessageCircle, "/member/community"],
];

export default function PortalGuide() {
  return (
    <DashboardLayout>
      <div className="portal-module portal-guide">
        <header className="portal-module-header">
          <div>
            <span>MEMBER GUIDE</span>
            <h1>Use your portal with confidence</h1>
            <p>Practical guidance for the member services that are available in the current application.</p>
          </div>
        </header>
        <div className="portal-guide-grid">
          {sections.map(([title, text, Icon, path]) => (
            <article className="portal-panel portal-guide-card" key={title}>
              <div className="portal-guide-icon"><Icon size={20} /></div>
              <div><h2>{title}</h2><p>{text}</p><Link className="portal-text-link" to={path}>Open {title}</Link></div>
            </article>
          ))}
        </div>
        <section className="portal-panel portal-guide-note">
          <BookOpen size={21} />
          <div><h2>When something is pending</h2><p>Keep the request or claim reference, check Notifications for updates, and use the official Contact page or your authorised Benevolent administrator when the portal asks you to follow up.</p></div>
        </section>
        <Link className="portal-btn" to="/member"><ArrowRight size={16} /> Back to dashboard</Link>
      </div>
    </DashboardLayout>
  );
}
