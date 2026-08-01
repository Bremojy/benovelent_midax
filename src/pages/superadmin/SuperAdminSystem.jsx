import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import "../../styles/portalModule.css";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function SuperAdminSystem(){
 const [status,setStatus]=useState("Checking...");const [details,setDetails]=useState(null);const [time,setTime]=useState(null);
 const check=async()=>{try{setStatus("Checking...");const res=await fetch(`${API_ROOT}/`);const data=await res.json();setDetails(data);setTime(new Date());setStatus(res.ok?"Operational":"Unavailable");}catch(e){setStatus("Unavailable");setDetails({message:e.message});setTime(new Date())}};
 useEffect(()=>{check()},[]);
 return <DashboardLayout><div className="portal-module"><header className="portal-module-header"><div><span>INFRASTRUCTURE</span><h1>System</h1><p>Verify that the Benevolent Midax backend is reachable and operational.</p></div><button className="portal-btn" onClick={check}>Run Health Check</button></header>
 <section className="portal-panel"><div className="portal-stat-grid"><div className="portal-stat"><span>API Status</span><strong>{status}</strong></div><div className="portal-stat"><span>Application</span><strong>{details?.application||"Benevolent Midax API"}</strong></div><div className="portal-stat"><span>Version</span><strong>{details?.version||"—"}</strong></div><div className="portal-stat"><span>Last Check</span><strong style={{fontSize:16}}>{time?time.toLocaleTimeString():"—"}</strong></div></div><p style={{color:"#666"}}>This health check talks directly to your configured backend URL: <strong>{API_ROOT}</strong></p></section>
 </div></DashboardLayout>
}
