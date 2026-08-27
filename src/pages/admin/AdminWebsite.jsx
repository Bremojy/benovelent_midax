import { Globe2, Newspaper, MessageCircle, Settings2, ArrowUpRight, ImagePlus } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import "../../styles/portal-redesign.css";

const items=[
 {title:"News & announcements",text:"Create and publish public news with cover photos, gallery images and attachments.",href:"/news",icon:<ImagePlus size={18}/>},
 {title:"Feedback",text:"Review active feedback collections and responses.",href:"/admin/feedback",icon:<MessageCircle size={18}/>},
 {title:"Portal settings",text:"Maintain administrator-facing settings and preferences.",href:"/admin/settings",icon:<Settings2 size={18}/>},
 {title:"Public site preview",text:"Open the public website to review current published communications.",href:"/news",icon:<Globe2 size={18}/>},
];
export default function AdminWebsite(){ return <DashboardLayout><div className="portal-dashboard-v10"><div className="portal-page-heading"><div><span className="portal-section-label"><Globe2 size={13}/> WEBSITE CONTENT</span><h1>Website & communications</h1><p>Keep daily communications easy to reach while preserving higher-risk publishing controls for SuperAdmin.</p></div></div><section className="portal-quick-actions">{items.map(i=><Link key={i.title} className="portal-quick-action" to={i.href}><div className="portal-quick-icon">{i.icon}</div><div className="portal-quick-copy"><strong>{i.title}</strong><span>{i.text}</span></div><ArrowUpRight size={15}/></Link>)}</section><div className="portal-info-strip"><Globe2 size={16}/> Admins can manage operational communications available to their role. Governance-sensitive website publication remains a SuperAdmin responsibility.</div></div></DashboardLayout>; }
