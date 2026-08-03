import { useEffect, useMemo, useState } from "react";
import { Upload, FileText, Eye, Download, Printer, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import API, { resolveApiUrl } from "../../services/api";

export default function SuperAdminConstitution() {
  const [fileInfo, setFileInfo] = useState({
    fileUrl: "/documents/benevolent-midax-constitution.pdf",
    fileName: "Benevolent Midax Constitution.pdf",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileUrl = useMemo(
    () => resolveApiUrl(fileInfo?.fileUrl || "/documents/benevolent-midax-constitution.pdf"),
    [fileInfo]
  );

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await API.get("/website/constitution");
        if (!active) return;
        const section = data?.section || {};
        const content = section?.content || data?.file || {};
        setFileInfo({
          fileUrl: content.fileUrl || "/documents/benevolent-midax-constitution.pdf",
          fileName: content.fileName || "Benevolent Midax Constitution.pdf",
        });
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || err.message || "Unable to load constitution file.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const saveFile = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      setError("Choose a PDF file first.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const { data } = await API.post("/website/constitution/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updated = data?.section?.content || {};
      setFileInfo({
        fileUrl: updated.fileUrl || data?.fileUrl || fileUrl,
        fileName: updated.fileName || selectedFile.name,
      });
      setSelectedFile(null);
      setMessage(data?.message || "Constitution file updated.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to upload constitution file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="portal-page">
        <div className="portal-header">
          <div>
            <span className="portal-kicker">SUPERADMIN CONTROL</span>
            <h1>Constitution Manager</h1>
            <p>Upload, view and publish the official constitution PDF used by the public website.</p>
          </div>
          <FileText size={36} />
        </div>

        {message && <div className="portal-success">{message}</div>}
        {error && <div className="portal-error">{error}</div>}

        <div className="portal-card">
          <div style={{ display: "grid", gap: 12 }}>
            <div><strong>Current file:</strong> {loading ? "Loading..." : fileInfo.fileName}</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="portal-btn primary" href={fileUrl} target="_blank" rel="noreferrer"><Eye size={16} /> View</a>
              <a className="portal-btn secondary" href={fileUrl} download><Download size={16} /> Download</a>
              <button type="button" className="portal-btn secondary" onClick={() => window.open(fileUrl, "_blank", "noopener,noreferrer")?.focus?.()}><Printer size={16} /> Print</button>
            </div>
          </div>

          <form onSubmit={saveFile} style={{ marginTop: 18, display: "grid", gap: 12 }}>
            <label className="portal-field">
              <span>Replace PDF file</span>
              <input type="file" accept="application/pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
            </label>
            <button className="portal-btn primary" type="submit" disabled={saving}>
              {saving ? <RefreshCw size={16} /> : <Upload size={16} />} {saving ? "Uploading..." : "Upload new constitution"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
