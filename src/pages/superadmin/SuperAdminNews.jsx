import { confirmAction } from "../../utils/modernDialog";
import { useEffect, useState } from "react";
import { CheckCircle2, Edit3, EyeOff, Newspaper, Plus, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import DashboardLayout from "../../layouts/DashboardLayout";
import { createManagedNews, deleteManagedNews, getManagedNews, updateManagedNews } from "../../services/newsService";
import "./SuperAdminNews.css";

const initial = { title: "", summary: "", content: "", category: "Announcement", published: true, featured: false, pinned: false, allowComments: true };
const categories = ["General", "Announcement", "Finance", "Contribution", "Meeting", "Event", "Emergency", "Election", "Poll"];

const toForm = (item) => ({
  title: item?.title || "",
  summary: item?.summary || "",
  content: item?.content || "",
  category: item?.category || "General",
  published: Boolean(item?.published && item?.status !== "draft"),
  featured: Boolean(item?.featured),
  pinned: Boolean(item?.pinned),
  allowComments: item?.allowComments !== false,
});

export default function SuperAdminNews() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(null);
  const [cover, setCover] = useState(null);
  const [images, setImages] = useState(null);
  const [attachments, setAttachments] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await getManagedNews({ limit: 100 });
      setItems(Array.isArray(r?.news) ? r.news : []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not load news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetEditor = () => {
    setEditing(null);
    setForm(initial);
    setCover(null);
    setImages(null);
    setAttachments(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editing) {
        const payload = {
          ...form,
          published: Boolean(form.published),
          status: form.published ? "published" : "draft",
        };
        const r = await updateManagedNews(editing, payload);
        setItems((prev) => prev.map((item) => item._id === editing ? r.news : item));
        toast.success(form.published ? "News updated and published." : "News saved as draft.");
        resetEditor();
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, typeof v === "boolean" ? String(v) : v));
        if (cover) fd.append("coverImage", cover);
        Array.from(images || []).forEach((f) => fd.append("images", f));
        Array.from(attachments || []).forEach((f) => fd.append("attachments", f));
        const r = await createManagedNews(fd);
        setItems((prev) => [r.news, ...prev]);
        toast.success(form.published ? "News published." : "Draft saved.");
        resetEditor();
        e.target.reset();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save news.");
    } finally {
      setLoading(false);
    }
  };

  const edit = (item) => {
    setEditing(item._id);
    setForm(toForm(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePublished = async (item) => {
    const nextPublished = !(item.published && item.status !== "draft");
    try {
      const r = await updateManagedNews(item._id, { published: nextPublished, status: nextPublished ? "published" : "draft" });
      setItems((prev) => prev.map((entry) => entry._id === item._id ? r.news : entry));
      toast.success(nextPublished ? "News published." : "News moved to draft.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not change publication status.");
    }
  };

  const remove = async (id) => {
    if (!await confirmAction("Delete this news item permanently?")) return;
    try {
      await deleteManagedNews(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      if (editing === id) resetEditor();
      toast.success("News deleted.");
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not delete news.");
    }
  };

  return (
    <DashboardLayout>
      <main className="superadmin-news-page">
        <div className="superadmin-news-header">
          <div><span>LIVE NEWSROOM</span><h1><Newspaper size={28} /> News Management</h1><p>Create, edit, publish, hide and remove website news from one place.</p></div>
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
        </div>

        <form className="portal-module superadmin-news-form" onSubmit={submit}>
          <div className="portal-module-header"><div><span>{editing ? "EDIT CONTENT" : "NEW CONTENT"}</span><h2>{editing ? "Edit news item" : "Publish a news update"}</h2></div>{editing && <button className="btn btn-secondary" type="button" onClick={resetEditor}><X size={16} /> Cancel edit</button>}</div>
          <div className="feedback-grid">
            <label>Title<input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="News title" /></label>
            <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <label>Summary<textarea rows="3" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} maxLength={500} /></label>
          <label>Content<textarea rows="8" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
          {!editing && <>
            <div className="feedback-grid"><label>Cover image<input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] || null)} /></label><label>Gallery images<input type="file" accept="image/*" multiple onChange={(e) => setImages(e.target.files)} /></label></div>
            <label>Attachments<input type="file" multiple onChange={(e) => setAttachments(e.target.files)} /></label>
          </>}
          <div className="news-checks">
            <label><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publish now</label>
            <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
            <label><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Pinned</label>
            <label><input type="checkbox" checked={form.allowComments} onChange={(e) => setForm({ ...form, allowComments: e.target.checked })} /> Allow comments</label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>{editing ? <Save size={16} /> : <Upload size={16} />} {loading ? "Saving..." : editing ? "Save changes" : form.published ? "Publish News" : "Save Draft"}</button>
        </form>

        <section className="portal-module">
          <div className="portal-module-header"><div><span>CONTENT CONTROL</span><h2>Existing news</h2></div></div>
          <div className="managed-news-list">
            {items.length === 0 ? <div className="portal-empty">No news items have been created yet.</div> : items.map((item) => {
              const published = item.published && item.status !== "draft";
              return <article key={item._id} className="managed-news-item">
                <div className="managed-news-copy"><div className="managed-news-meta"><span>{item.category || "News"}</span><strong className={published ? "published" : "draft"}>{published ? "Published" : "Draft"}</strong></div><h3>{item.title}</h3><p>{item.summary || item.content}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small></div>
                <div className="managed-news-actions">
                  <button className="icon-btn" type="button" title="Edit news" onClick={() => edit(item)}><Edit3 size={18} /></button>
                  <button className="icon-btn" type="button" title={published ? "Move to draft" : "Publish news"} onClick={() => togglePublished(item)}>{published ? <EyeOff size={18} /> : <CheckCircle2 size={18} />}</button>
                  <button className="icon-btn danger" type="button" title="Delete news" onClick={() => remove(item._id)}><Trash2 size={18} /></button>
                </div>
              </article>;
            })}
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
