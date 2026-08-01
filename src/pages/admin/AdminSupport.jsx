import { useEffect, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API from "../../services/api";
import { getAdminMembers } from "../../services/adminService";
import "../../styles/portalModule.css";

export default function AdminSupport(){
 const [members,setMembers]=useState([]); const [form,setForm]=useState({recipient:"",title:"",message:""});
 const [loading,setLoading]=useState(true); const [sending,setSending]=useState(false); const [error,setError]=useState(""); const [success,setSuccess]=useState("");
 const load=async()=>{try{setLoading(true);const r=await getAdminMembers({page:1,limit:100});setMembers(r.members||[]);}catch(e){setError(e.response?.data?.message||e.message||"Unable to load members.");}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const send=async(e)=>{e.preventDefault();setError("");setSuccess("");if(!form.recipient||!form.title||!form.message){setError("Select a member and complete the title and message.");return}try{setSending(true);const {data}=await API.post("/notifications",{recipient:form.recipient,recipientModel:"Member",title:form.title,message:form.message,type:"system",senderModel:"Admin"});if(!data?.success)throw new Error(data?.message||"Unable to send support message.");setSuccess("Message sent successfully.");setForm({recipient:"",title:"",message:""});}catch(e){setError(e.response?.data?.message||e.message||"Unable to send message.");}finally{setSending(false)}};
 return <DashboardLayout><div className="portal-module"><header className="portal-module-header"><div><span>MEMBER COMMUNICATION</span><h1>Support</h1><p>Send direct support and service messages to members.</p></div></header>
 {error&&<div className="portal-alert">{error}</div>}{success&&<div className="portal-alert success">{success}</div>}
 <section className="portal-panel"><h2>Contact a Member</h2><form onSubmit={send}><div className="portal-form-grid"><div className="portal-field"><label>Member</label><select value={form.recipient} onChange={e=>setForm({...form,recipient:e.target.value})} disabled={loading}><option value="">Select member</option>{members.map(m=><option key={m._id} value={m._id}>{m.fullName} — {m.memberNumber}</option>)}</select></div><div className="portal-field"><label>Subject</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Claim update"/></div></div><div className="portal-field" style={{marginTop:14}}><label>Message</label><textarea rows="7" value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Write the message to the member..."/></div><button className="portal-btn" disabled={sending}>{sending?"Sending...":"Send Support Message"}</button></form></section></div></DashboardLayout>
}
