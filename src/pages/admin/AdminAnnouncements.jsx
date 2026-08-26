import { useEffect, useState } from "react";
import { Newspaper, Upload, Trash2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { confirmAction } from "../../utils/modernDialog";
import DashboardLayout from "../../layouts/DashboardLayout";
import { createManagedNews, deleteManagedNews, getManagedNews } from "../../services/newsService";
import "../superadmin/SuperAdminNews.css";

const initial = { title: "", summary: "", content: "", category: "Announcement", published: true, featured: false, pinned: false };

export default function AdminAnnouncements() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initial);
  const [cover, setCover] = useState(null);
  const [images, setImages] = useState(null);
  const [attachments, setAttachments] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { setLoading(true); const r = await getManagedNews({ limit: 100 }); setItems(r?.news || []); }
    catch (e) { toast.error(e.response?.data?.message || "Could not load announcements."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => fd.append(k, typeof v === "boolean" ? String(v) : v));
      if (cover) fd.append("coverImage", cover);
      Array.from(images || []).forEach(f => fd.append("images", f));
      Array.from(attachments || []).forEach(f => fd.append("attachments", f));
      const r = await createManagedNews(fd);
      toast.success("Announcement published to the public News page.");
      setItems(prev => [r.news, ...prev]); setForm(initial); setCover(null); setImages(null); setAttachments(null); e.target.reset();
    } catch (err) { toast.error(err.response?.data?.message || "Could not publish announcement."); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!await confirmAction("Delete this announcement permanently?")) return;
    try { await deleteManagedNews(id); setItems(prev => prev.filter(item => item._id !== id)); toast.success("Announcement deleted."); }
    catch (e) { toast.error(e.response?.data?.message || "Could not delete announcement."); }
  };

  return <DashboardLayout><main className="superadmin-news-page"><div className="superadmin-news-header"><div><span>PUBLIC COMMUNICATIONS</span><h1><Newspaper size={28}/> Announcements</h1><p>Publish pictures, updates and official announcements directly to the public News page.</p></div><button type="button" className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16}/> Refresh</button></div><form className="portal-module superadmin-news-form" onSubmit={submit}><div className="feedback-grid"><label>Title<input type="text" maxLength={180} required value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Announcement title" /></label><label>Category<select value={form.category} onChange={e => setForm({...form,category:e.target.value})}><option>Announcement</option><option>Event</option><option>General</option></select></label></div><label>Summary<textarea rows="3" maxLength={500} value={form.summary} onChange={e => setForm({...form,summary:e.target.value})} /></label><label>Content<textarea rows="8" maxLength={10000} required value={form.content} onChange={e => setForm({...form,content:e.target.value})} /></label><div className="feedback-grid"><label>Cover image<input type="file" accept="image/*" onChange={e => setCover(e.target.files?.[0] || null)} /></label><label>Gallery images<input type="file" accept="image/*" multiple onChange={e => setImages(e.target.files)} /></label></div><label>Attachments<input type="file" multiple onChange={e => setAttachments(e.target.files)} /></label><div className="news-checks"><label><input type="checkbox" checked={form.featured} onChange={e => setForm({...form,featured:e.target.checked})}/> Featured</label><label><input type="checkbox" checked={form.pinned} onChange={e => setForm({...form,pinned:e.target.checked})}/> Pinned</label></div><button className="btn btn-primary" type="submit" disabled={loading}><Upload size={16}/> {loading ? "Publishing…" : "Publish announcement"}</button></form><section className="portal-module"><div className="portal-module-header"><div><span>PUBLIC NEWS</span><h2>Published announcements</h2></div></div><div className="managed-news-list">{items.length === 0 ? <div className="portal-empty">No public announcements have been published yet.</div> : items.map(item => <article key={item._id} className="managed-news-item"><div><span>{item.category || "Announcement"}</span><h3>{item.title}</h3><p>{item.summary || item.content}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("en-KE") : ""}</small></div><button className="icon-btn danger" type="button" title="Delete announcement" onClick={() => remove(item._id)}><Trash2 size={18}/></button></article>)}</div></section></main></DashboardLayout>;
}
