import { useEffect, useState } from "react";
import { ShieldCheck, XCircle } from "lucide-react";
import API, { resolveUploadUrl } from "../services/api";

export default function VerifyMembership() {
  const [state, setState] = useState({ loading: true, member: null, error: "" });
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setState({ loading: false, member: null, error: "Verification code is missing." });
    API.get("/platform/membership/verify", { params: { token } }).then(({ data }) => setState({ loading: false, member: data.member, error: "" })).catch(() => setState({ loading: false, member: null, error: "This membership code is invalid or expired." }));
  }, []);
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"linear-gradient(135deg,#eef8f2,#f8fafc)"}}><section style={{width:"min(540px,100%)",background:"#fff",borderRadius:26,padding:28,boxShadow:"0 22px 70px rgba(15,23,42,.12)"}}>{state.loading ? <p>Verifying membership…</p> : state.member ? <><ShieldCheck size={42} color="#1f7a52"/><h1 style={{marginBottom:8}}>Membership verified</h1><div style={{display:"grid",gridTemplateColumns:"64px 1fr",gap:14,alignItems:"center"}}><div style={{width:64,height:64,borderRadius:18,overflow:"hidden",background:"#eef7f1",display:"grid",placeItems:"center"}}>{state.member.profileImage?<img src={resolveUploadUrl(state.member.profileImage)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:state.member.fullName?.[0]}</div><div><strong>{state.member.fullName}</strong><p>{state.member.memberNumber}</p><p>{state.member.siteStation || "Station not specified"} · {state.member.department || "Community"}</p></div></div><p style={{marginTop:20}}>This result confirms that the membership record is active in Benevolent MIDAX.</p></> : <><XCircle size={42} color="#c2410c"/><h1>Verification failed</h1><p>{state.error}</p></>}</section></main>;
}
