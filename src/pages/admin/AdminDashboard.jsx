import { useEffect, useState } from "react";
import { RefreshCw, Users, UserCheck, UserX, Ban, Wallet, HandHeart } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getAdminDashboard, getMemberStatistics, getRecentMembers, getContributionSummary } from "../../services/adminService";
import "./AdminDashboard.css";
import "../../styles/portalModule.css";

export default function AdminDashboard(){
 const [stats,setStats]=useState({});const [recent,setRecent]=useState([]);const [contrib,setContrib]=useState({});const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const load=async()=>{try{setLoading(true);setError("");const [,s,r,c]=await Promise.all([getAdminDashboard(),getMemberStatistics(),getRecentMembers(),getContributionSummary()]);setStats(s?.statistics||s||{});setRecent(r?.members||r?.recentMembers||[]);setContrib(c?.summary||c||{});}catch(e){setError(e.response?.data?.message||e.message||"Unable to load administrator dashboard.");}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const val=(...keys)=>{for(const k of keys)if(stats?.[k]!==undefined)return stats[k];return 0};
 if(loading)return <DashboardLayout><div className="admin-dashboard-loading"><div className="admin-loading-spinner"><RefreshCw className="spinning"/></div><h2>Loading administration dashboard</h2><p>Fetching current member and finance information...</p></div></DashboardLayout>;
 return <DashboardLayout><div className="admin-dashboard">
 <header className="admin-dashboard-header"><div><span className="admin-eyebrow">ADMINISTRATION</span><h1>Welcome to the Admin Portal</h1><p>Manage members, finance, claims and member support.</p></div><button className="admin-refresh-btn" onClick={load}><RefreshCw size={17}/> Refresh</button></header>
 {error&&<div className="admin-inline-error">{error}</div>}
 <section className="admin-stat-grid">
 <Stat icon={<Users/>} label="Total Members" value={val("totalMembers","total","count")} />
 <Stat icon={<UserCheck/>} label="Active Members" value={val("activeMembers","active")} type="success"/>
 <Stat icon={<UserX/>} label="Inactive Members" value={val("inactiveMembers","inactive")} type="warning"/>
 <Stat icon={<Ban/>} label="Suspended" value={val("suspendedMembers","suspended")} type="danger"/>
 </section>
 <section className="admin-stat-grid"><Stat icon={<Users/>} label="Profiles 100%" value={val("completedProfiles")} /><Stat icon={<UserX/>} label="Profiles incomplete" value={val("incompleteProfiles")} type="warning" /><Stat icon={<Users/>} label="Leaders" value={val("totalLeaders")} /><Stat icon={<HandHeart/>} label="Approved cases" value={val("approvedClaims")} type="success" /></section>
 <section className="admin-overview-grid">
  <div className="admin-overview-card"><div className="overview-card-header"><div><span>MEMBERSHIP</span><h2>Member Overview</h2></div><div className="overview-icon"><Users size={21}/></div></div><div className="overview-mini-grid"><div><span>Total</span><strong>{val("totalMembers","total","count")}</strong></div><div><span>Active</span><strong>{val("activeMembers","active")}</strong></div><div><span>Inactive</span><strong>{val("inactiveMembers","inactive")}</strong></div><div><span>Suspended</span><strong>{val("suspendedMembers","suspended")}</strong></div></div></div>
  <div className="admin-overview-card"><div className="overview-card-header"><div><span>CONSTITUTION ACCOUNTING</span><h2>Book balance</h2></div><div className="overview-icon"><Wallet size={21}/></div></div><div className="overview-mini-grid"><div><span>Book balance</span><strong>{money(val("bookBalance"))}</strong></div><div><span>Minimum required</span><strong>{money(500000)}</strong></div><div><span>Approved cases</span><strong>{val("approvedClaims")}</strong></div><div><span>Verified members</span><strong>{val("verifiedMembers")}</strong></div></div></div>
 </section>
 <section className="admin-overview-card"><div className="overview-card-header"><div><span>PROFILE COMPLETION</span><h2>Members needing attention</h2></div></div>{(stats.incompleteMembers||[]).length===0?<div className="portal-empty">All current member profiles are complete.</div>:<div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Member</th><th>Completion</th><th>Missing</th></tr></thead><tbody>{stats.incompleteMembers.map((m)=><tr key={m._id}><td>{m.fullName||m.memberNumber}</td><td>{m.profileCompletion||0}%</td><td>{(m.missingFields||[]).join(", ")}</td></tr>)}</tbody></table></div>}</section>
 <section className="admin-quick-section"><div className="admin-section-heading"><span>WORKSPACE</span><h2>Quick Actions</h2></div><div className="admin-quick-grid"><Quick href="/admin/members" icon={<Users/>} title="Manage Members" text="Create, edit and manage member accounts."/><Quick href="/admin/finance" icon={<Wallet/>} title="Finance" text="Review contributions and transactions."/><Quick href="/admin/claims" icon={<HandHeart/>} title="Claims" text="Review assistance applications."/><Quick href="/admin/support" icon={<HandHeart/>} title="Member Support" text="Send updates and assistance messages." /></div></section>
 <section className="admin-overview-card"><div className="overview-card-header"><div><span>RECENT ACTIVITY</span><h2>Recently Registered Members</h2></div><Link to="/admin/members" className="admin-refresh-btn">View all</Link></div>{recent.length===0?<div className="portal-empty">No recent members returned.</div>:<div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Name</th><th>Member Number</th><th>Email</th><th>Status</th></tr></thead><tbody>{recent.slice(0,8).map((m,i)=><tr key={m._id||i}><td>{m.fullName||"Member"}</td><td>{m.memberNumber||"—"}</td><td>{m.email||"—"}</td><td><span className="portal-badge">{m.status||"Active"}</span></td></tr>)}</tbody></table></div>}</section>
 </div></DashboardLayout>
}
function Stat({icon,label,value,type=""}){return <div className={`admin-stat-card ${type}`}><div className="stat-card-top"><div className="stat-icon">{icon}</div><span className="stat-label">{label}</span></div><div className="stat-value">{value}</div></div>}
function Quick({href,icon,title,text}){return <Link to={href} className="admin-quick-action"><div className="quick-action-icon">{icon}</div><div><h3>{title}</h3><p>{text}</p></div><span className="quick-arrow">→</span></Link>}
const money=v=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:0}).format(Number(v||0));
