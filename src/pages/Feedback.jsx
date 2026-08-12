import { useEffect, useMemo, useState } from "react";
import { ExternalLink, MessageSquarePlus, Star, Trash2, Plus, X } from "lucide-react";
import { getFeedbackCollections, createFeedbackCollection, deleteFeedbackCollection, submitFeedback, getFeedbackResponses } from "../services/feedbackService";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";

const questionTypes = ["short_text","long_text","email","number","rating","single_choice","multiple_choice"];

function AdminComposer({ onCreated }) {
  const [form, setForm] = useState({ title:"", description:"", kind:"native", googleFormUrl:"", anonymous:false, preventDuplicate:true, questions:[] });
  const addQuestion = () => setForm((f)=>({...f,questions:[...f.questions,{id:crypto.randomUUID(),type:"short_text",label:"",required:false,options:[]}] }));
  const updateQ=(id,key,value)=>setForm((f)=>({...f,questions:f.questions.map(q=>q.id===id?{...q,[key]:value}:q)}));
  const save=async(e)=>{e.preventDefault();try{const r=await createFeedbackCollection(form);toast.success("Feedback collection created");onCreated(r.data.collection);setForm({title:"",description:"",kind:"native",googleFormUrl:"",anonymous:false,preventDuplicate:true,questions:[]});}catch(e){toast.error(e.response?.data?.message||"Could not create feedback");}};
  return <form className="portal-module feedback-composer" onSubmit={save}>
    <div className="portal-module-header"><div><h2>Create feedback</h2><p>Build a native form or link a Google Form.</p></div></div>
    <div className="feedback-grid"><label>Title<input value={form.title} required onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Type<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="native">Native feedback</option><option value="google_form">Google Forms</option></select></label></div>
    <label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
    {form.kind==="google_form"?<label>Google Forms URL<input type="url" required value={form.googleFormUrl} onChange={e=>setForm({...form,googleFormUrl:e.target.value})}/></label>:<>
      <div className="feedback-question-toolbar"><strong>Questions</strong><button type="button" className="btn btn-secondary" onClick={addQuestion}><Plus size={16}/> Add question</button></div>
      {form.questions.map((q,i)=><div className="feedback-question" key={q.id}><div><span>Question {i+1}</span><button type="button" className="icon-btn" onClick={()=>setForm(f=>({...f,questions:f.questions.filter(x=>x.id!==q.id)}))}><X size={16}/></button></div><input placeholder="Question text" required value={q.label} onChange={e=>updateQ(q.id,"label",e.target.value)}/><div className="feedback-grid"><select value={q.type} onChange={e=>updateQ(q.id,"type",e.target.value)}>{questionTypes.map(t=><option key={t}>{t}</option>)}</select><label className="inline-check"><input type="checkbox" checked={q.required} onChange={e=>updateQ(q.id,"required",e.target.checked)}/> Required</label></div></div>)}
    </>}
    <div className="feedback-grid"><label className="inline-check"><input type="checkbox" checked={form.anonymous} onChange={e=>setForm({...form,anonymous:e.target.checked})}/> Allow anonymous answers</label><label className="inline-check"><input type="checkbox" checked={form.preventDuplicate} onChange={e=>setForm({...form,preventDuplicate:e.target.checked})}/> Prevent duplicate member responses</label></div>
    <button className="btn btn-primary" type="submit"><MessageSquarePlus size={16}/> Publish feedback</button>
  </form>;
}

export default function Feedback(){
  const location=useLocation(); const role=location.pathname.startsWith("/member")?"member":location.pathname.startsWith("/superadmin")?"superadmin":"admin"; const canManage=role!=="member";
  const [items,setItems]=useState([]); const [active,setActive]=useState(null); const [answers,setAnswers]=useState({}); const [responses,setResponses]=useState([]); const [loading,setLoading]=useState(true);
  const load=async()=>{try{const r=await getFeedbackCollections();setItems(r.data.collections||[])}catch(e){toast.error("Could not load feedback") }finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const submit=async()=>{try{await submitFeedback(active._id,answers);toast.success("Feedback submitted");setActive(null);setAnswers({})}catch(e){toast.error(e.response?.data?.message||"Could not submit feedback")}};
  const openResponses=async(item)=>{try{const r=await getFeedbackResponses(item._id);setResponses(r.data.responses||[]);setActive({...item,showResponses:true})}catch(e){toast.error("Could not load responses")}};
  return <div className="portal-page feedback-page"><div className="portal-module-header"><div><h1>Feedback</h1><p>Share your experience, ideas and suggestions with Benevolent.</p></div></div>
    {canManage&&<AdminComposer onCreated={c=>setItems(prev=>[c,...prev])}/>} 
    {loading?<div className="feedback-skeleton">Loading feedback…</div>:<div className="feedback-card-grid">{items.map(item=><article className="interactive-card feedback-card" key={item._id}><div className="feedback-card-top"><span className="feedback-badge">{item.kind==="native"?"Native":"Google Forms"}</span>{canManage&&<button className="icon-btn" onClick={async()=>{await deleteFeedbackCollection(item._id);setItems(x=>x.filter(y=>y._id!==item._id));toast.success("Deleted")}}><Trash2 size={16}/></button>}</div><h3>{item.title}</h3><p>{item.description||"We value your feedback."}</p><div className="feedback-card-actions">{item.kind==="google_form"?<a className="btn btn-primary" href={item.googleFormUrl} target="_blank" rel="noreferrer">Open form <ExternalLink size={16}/></a>:<button className="btn btn-primary" onClick={()=>{setAnswers({});setActive(item)}}>Give feedback</button>}{canManage&&<button className="btn btn-secondary" onClick={()=>openResponses(item)}>Responses ({item.responseCount||0})</button>}</div></article>)}</div>}
    {active&&!active.showResponses&&<div className="feedback-modal-backdrop" onMouseDown={()=>setActive(null)}><div className="feedback-modal" onMouseDown={e=>e.stopPropagation()}><div className="portal-module-header"><div><h2>{active.title}</h2><p>{active.description}</p></div><button className="icon-btn" onClick={()=>setActive(null)}><X/></button></div>{active.questions.map(q=><label key={q.id}>{q.label}{q.type==="long_text"?<textarea value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/>:q.type==="rating"?<div className="rating-row">{[1,2,3,4,5].map(n=><button type="button" key={n} className="rating-button" onClick={()=>setAnswers({...answers,[q.id]:n})}><Star fill={answers[q.id]>=n?"currentColor":"none"}/></button>)}</div>:<input type={q.type==="email"?"email":q.type==="number"?"number":"text"} value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/>}</label>)}<button className="btn btn-primary" onClick={submit}>Submit feedback</button></div></div>}
    {active?.showResponses&&<div className="feedback-modal-backdrop" onMouseDown={()=>setActive(null)}><div className="feedback-modal" onMouseDown={e=>e.stopPropagation()}><div className="portal-module-header"><h2>{active.title} responses</h2><button className="icon-btn" onClick={()=>setActive(null)}><X/></button></div>{responses.length?<div className="response-list">{responses.map(r=><pre key={r._id}>{JSON.stringify(r.answers,null,2)}</pre>)}</div>:<p>No responses yet.</p>}</div></div>}
  </div>;
}
