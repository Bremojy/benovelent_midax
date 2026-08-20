import { useEffect, useState } from "react";
import { FileText, Download, Search } from "lucide-react";
import API, { resolveApiUrl } from "../services/api";

export default function Resources(){
 const [docs,setDocs]=useState([]),[q,setQ]=useState("");
 useEffect(()=>{API.get("/platform/public/documents").then(r=>setDocs(r.data?.documents||[])).catch(()=>setDocs([]))},[]);
 const visible=docs.filter(d=>d.name.toLowerCase().includes(q.toLowerCase()));
 return <main className="public-resource-page"><section className="public-resource-hero"><span>RESOURCE CENTRE</span><h1>Documents, forms and guides.</h1><p>Find the resources published by Benevolent MIDAX in one clear, mobile-friendly place.</p><div className="resource-search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search resources..."/></div></section><section className="resource-list">{visible.map(d=><a key={d.name} href={resolveApiUrl(d.url)} target="_blank" rel="noreferrer"><FileText size={24}/><div><strong>{d.name}</strong><small>{Math.round((d.size||0)/1024)} KB</small></div><Download size={18}/></a>)}{!visible.length&&<p className="resource-empty">No resources match your search.</p>}</section></main>
}
