import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, HelpCircle, MessageCircle, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import API from "../services/api";
import "../styles/smart-assistant.css";

const STORAGE_KEY_PREFIX = "benovelentMidaxAssistantHistory";
const MAX_MESSAGES = 30;

const FAQ = [
  { keys: ["contribution", "pay", "500", "monthly"], answer: "The public website describes the member contribution as Ksh 500. For the current position, use your portal contribution records and approved scheme rules." },
  { keys: ["funeral", "death", "burial"], answer: "Funeral support is part of the scheme benefits. Eligibility and exact amounts follow the Constitution, which remains the authoritative source." },
  { keys: ["medical", "hospital", "inpatient"], answer: "Medical support is available under the scheme subject to the published eligibility and bill rules. Open Support in your portal or read the Constitution for the current process." },
  { keys: ["constitution", "rules", "governance"], answer: "Open the Constitution page to read, print or download the official rules and governance document." },
  { keys: ["news", "announcement", "update"], answer: "Public updates are available in News. Signed-in members can also see portal announcements and notifications." },
  { keys: ["chat", "message", "leader"], answer: "Signed-in users can use Messages/Chat to communicate privately. Admin and SuperAdmin accounts have broader directory controls." },
  { keys: ["poll", "vote", "voting"], answer: "Open Polls in your portal when an active poll is published. Available tools depend on your account role." },
  { keys: ["support", "claim", "help request"], answer: "Open Support or Claims to submit and track a request. Keep the required supporting documents ready before submitting." },
  { keys: ["profile", "photo", "account"], answer: "Open Profile or Settings to update your personal information, profile photo and account preferences." },
  { keys: ["notification"], answer: "Use the notification centre for announcements, messages, polls and other account updates. Browser push works only after permission is granted." },
  { keys: ["home", "website", "public site"], answer: "Use the Website/Home action in the portal to return to the public Benovelent MIDAX website." },
];

function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function makeMessage(from, text) { return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, from, text, at: new Date().toISOString() }; }
function fallbackAnswer(question, role) {
  const text = normalize(question);
  if (!text) return "Ask me about the Constitution, support, contributions, chat, polls, notifications or portal navigation.";
  if (text.includes("another phone") || text.includes("other phone") || text.includes("logged out") || text.includes("security")) return role ? "For account security, signing in on another device can replace the older session. Keep your login details private and use only trusted devices." : "Benovelent MIDAX uses server-side account protection. Keep your login details private and use only trusted devices.";
  if (text.includes("who are you") || text.includes("what can you do")) return "I’m MIDAX Assistant. I can explain published Benovelent MIDAX information, guide you around the portal and point you to the right section.";
  const hit = FAQ.find((item) => item.keys.some((key) => text.includes(key)));
  if (hit) return hit.answer;
  if (role === "member") return "I could not match that to a published portal topic. Try Support, Claims, Profile, Contributions, Chat, Notifications, Polls or the Constitution.";
  if (role === "admin" || role === "superadmin") return "I could not match that to a published admin topic. Try Members, Support, Claims, Chat, Notifications, Polls, News or the Constitution.";
  return "I could not match that to a published website topic. Try Membership, Support, the Constitution, News or Contact information.";
}
function getHistoryKey(role, path) {
  const portal = String(role || "public").toLowerCase();
  const sectionMatch = String(path || "").match(/^\/(member|admin|superadmin)(?:\/([^/]+))?/);
  const section = sectionMatch ? (sectionMatch[2] || "home") : "public";
  return `${STORAGE_KEY_PREFIX}:${portal}:${section}`;
}

function loadHistory(role, path) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(getHistoryKey(role, path)) || "null");
    if (Array.isArray(parsed) && parsed.length) return parsed.slice(-MAX_MESSAGES);
  } catch (_) {}
  return [makeMessage("bot", `Hello! I’m MIDAX Assistant. ${role ? "How can I help with your portal today?" : "How can I help you today?"}`)];
}

export default function SmartAssistant() {
  const { role } = useAuth();
  const location = useLocation();
  const roleName = String(role || "").toLowerCase();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [showLauncher, setShowLauncher] = useState(true);
  const [messages, setMessages] = useState(() => loadHistory(roleName, location.pathname));
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const path = location.pathname;
  const isPortal = /^\/(member|admin|superadmin)(?:\/|$)/.test(path);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        getHistoryKey(roleName, path),
        JSON.stringify(messages.slice(-MAX_MESSAGES))
      );
    } catch (_) {}
  }, [messages, roleName, path]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, typing]);
  useEffect(() => {
    if (open) { setShowLauncher(true); setShowTeaser(false); window.setTimeout(() => inputRef.current?.focus(), 120); return undefined; }
    setShowLauncher(true); setShowTeaser(true);
    const t1 = window.setTimeout(() => setShowTeaser(false), 5200);
    const t2 = window.setTimeout(() => setShowLauncher(false), 9000);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [open, path]);
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const suggested = useMemo(() => {
    if (path.includes("support") || path.includes("claims")) return ["How do I submit a support request?", "What documents should I prepare?", "How do I track my request?"];
    if (path.includes("messages")) return ["How do I use chat?", "How do I find a member?", "How do I stay secure on another phone?"];
    if (path.includes("profile") || path.includes("settings")) return ["How do I complete my profile?", "How do I change my photo?", "How do I stay secure on another phone?"];
    if (path.includes("contribution") || path.includes("accounts")) return ["How do contributions work?", "Where is contribution history?", "What support does the scheme provide?"];
    return roleName ? ["How do I submit support?", "How do I use chat?", "Where are notifications?", "How do I read the Constitution?"] : ["What does the scheme support?", "How do I read the Constitution?", "How do I access the portal?", "How do I contact Benevolent?"];
  }, [path, roleName]);

  const clearChat = () => setMessages([makeMessage("bot", `Fresh chat ready. ${roleName ? "What can I help you do in the portal?" : "What would you like to know?"}`)]);
  const ask = async (question = input) => {
    const clean = String(question || "").trim();
    if (!clean || typing) return;
    setMessages((items) => [...items, makeMessage("user", clean)]);
    setInput(""); setTyping(true);
    try {
      const endpoint = roleName ? "/platform/assistant" : "/platform/public/assistant";
      const { data } = await API.post(endpoint, { question: clean });
      setMessages((items) => [...items, makeMessage("bot", data?.answer || fallbackAnswer(clean, roleName))]);
    } catch (_) {
      setMessages((items) => [...items, makeMessage("bot", fallbackAnswer(clean, roleName))]);
    } finally { setTyping(false); }
  };

  return <div className={`smart-assistant ${open ? "is-open" : ""} ${isPortal ? "is-portal" : ""}`}>
    {showTeaser && !open && <button type="button" className="smart-assistant-teaser" onClick={() => { setOpen(true); setShowTeaser(false); }} aria-label="Open MIDAX help">
      <span className="teaser-dot"><Sparkles size={11} /></span><span><strong>MIDAX Assistant</strong><small>Need help navigating?</small></span><span className="teaser-close" onClick={(event) => { event.stopPropagation(); setShowTeaser(false); }} aria-hidden="true">×</span>
    </button>}
    {open && <section className="smart-assistant-panel" aria-label="Benovelent MIDAX assistant">
      <header className="smart-assistant-header"><div className="assistant-header-main"><span className="assistant-orb"><Bot size={19} /></span><div><strong>MIDAX Assistant</strong><span className="assistant-status"><i /> {roleName ? `${roleName} portal • ready` : "Public website • ready"}</span></div></div><div className="assistant-header-actions"><button type="button" onClick={clearChat} aria-label="Start a new chat" title="New chat"><RotateCcw size={16} /></button><button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" title="Close"><X size={17} /></button></div></header>
      <div className="smart-assistant-privacy"><ShieldCheck size={14} /> Guided answers use published Benovelent MIDAX information.</div>
      <div className="smart-assistant-messages" role="log" aria-live="polite" aria-busy={typing}>
        {messages.slice(-MAX_MESSAGES).map((message) => <div key={message.id} className={`assistant-message ${message.from}`}>
          {message.from === "bot" && <span className="message-avatar"><Bot size={13} /></span>}
          <div className="message-bubble"><p>{message.text}</p><time>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
        </div>)}
        {typing && <div className="assistant-message bot"><span className="message-avatar"><Bot size={13} /></span><div className="message-bubble typing-bubble"><span /><span /><span /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="assistant-suggestions" aria-label="Suggested questions">{suggested.map((item) => <button type="button" key={item} onClick={() => ask(item)} disabled={typing}>{item}</button>)}</div>
      <form className="smart-assistant-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask MIDAX anything…" aria-label="Ask the assistant" maxLength={500} /><button type="submit" aria-label="Send question" disabled={!input.trim() || typing}><Send size={17} /></button></form>
      <p className="assistant-note"><HelpCircle size={13} /> No private member data is exposed through the public assistant.</p>
    </section>}
    {(showLauncher || open) && <button className={`smart-assistant-trigger ${open ? "is-active" : ""}`} type="button" onClick={() => { setOpen((value) => !value); setShowTeaser(false); setShowLauncher(true); }} aria-expanded={open} aria-label={open ? "Close MIDAX Assistant" : "Open MIDAX Assistant"}>{open ? <MessageCircle size={20} /> : <Bot size={20} />}<span>{open ? "Close" : "Ask MIDAX"}</span><ChevronDown className="assistant-chevron" size={15} /></button>}
  </div>;
}
