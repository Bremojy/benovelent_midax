import { Paperclip, Pencil, Trash2 } from "lucide-react";
import { resolveApiUrl } from "../../services/api";

const money = (v) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(v || 0));
const dt = (v) => v ? new Date(v).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function ConstitutionLedgerTable({ entries = [], canEdit = false, onEdit, onDelete }) {
  return <div className="portal-table-wrap"><table className="portal-table constitution-ledger-table"><thead><tr><th>Date</th><th>Contributor</th><th>Entry</th><th>Description</th><th>Money in</th><th>Money out</th><th>Balance</th>{canEdit && <th>Actions</th>}</tr></thead><tbody>
    {entries.length === 0 ? <tr><td colSpan={canEdit ? 8 : 7}>No constitution records in the selected date range.</td></tr> : entries.map((row) => <tr key={row._id}>
      <td>{dt(row.date)}</td>
      <td><strong>{row.contributorName || "—"}</strong><small>{row.contributorType === "admin" ? "Admin / Leader" : row.contributorType === "all" ? "All members & admins" : row.member?.memberNumber || "Member"}</small></td>
      <td>{String(row.type || "").replace(/_/g, " ")}<small>{row.category || row.paymentMethod || ""}</small></td>
      <td>{row.description || "—"}{row.attachment?.url && <a className="attachment-link" href={resolveApiUrl(row.attachment.url)} target="_blank" rel="noreferrer"><Paperclip size={14}/> {row.attachment.name || "Attachment"}</a>}</td>
      <td className="money-positive">{row.credit ? money(row.credit) : "—"}</td>
      <td className="money-negative">{row.debit ? money(row.debit) : "—"}</td>
      <td>{money(row.runningBalance)}</td>
      {canEdit && <td><div className="row-actions"><button className="icon-btn" title="Edit" onClick={() => onEdit?.(row)}><Pencil size={15}/></button><button className="icon-btn danger" title="Delete" onClick={() => onDelete?.(row)}><Trash2 size={15}/></button></div></td>}
    </tr>)}
  </tbody></table></div>;
}
