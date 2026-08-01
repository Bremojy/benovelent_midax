import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import "../../styles/portalModule.css";

export default function SuperAdminAudit(){
 const [logs,setLogs]=useState([]);const [summary,setSummary]=useState({});const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const load=async()=>{try{setLoading(true);setError("");const [s,l]=await Promise.all([API.get("/audit-logs/summary"),API.get("/audit-logs")]);setSummary(s.data?.summary||s.data||{});setLogs(Array.isArray(l.data?.logs)?l.data.logs:[]);}catch(e){setError(e.response?.data?.message||e.message||"Unable to load audit records.");}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const del=async(id)=>{if(!window.confirm("Delete this audit record?"))return;try{await API.delete(`/audit-logs/${id}`);await load()}catch(e){setError(e.response?.data?.message||e.message||"Unable to delete audit record.")}};
 return <DashboardLayout><div className="portal-module"><header className="portal-module-header"><div><span>SYSTEM GOVERNANCE</span><h1>Audit</h1><p>Review important actions across the Benevolent Midax administration system.</p></div><button className="portal-btn" onClick={load}>{loading?"Refreshing...":"Refresh"}</button></header>{error&&<div className="portal-alert">{error}</div>}
 <div className="portal-stat-grid"><Stat label="Total Logs" value={summary.total||logs.length}/><Stat label="Today" value={summary.today||summary.todayCount||0}/><Stat label="Creates" value={summary.creates||0}/><Stat label="Updates" value={summary.updates||0}/></div>
 <section className="portal-panel">{loading?<div className="portal-empty">Loading audit logs...</div>:logs.length===0?<div className="portal-empty">No audit records found.</div>:<div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Description</th><th></th></tr></thead><tbody>{logs.slice(0,100).map((x,i)=><tr key={x._id||i}><td>{date(x.createdAt)}</td><td>{x.user?.fullName||x.user?.email||"System"}</td><td>{x.userRole||"—"}</td><td><span className="portal-badge">{x.action||"—"}</span></td><td>{x.module||"—"}</td><td>{x.description||"—"}</td><td>{x._id&&<button className="portal-btn danger" onClick={()=>del(x._id)}>Delete</button>}</td></tr>)}</tbody></table></div>}</section>
 </div></DashboardLayout>
}
function Stat({label,value}){return <div className="portal-stat"><span>{label}</span><strong>{value}</strong></div>}
const date=v=>v?new Date(v).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"}):"—";
