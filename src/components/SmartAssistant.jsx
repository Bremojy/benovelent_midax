import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, HelpCircle, RotateCcw, Send, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import API from "../services/api";
import "../styles/smart-assistant.css";

const STORAGE_KEY_PREFIX = "benovelentMidaxAssistantHistory";
const MAX_MESSAGES = 30;

const FAQ = [
  { keys: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"], answer: "Hello! Welcome to Benevolent MIDAX. I can guide you around the public website and the secure member, admin and superadmin portals." },
  { keys: ["who are you", "what can you do", "help"], answer: "I’m the Benevolent Assistant. I explain published website information, show you where features are located and help with portal navigation, notifications, chat and calls." },
  { keys: ["contribution", "pay", "monthly contribution", "500"], answer: "The website currently describes the member contribution as Ksh 500. Your Accounts area shows the contribution records available to your account, while the Constitution remains the authority for scheme rules." },
  { keys: ["funeral", "death", "burial"], answer: "Funeral support is a core scheme benefit. The public Services page currently describes Ksh 100,000 for an eligible funeral claim and Ksh 30,000 for qualifying sibling funeral expenses, subject to the Constitution and claim conditions." },
  { keys: ["medical", "hospital", "inpatient"], answer: "Medical support is part of the scheme and follows the Constitution’s inpatient amount bands, eligibility rules and family claim limits. Members can use Support or Claims after signing in." },
  { keys: ["education", "school fees", "children education"], answer: "Education support is described as coming soon. The website intentionally does not invent an amount; the Constitution and official scheme updates should be used when the benefit is activated." },
  { keys: ["constitution", "rules", "governance", "policy"], answer: "Open Constitution to read, view, download or print the official scheme rules. The Constitution is the authoritative source for governance, eligibility and benefit procedures." },
  { keys: ["about", "history", "midax company"], answer: "The About page explains the relationship between Midax Petroleum Marketing and the Benevolent scheme, the scheme’s purpose, member voice, accountability and communication." },
  { keys: ["services", "benefits", "support services"], answer: "The Services page covers Funeral Support, Medical Support, Education Support coming soon, accountability and Constitution-led decision making." },
  { keys: ["news", "announcement", "update", "newsroom"], answer: "Open News to read published updates, upcoming activities, resources and community polls. Signed-in users can also receive portal notifications." },
  { keys: ["event", "events", "calendar", "activity"], answer: "Open News or the Events area to see published upcoming activities. Event visibility depends on the audience configured by the scheme team." },
  { keys: ["resource", "resources", "form", "guide", "document"], answer: "Open Resource Centre or the Resources section of News to access published forms, guides and official documents, including the Constitution." },
  { keys: ["contact", "phone", "email", "whatsapp", "location", "nairobi"], answer: "Open Contact for the official enquiry form and scheme contact information. The public page lists Nairobi, Kenya as the location and routes messages through the website." },
  { keys: ["login", "sign in", "access portal", "password"], answer: "Use Login to access the secure portal. Member, admin and superadmin accounts see different tools according to their roles. Keep your password private." },
  { keys: ["member portal", "member dashboard", "member"], answer: "The member portal includes Profile, Dependants, Accounts, Support, Claims, Messages, Notifications, News/Announcements, Polls and Settings." },
  { keys: ["admin portal", "administrator", "admin dashboard", "admin"], answer: "The admin portal is for authorised administrators and includes dashboard activity, member management, accounts/finance tools, support and claims, messages, notifications and operational controls available to the role." },
  { keys: ["superadmin", "super admin", "super administrator"], answer: "The superadmin portal contains higher-level administration, system, audit, data-integrity, member/admin management, messages, notifications, news and settings tools. Access is restricted to authorised superadmins." },
  { keys: ["profile", "photo", "account details", "bio"], answer: "Open Profile to review or update your account details and profile photo. Some required fields must be completed before the full member experience is available." },
  { keys: ["dependant", "dependants", "family", "children", "spouse", "parent"], answer: "Open Dependants in the member portal to manage eligible family records used by support and claims processes." },
  { keys: ["accounts", "ledger", "contributions history", "balance"], answer: "Open Accounts to view the scheme account information and contribution records available to your portal role. Financial figures are server-provided and should be treated as the current system record." },
  { keys: ["support request", "claim", "submit support", "assistance"], answer: "Open Support or Claims in your portal, choose the relevant request type and provide the required details and supporting documents. You can track the request after submission." },
  { keys: ["chat", "message", "messaging", "whatsapp like", "conversation"], answer: "Open Messages to search members, start private conversations, view recent chats, send messages and use calling where the other person is reachable." },
  { keys: ["audio call", "voice call", "video call", "call someone", "calling"], answer: "Messages supports browser audio and video calling using your microphone/camera. Calls need a live internet connection and the browser must be allowed to use the required devices." },
  { keys: ["ringtone", "incoming call sound", "call sound"], answer: "Incoming calls use the Benevolent call ringtone supplied with the website. On a browser, sound may still depend on the browser’s notification and audio permissions; keeping notifications enabled gives the most reliable alert." },
  { keys: ["notification", "notifications", "bell", "alert"], answer: "Use the Notifications area and the bell icon for portal updates. Browser push notifications require permission, and call alerts can also use device/browser notifications when supported." },
  { keys: ["poll", "vote", "voting"], answer: "Open Polls to see active community questions and cast your vote when your account is eligible. Published poll results can also appear on the public News page." },
  { keys: ["install", "app", "phone", "android", "iphone", "pwa", "home screen"], answer: "The website is installable as a PWA on supported browsers. Use the Install action when offered, or use your browser’s Add to Home Screen/Install App option." },
  { keys: ["privacy", "private", "security", "personal data"], answer: "Open Privacy Policy for the website’s privacy guidance. Member information, support requests, dependants and portal activity are intended for authorised access only." },
  { keys: ["terms", "conditions", "rules for using"], answer: "Open Terms & Conditions for the rules governing use of the website and portals, including responsible use and keeping account credentials private." },
  { keys: ["logout", "log out", "sign out"], answer: "Use the account menu and choose Logout. Sessions are kept only for the current browser tab, so closing the tab or browser does not leave a persistent portal login behind." },
  { keys: ["another phone", "other phone", "new device", "same laptop", "two accounts", "same computer"], answer: "Each browser tab keeps its own portal session, so different authorised accounts can be used on the same computer without sharing login credentials. A server-side session replacement can still end an account session for security." },
  { keys: ["website", "home", "public site", "go to website"], answer: "Use the Website/Home button in the portal top bar to return to the public Benevolent MIDAX website." },
];

function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function makeMessage(from, text) { return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, from, text, at: new Date().toISOString() }; }
function fallbackAnswer(question, role) {
  const text = normalize(question);
  if (!text) return "Hello! Ask me about Benevolent MIDAX, the Constitution, services, contributions, support, claims, members, chat, calls, notifications, polls, resources or portal navigation.";
  if (text.includes("another phone") || text.includes("other phone") || text.includes("logged out") || text.includes("security")) return role ? "For account security, signing in on another device can replace the older session. Keep your login details private and use only trusted devices." : "Benovelent MIDAX uses server-side account protection. Keep your login details private and use only trusted devices.";
  if (text.includes("who are you") || text.includes("what can you do")) return "I’m Benevolent Assistant. I can explain published Benovelent MIDAX information, guide you around the portal and point you to the right section.";
  const hit = FAQ.find((item) => item.keys.some((key) => text.includes(key)));
  if (hit) return hit.answer;
  if (role === "member") return "I could not match that to a published portal topic. Try Support, Claims, Profile, Accounts, Chat, Notifications, Polls or the Constitution.";
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
  return [makeMessage("bot", `Hello! I’m Benevolent Assistant. ${role ? "How can I help with your portal today?" : "How can I help you today?"}`)];
}

export default function SmartAssistant() {
  const { role } = useAuth();
  const location = useLocation();
  const roleName = String(role || "").toLowerCase();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
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
    if (open) { setShowTeaser(false); window.setTimeout(() => inputRef.current?.focus(), 120); return undefined; }
    setShowTeaser(true);
    const t1 = window.setTimeout(() => setShowTeaser(false), 5200);
    return () => window.clearTimeout(t1);
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
      <span className="teaser-dot"><Sparkles size={11} /></span><span><strong>Benevolent Assistant</strong><small>Need help navigating?</small></span><span className="teaser-close" onClick={(event) => { event.stopPropagation(); setShowTeaser(false); }} aria-hidden="true">×</span>
    </button>}
    {open && <section className="smart-assistant-panel" aria-label="Benovelent MIDAX assistant">
      <header className="smart-assistant-header"><div className="assistant-header-main"><span className="assistant-orb"><Bot size={19} /></span><div><strong>Benevolent Assistant</strong><span className="assistant-status"><i /> {roleName ? `${roleName} portal • ready` : "Public website • ready"}</span></div></div><div className="assistant-header-actions"><button type="button" onClick={clearChat} aria-label="Start a new chat" title="New chat"><RotateCcw size={16} /></button><button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" title="Close"><X size={17} /></button></div></header>
      <div className="smart-assistant-privacy"><ShieldCheck size={14} /> Answers are based on the website and your authorised portal information.</div>
      <div className="smart-assistant-messages" role="log" aria-live="polite" aria-busy={typing}>
        {messages.slice(-MAX_MESSAGES).map((message) => <div key={message.id} className={`assistant-message ${message.from}`}>
          {message.from === "bot" && <span className="message-avatar"><Bot size={13} /></span>}
          <div className="message-bubble"><p>{message.text}</p><time>{new Date(message.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div>
        </div>)}
        {typing && <div className="assistant-message bot"><span className="message-avatar"><Bot size={13} /></span><div className="message-bubble typing-bubble"><span /><span /><span /></div></div>}
        <div ref={endRef} />
      </div>
      <div className="assistant-suggestions" aria-label="Suggested questions">{suggested.map((item) => <button type="button" key={item} onClick={() => ask(item)} disabled={typing}>{item}</button>)}</div>
      <form className="smart-assistant-input" onSubmit={(event) => { event.preventDefault(); ask(); }}><input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about the website or portal…" aria-label="Ask the assistant" maxLength={500} /><button type="submit" aria-label="Send question" disabled={!input.trim() || typing}><Send size={17} /></button></form>
      <p className="assistant-note"><HelpCircle size={13} /> The public assistant does not expose private member records.</p>
    </section>}
  </div>;
}
