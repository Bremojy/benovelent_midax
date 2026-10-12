import { getStatusVariant, statusIconography } from "../../config/iconography";

/** Accessible, consistently colored status label shared by workflow cards and tables. */
export default function StatusBadge({ status = "Unknown", className = "", label }) {
  const value = String(status || "Unknown").trim() || "Unknown";
  const variant = getStatusVariant(value);
  const Icon = statusIconography[variant]?.Icon || statusIconography.info.Icon;
  const legacyStatusClass = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <span className={`bene-status bene-status--${variant} status ${legacyStatusClass} ${className}`.trim()}>
      <Icon size={15} strokeWidth={2.25} aria-hidden="true" focusable="false" />
      <span>{label || value}</span>
    </span>
  );
}
