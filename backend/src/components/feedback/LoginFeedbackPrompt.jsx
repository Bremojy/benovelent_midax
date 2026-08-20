import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, MessageSquareText, X, Star } from "lucide-react";
import toast from "react-hot-toast";
import { getPendingLoginFeedback, submitFeedback } from "../../services/feedbackService";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
import "./LoginFeedbackPrompt.css";

function AnswerControl({ question, value, onChange }) {
  if (question.type === "rating") {
    return <div className="lfp-rating" aria-label="Rating out of five">
      {[1,2,3,4,5].map((n) => <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)}><Star size={30} fill={Number(value) >= n ? "currentColor" : "none"} /></button>)}
    </div>;
  }
  if (question.type === "long_text") return <textarea rows={5} value={value || ""} onChange={(e) => onChange(e.target.value)} autoFocus />;
  if (question.type === "single_choice") return <div className="lfp-options">{(question.options || []).map((option) => <label key={option}><input type="radio" name={question.id} checked={value === option} onChange={() => onChange(option)} /> {option}</label>)}</div>;
  if (question.type === "multiple_choice") {
    const selected = Array.isArray(value) ? value : [];
    return <div className="lfp-options">{(question.options || []).map((option) => <label key={option}><input type="checkbox" checked={selected.includes(option)} onChange={(e) => onChange(e.target.checked ? [...selected, option] : selected.filter((x) => x !== option))} /> {option}</label>)}</div>;
  }
  return <input type={question.type === "email" ? "email" : question.type === "number" ? "number" : "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} autoFocus />;
}

export default function LoginFeedbackPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [required, setRequired] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const role = String(user?.role || "member").toLowerCase();
  const basePath = role === "superadmin" ? "/superadmin" : role === "admin" ? "/admin" : "/member";

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (authLoading || !user || location.pathname !== basePath) return;
      try {
        const response = await getPendingLoginFeedback();
        const data = response.data || {};
        if (!active || !data.prompt) return;
        const key = `benovelentFeedbackPrompt:${data.prompt._id}`;
        const last = Number(localStorage.getItem(key) || 0);
        const days = Number(data.prompt.promptFrequencyDays || 7);
        if (!data.required && last && Date.now() - last < days * 86400000) return;
        setPrompt(data.prompt);
        setRequired(Boolean(data.required));
      } catch (_) {
        // A feedback prompt must never break portal access if its endpoint is unavailable.
      }
    };
    load();
    return () => { active = false; };
  }, [authLoading, user, location.pathname, basePath]);

  useEffect(() => {
    if (!prompt || closed) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [prompt, closed]);

  const questions = useMemo(() => prompt?.questions || [], [prompt]);
  const question = questions[step];
  if (!prompt || closed || !question) return null;

  const value = answers[question.id];
  const valid = !question.required || !(value === undefined || value === "" || (Array.isArray(value) && value.length === 0));
  const finish = async () => {
    if (!valid) return toast.error("Please answer this question before continuing.");
    setLoading(true);
    try {
      await submitFeedback(prompt._id, answers);
      if (!required) localStorage.setItem(`benovelentFeedbackPrompt:${prompt._id}`, String(Date.now()));
      setClosed(true);
      toast.success("Thank you. Your feedback helps improve Benovelent Midax.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not submit feedback.");
    } finally { setLoading(false); }
  };

  return <div className="lfp-backdrop" role="dialog" aria-modal="true" aria-labelledby="lfp-title">
    <div className="lfp-card">
      {!required && <button type="button" className="lfp-close" onClick={() => setClosed(true)} aria-label="Close feedback"><X size={18} /></button>}
      <div className="lfp-icon"><MessageSquareText size={23} /></div>
      <span className="lfp-eyebrow">PORTAL FEEDBACK</span>
      <h2 id="lfp-title">{prompt.title}</h2>
      <p className="lfp-description">{prompt.description || "We are asking for a short, clearly labelled feedback check-in to improve the portal."}</p>
      <div className="lfp-progress"><span>{step + 1} of {questions.length}</span><div><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div></div>
      <div className="lfp-question"><label>{question.label}{question.required && <b> *</b>}</label><AnswerControl question={question} value={value} onChange={(next) => setAnswers((prev) => ({ ...prev, [question.id]: next }))} /></div>
      <div className="lfp-actions">
        <button type="button" className="lfp-secondary" onClick={() => setClosed(true)} disabled={required}> {required ? "Required check-in" : "Not now"}</button>
        {step > 0 && <button type="button" className="lfp-secondary" onClick={() => setStep((n) => n - 1)}><ChevronLeft size={16} /> Back</button>}
        {step < questions.length - 1 ? <button type="button" className="lfp-primary" disabled={!valid} onClick={() => setStep((n) => n + 1)}>Next <ChevronRight size={16} /></button> : <button type="button" className="lfp-primary" disabled={!valid || loading} onClick={finish}>{loading ? "Submitting…" : <><CheckCircle2 size={16} /> Submit</>}</button>}
      </div>
      <small className="lfp-note">{required ? "This check-in is required and must be completed before you continue into the portal." : "This is an optional feedback request. You may skip it."}</small>
    </div>
  </div>;
}
