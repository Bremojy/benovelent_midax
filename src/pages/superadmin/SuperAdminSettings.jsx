import { confirmAction } from "../../utils/modernDialog";
import { Link, useSearchParams } from "react-router-dom";
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
  Eye,
  Smartphone,
  FileText,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import NotificationSettings from "../../components/NotificationSettings";
import API, { resolveApiUrl } from "../../services/api";
import { THEME_PRESETS, THEME_TARGETS, DEFAULT_THEME, normalizeTheme, themeContrastWarnings, isHexColor, applyTheme } from "../../utils/theme";
import { useAuth } from "../../context/AuthContext";
import "../../styles/portalModule.css";

const SECTION_FIELDS = [
  { key: "home", label: "Home" },
  { key: "about", label: "About" },
  { key: "services", label: "Services" },
  { key: "news", label: "Newsroom" },
  { key: "events", label: "Events" },
  { key: "resources", label: "Resources" },
  { key: "chatbot", label: "Chatbot" },
  { key: "contact", label: "Contact" },
  { key: "footer", label: "Footer" },
  { key: "gallery", label: "Gallery" },
  { key: "privacy-policy", label: "Privacy Policy" },
  { key: "terms-conditions", label: "Terms & Conditions" },
  { key: "disclaimer", label: "Disclaimer" },
];

const EMPTY_SECTION = (section) => ({
  _id: "",
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

export default function SuperAdminSettings({ initialTab = "website" }) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const validTabs = ["website", "carousel", "leaders", "gallery", "constitution", "system", "settings", "notifications"];
  const initialTabValue = validTabs.includes(requestedTab) ? requestedTab : (validTabs.includes(initialTab) ? initialTab : "website");
  const [activeTab, setActiveTab] = useState(initialTabValue);
  const [sections, setSections] = useState(() =>
    Object.fromEntries(SECTION_FIELDS.map((item) => [item.key, EMPTY_SECTION(item.key)]))
  );
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [themeTarget, setThemeTarget] = useState("primary");
  const [systemSettings, setSystemSettings] = useState(null);
  const [systemForm, setSystemForm] = useState({
    organization: { name:"", legalName:"", email:"", phone:"", address:"", location:"", officeHours:"", logo:"", favicon:"", socialChannels:{ whatsapp:"", instagram:"", facebook:"", x:"", website:"" } },
    website: { siteTitle:"", subtitle:"", seoDescription:"", footer:"", publicContactInformation:"" },
    scheme: { monthlyContribution:"", gracePeriodDays:"", minimumBookBalance:"", maintenanceMode:false },
    support: { funeral:{enabled:null}, medical:{enabled:null}, education:{enabled:null} },
    mpesa: { manualPaybill:"", manualAccountReference:"", displayLabel:"M-PESA", manualPaymentEnabled:false, stkEnabled:false, environment:"production", operationalShortcode:"", operationalStatus:"unknown" },
    branding: { ...DEFAULT_THEME, accentColor:DEFAULT_THEME.primary, secondaryColor:DEFAULT_THEME.secondary, logoUrl:"", faviconUrl:"" },
    homepage: { showCarousel:true, showLeaders:true, showPolicies:true },
    notificationReadiness: { browserPushEnabled:false },
    featureToggles: {},
  });
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemUpdatedAt, setSystemUpdatedAt] = useState(null);
  const [slides, setSlides] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [galleryDraft, setGalleryDraft] = useState({ title: "", caption: "", altText: "" });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");
  const [savingCarousel, setSavingCarousel] = useState(false);
  const [savingLeader, setSavingLeader] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewKey, setPreviewKey] = useState("");
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
        const [websiteRes, carouselRes, leadersRes, galleryRes, systemRes] = await Promise.allSettled([
          API.get("/website/manage"),
          API.get("/carousel/manage"),
          API.get("/leaders/manage"),
          API.get("/website/gallery"),
          API.get("/superadmin/settings"),
        ]);

        if (!active) return;

        if (websiteRes.status === "fulfilled") {
          const rows = Array.isArray(websiteRes.value.data?.content) ? websiteRes.value.data.content : [];
          const nextSections = Object.fromEntries(SECTION_FIELDS.map((item) => [item.key, EMPTY_SECTION(item.key)]));
          rows.forEach((row) => {
            if (!row?.section || !nextSections[row.section]) return;
            nextSections[row.section] = {
              _id: row._id || row.id || "",
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

        if (systemRes?.status === "fulfilled") {
          const safe = systemRes.value.data?.settings || {};
          const next = {
            organization: { ...systemForm.organization, ...(safe.organization || {}), socialChannels: { ...systemForm.organization.socialChannels, ...(safe.organization?.socialChannels || {}) } },
            website: { ...systemForm.website, ...(safe.website || {}) },
            scheme: { ...systemForm.scheme, ...(safe.scheme || {}) },
            support: { ...systemForm.support, ...(safe.support || {}) },
            mpesa: { ...systemForm.mpesa, ...(safe.mpesa || {}) },
            branding: { ...systemForm.branding, ...(safe.branding || {}) },
            homepage: { ...systemForm.homepage, ...(safe.homepage || {}) },
            notificationReadiness: { ...systemForm.notificationReadiness, ...(safe.notificationReadiness || {}) },
            featureToggles: safe.featureToggles || {},
          };
          setSystemSettings(safe);
          setSystemForm(next);
          setSystemUpdatedAt(safe.updatedAt || null);
          setTheme(normalizeTheme(safe.branding || {}));
        }

        if (carouselRes.status === "fulfilled") {
          setSlides(Array.isArray(carouselRes.value.data) ? carouselRes.value.data : []);
        }

        if (leadersRes.status === "fulfilled") {
          setLeaders(Array.isArray(leadersRes.value.data) ? leadersRes.value.data : []);
        }

        if (galleryRes.status === "fulfilled") {
          const section = galleryRes.value.data?.section || {};
          const configuredItems = section?.content?.galleryItems;
          if (Array.isArray(configuredItems) && configuredItems.length) {
            setGallery(configuredItems.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
          } else {
            const images = section?.images || galleryRes.value.data?.gallery || [];
            setGallery(Array.isArray(images) ? images.map((url, index) => ({ id: `legacy-${index}`, url, title: "", caption: "", altText: "Benevolent MIDAX community moment", published: true, order: index })) : []);
          }
        }
        const failures = [
          [websiteRes, "website content"], [carouselRes, "carousel"], [leadersRes, "leaders"],
          [galleryRes, "gallery"], [systemRes, "system settings"],
        ].filter(([result]) => result.status === "rejected").map(([, label]) => label);
        if (failures.length) setError(`Unable to load ${failures.join(", ")}. Loaded sections remain visible, but failed sections were not replaced with fake data.`);
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
        content: { body: item.content },
      };

      const request = item._id
        ? API.put(`/website/${key}`, payload)
        : API.post("/website", { section: key, ...payload });
      const { data } = await request;
      const saved = data?.section;
      if (saved) {
        setSections((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            _id: saved._id || prev[key]?._id || "",
            title: saved.title ?? prev[key]?.title ?? "",
            subtitle: saved.subtitle ?? prev[key]?.subtitle ?? "",
            description: saved.description ?? prev[key]?.description ?? "",
            content: normalizeContent(saved.content),
            published: saved.published !== false,
          },
        }));
      }
      setMessage(data?.message || (item.published ? "Section saved and published." : "Section saved as a draft."));
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save section.");
    } finally {
      setSavingKey("");
    }
  };

  const patchSystem = (group, patch) => setSystemForm((prev) => ({ ...prev, [group]: { ...prev[group], ...patch } }));
  const saveSystemSettings = async () => {
    try {
      setSystemSaving(true); setError(""); setMessage("");
      const payload = { ...systemForm, scheme: { ...systemForm.scheme,
        monthlyContribution: systemForm.scheme.monthlyContribution === "" ? null : Number(systemForm.scheme.monthlyContribution),
        gracePeriodDays: systemForm.scheme.gracePeriodDays === "" ? null : Number(systemForm.scheme.gracePeriodDays),
        minimumBookBalance: systemForm.scheme.minimumBookBalance === "" ? null : Number(systemForm.scheme.minimumBookBalance),
      }};
      const { data } = await API.put("/superadmin/settings", payload);
      setSystemSettings(data?.settings || null); setSystemUpdatedAt(data?.updatedAt || null);
      setSystemForm((prev) => ({ ...prev, ...(data?.settings || {}) }));
      setTheme(normalizeTheme(data?.settings?.branding || {}));
      setMessage(data?.message || "System settings saved.");
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to save system settings."); }
    finally { setSystemSaving(false); }
  };

  const saveTheme = async () => {
    try {
      setSystemSaving(true); setError(""); setMessage("");
      if (!theme || !THEME_PRESETS.some((preset) => preset.key === theme.preset) && !String(theme.preset || "").startsWith("custom")) setTheme((current) => normalizeTheme(current));
      const branding = { ...normalizeTheme(theme), accentColor: theme.primary, secondaryColor: theme.secondary };
      const warnings = themeContrastWarnings(branding);
      if (warnings.length) {
        setError(`Theme contrast needs attention: ${warnings.map((warning) => `${warning.label} (${warning.ratio.toFixed(2)}:1)`).join(", ")}.`);
        return;
      }
      const { data } = await API.put("/superadmin/settings", { branding });
      const saved = normalizeTheme(data?.settings?.branding || branding);
      setTheme(saved);
      setSystemSettings(data?.settings || null); setSystemUpdatedAt(data?.updatedAt || null);
      setSystemForm((prev) => ({ ...prev, ...(data?.settings || {}), branding: { ...prev.branding, ...(data?.settings?.branding || {}) } }));
      applyTheme(saved);
      setMessage("Brand and theme saved to the authoritative system settings.");
    } catch (err) { setError(err.response?.data?.message || err.message || "Unable to save theme."); }
    finally { setSystemSaving(false); }
  };

  const updateThemeTarget = (value) => {
    if (!isHexColor(value)) return;
    setTheme((current) => normalizeTheme({ ...current, [themeTarget]: value, preset: "custom" }));
    applyTheme({ ...theme, [themeTarget]: value, preset: "custom" });
  };

  const selectThemePreset = (preset) => {
    const next = normalizeTheme({ ...preset, header: preset.secondary, sidebar: preset.secondary, buttons: preset.primary, links: preset.primary });
    setTheme(next);
    applyTheme(next);
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
    if (!await confirmAction("Archive this carousel slide from the public website? The stored record will be retained.")) return;
    try {
      setError("");
      const { data } = await API.delete(`/carousel/${slideId}`);
      if (data?.slide) setSlides((prev) => prev.map((slide) => (slide._id === slideId ? data.slide : slide)));
      else setSlides((prev) => prev.map((slide) => slide._id === slideId ? { ...slide, isActive: false } : slide));
      setMessage("Carousel slide archived.");
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
      form.append("title", galleryDraft.title.trim());
      form.append("caption", galleryDraft.caption.trim());
      form.append("altText", galleryDraft.altText.trim());
      const { data } = await API.post("/website/gallery/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const items = data?.section?.content?.galleryItems || [];
      if (Array.isArray(items)) setGallery(items.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
      setGalleryFile(null);
      setGalleryDraft({ title: "", caption: "", altText: "" });
      setMessage("Gallery image uploaded and published to the public gallery.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to upload gallery image.");
    } finally {
      setSavingGallery(false);
    }
  };

  const updateGalleryItem = async (itemId, patch) => {
    try {
      setError("");
      const { data } = await API.patch(`/website/gallery/items/${itemId}`, patch);
      const items = data?.section?.content?.galleryItems;
      if (Array.isArray(items)) setGallery(items.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
      setMessage("Gallery item updated.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to update gallery item.");
    }
  };

  const archiveGalleryItem = async (itemId) => {
    if (!await confirmAction("Archive this gallery item from the public website? The stored media will be retained.")) return;
    try {
      setError("");
      const { data } = await API.delete(`/website/gallery/items/${itemId}`);
      const items = data?.section?.content?.galleryItems;
      if (Array.isArray(items)) setGallery(items.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
      setMessage("Gallery item archived from the public website.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to archive gallery item.");
    }
  };

  const moveGalleryItem = async (itemId, direction) => {
    const current = gallery.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const index = current.findIndex((item) => item.id === itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    [current[index], current[target]] = [current[target], current[index]];
    const items = current.map((item, order) => ({ id: item.id, order }));
    try {
      setError("");
      const { data } = await API.patch("/website/gallery/items/reorder", { items });
      const next = data?.section?.content?.galleryItems;
      if (Array.isArray(next)) setGallery(next.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)));
      setMessage("Gallery order saved.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to save gallery order.");
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
      form.append("isActive", String(leaderDraft.isActive !== false));
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
    if (!await confirmAction("Archive this leader from the public website? The stored record will be retained.")) return;
    try {
      setError("");
      const { data } = await API.delete(`/leaders/${leaderId}`);
      if (data?.leader) setLeaders((prev) => prev.map((item) => (item._id === leaderId ? data.leader : item)));
      else setLeaders((prev) => prev.map((item) => item._id === leaderId ? { ...item, isActive: false } : item));
      setMessage("Leader archived.");
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
            <h1>Website Manager content studio</h1>
            <p>See what the public website contains, then edit pages, leaders, gallery images and theme settings from one place.</p>
          </div>
          <nav className="settings-tab-groups" aria-label="Website management areas">
            <div className="settings-tab-group"><span>WEBSITE CONTENT</span><button type="button" className={activeTab === "website" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("website")}>Pages</button></div>
            <div className="settings-tab-group"><span>MEDIA</span><button type="button" className={activeTab === "carousel" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("carousel")}>Carousel</button><button type="button" className={activeTab === "leaders" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("leaders")}>Leaders</button><button type="button" className={activeTab === "gallery" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("gallery")}>Gallery</button></div>
            <div className="settings-tab-group"><span>BRANDING & CONFIG</span><button type="button" className={activeTab === "settings" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("settings")}>Branding</button><button type="button" className={activeTab === "system" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("system")}>Configuration</button></div>
            <div className="settings-tab-group"><span>SCHEME SYSTEM</span><button type="button" className={activeTab === "constitution" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("constitution")}>Constitution</button><button type="button" className={activeTab === "notifications" ? "portal-btn" : "portal-btn light"} onClick={() => setActiveTab("notifications")}>Notifications</button></div>
          </nav>
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
                Use Pages for published website copy, Media for visual content, Branding for public presentation and Configuration for authoritative organization/scheme settings. Detailed governance tools remain in their dedicated SuperAdmin modules.
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
                {SECTION_FIELDS.map((item) => (
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

                    <div className="portal-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
                      <label className="portal-field" style={{ margin: 0, minWidth: 180 }}>
                        <span>Publication</span>
                        <select value={sections[item.key]?.published === false ? "draft" : "published"} onChange={(e) => patchSection(item.key, { published: e.target.value === "published" })}>
                          <option value="published">Published</option>
                          <option value="draft">Draft / unpublished</option>
                        </select>
                      </label>
                      <div className="portal-actions">
                        <button type="button" className="portal-btn light" onClick={() => setPreviewKey(item.key)}>Preview</button>
                        <button type="button" className="portal-btn" onClick={() => saveSection(item.key)} disabled={savingKey === item.key}>
                          <Save size={16} /> {savingKey === item.key ? "Saving..." : sections[item.key]?.published === false ? "Save draft" : "Save & publish"}
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            )}

            {previewKey && activeTab === "website" && (
              <section className="portal-panel" style={{ marginTop: 16 }} aria-live="polite">
                <div className="portal-section-title">
                  <Eye size={20} />
                  <div><span>DRAFT PREVIEW</span><h2>{sections[previewKey]?.title || previewKey}</h2><small>{sections[previewKey]?.published === false ? "Draft / unpublished" : "Published"}</small></div>
                </div>
                <div style={{ display: "grid", gap: 10, padding: "8px 0" }}>
                  {sections[previewKey]?.subtitle && <p style={{ margin: 0, fontWeight: 700 }}>{sections[previewKey].subtitle}</p>}
                  {sections[previewKey]?.description && <p style={{ margin: 0, lineHeight: 1.7 }}>{sections[previewKey].description}</p>}
                  {sections[previewKey]?.content && <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.75, borderTop: "1px solid #eee", paddingTop: 12 }}>{sections[previewKey].content}</div>}
                </div>
                <div className="portal-actions"><button type="button" className="portal-btn light" onClick={() => setPreviewKey("")}>Close preview</button></div>
              </section>
            )}

            {activeTab === "system" && (
              <div className="portal-grid">
                <section className="portal-panel">
                  <div className="portal-section-title"><Settings2 size={20}/><div><span>AUTHORITATIVE CONFIGURATION</span><h2>Organization</h2><small>Stored in the SystemSettings singleton. {systemUpdatedAt ? `Last updated ${new Date(systemUpdatedAt).toLocaleString()}.` : "Not yet updated."}</small></div></div>
                  <div className="portal-form-grid">
                    {[["name","Display name"],["legalName","Legal name"],["email","Email"],["phone","Phone"],["address","Address"],["location","Location"],["officeHours","Office hours"],["logo","Logo URL"],["favicon","Favicon URL"]].map(([key,label])=><label className="portal-field" key={key}><span>{label}</span><input value={systemForm.organization[key]||""} onChange={(e)=>patchSystem("organization",{[key]:e.target.value})}/></label>)}
                    <label className="portal-field"><span>WhatsApp</span><input value={systemForm.organization.socialChannels?.whatsapp||""} onChange={(e)=>patchSystem("organization",{socialChannels:{...systemForm.organization.socialChannels,whatsapp:e.target.value}})}/></label>
                  </div>
                </section>
                <section className="portal-panel">
                  <div className="portal-section-title"><Check size={20}/><div><span>WEBSITE / SCHEME</span><h2>Public website and contribution rules</h2></div></div>
                  <div className="portal-form-grid">
                    {[["siteTitle","Site title"],["subtitle","Subtitle"],["seoDescription","SEO description"],["footer","Footer"],["publicContactInformation","Public contact information"]].map(([key,label])=><label className="portal-field" key={key}><span>{label}</span><input value={systemForm.website[key]||""} onChange={(e)=>patchSystem("website",{[key]:e.target.value})}/></label>)}
                    {[["monthlyContribution","Monthly contribution"],["gracePeriodDays","Grace period (days)"],["minimumBookBalance","Minimum book balance"]].map(([key,label])=><label className="portal-field" key={key}><span>{label}</span><input type="number" min="0" value={systemForm.scheme[key] ?? ""} placeholder="Not configured" onChange={(e)=>patchSystem("scheme",{[key]:e.target.value})}/></label>)}
                    <label className="portal-field"><span>Maintenance mode</span><input type="checkbox" checked={Boolean(systemForm.scheme.maintenanceMode)} onChange={(e)=>patchSystem("scheme",{maintenanceMode:e.target.checked})}/></label>
                  </div>
                </section>
                <section className="portal-panel"><div className="portal-section-title"><ShieldCheck size={20}/><div><span>SUPPORT POLICIES</span><h2>Benefit availability flags</h2><small>Detailed amounts and repayment rules are managed in Policy Administration.</small></div></div><div className="portal-form-grid">{[["funeral","Funeral support"],["medical","Medical support"],["education","Education policy"]].map(([key,label])=><label className="portal-field" key={key}><span>{label}</span><select value={systemForm.support[key]?.enabled===null?"":systemForm.support[key]?.enabled?"true":"false"} onChange={(e)=>patchSystem("support",{[key]:{enabled:e.target.value===""?null:e.target.value==="true"}})}><option value="">Use policy/default</option><option value="true">Enabled</option><option value="false">Disabled</option></select></label>)}</div></section>
                <section className="portal-panel"><div className="portal-section-title"><Smartphone size={20}/><div><span>SAFE M-PESA CONFIGURATION</span><h2>Manual collection and operational status</h2><small>Only non-secret business configuration is stored here. Daraja secrets remain deployment environment variables.</small></div></div><div className="portal-form-grid"><label className="portal-field"><span>PayBill</span><input inputMode="numeric" value={systemForm.mpesa.manualPaybill||""} onChange={(e)=>patchSystem("mpesa",{manualPaybill:e.target.value.replace(/\D/g,"")})}/></label><label className="portal-field"><span>Account / reference</span><input value={systemForm.mpesa.manualAccountReference||""} onChange={(e)=>patchSystem("mpesa",{manualAccountReference:e.target.value})}/></label><label className="portal-field"><span>Display label</span><input value={systemForm.mpesa.displayLabel||""} onChange={(e)=>patchSystem("mpesa",{displayLabel:e.target.value})}/></label><label className="portal-field"><span>Environment</span><select value={systemForm.mpesa.environment||"production"} onChange={(e)=>patchSystem("mpesa",{environment:e.target.value})}><option value="production">Production</option><option value="sandbox">Sandbox</option><option value="unknown">Unknown</option></select></label><label className="portal-field"><span>Operational shortcode</span><input value={systemForm.mpesa.operationalShortcode||""} onChange={(e)=>patchSystem("mpesa",{operationalShortcode:e.target.value})}/></label><label className="portal-field"><span>Operational status</span><select value={systemForm.mpesa.operationalStatus||"unknown"} onChange={(e)=>patchSystem("mpesa",{operationalStatus:e.target.value})}><option>unknown</option><option>ready</option><option>not-configured</option><option>degraded</option></select></label><label className="portal-field"><span>Manual payment enabled</span><input type="checkbox" checked={Boolean(systemForm.mpesa.manualPaymentEnabled)} onChange={(e)=>patchSystem("mpesa",{manualPaymentEnabled:e.target.checked})}/></label><label className="portal-field"><span>STK enabled</span><input type="checkbox" checked={Boolean(systemForm.mpesa.stkEnabled)} onChange={(e)=>patchSystem("mpesa",{stkEnabled:e.target.checked})}/></label></div></section>
                <section className="portal-panel"><div className="portal-section-title"><Palette size={20}/><div><span>THEME / HOMEPAGE / NOTIFICATIONS</span><h2>Presentation and readiness</h2></div></div><div className="portal-form-grid"><label className="portal-field"><span>Accent color</span><input type="text" value={systemForm.branding.accentColor||""} onChange={(e)=>patchSystem("branding",{accentColor:e.target.value})}/></label><label className="portal-field"><span>Secondary color</span><input type="text" value={systemForm.branding.secondaryColor||""} onChange={(e)=>patchSystem("branding",{secondaryColor:e.target.value})}/></label>{[["showCarousel","Show carousel"],["showLeaders","Show leaders"],["showPolicies","Show policies"]].map(([key,label])=><label className="portal-field" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(systemForm.homepage[key])} onChange={(e)=>setSystemForm(p=>({...p,homepage:{...p.homepage,[key]:e.target.checked}}))}/></label>)}{[["browserPushEnabled","Browser push"]].map(([key,label])=><label className="portal-field" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(systemForm.notificationReadiness[key])} onChange={(e)=>setSystemForm(p=>({...p,notificationReadiness:{...p.notificationReadiness,[key]:e.target.checked}}))}/></label>)}</div></section>
                <section className="portal-panel"><div className="portal-section-title"><FileText size={20}/><div><span>CONTROL CONSOLE INDEX</span><h2>Related authoritative modules</h2></div></div><div className="portal-card-grid">{[["Policy Administration","Manage create/edit/delete/enable/disable and policy rules.","/superadmin/policies"],["Leaders","Manage live leadership records.","/superadmin/leaders"],["Gallery","Manage live gallery records.","/superadmin/settings"],["Constitution","Manage the published document/version.","/superadmin/settings"],["News & events","Manage published updates and activities.","/superadmin/news"],["Assistant","Published content/settings feed assistant context.","/superadmin/settings"],["Notifications","Manage push/readiness controls.","/superadmin/settings"],["System health","Review dependency readiness.","/superadmin/settings"]].map(([title,desc,to])=><Link key={title} className="portal-panel" to={to} style={{margin:0}}><strong>{title}</strong><p>{desc}</p></Link>)}</div></section>
                <div className="portal-actions"><button type="button" className="portal-btn" onClick={saveSystemSettings} disabled={systemSaving}><Save size={16}/> {systemSaving?"Saving…":"Save system settings"}</button></div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="portal-grid brand-theme-studio">
                <section className="portal-panel">
                  <div className="portal-section-title"><Palette size={20}/><div><span>BRAND & THEME STUDIO</span><h2>Visual theme control</h2><p>Choose a preset or customize a semantic color target. Changes preview live before they are saved.</p></div></div>
                  <div className="theme-grid">
                    {THEME_PRESETS.map((preset) => <button key={preset.key} type="button" className={theme.preset === preset.key ? "theme-swatch selected" : "theme-swatch"} onClick={() => selectThemePreset(preset)}><span style={{ background:preset.primary }} /><strong>{preset.name}</strong><small>{preset.primary}</small></button>)}
                  </div>
                  <div className="portal-form-grid theme-controls">
                    <label className="portal-field"><span>Color target</span><select value={themeTarget} onChange={(e)=>setThemeTarget(e.target.value)}>{THEME_TARGETS.map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
                    <label className="portal-field"><span>HEX color</span><div className="theme-color-input"><input type="color" value={isHexColor(theme[themeTarget]) ? theme[themeTarget] : DEFAULT_THEME[themeTarget] || DEFAULT_THEME.primary} onChange={(e)=>updateThemeTarget(e.target.value)} aria-label={`Choose ${themeTarget} color`} /><input type="text" value={theme[themeTarget] || ""} onChange={(e)=>{ const value=e.target.value.trim(); setTheme((current)=>({ ...current, [themeTarget]:value, preset:"custom" })); }} onBlur={()=>updateThemeTarget(theme[themeTarget])} aria-label={`${themeTarget} HEX color`} placeholder="#000000" /></div></label>
                  </div>
                  <div className="theme-target-grid">{THEME_TARGETS.map(([key,label])=><button key={key} type="button" className={themeTarget===key?"theme-target active":"theme-target"} onClick={()=>setThemeTarget(key)}><span style={{ background:isHexColor(theme[key]) ? theme[key] : DEFAULT_THEME.primary }}></span><strong>{label}</strong><small>{theme[key] || "—"}</small></button>)}</div>
                  {themeContrastWarnings(theme).length > 0 && <div className="portal-alert warning" role="alert">Some text/background combinations do not meet the recommended contrast ratio. Adjust the related colors before saving.</div>}
                  <div className="theme-live-preview">
                    <div className="theme-preview-header" style={{background:theme.header,color:theme.text}}><strong>Benevolent MIDAX</strong><span>Header preview</span></div>
                    <div className="theme-preview-body" style={{background:theme.background,color:theme.text}}><aside style={{background:theme.sidebar,color:theme.text}}>Sidebar</aside><div className="theme-preview-content"><div className="theme-preview-card" style={{background:theme.surface,borderColor:theme.border}}><h3 style={{color:theme.text}}>Portal sample</h3><p style={{color:theme.mutedText}}>Cards, forms, tables and public content inherit the same semantic theme.</p><button type="button" style={{background:theme.buttons,color:theme.surface,borderColor:theme.buttons}}>Primary action</button><span className="theme-preview-link" style={{color:theme.links}}>Example link</span></div><div className="theme-preview-card" style={{background:theme.elevatedSurface,borderColor:theme.border}}><strong style={{color:theme.text}}>Status</strong><div className="theme-preview-statuses"><span style={{background:theme.success}}>Success</span><span style={{background:theme.warning}}>Warning</span><span style={{background:theme.danger}}>Danger</span></div></div></div></div>
                  </div>
                  <div className="portal-actions"><button className="portal-btn" type="button" onClick={saveTheme} disabled={systemSaving}><Save size={16}/> {systemSaving ? "Saving…" : "Apply & save theme"}</button><button className="portal-btn light" type="button" onClick={()=>selectThemePreset(DEFAULT_THEME)} disabled={systemSaving}><RefreshCw size={16}/> Reset to orange</button></div>
                </section>
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
                              <div className="portal-field">
                                <label>Visibility</label>
                                <select value={slide.isActive === false ? "archived" : "active"} onChange={(e) => setSlides((prev) => prev.map((x) => x._id === slide._id ? { ...x, isActive: e.target.value === "active" } : x))}>
                                  <option value="active">Active / published</option>
                                  <option value="archived">Archived / hidden</option>
                                </select>
                              </div>
                            </div>
                            <span className={`portal-badge ${slide.isActive === false ? "rejected" : "approved"}`}>{slide.isActive === false ? "Archived / hidden" : "Active / published"}</span>
                            <div className="portal-actions">
                              <button className="portal-btn" type="button" onClick={() => updateSlide(slide._id, slide)}>Save</button>
                              <button className="portal-btn danger" type="button" onClick={() => deleteSlide(slide._id)}>
                                <Trash2 size={16} /> Archive
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
                    <div className="portal-field">
                      <label>Visibility</label>
                      <select value={leaderDraft.isActive === false ? "archived" : "active"} onChange={(e) => setLeaderDraft((p) => ({ ...p, isActive: e.target.value === "active" }))}>
                        <option value="active">Active / published</option>
                        <option value="archived">Archived / hidden</option>
                      </select>
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
                            <span className={`portal-badge ${leader.isActive === false ? "rejected" : "approved"}`}>{leader.isActive === false ? "Archived / hidden" : "Active / published"}</span>
                            <div className="portal-actions">
                              <button className="portal-btn" type="button" onClick={() => editLeader(leader)}>Edit</button>
                              <button className="portal-btn danger" type="button" onClick={() => deleteLeader(leader._id)}>
                                <Trash2 size={16} /> Archive
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
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => setGalleryFile(e.target.files?.[0] || null)} required />
                    </div>
                    <label className="portal-field"><span>Title</span><input type="text" value={galleryDraft.title} onChange={(e) => setGalleryDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Optional title" maxLength={180} /></label>
                    <label className="portal-field"><span>Caption</span><input type="text" value={galleryDraft.caption} onChange={(e) => setGalleryDraft((prev) => ({ ...prev, caption: e.target.value }))} placeholder="Optional caption" maxLength={300} /></label>
                    <label className="portal-field" style={{ gridColumn: "1 / -1" }}><span>Alt text</span><input type="text" value={galleryDraft.altText} onChange={(e) => setGalleryDraft((prev) => ({ ...prev, altText: e.target.value }))} placeholder="Describe the image for accessibility" maxLength={180} /></label>
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
                      {gallery.map((item, index) => (
                        <article key={item.id || `${item.url}-${index}`} className="portal-panel" style={{ padding: 12, marginBottom: 0 }}>
                          <img src={normalizeImagePath(item.url)} alt={item.altText || `Gallery ${index + 1}`} style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 14 }} />
                          <div className="portal-form-grid" style={{ marginTop: 12 }}>
                            <label className="portal-field"><span>Title</span><input value={item.title || ""} onChange={(e) => setGallery((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, title: e.target.value } : entry))} /></label>
                            <label className="portal-field"><span>Caption</span><input value={item.caption || ""} onChange={(e) => setGallery((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, caption: e.target.value } : entry))} /></label>
                            <label className="portal-field" style={{ gridColumn: "1 / -1" }}><span>Alt text</span><input value={item.altText || ""} onChange={(e) => setGallery((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, altText: e.target.value } : entry))} /></label>
                          </div>
                          <div className="portal-actions" style={{ marginTop: 10, flexWrap: "wrap" }}>
                            <label className="portal-field" style={{ margin: 0, minWidth: 160 }}><span>Published</span><input type="checkbox" checked={item.published !== false} onChange={(e) => setGallery((prev) => prev.map((entry) => entry.id === item.id ? { ...entry, published: e.target.checked } : entry))} /></label>
                            <button type="button" className="portal-btn light" onClick={() => moveGalleryItem(item.id, -1)} disabled={index === 0}>↑ Move up</button>
                            <button type="button" className="portal-btn light" onClick={() => moveGalleryItem(item.id, 1)} disabled={index === gallery.length - 1}>↓ Move down</button>
                            <button type="button" className="portal-btn" onClick={() => { const current = gallery.find((entry) => entry.id === item.id); updateGalleryItem(item.id, { title: current?.title || "", caption: current?.caption || "", altText: current?.altText || "", published: current?.published !== false }); }}>
                              <Save size={15} /> Save
                            </button>
                            <button type="button" className="portal-btn danger" onClick={() => archiveGalleryItem(item.id)}><Trash2 size={15} /> Archive</button>
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
            Signed in as <strong>{user?.fullName || user?.name || "Super Administrator"}</strong> ({roleLabel}). Carousel, leader and gallery uploads are stored securely and served through permanent URLs. Gallery metadata, ordering and publication state are also managed here; archiving removes an image from the public site without deleting its stored media.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
