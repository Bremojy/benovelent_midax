import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API, { resolveApiUrl } from "../../services/api";
import "../../styles/portalModule.css";

const sources = [
  { type:"Medical", get:"/medical/admin/applications", approve:"/medical/admin/approve/", reject:"/medical/admin/reject/" },
  { type:"Funeral", get:"/funeral/", approve:"/funeral/", reject:"/funeral/" },
  { type:"Education", get:"/education/", approve:"/education/", reject:"/education/" },
];

export default function AdminClaims() {
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState("");

  const load=async()=>{
    try{
      setLoading(true);setError("");
      const results=await Promise.allSettled(sources.map(s=>API.get(s.get)));
      const merged=[];
      results.forEach((r,i)=>{
        if(r.status==="fulfilled"){
          const data=r.value.data;
          const arr=data?.applications||data?.claims||data?.records||[];
          if(Array.isArray(arr)) arr.forEach(x=>merged.push({...x,supportType:sources[i].type,source:sources[i]}));
        }
      });
      merged.sort((a,b)=>new Date(b.createdAt||b.applicationDate)-new Date(a.createdAt||a.applicationDate));
      setItems(merged);
      if(!merged.length && results.every(r=>r.status==="rejected")) throw results[0].reason;
    }catch(err){setError(err.response?.data?.message||err.message||"Unable to load claims.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{load()},[]);

  const action=async(item,kind)=>{
    if(!item._id)return;
    const key=`${kind}-${item._id}`;
    try{
      setBusy(key);
      const endpoint=kind==="approve"?item.source.approve:item.source.reject;
      const path = item.supportType === "Medical"
        ? `${endpoint}${item._id}`
        : `${endpoint}${item._id}/${kind}`;
      const {data}=await API.put(path, kind==="reject"?{rejectionReason:"Reviewed and rejected by administrator."}:{});
      if(!data?.success && data?.message===undefined) throw new Error("Action failed.");
      await load();
    }catch(err){setError(err.response?.data?.message||err.message||"Unable to update claim.");}
    finally{setBusy("");}
  };

  const openDocument = async (type,id,url) => { try { await API.post(`/admin/claims/${String(type).toLowerCase()}/${id}/open`); } catch {} window.open(url,"_blank","noopener,noreferrer"); };
  return <DashboardLayout><div className="portal-module">
    <header className="portal-module-header"><div><span>ASSISTANCE PROCESSING</span><h1>Claims</h1><p>Review and process medical, funeral and education assistance applications.</p></div><button className="portal-btn" onClick={load}>Refresh</button></header>
    {error&&<div className="portal-alert">{error}</div>}
    <section className="portal-panel claim-guide">
      <h2>Administrator processing guide</h2>
      <div className="claim-guide-grid">
        <div><b>1. Review</b><span>Open the application and verify the member details and supporting documents.</span></div>
        <div><b>2. Decide</b><span>Move the application through review, approval or rejection using the controls below.</span></div>
        <div><b>3. Disburse</b><span>After approval, record payment/disbursement so the member portal reflects the live status.</span></div>
        <div><b>4. Communicate</b><span>Member notifications are generated from the backend workflow.</span></div>
      </div>
    </section>
    <section className="portal-panel">
      {loading?<div className="portal-empty">Loading applications...</div>:items.length===0?<div className="portal-empty">No assistance applications found.</div>:
      <div className="portal-table-wrap"><table className="portal-table"><thead><tr><th>Type</th><th>Applicant</th><th>Amount</th><th>Date</th><th>Status</th><th>Documents</th><th>Actions</th></tr></thead><tbody>
      {items.map((x,i)=><tr key={`${x.supportType}-${x._id||i}`}><td>{x.supportType}</td><td>{x.member?.fullName||x.contributorName||x.memberNumber||"Member"}</td><td>{money(x.requestedAmount||x.amount)}</td><td>{date(x.createdAt||x.applicationDate)}</td><td><span className="portal-badge">{x.status||"Pending"}</span></td><td>{Array.isArray(x.documents) && x.documents.length ? x.documents.map((doc, index) => {
  const url = typeof doc === "string" ? doc : doc?.fileUrl;
  if (!url) return null;
  const full = url.startsWith("http") ? url : resolveApiUrl(url);
  return <button key={`${url}-${index}`} className="portal-btn secondary" type="button" onClick={()=>openDocument(x.supportType,x._id,full)}>Open Doc {index + 1}</button>;
}) : "—"}</td><td><div className="portal-actions">{!["Approved","Paid","Closed","Disbursed","Completed"].includes(x.status)&&<><button className="portal-btn" disabled={busy===`approve-${x._id}`} onClick={()=>action(x,"approve")}>Approve</button><button className="portal-btn danger" disabled={busy===`reject-${x._id}`} onClick={()=>action(x,"reject")}>Reject</button></>}</div></td></tr>)}
      </tbody></table></div>}
    </section>
  </div></DashboardLayout>
}
const money=v=>new Intl.NumberFormat("en-KE",{style:"currency",currency:"KES",maximumFractionDigits:0}).format(Number(v||0));
const date=v=>v?new Date(v).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}):"—";
