import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, MessageSquarePlus, Star, Trash2, Plus, X, Home, UserRound, Clock3, MessageCircle } from "lucide-react";
import { getFeedbackCollections, createFeedbackCollection, deleteFeedbackCollection, submitFeedback, getFeedbackResponses, createBuiltInFeedback } from "../services/feedbackService";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const questionTypes = ["short_text", "long_text", "email", "number", "rating", "single_choice", "multiple_choice"];

function AdminComposer({ onCreated }) {
  const [form, setForm] = useState({ title: "", description: "", kind: "native", googleFormUrl: "", anonymous: false, preventDuplicate: true, questions: [] });
  const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, { id: crypto.randomUUID(), type: "short_text", label: "", required: false, options: [] }] }));
  const updateQ = (id, key, value) => setForm((f) => ({ ...f, questions: f.questions.map((q) => q.id === id ? { ...q, [key]: value } : q) }));
  const save = async (e) => {
    e.preventDefault();
    if (form.kind === "native" && !form.questions.length) { toast.error("Add at least one feedback question."); return; }
    try {
      const normalized = { ...form, questions: form.questions.map((q) => ({ ...q, options: Array.isArray(q.options) ? q.options.filter(Boolean) : [] })) };
      const r = await createFeedbackCollection(normalized);
      toast.success("Feedback collection created");
      onCreated(r.data.collection);
      setForm({ title: "", description: "", kind: "native", googleFormUrl: "", anonymous: false, preventDuplicate: true, questions: [] });
    } catch (e) { toast.error(e.response?.data?.message || "Could not create feedback"); }
  };
  return <form className="portal-module feedback-composer" onSubmit={save}>
    <div className="portal-module-header"><div><span>FEEDBACK MANAGEMENT</span><h2>Create feedback</h2><p>Create a native one-question-at-a-time form or link a Google Form.</p></div></div>
    <div className="feedback-grid">
      <label>Title<input type="text" value={form.title} required onChange={e => setForm({ ...form, title: e.target.value })} /></label>
      <label>Type<select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })}><option value="native">Native feedback</option><option value="google_form">Google Forms</option></select></label>
    </div>
    <label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
    {form.kind === "google_form" ? <label>Google Forms URL<input type="url" required value={form.googleFormUrl} onChange={e => setForm({ ...form, googleFormUrl: e.target.value })} /></label> : <>
      <div className="feedback-question-toolbar"><strong>Questions</strong><button type="button" className="btn btn-secondary" onClick={addQuestion}><Plus size={16} /> Add question</button></div>
      {form.questions.map((q, i) => <div className="feedback-question" key={q.id}>
        <div className="feedback-question-head"><span>Question {i + 1}</span><button type="button" className="icon-btn" onClick={() => setForm(f => ({ ...f, questions: f.questions.filter(x => x.id !== q.id) }))}><X size={16} /></button></div>
        <input type="text" placeholder="Question text" required value={q.label} onChange={e => updateQ(q.id, "label", e.target.value)} />
        <div className="feedback-grid">
          <label>Answer type<select value={q.type} onChange={e => updateQ(q.id, "type", e.target.value)}>{questionTypes.map(t => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}</select></label>
          <label className="inline-check"><input type="checkbox" checked={q.required} onChange={e => updateQ(q.id, "required", e.target.checked)} /> Required</label>
        </div>
        {(q.type === "single_choice" || q.type === "multiple_choice") && <label>Options<input type="text" placeholder="Option 1, Option 2, Option 3" value={(q.options || []).join(", ")} onChange={e => updateQ(q.id, "options", e.target.value.split(",").map(x => x.trim()).filter(Boolean))} /></label>}
      </div>)}
    </>}
    <div className="feedback-grid">
      <label className="inline-check"><input type="checkbox" checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} /> Allow anonymous answers</label>
      <label className="inline-check"><input type="checkbox" checked={form.preventDuplicate} onChange={e => setForm({ ...form, preventDuplicate: e.target.checked })} /> Prevent duplicate member responses</label>
    </div>
    <button className="btn btn-primary" type="submit"><MessageSquarePlus size={16} /> Publish feedback</button>
  </form>;
}

function QuestionControl({ question, value, onChange }) {
  const type = question.type;
  if (type === "long_text") return <textarea rows="6" value={value || ""} onChange={e => onChange(e.target.value)} />;
  if (type === "rating") return <div className="rating-row" aria-label="Rating out of five">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className="rating-button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)}><Star size={34} fill={Number(value) >= n ? "currentColor" : "none"} /></button>)}</div>;
  if (type === "single_choice") return <div className="feedback-choice-list">{(question.options || []).map(option => <label key={option} className="feedback-choice"><input type="radio" name={`question-${question.id}`} checked={value === option} onChange={() => onChange(option)} /> <span>{option}</span></label>)}</div>;
  if (type === "multiple_choice") { const selected = Array.isArray(value) ? value : []; return <div className="feedback-choice-list">{(question.options || []).map(option => <label key={option} className="feedback-choice"><input type="checkbox" checked={selected.includes(option)} onChange={e => onChange(e.target.checked ? [...selected, option] : selected.filter(x => x !== option))} /> <span>{option}</span></label>)}</div>; }
  return <input type={type === "email" ? "email" : type === "number" ? "number" : "text"} inputMode={type === "number" ? "decimal" : undefined} value={value ?? ""} onChange={e => onChange(type === "number" ? e.target.value : e.target.value)} />;
}

export default function Feedback() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = location.pathname.startsWith("/member") ? "member" : location.pathname.startsWith("/superadmin") ? "superadmin" : "admin";
  const canManage = role !== "member";
  const isSuperAdmin = role === "superadmin";
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => { try { const r = await getFeedbackCollections(); setItems(r.data.collections || []); } catch { toast.error("Could not load feedback"); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const questions = useMemo(() => active?.questions || [], [active]);
  const currentQuestion = questions[step];
  const closeForm = () => { setActive(null); setStep(0); setAnswers({}); };
  const validateCurrent = () => {
    if (!currentQuestion?.required) return true;
    const value = answers[currentQuestion.id];
    return !(value === undefined || value === "" || (Array.isArray(value) && !value.length));
  };
  const next = () => { if (!validateCurrent()) { toast.error("Please answer this question before continuing."); return; } setStep((n) => Math.min(n + 1, questions.length - 1)); };
  const back = () => setStep((n) => Math.max(0, n - 1));
  const submit = async () => {
    if (!validateCurrent()) { toast.error("Please answer this question before submitting."); return; }
    try { await submitFeedback(active._id, answers); toast.success("Thank you for your feedback."); closeForm(); } catch (e) { toast.error(e.response?.data?.message || "Could not submit feedback"); }
  };
  const openResponses = async item => { try { const r = await getFeedbackResponses(item._id); setResponses(r.data.responses || []); setActive({ ...item, showResponses: true }); } catch { toast.error("Could not load responses"); } };

  return <div className="portal-page feedback-page">
    <div className="feedback-mobile-back"><button type="button" className="feedback-back-button" onClick={() => navigate(-1)}><ChevronLeft size={18} /> Back</button><button type="button" className="feedback-home-button" onClick={() => navigate("/")}><Home size={17} /> Home</button></div>
    <div className="portal-module-header feedback-page-header"><div><span>COMMUNITY VOICE</span><h1>Feedback</h1><p>Share your experience, ideas and suggestions with the Benovelent Fund Scheme.</p></div>{isSuperAdmin && <button type="button" className="btn btn-primary" onClick={async () => { try { const r = await createBuiltInFeedback(); setItems(prev => prev.some(x => x._id === r.data.collection?._id) ? prev : [r.data.collection, ...prev]); toast.success(r.data.existing ? "Built-in feedback is already active." : "Built-in experience feedback launched for all users."); } catch (e) { toast.error(e.response?.data?.message || "Could not launch built-in feedback"); } }}><MessageSquarePlus size={16} /> Launch experience check-in</button>}</div>
    {canManage && <AdminComposer onCreated={c => setItems(prev => [c, ...prev])} />}
    {loading ? <div className="feedback-skeleton">Loading feedback…</div> : <div className="feedback-card-grid">{items.map(item => <article className="interactive-card feedback-card" key={item._id}>
      <div className="feedback-card-top"><span className="feedback-badge">{item.kind === "native" ? "Native" : "Google Forms"}</span>{canManage && <button type="button" className="icon-btn" onClick={async () => { await deleteFeedbackCollection(item._id); setItems(x => x.filter(y => y._id !== item._id)); toast.success("Deleted"); }}><Trash2 size={16} /></button>}</div>
      <h3>{item.title}</h3><p>{item.description || "We value your feedback."}</p>
      <div className="feedback-card-actions">{item.kind === "google_form" ? <a className="btn btn-primary" href={item.googleFormUrl} target="_blank" rel="noreferrer">Open form <ExternalLink size={16} /></a> : <button className="btn btn-primary" type="button" onClick={() => { setAnswers({}); setStep(0); setActive(item); }}>Give feedback</button>}{canManage && <button className="btn btn-secondary" type="button" onClick={() => openResponses(item)}>Responses ({item.responseCount || 0})</button>}</div>
    </article>)}</div>}

    {active && !active.showResponses && <div className="feedback-modal-backdrop" onMouseDown={closeForm}>
      <div className="feedback-modal feedback-step-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="feedback-step-head"><div><span>QUESTION {step + 1} OF {Math.max(questions.length, 1)}</span><h2>{active.title}</h2><p>{active.description}</p></div><button type="button" className="icon-btn" onClick={closeForm}><X /></button></div>
        <div className="feedback-progress"><span style={{ width: `${questions.length ? ((step + 1) / questions.length) * 100 : 0}%` }} /></div>
        {currentQuestion ? <div className="feedback-single-question"><label><strong>{currentQuestion.label}</strong>{currentQuestion.required && <em>Required</em>}<QuestionControl question={currentQuestion} value={answers[currentQuestion.id]} onChange={value => setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }))} /></label></div> : <div className="portal-empty">This feedback collection has no questions.</div>}
        <div className="feedback-step-actions"><button type="button" className="btn btn-secondary" onClick={back} disabled={step === 0}><ChevronLeft size={17} /> Back</button>{step < questions.length - 1 ? <button type="button" className="btn btn-primary" onClick={next}>Next <ChevronRight size={17} /></button> : <button type="button" className="btn btn-primary" onClick={submit}>Submit feedback</button>}</div>
      </div>
    </div>}

    {active?.showResponses && <div className="feedback-modal-backdrop" onMouseDown={closeForm}>
      <div className="feedback-modal feedback-responses-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="feedback-responses-head"><div><span>COLLECTED RESPONSES</span><h2>{active.title}</h2><p>{responses.length} response{responses.length === 1 ? "" : "s"} captured.</p></div><button type="button" className="icon-btn" onClick={closeForm}><X /></button></div>
        {responses.length ? <div className="response-list">{responses.map((r, index) => { const answerEntries = Object.entries(r.answers || {}); return <article className="response-card" key={r._id || index}>
          <div className="response-card-head"><div className="response-person"><span className="response-avatar"><UserRound size={17}/></span><div><strong>{r.anonymous ? "Anonymous response" : (r.member?.fullName || "Member response")}</strong><span>{r.member?.memberNumber || "Private member response"}</span></div></div><span className="response-time"><Clock3 size={14}/>{r.createdAt ? new Date(r.createdAt).toLocaleString() : "Submitted"}</span></div>
          <div className="response-answer-list">{answerEntries.length ? answerEntries.map(([qid, value]) => { const question = (active.questions || []).find(q => q.id === qid); return <div className="response-answer" key={qid}><span className="response-question"><MessageCircle size={14}/>{question?.label || qid}</span><p>{Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</p></div>; }) : <p className="response-empty">No answer data recorded.</p>}</div>
        </article>; })}</div> : <div className="response-empty-state"><MessageCircle size={28}/><strong>No responses yet</strong><span>Member submissions will appear here in a clean, readable format.</span></div>}
      </div>
    </div>}
  </div>;
}
