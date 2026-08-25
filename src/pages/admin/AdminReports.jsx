import { useEffect, useState } from "react";
import { BarChart3, Download, FileText, HandHeart, RefreshCw, Users, Wallet } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { getAdminDashboard, getContributionSummary } from "../../services/adminService";
import "../../styles/portal-redesign.css";

const money = (value) => new Intl.NumberFormat("en-KE", { style:"currency", currency:"KES", maximumFractionDigits:0 }).format(Number(value || 0));

export default function AdminReports(){
  const [dashboard,setDashboard]=useState({}); const [finance,setFinance]=useState({}); const [loading,setLoading]=useState(true);
  const load=async()=>{ setLoading(true); try { const [a,c]=await Promise.all([getAdminDashboard(),getContributionSummary()]); setDashboard(a?.dashboard||{}); setFinance(c?.summary||c||{}); } finally { setLoading(false); } };
  useEffect(()=>{load();},[]);
  return <DashboardLayout><div className="portal-dashboard-v10">
    <div className="portal-page-heading"><div><span className="portal-section-label"><BarChart3 size={13}/> OPERATIONS REPORTS</span><h1>Benovelent reports</h1><p>A fast operational snapshot for daily decisions. Detailed pages remain available under Members, Claims/Support and Disbursements.</p></div><button className="portal-primary-btn" type="button" onClick={()=>window.print()}><Download size={16}/> Print / export</button></div>
    <section className="portal-kpi-grid">
      <div className="portal-kpi"><div className="portal-kpi-head"><span>Members</span><div className="portal-kpi-icon"><Users size={17}/></div></div><div className="portal-kpi-value">{dashboard.totalMembers||0}</div><small className="portal-kpi-note">{dashboard.activeMembers||0} active</small></div>
      <div className="portal-kpi"><div className="portal-kpi-head"><span>Support</span><div className="portal-kpi-icon"><HandHeart size={17}/></div></div><div className="portal-kpi-value">{dashboard.pendingSupport?.total||0}</div><small className="portal-kpi-note">Pending cases</small></div>
      <div className="portal-kpi"><div className="portal-kpi-head"><span>Contributions</span><div className="portal-kpi-icon"><Wallet size={17}/></div></div><div className="portal-kpi-value">{money(dashboard.contributionsReceived ?? dashboard.bookBalance)}</div><small className="portal-kpi-note">Finance snapshot</small></div>
      <div className="portal-kpi"><div className="portal-kpi-head"><span>Approved support</span><div className="portal-kpi-icon"><FileText size={17}/></div></div><div className="portal-kpi-value">{dashboard.approvedClaims||0}</div><small className="portal-kpi-note">Approved cases</small></div>
    </section>
    <section className="portal-table-card"><div className="panel-heading"><div><span className="panel-kicker">CURRENT YEAR</span><h2>Contribution summary</h2></div><button className="panel-link button-link" onClick={load} disabled={loading}><RefreshCw size={15}/> {loading?"Refreshing…":"Refresh"}</button></div><table className="portal-table"><tbody><tr><th>Expected</th><td>{money(finance.expectedAmount)}</td></tr><tr><th>Collected</th><td>{money(finance.totalCollected || finance.collected || finance.paidAmount)}</td></tr><tr><th>Members charged</th><td>{finance.membersCharged || finance.members || dashboard.verifiedMembers || 0}</td></tr><tr><th>Pending disbursements</th><td>{dashboard.pendingDisbursements || 0}</td></tr></tbody></table></section>
    <div className="portal-info-strip"><BarChart3 size={16}/> Use Claims/Support for case-level review and Accounts for the live disbursement/payment workflow. Actual M-PESA disbursement remains a SuperAdmin financial control.</div>
  </div></DashboardLayout>;
}
