import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronDown, Upload, Palette, Save, Trash2, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API, { resolveApiUrl } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "../../styles/portalModule.css";

const SECTION_FIELDS = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "services", label: "Services" },
  { key: "contact", label: "Contact" },
  { key: "footer", label: "Footer" },
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

function emptySection(section) {
  return {
    section,
    title: "",
    subtitle: "",
    description: "",
    content: "",
    published: true,
  };
}

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

export default function SuperAdminSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("website");
  const [sections, setSections] = useState(() =>
    Object.fromEntries(SECTION_FIELDS.map((item) => [item.key, emptySection(item.key)]))
  );
  const [themeColor, setThemeColor] = useState("#ff7a00");
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState("");
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
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
        const [websiteRes, carouselRes, settingsRes] = await Promise.allSettled([
          API.get("/website"),
          API.get("/carousel"),
          API.get("/website/settings"),
        ]);

        if (!active) return;

        if (websiteRes.status === "fulfilled") {
          const rows = Array.isArray(websiteRes.value.data?.content)
            ? websiteRes.value.data.content
            : [];
          const nextSections = Object.fromEntries(
            SECTION_FIELDS.map((item) => [item.key, emptySection(item.key)])
          );

          rows.forEach((row) => {
            if (!row?.section) return;
            nextSections[row.section] = {
              section: row.section,
              title: row.title || "",
              subtitle: row.subtitle || "",
              description: row.description || "",
              content: normalizeContent(row.content),
              published: row.published !== false,
            };

            if (row.section === "settings") {
              const content = row.content || {};
              const color = content.themeColor || content.accentColor || row.themeColor;
              if (color) setThemeColor(color);
            }
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
      setSavingSection(key);
      setError("");
      const item = sections[key] || emptySection(key);
      const payload = {
        title: item.title,
        subtitle: item.subtitle,
        description: item.description,
        published: item.published,
        content:
          key === "settings"
            ? {
                themeColor,
                accentColor: themeColor,
              }
            : { body: item.content },
      };

      const exists = Boolean(item.title || item.subtitle || item.description || item.content);
      const request = exists ? API.put(`/website/${key}`, payload) : API.post("/website", { section: key, ...payload });

      const { data } = await request;
      setMessage(data?.message || "Section saved.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save section.");
    } finally {
      setSavingSection("");
    }
  };

  const saveTheme = async () => {
    try {
      setSavingSection("settings");
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
      setSavingSection("");
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
      form.append("title", carouselForm.title || "Benevolent Midax");
      form.append("description", carouselForm.description || "");
      form.append("buttonText", carouselForm.buttonText || "Discover More");
      form.append("buttonLink", carouselForm.buttonLink || "/about");
      form.append("order", String(carouselForm.order || 0));

      const { data } = await API.post("/carousel/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSlides((prev) => [data.slide, ...prev]);
      setMessage("Carousel slide uploaded and saved locally under /uploads/carousel.");
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
      setError(err.response?.data?.message || err.message || "Unable to upload carousel slide.");
    } finally {
      setSavingCarousel(false);
    }
  };

  const updateSlide = async (slideId, patch) => {
    try {
      setError("");
      setMessage("");
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

  return (
    <DashboardLayout>
      <div className="portal-module">
        <header className="portal-module-header">
          <div>
            <span>PUBLIC WEBSITE CONTROL</span>
            <h1>Website Settings</h1>
            <p>Update your public pages, brand color, and carousel slides from one secure place.</p>
          </div>
          <div className="portal-actions">
            <button className="portal-btn" onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </header>

        {(message || error) && (
          <div className={error ? "portal-alert" : "portal-alert success"}>
            {error || message}
          </div>
        )}

        <section className="portal-panel">
          <div className="settings-tabs">
            <button className={activeTab === "website" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("website")}>Website content</button>
            <button className={activeTab === "theme" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("theme")}>Theme color</button>
            <button className={activeTab === "carousel" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("carousel")}>Carousels</button>
          </div>
        </section>

        {loading ? (
          <section className="portal-panel">
            <div className="portal-empty">Loading website settings...</div>
          </section>
        ) : (
          <>
            {activeTab === "theme" && (
              <section className="portal-panel">
                <div className="portal-section-title">
                  <Palette size={20} />
                  <div>
                    <span>BRANDING</span>
                    <h2>Public Website Color</h2>
                  </div>
                </div>

                <div className="theme-grid">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.value}
                      type="button"
                      className={themeColor === theme.value ? "theme-swatch selected" : "theme-swatch"}
                      onClick={() => setThemeColor(theme.value)}
                    >
                      <span style={{ background: theme.value }} />
                      <strong>{theme.name}</strong>
                      <small>{theme.value}</small>
                    </button>
                  ))}
                </div>

                <button className="portal-btn" onClick={saveTheme} disabled={savingSection === "settings"}>
                  <Save size={16} /> {savingSection === "settings" ? "Saving..." : "Save theme"}
                </button>
              </section>
            )}

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
                        <input
                          value={sections[item.key]?.title || ""}
                          onChange={(e) => patchSection(item.key, { title: e.target.value })}
                        />
                      </div>
                      <div className="portal-field">
                        <label>Subtitle</label>
                        <input
                          value={sections[item.key]?.subtitle || ""}
                          onChange={(e) => patchSection(item.key, { subtitle: e.target.value })}
                        />
                      </div>
                      <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                        <label>Description</label>
                        <textarea
                          rows="4"
                          value={sections[item.key]?.description || ""}
                          onChange={(e) => patchSection(item.key, { description: e.target.value })}
                        />
                      </div>
                      <div className="portal-field" style={{ gridColumn: "1 / -1" }}>
                        <label>Extra content</label>
                        <textarea
                          rows="6"
                          value={sections[item.key]?.content || ""}
                          onChange={(e) => patchSection(item.key, { content: e.target.value })}
                          placeholder="Optional body text, JSON or notes for this page."
                        />
                      </div>
                    </div>

                    <div className="portal-actions">
                      <button
                        className="portal-btn"
                        onClick={() => saveSection(item.key)}
                        disabled={savingSection === item.key}
                      >
                        <Save size={16} /> {savingSection === item.key ? "Saving..." : "Save section"}
                      </button>
                    </div>
                  </section>
                ))}
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
                      <input value={carouselForm.title} onChange={(e) => setCarouselForm((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="portal-field">
                      <label>Button text</label>
                      <input value={carouselForm.buttonText} onChange={(e) => setCarouselForm((p) => ({ ...p, buttonText: e.target.value }))} />
                    </div>
                    <div className="portal-field">
                      <label>Button link</label>
                      <input value={carouselForm.buttonLink} onChange={(e) => setCarouselForm((p) => ({ ...p, buttonLink: e.target.value }))} />
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
                          <img src={resolveApiUrl(slide.imageUrl)} alt={slide.title || "Carousel"} />
                          <div>
                            <input value={slide.title || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, title: e.target.value } : x))} />
                            <textarea rows="3" value={slide.description || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, description: e.target.value } : x))} />
                            <div className="portal-form-grid">
                              <div className="portal-field">
                                <label>Button text</label>
                                <input value={slide.buttonText || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, buttonText: e.target.value } : x))} />
                              </div>
                              <div className="portal-field">
                                <label>Button link</label>
                                <input value={slide.buttonLink || ""} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, buttonLink: e.target.value } : x))} />
                              </div>
                              <div className="portal-field">
                                <label>Order</label>
                                <input type="number" value={slide.order || 0} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, order: Number(e.target.value) } : x))} />
                              </div>
                            </div>
                            <div className="portal-actions">
                              <button className="portal-btn" onClick={() => updateSlide(slide._id, slide)}>Save</button>
                              <button className="portal-btn danger" onClick={() => deleteSlide(slide._id)}>
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
          </>
        )}

        <section className="portal-panel">
          <p style={{ color: "#666" }}>
            Signed in as <strong>{user?.fullName || user?.name || "Super Administrator"}</strong> ({roleLabel}). Carousel uploads are stored locally by the backend in <code>/uploads/carousel</code> and served statically by the server.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
