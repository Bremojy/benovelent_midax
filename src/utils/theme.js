export const THEME_PRESETS = [
  { name: "Orange", key: "orange", primary: "#c2410c", secondary: "#9a3412", background: "#fffaf5", surface: "#ffffff", elevatedSurface: "#fff7ed", text: "#1f2937", mutedText: "#667085", border: "#e5e7eb", focus: "#fb923c", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Blue", key: "blue", primary: "#2563eb", secondary: "#1d4ed8", background: "#f7faff", surface: "#ffffff", elevatedSurface: "#eff6ff", text: "#172033", mutedText: "#667085", border: "#dbe3f0", focus: "#60a5fa", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Green", key: "green", primary: "#15803d", secondary: "#166534", background: "#f6fff8", surface: "#ffffff", elevatedSurface: "#ecfdf3", text: "#163020", mutedText: "#667085", border: "#d7eadc", focus: "#4ade80", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Violet", key: "violet", primary: "#7c3aed", secondary: "#6d28d9", background: "#fbf9ff", surface: "#ffffff", elevatedSurface: "#f5f3ff", text: "#241b3b", mutedText: "#667085", border: "#e5dff7", focus: "#a78bfa", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Red", key: "red", primary: "#dc2626", secondary: "#b91c1c", background: "#fff8f8", surface: "#ffffff", elevatedSurface: "#fef2f2", text: "#2b1717", mutedText: "#667085", border: "#f0d9d9", focus: "#f87171", success: "#15803d", warning: "#b45309", danger: "#991b1b" },
  { name: "Rose", key: "rose", primary: "#e11d48", secondary: "#be123c", background: "#fff8fa", surface: "#ffffff", elevatedSurface: "#fff1f2", text: "#2b1520", mutedText: "#667085", border: "#f1d9df", focus: "#fb7185", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Amber", key: "amber", primary: "#92400e", secondary: "#78350f", background: "#fffaf2", surface: "#ffffff", elevatedSurface: "#fffbeb", text: "#2d2110", mutedText: "#667085", border: "#eadfca", focus: "#fbbf24", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Teal", key: "teal", primary: "#0f766e", secondary: "#115e59", background: "#f4fffd", surface: "#ffffff", elevatedSurface: "#f0fdfa", text: "#10302e", mutedText: "#667085", border: "#d4e7e5", focus: "#2dd4bf", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Cyan", key: "cyan", primary: "#0e7490", secondary: "#155e75", background: "#f4fdff", surface: "#ffffff", elevatedSurface: "#ecfeff", text: "#102c33", mutedText: "#667085", border: "#d4e5ea", focus: "#22d3ee", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Indigo", key: "indigo", primary: "#4f46e5", secondary: "#4338ca", background: "#f8f9ff", surface: "#ffffff", elevatedSurface: "#eef2ff", text: "#1b1d3b", mutedText: "#667085", border: "#dde1f6", focus: "#818cf8", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Navy", key: "navy", primary: "#1e3a8a", secondary: "#172554", background: "#f7f9fc", surface: "#ffffff", elevatedSurface: "#eff6ff", text: "#14213d", mutedText: "#667085", border: "#d8dfeb", focus: "#60a5fa", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Emerald", key: "emerald", primary: "#047857", secondary: "#065f46", background: "#f4fffb", surface: "#ffffff", elevatedSurface: "#ecfdf5", text: "#123029", mutedText: "#667085", border: "#d2e9df", focus: "#34d399", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Slate", key: "slate", primary: "#475569", secondary: "#334155", background: "#f8fafc", surface: "#ffffff", elevatedSurface: "#f1f5f9", text: "#0f172a", mutedText: "#64748b", border: "#dbe2ea", focus: "#94a3b8", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Neutral", key: "neutral", primary: "#404040", secondary: "#262626", background: "#fafafa", surface: "#ffffff", elevatedSurface: "#f5f5f5", text: "#171717", mutedText: "#737373", border: "#e5e5e5", focus: "#737373", success: "#15803d", warning: "#b45309", danger: "#b91c1c" },
  { name: "Dark modern", key: "dark", primary: "#f59e0b", secondary: "#f97316", background: "#0f172a", surface: "#111827", elevatedSurface: "#1f2937", text: "#f8fafc", mutedText: "#cbd5e1", border: "#334155", focus: "#fbbf24", success: "#4ade80", warning: "#fbbf24", danger: "#f87171" },
];

export const THEME_TARGETS = [
  ["primary", "Primary / accent"], ["secondary", "Secondary"], ["background", "Page background"], ["surface", "Surface"],
  ["elevatedSurface", "Elevated surface"], ["text", "Heading / body text"], ["mutedText", "Muted text"], ["border", "Border"],
  ["focus", "Focus ring"], ["success", "Success"], ["warning", "Warning"], ["danger", "Danger"], ["header", "Header"],
  ["sidebar", "Sidebar"], ["buttons", "Buttons"], ["links", "Links"],
];

export const DEFAULT_THEME = { ...THEME_PRESETS[0], header: THEME_PRESETS[0].secondary, sidebar: THEME_PRESETS[0].secondary, buttons: THEME_PRESETS[0].primary, links: THEME_PRESETS[0].primary };

export const isHexColor = (value) => /^#[0-9a-fA-F]{6}$/.test(String(value || "").trim());

function channel(hex, start) { return parseInt(hex.slice(start, start + 2), 16) / 255; }
function linear(v) { return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }
export function contrastRatio(foreground, background) {
  if (!isHexColor(foreground) || !isHexColor(background)) return 0;
  const lum = (hex) => 0.2126 * linear(channel(hex, 1)) + 0.7152 * linear(channel(hex, 3)) + 0.0722 * linear(channel(hex, 5));
  const a = lum(foreground); const b = lum(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function normalizeTheme(branding = {}) {
  const merged = { ...DEFAULT_THEME, ...(branding || {}) };
  merged.primary = merged.primary || merged.accentColor || DEFAULT_THEME.primary;
  merged.secondary = merged.secondary || merged.secondaryColor || DEFAULT_THEME.secondary;
  merged.header = merged.header || merged.secondary;
  merged.sidebar = merged.sidebar || merged.secondary;
  merged.buttons = merged.buttons || merged.primary;
  merged.links = merged.links || merged.primary;
  merged.preset = merged.preset || "orange";
  return merged;
}

export function applyTheme(branding = {}) {
  if (typeof document === "undefined") return normalizeTheme(branding);
  const theme = normalizeTheme(branding);
  const root = document.documentElement;
  const values = {
    "--color-primary": theme.primary,
    "--color-primary-hover": theme.secondary,
    "--color-primary-soft": `${theme.primary}18`,
    "--color-secondary": theme.secondary,
    "--color-background": theme.background,
    "--color-surface": theme.surface,
    "--color-surface-elevated": theme.elevatedSurface,
    "--color-text": theme.text,
    "--color-text-muted": theme.mutedText,
    "--color-border": theme.border,
    "--color-focus": theme.focus,
    "--color-success": theme.success,
    "--color-warning": theme.warning,
    "--color-danger": theme.danger,
    "--color-header": theme.header,
    "--color-sidebar": theme.sidebar,
    "--color-buttons": theme.buttons,
    "--color-links": theme.links,
    // Backwards-compatible aliases for the current codebase.
    "--orange": theme.primary,
    "--orange-dark": theme.secondary,
    "--portal-accent": theme.primary,
    "--portal-accent-soft": `${theme.primary}18`,
    "--portal-accent-2": theme.secondary,
    "--portal-soft": `${theme.primary}18`,
  };
  Object.entries(values).forEach(([key, value]) => root.style.setProperty(key, value));
  root.setAttribute("data-theme-preset", theme.preset || "custom");
  return theme;
}

export function themeContrastWarnings(theme) {
  const t = normalizeTheme(theme);
  const pairs = [["Body text / background", t.text, t.background], ["Body text / surface", t.text, t.surface], ["Muted text / surface", t.mutedText, t.surface], ["Primary / surface", t.primary, t.surface]];
  return pairs.filter(([, fg, bg]) => contrastRatio(fg, bg) < 4.5).map(([label, fg, bg]) => ({ label, ratio: contrastRatio(fg, bg), foreground: fg, background: bg }));
}
