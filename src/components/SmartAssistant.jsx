import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, ChevronDown, HelpCircle, MessageCircle, Send, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import "../styles/smart-assistant.css";

const BASE_FAQ = [
  { keys: ["contribution", "pay", "500", "monthly"], answer: "The public website describes the member contribution as Ksh 500. Members should follow the approved scheme rules and their portal records for the current position." },
  { keys: ["funeral", "death", "burial"], answer: "The website describes funeral support as part of the scheme benefits. Eligibility and the exact amount are governed by the Constitution, so open the Constitution page for the authoritative rules." },
  { keys: ["medical", "hospital", "inpatient"], answer: "Medical support is available under the scheme subject to the constitutional eligibility and bill thresholds. Check the Constitution or your member Support area for the current process." },
  { keys: ["constitution", "rules", "governance"], answer: "The official Constitution can be viewed, printed or downloaded from the Constitution page on the public website." },
  { keys: ["news", "announcement", "update"], answer: "Public updates are available in News. Members can also see portal announcements after signing in." },
  { keys: ["chat", "message", "leader"], answer: "Signed-in members can use Chat to communicate privately with members and leaders. Administrators have broader member-management and filtering tools." },
  { keys: ["poll", "vote", "voting"], answer: "Polls are available inside the portal when an active poll is published. Open Polls from your dashboard to participate." },
  { keys: ["support", "claim", "help request"], answer: "Members can submit support requests from the Support/Claims area. Keep required documentation ready before submitting." },
  { keys: ["profile", "photo", "account"], answer: "Open Profile or Settings in your portal to update your personal information and account settings." },
  { keys: ["home", "website", "public site"], answer: "Use the Website button in an authenticated portal to return to the public Benovelent MIDAX website." },
  { keys: ["filter", "station", "department", "position"], answer: "Administrators and SuperAdmins can filter the member/chat directory by site station, department, position, status and presence." },
];

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function answerFor(question, role) {
  const text = normalize(question);
  if (!text) return "Ask me about the Constitution, support, contributions, chat, polls, notifications, the public website, or portal navigation.";
  if (text.includes("who are you") || text.includes("what can you do")) return "I am the Benovelent MIDAX website assistant. I answer from the public website knowledge in this application and can guide signed-in users around their portal.";
  if (text.includes("constituency")) return "I can explain Benovelent MIDAX website and Constitution information, but I do not invent constituency rules or official government information. Ask about a specific section and I will stay within the information published by this site.";
  const hit = BASE_FAQ.find(item => item.keys.some(key => text.includes(key)));
  if (hit) return hit.answer;
  if (role === "member") return "I could not match that to a published Benovelent MIDAX topic. Try asking about your profile, accounts, support, claims, chat, notifications, polls, announcements or the Constitution.";
  if (role === "admin" || role === "superadmin") return "I could not match that to a published portal topic. Try asking about members, filters, support, chat, notifications, polls, news, Constitution management or portal navigation.";
  return "I could not match that to a published website topic. Try asking about membership, support, the Constitution, news, contact information or how to access the portal.";
}

export default function SmartAssistant() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [compact, setCompact] = useState(false);
  const idleTimer = useRef(null);
  const [messages, setMessages] = useState([{ from: "bot", text: "Hi — I’m the Benovelent MIDAX assistant. What would you like to know?" }]);

  useEffect(() => {
    const schedule = () => {
      window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => setCompact(true), 5000);
    };
    schedule();
    const wake = () => { setCompact(false); schedule(); };
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    return () => {
      window.clearTimeout(idleTimer.current);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, []);
  const suggested = useMemo(() => (role ? ["How do I submit support?", "How do I use chat?", "What can I filter?"] : ["What does the scheme support?", "How do I read the Constitution?", "How do I access the portal?"]), [role]);

  const ask = async (question = input) => {
    const clean = String(question || "").trim();
    if (!clean) return;
    setMessages((items) => [...items, { from: "user", text: clean }, { from: "bot", text: "Checking the current Benovelent MIDAX information…" }]);
    setInput("");
    try {
      const endpoint = role ? "/platform/assistant" : "/platform/public/assistant";
      const { data } = await API.post(endpoint, { question: clean });
      const answer = data?.answer || answerFor(clean, String(role || "").toLowerCase());
      setMessages((items) => { const next = [...items]; const index = next.map((m,i)=>[m,i]).reverse().find(([,i])=>next[i]?.from === "bot")?.[1]; if (index !== undefined && next[index].text.includes("Checking the current")) next[index] = { from:"bot", text: answer }; return next; });
    } catch (_) {
      setMessages((items) => [...items, { from: "bot", text: answerFor(clean, String(role || "").toLowerCase()) }]);
    }
  };

  return (
    <div className={`smart-assistant ${open ? "is-open" : ""} ${compact && !open ? "is-compact" : ""}`}>
      {open && (
        <section className="smart-assistant-panel" aria-label="Benovelent MIDAX assistant">
          <header className="smart-assistant-header">
            <div><span className="assistant-orb"><Bot size={18} /></span><div><strong>MIDAX Assistant</strong><small>{role ? `${role} portal guidance` : "Public website guidance"}</small></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={17} /></button>
          </header>
          <div className="smart-assistant-messages">
            {messages.slice(-8).map((message, index) => <div key={`${message.from}-${index}`} className={`assistant-message ${message.from}`}>{message.text}</div>)}
          </div>
          <div className="assistant-suggestions">{suggested.map((item) => <button type="button" key={item} onClick={() => ask(item)}>{item}</button>)}</div>
          <form className="smart-assistant-input" onSubmit={(e) => { e.preventDefault(); ask(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about this website…" aria-label="Ask the assistant" />
            <button type="submit" aria-label="Send question"><Send size={17} /></button>
          </form>
          <p className="assistant-note"><HelpCircle size={13} /> Answers are based on Benovelent MIDAX information published in this application.</p>
        </section>
      )}
      <button className="smart-assistant-trigger" type="button" onClick={() => { setOpen((value) => !value); setCompact(false); }} onMouseEnter={() => setCompact(false)} aria-expanded={open} aria-label={open ? "Close MIDAX Assistant" : "Open MIDAX Assistant"}>
        {open ? <MessageCircle size={20} /> : <Bot size={20} />}
        <span>Ask MIDAX</span>
        <ChevronDown className="assistant-chevron" size={15} />
      </button>
    </div>
  );
}
