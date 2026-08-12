import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  Upload,
  Users,
  ImagePlus,
  Edit3,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import NotificationSettings from "../../components/NotificationSettings";
import API, { resolveApiUrl } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../styles/portalModule.css";

const SECTION_FIELDS = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "services", label: "Services" },
  { key: "contact", label: "Contact" },
  { key: "footer", label: "Footer" },
  { key: "gallery", label: "Gallery" },
  { key: "privacy-policy", label: "Privacy Policy" },
  { key: "terms-conditions", label: "Terms & Conditions" },
  { key: "settings", label: "Website Settings" },
];

const THEMES = [
  { name: "Midax Orange", value: "#ff7a00" },
  { name: "Royal Violet", value: "#7c3aed" },
  { name: "Trust Blue", value: "#0ea5e9" },
  { name: "Community Green", value: "#10b981" },
  { name: "Warm Rose", value: "#e11d48" },
  { name: "Golden", value: "#f59e0b" },
];

const EMPTY_SECTION = (section) => ({
  section,
  title: "",
  subtitle: "",
  description: "",
  content: "",
  published: true,
});

function normalizeContent(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.body === "string") return value.body;
    if (typeof value.text === "string") return value.text;
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function normalizeImagePath(src) {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return resolveApiUrl(src);
}

export default function SuperAdminSettings() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("website");
  const [sections, setSections] = useState(() =>
    Object.fromEntries(SECTION_FIELDS.map((item) => [item.key, EMPTY_SECTION(item.key)]))
  );
  const [themeColor, setThemeColor] = useState("#ff7a00");
  const [slides, setSlides] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [savingLeader, setSavingLeader] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [galleryFile, setGalleryFile] = useState(null);
  const [leaderFile, setLeaderFile] = useState(null);
  const [leaderDraft, setLeaderDraft] = useState({
    _id: "",
    name: "",
    position: "",
    bio: "",
    order: 0,
    isActive: true,
  });
  const [carouselForm, setCarouselForm] = useState({
    title: "",
    description: "",
    buttonText: "Discover More",
    buttonLink: "/about",
    order: 0,
    isActive: true,
  });

  const roleLabel = useMemo(() => "Super Administrator", []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const [websiteRes, carouselRes, leadersRes, galleryRes, settingsRes] = await Promise.allSettled([
          API.get("/website"),
          API.get("/carousel"),
          API.get("/leaders"),
          API.get("/website/gallery"),
          API.get("/website/settings"),
        ]);

        if (!active) return;

        if (websiteRes.status === "fulfilled") {
          const rows = Array.isArray(websiteRes.value.data?.content) ? websiteRes.value.data.content : [];
          const nextSections = Object.fromEntries(SECTION_FIELDS.map((item) => [item.key, EMPTY_SECTION(item.key)]));
          rows.forEach((row) => {
            if (!row?.section || !nextSections[row.section]) return;
            nextSections[row.section] = {
              section: row.section,
              title: row.title || "",
              subtitle: row.subtitle || "",
              description: row.description || "",
              content: normalizeContent(row.content),
              published: row.published !== false,
            };
          });
          setSections(nextSections);
        }

        if (settingsRes.status === "fulfilled") {
          const settingsContent = settingsRes.value.data?.section?.content || settingsRes.value.data?.settings || {};
          const color = settingsContent.themeColor || settingsContent.accentColor;
          if (color) setThemeColor(color);
        }

        if (carouselRes.status === "fulfilled") {
          setSlides(Array.isArray(carouselRes.value.data) ? carouselRes.value.data : []);
        }

        if (leadersRes.status === "fulfilled") {
          setLeaders(Array.isArray(leadersRes.value.data) ? leadersRes.value.data : []);
        }

        if (galleryRes.status === "fulfilled") {
          const images = galleryRes.value.data?.section?.images || galleryRes.value.data?.gallery || [];
          setGallery(Array.isArray(images) ? images : []);
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || err.message || "Unable to load website settings.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const patchSection = (key, patch) => {
    setSections((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };

  const saveSection = async (key) => {
    try {
      setSavingKey(key);
      setError("");
      const item = sections[key] || EMPTY_SECTION(key);
      const payload = {
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        published: item.published,
        content: key === "settings" ? { themeColor, accentColor: themeColor } : { body: item.content },
      };

      const exists = Boolean(item.title || item.subtitle || item.description || item.content);
      const request = exists ? API.put(`/website/${key}`, payload) : API.post("/website", { section: key, ...payload });
      const { data } = await request;
      setMessage(data?.message || "Section saved.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save section.");
    } finally {
      setSavingKey("");
    }
  };

  const saveTheme = async () => {
    try {
      setSavingKey("settings");
      setError("");
      const payload = {
        title: "Website Settings",
        subtitle: "Brand color and public website preferences",
        description: "Managed by the superadmin portal.",
        content: {
          themeColor,
          accentColor: themeColor,
        },
        published: true,
      };
      const { data } = await API.put("/website/settings", payload).catch(async (err) => {
        if (err.response?.status === 404) {
          return await API.post("/website", { section: "settings", ...payload });
        }
        throw err;
      });
      const savedColor = data?.section?.content?.themeColor || themeColor;
      document.documentElement.style.setProperty("--orange", savedColor);
      document.documentElement.style.setProperty("--orange-dark", savedColor);
      document.documentElement.style.setProperty("--portal-accent", savedColor);
      document.documentElement.style.setProperty("--portal-accent-soft", `${savedColor}18`);
      setMessage("Website theme updated.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save theme.");
    } finally {
      setSavingKey("");
    }
  };

  const uploadCarousel = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError("Please choose a slide image first.");
      return;
    }
    try {
      setSavingCarousel(true);
      setError("");
      const form = new FormData();
      form.append("image", uploadFile);
      form.append("title", carouselForm.title || "Benovelent Midax");
      form.append("description", carouselForm.description || "");
      form.append("buttonText", carouselForm.buttonText || "Discover More");
      form.append("buttonLink", carouselForm.buttonLink || "/about");
      form.append("order", String(carouselForm.order || 0));

      const { data } = await API.post("/carousel/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSlides((prev) => [data.slide, ...prev]);
      setMessage("Carousel slide uploaded and published to the public carousel.");
      setUploadFile(null);
      setCarouselForm({
        title: "",
        description: "",
        buttonText: "Discover More",
        buttonLink: "/about",
        order: 0,
        isActive: true,
      });
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.code === "DUPLICATE_CAROUSEL") {
        setError("This image/content is already in the carousel. The existing slide was kept, so no duplicate was created.");
      } else {
        setError(err.response?.data?.message || err.message || "Unable to upload carousel slide.");
      }
    } finally {
      setSavingCarousel(false);
    }
  };

  const updateSlide = async (slideId, patch) => {
    try {
      setError("");
      const current = slides.find((slide) => slide._id === slideId);
      const form = new FormData();
      if (current?.title !== undefined) form.append("title", patch.title ?? current.title);
      if (current?.description !== undefined) form.append("description", patch.description ?? current.description);
      if (current?.buttonText !== undefined) form.append("buttonText", patch.buttonText ?? current.buttonText);
      if (current?.buttonLink !== undefined) form.append("buttonLink", patch.buttonLink ?? current.buttonLink);
      form.append("order", String(patch.order ?? current?.order ?? 0));
      form.append("isActive", String(patch.isActive ?? current?.isActive ?? true));

      const { data } = await API.put(`/carousel/${slideId}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSlides((prev) => prev.map((slide) => (slide._id === slideId ? data.slide : slide)));
      setMessage("Carousel slide updated.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update carousel.");
    }
  };

  const deleteSlide = async (slideId) => {
    if (!window.confirm("Delete this carousel slide?")) return;
    try {
      setError("");
      await API.delete(`/carousel/${slideId}`);
      setSlides((prev) => prev.filter((slide) => slide._id !== slideId));
      setMessage("Carousel slide deleted.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to delete carousel slide.");
    }
  };

  const uploadGallery = async (e) => {
    e.preventDefault();
    if (!galleryFile) {
      setError("Please choose a gallery image first.");
      return;
    }
    try {
      setSavingGallery(true);
      setError("");
      const form = new FormData();
      form.append("image", galleryFile);
      form.append("caption", galleryFile.name);
      const { data } = await API.post("/website/gallery/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const images = data?.section?.images || [];
      setGallery(Array.isArray(images) ? images : gallery);
      setGalleryFile(null);
      setMessage("Gallery image uploaded and published to the public gallery.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to upload gallery image.");
    } finally {
      setSavingGallery(false);
    }
  };

  const saveLeader = async (e) => {
    e.preventDefault();
    if (!leaderDraft.name.trim() || !leaderDraft.position.trim()) {
      setError("Leader name and position are required.");
      return;
    }

    try {
      setSavingLeader(true);
      setError("");
      const form = new FormData();
      form.append("name", leaderDraft.name.trim());
      form.append("position", leaderDraft.position.trim());
      form.append("bio", leaderDraft.bio || "");
      form.append("order", String(leaderDraft.order || 0));
      if (leaderFile) form.append("image", leaderFile);

      const response = leaderDraft._id
        ? await API.put(`/leaders/${leaderDraft._id}`, form, { headers: { "Content-Type": "multipart/form-data" } })
        : await API.post("/leaders/upload", form, { headers: { "Content-Type": "multipart/form-data" } });

      const saved = response.data?.leader;
      if (saved) {
        setLeaders((prev) => {
          const next = leaderDraft._id
            ? prev.map((item) => (item._id === saved._id ? saved : item))
            : [saved, ...prev];
          return next;
        });
      }

      setLeaderDraft({ _id: "", name: "", position: "", bio: "", order: 0, isActive: true });
      setLeaderFile(null);
      setMessage(leaderDraft._id ? "Leader updated." : "Leader added and published.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save leader.");
    } finally {
      setSavingLeader(false);
    }
  };

  const editLeader = (leader) => {
    setLeaderDraft({
      _id: leader._id,
      name: leader.name || "",
      position: leader.position || "",
      bio: leader.bio || "",
      order: leader.order || 0,
      isActive: leader.isActive !== false,
    });
    setLeaderFile(null);
    setActiveTab("leaders");
  };

  const deleteLeader = async (leaderId) => {
    if (!window.confirm("Delete this leader?")) return;
    try {
      setError("");
      await API.delete(`/leaders/${leaderId}`);
      setLeaders((prev) => prev.filter((item) => item._id !== leaderId));
      setMessage("Leader removed.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to delete leader.");
    }
  };

  const sectionCards = useMemo(
    () => SECTION_FIELDS.map((item) => ({
      ...item,
      section: sections[item.key] || EMPTY_SECTION(item.key),
    })),
    [sections]
  );

  return (
    <DashboardLayout>
      <NotificationSettings />
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>PUBLIC WEBSITE CONTROL</span>
            <h1>SuperAdmin website editor</h1>
            <p>See what the public website contains, then edit pages, leaders, gallery images and theme settings from one place.</p>
          </div>
          <div className="portal-actions">
            <button className={activeTab === "website" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("website")} type="button">Website content</button>
            <button className={activeTab === "carousel" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("carousel")} type="button">Carousel</button>
            <button className={activeTab === "leaders" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("leaders")} type="button">Leaders</button>
            <button className={activeTab === "gallery" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("gallery")} type="button">Gallery</button>
            <button className={activeTab === "settings" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("settings")} type="button">Theme</button>
          </div>
        </header>

        <section className="portal-panel">
          <div className="portal-section-title">
            <Settings2 size={20} />
            <div>
              <span>WHAT SUPERADMIN CAN EDIT</span>
              <h2>Current website inventory</h2>
            </div>
          </div>
          <div className="portal-stat-grid">
            {sectionCards.map((item) => (
              <div className="portal-stat" key={item.key}>
                <span>{item.label}</span>
                <strong>{item.section.title || "Empty"}</strong>
                <small>{item.section.subtitle || item.section.description || "Ready for content"}</small>
              </div>
            ))}
          </div>
          <div className="portal-form-grid">
            <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
              <p style={{ margin: 0, color: "#666", lineHeight: 1.6 }}>
                The public site can be edited through the Website content tab. Carousel slides are what show on the home hero. Leaders are shown on the public leadership page. Gallery images are reflected on the public gallery page.
              </p>
            </div>
          </div>
        </section>

        {error && <div className="portal-alert">{error}</div>}
        {message && <div className="portal-alert success">{message}</div>}

        {loading ? (
          <div className="portal-panel portal-empty">Loading website settings...</div>
        ) : (
          <>
            {activeTab === "website" && (
              <div className="portal-grid">
                {SECTION_FIELDS.filter((item) => item.key !== "settings").map((item) => (
                  <section className="portal-panel" key={item.key}>
                    <div className="portal-section-title">
                      <Check size={20} />
                      <div>
                        <span>{item.label.toUpperCase()}</span>
                        <h2>{item.label} page content</h2>
                      </div>
                    </div>

                    <div className="portal-form-grid">
                      <div className="portal-field">
                        <label>Title</label>
                        <input type="text" value={sections[item.key]?.title || ""} onChange={(e) => patchSection(item.key, { title: e.target.value })} />
                      </div>
                      <div className="portal-field">
                        <label>Subtitle</label>
                        <input type="text" value={sections[item.key]?.subtitle || ""} onChange={(e) => patchSection(item.key, { subtitle: e.target.value })} />
                      </div>
                      <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                        <label>Description</label>
                        <textarea rows="4" value={sections[item.key]?.description || ""} onChange={(e) => patchSection(item.key, { description: e.target.value })} />
                      </div>
                      <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                        <label>Extra content</label>
                        <textarea rows="6" value={sections[item.key]?.content || ""} onChange={(e) => patchSection(item.key, { content: e.target.value })} placeholder="Optional body text, JSON or notes for this page." />
                      </div>
                    </div>

                    <div className="portal-actions">
                      <button className="portal-btn" onClick={() => saveSection(item.key)} disabled={savingKey === item.key} type="button">
                        <Save size={16} /> {savingKey === item.key ? "Saving..." : "Save section"}
                      </button>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="portal-panel">
                <div className="portal-section-title">
                  <Palette size={20} />
                  <div>
                    <span>THEME CONTROL</span>
                    <h2>Choose the public brand color</h2>
                  </div>
                </div>

                <div className="theme-grid">
                  {THEMES.map((theme) => (
                    <button key={theme.value} type="button" className={themeColor === theme.value ? "theme-swatch selected" : "theme-swatch"} onClick={() => setThemeColor(theme.value)}>
                      <span style={{ background: theme.value }} />
                      <strong>{theme.name}</strong>
                      <small>{theme.value}</small>
                    </button>
                  ))}
                </div>

                <div className="portal-actions">
                  <button className="portal-btn" type="button" onClick={saveTheme} disabled={savingKey === "settings"}>
                    <Save size={16} /> {savingKey === "settings" ? "Saving..." : "Save theme"}
                  </button>
                  <button className="portal-btn light" type="button" onClick={() => setThemeColor("#ff7a00")}>
                    <RefreshCw size={16} /> Reset to orange
                  </button>
                </div>
              </div>
            )}

            {activeTab === "carousel" && (
              <div className="portal-grid">
                <section className="portal-panel">
                  <div className="portal-section-title">
                    <Upload size={20} />
                    <div>
                      <span>UPLOAD</span>
                      <h2>Add a carousel slide</h2>
                    </div>
                  </div>

                  <form className="portal-form-grid" onSubmit={uploadCarousel}>
                    <div className="portal-field">
                      <label>Slide image</label>
                      <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="portal-field">
                      <label>Title</label>
                      <input type="text" value={carouselForm.title} onChange={(e) => setCarouselForm((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="portal-field">
                      <label>Button text</label>
                      <input type="text" value={carouselForm.buttonText} onChange={(e) => setCarouselForm((p) => ({ ...p, buttonText: e.target.value }))} />
                    </div>
                    <div className="portal-field">
                      <label>Button link</label>
                      <input type="text" value={carouselForm.buttonLink} onChange={(e) => setCarouselForm((p) => ({ ...p, buttonLink: e.target.value }))} />
                    </div>
                    <div className="portal-field">
                      <label>Order</label>
                      <input type="number" value={carouselForm.order} onChange={(e) => setCarouselForm((p) => ({ ...p, order: Number(e.target.value) }))} />
                    </div>
                    <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Description</label>
                      <textarea rows="4" value={carouselForm.description} onChange={(e) => setCarouselForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>
                    <button className="portal-btn" disabled={savingCarousel} type="submit">
                      <Save size={16} /> {savingCarousel ? "Uploading..." : "Upload slide"}
                    </button>
                  </form>
                </section>

                <section className="portal-panel">
                  <div className="portal-section-title">
                    <ChevronDown size={20} />
                    <div>
                      <span>MANAGE</span>
                      <h2>Existing carousel slides</h2>
                    </div>
                  </div>

                  {slides.length === 0 ? (
                    <div className="portal-empty">No carousel slides found.</div>
                  ) : (
                    <div className="carousel-admin-list">
                      {slides.map((slide) => (
                        <article key={slide._id} className="carousel-admin-card">
                          <img src={normalizeImagePath(slide.imageUrl)} alt={slide.title || "Carousel"} />
                          <div>
                            <input type="text" value={slide.title || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, title: e.target.value } : x))} />
                            <textarea rows="3" value={slide.description || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, description: e.target.value } : x))} />
                            <div className="portal-form-grid">
                              <div className="portal-field">
                                <label>Button text</label>
                                <input type="text" value={slide.buttonText || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, buttonText: e.target.value } : x))} />
                              </div>
                              <div className="portal-field">
                                <label>Button link</label>
                                <input type="text" value={slide.buttonLink || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, buttonLink: e.target.value } : x))} />
                              </div>
                              <div className="portal-field">
                                <label>Order</label>
                                <input type="number" value={slide.order || 0} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, order: Number(e.target.value) } : x))} />
                              </div>
                            </div>
                            <div className="portal-actions">
                              <button className="portal-btn" type="button" onClick={() => updateSlide(slide._id, slide)}>Save</button>
                              <button className="portal-btn danger" type="button" onClick={() => deleteSlide(slide._id)}>
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "leaders" && (
              <div className="portal-grid">
                <section className="portal-panel">
                  <div className="portal-section-title">
                    <Users size={20} />
                    <div>
                      <span>ADD / EDIT LEADER</span>
                      <h2>Leadership details</h2>
                    </div>
                  </div>

                  <form className="portal-form-grid" onSubmit={saveLeader}>
                    <div className="portal-field">
                      <label>Name</label>
                      <input type="text" value={leaderDraft.name} onChange={(e) => setLeaderDraft((p) => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="portal-field">
                      <label>Position</label>
                      <input type="text" value={leaderDraft.position} onChange={(e) => setLeaderDraft((p) => ({ ...p, position: e.target.value }))} />
                    </div>
                    <div className="portal-field">
                      <label>Order</label>
                      <input type="number" value={leaderDraft.order} onChange={(e) => setLeaderDraft((p) => ({ ...p, order: Number(e.target.value) }))} />
                    </div>
                    <div className="portal-field">
                      <label>Photo</label>
                      <input type="file" accept="image/*" onChange={(e) => setLeaderFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Bio</label>
                      <textarea rows="4" value={leaderDraft.bio} onChange={(e) => setLeaderDraft((p) => ({ ...p, bio: e.target.value }))} />
                    </div>
                    <div className="portal-actions">
                      <button className="portal-btn" type="submit" disabled={savingLeader}>
                        <Plus size={16} /> {savingLeader ? "Saving..." : (leaderDraft._id ? "Update leader" : "Add leader")}
                      </button>
                      {leaderDraft._id && (
                        <button className="portal-btn light" type="button" onClick={() => setLeaderDraft({ _id: "", name: "", position: "", bio: "", order: 0, isActive: true })}>
                          Cancel edit
                        </button>
                      )}
                    </div>
                  </form>
                </section>

                <section className="portal-panel">
                  <div className="portal-section-title">
                    <Edit3 size={20} />
                    <div>
                      <span>EXISTING LEADERS</span>
                      <h2>Public leadership page content</h2>
                    </div>
                  </div>

                  {leaders.length === 0 ? (
                    <div className="portal-empty">No leaders found yet.</div>
                  ) : (
                    <div className="carousel-admin-list">
                      {leaders.map((leader) => (
                        <article key={leader._id} className="carousel-admin-card">
                          <img src={normalizeImagePath(leader.imageUrl) || "/default-avatar.svg"} alt={leader.name || "Leader"} />
                          <div>
                            <input type="text" value={leader.name || ""} readOnly />
                            <input type="text" value={leader.position || ""} readOnly />
                            <textarea rows="3" value={leader.bio || ""} readOnly />
                            <div className="portal-actions">
                              <button className="portal-btn" type="button" onClick={() => editLeader(leader)}>Edit</button>
                              <button className="portal-btn danger" type="button" onClick={() => deleteLeader(leader._id)}>
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "gallery" && (
              <div className="portal-grid">
                <section className="portal-panel">
                  <div className="portal-section-title">
                    <ImagePlus size={20} />
                    <div>
                      <span>UPLOAD</span>
                      <h2>Add a gallery image</h2>
                    </div>
                  </div>

                  <form className="portal-form-grid" onSubmit={uploadGallery}>
                    <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Gallery image</label>
                      <input type="file" accept="image/*" onChange={(e) => setGalleryFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Optional caption</label>
                      <input type="text" value={galleryFile ? galleryFile.name : ""} readOnly placeholder="Selected file name appears here" />
                    </div>
                    <button className="portal-btn" type="submit" disabled={savingGallery}>
                      <Save size={16} /> {savingGallery ? "Uploading..." : "Upload image"}
                    </button>
                  </form>
                </section>

                <section className="portal-panel">
                  <div className="portal-section-title">
                    <Check size={20} />
                    <div>
                      <span>PUBLIC GALLERY</span>
                      <h2>Uploaded images</h2>
                    </div>
                  </div>

                  {gallery.length === 0 ? (
                    <div className="portal-empty">No gallery images yet.</div>
                  ) : (
                    <div className="portal-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                      {gallery.map((img, index) => (
                        <div key={`${img}-${index}`} className="portal-panel" style={{ padding: 12, marginBottom: 0 }}>
                          <img src={normalizeImagePath(img)} alt={`Gallery ${index + 1}`} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 14 }} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </>
        )}

        <section className="portal-panel">
          <p style={{ color: "#666" }}>
            Signed in as <strong>{user?.fullName || user?.name || "Super Administrator"}</strong> ({roleLabel}). Carousel, leader and gallery uploads are stored securely and served through permanent URLs.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
