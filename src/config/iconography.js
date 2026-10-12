import {
  Home,
  Info,
  HandHeart,
  Newspaper,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Printer,
  Archive,
  Palette,
  Images,
  Send,
  History,
  Settings,
  LockKeyhole,
} from "lucide-react";

/** Shared icon vocabulary for BENEvolent MIDAX. Reuse the same icon for the same task. */
export const publicNavigationItems = [
  { label: "Home", path: "/", Icon: Home },
  { label: "About", path: "/about", Icon: Info },
  { label: "Services", path: "/services", Icon: HandHeart },
  { label: "News", path: "/news", Icon: Newspaper },
  { label: "Contact", path: "/contact", Icon: Phone },
];

export const statusIconography = {
  success: { Icon: CheckCircle2, label: "Successful" },
  pending: { Icon: Clock3, label: "Pending" },
  danger: { Icon: XCircle, label: "Unsuccessful" },
  warning: { Icon: AlertTriangle, label: "Attention required" },
  info: { Icon: HelpCircle, label: "Information" },
  neutral: { Icon: Archive, label: "Archived or inactive" },
};

export function getStatusVariant(status) {
  const value = String(status || "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
  if (/\b(approved|paid|completed|complete|verified|successful|accepted|active|settled|published|target reached)\b/.test(value)) return "success";
  if (/\b(rejected|failed|failure|cancelled|canceled|declined|denied|error|reversed)\b/.test(value)) return "danger";
  if (/\b(overdue|attention|warning|documents required|action required|expired)\b/.test(value)) return "warning";
  if (/\b(pending|under review|review|processing|initiated|partial|draft|disbursement)\b/.test(value)) return "pending";
  if (/\b(closed|archived|inactive|disabled)\b/.test(value)) return "neutral";
  return "info";
}

/** Shared semantic actions; use these instead of choosing unrelated icons per page. */
export const actionIconography = {
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  view: Eye,
  download: Download,
  upload: Upload,
  search: Search,
  print: Printer,
  archive: Archive,
  publish: Send,
  history: History,
  appearance: Palette,
  media: Images,
  settings: Settings,
  security: LockKeyhole,
};
