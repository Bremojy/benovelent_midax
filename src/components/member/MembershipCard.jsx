import { useEffect, useState } from "react";
import { User, BadgeCheck, Calendar, Building2, Loader2 } from "lucide-react";
import API from "../../services/api";
import "../../styles/member.css";
export default function MembershipCard() {
  const [card,setCard]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{let active=true;API.get("/platform/membership-card").then(({data})=>{if(active)setCard(data?.card||null)}).catch(e=>{if(active)setError(e.response?.data?.message||"Unable to load membership details.")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
  const member=card?.member; if(loading)return <div className="member-card" aria-live="polite"><Loader2 size={18}/> Loading membership details…</div>;
  if(error||!member)return <div className="member-card" role="alert"><h3>Membership Details</h3><p>{error||"Membership data is unavailable."}</p></div>;
  const joined=card.joinDate?new Date(card.joinDate).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"}):"Not configured";
  return <div className="member-card"><h3>Membership Details</h3><div className="member-item"><User size={18}/><span>Member No.</span><strong>{member.memberNumber||"Not configured"}</strong></div><div className="member-item"><BadgeCheck size={18}/><span>Status</span><strong className="active-status">{card.status||"Not configured"}</strong></div><div className="member-item"><Building2 size={18}/><span>Department</span><strong>{member.department||"Not configured"}</strong></div><div className="member-item"><Calendar size={18}/><span>Joined</span><strong>{joined}</strong></div>{card.verifyUrl&&<a className="member-verify-link" href={card.verifyUrl}>Verify membership</a>}</div>;
}
