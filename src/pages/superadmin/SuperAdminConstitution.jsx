import { useEffect, useMemo, useState } from "react";
import { Upload, FileText, Eye, Download, Printer, RefreshCw, RotateCcw } from "lucide-react";
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
  const [currentVersion, setCurrentVersion] = useState(1);
  const [history, setHistory] = useState([]);
  const [restoringVersion, setRestoringVersion] = useState("");

  const fileUrl = useMemo(
    () => resolveApiUrl(fileInfo?.fileUrl || "/documents/benevolent-midax-constitution.pdf"),
    [fileInfo]
  );

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [{ data: publicData }, { data: managementData }] = await Promise.all([
          API.get("/website/constitution"),
          API.get("/website/constitution/manage"),
        ]);
        if (!active) return;
        const section = publicData?.section || {};
        const content = section?.content || publicData?.file || {};
        setFileInfo({
          fileUrl: content.fileUrl || "/documents/benevolent-midax-constitution.pdf",
          fileName: content.fileName || "Benevolent Midax Constitution.pdf",
        });
        setCurrentVersion(Number(managementData?.current?.version || content.version || 1));
        setHistory(Array.isArray(managementData?.history) ? managementData.history : []);
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
      setCurrentVersion(Number(data?.version || updated.version || currentVersion + 1));
      setSelectedFile(null);
      setMessage(data?.message || "Constitution file updated.");
      const { data: managementData } = await API.get("/website/constitution/manage");
      setHistory(Array.isArray(managementData?.history) ? managementData.history : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to upload constitution file.");
    } finally {
      setSaving(false);
    }
  };

  const restoreVersion = async (version) => {
    if (!window.confirm(`Restore Constitution version ${version}? The current published file will remain in version history.`)) return;
    try {
      setRestoringVersion(String(version));
      setError("");
      setMessage("");
      const { data } = await API.post(`/website/constitution/restore/${version}`);
      const current = data?.current || {};
      setCurrentVersion(Number(current.version || currentVersion));
      setFileInfo({
        fileUrl: current.fileUrl || fileInfo.fileUrl,
        fileName: current.fileName || fileInfo.fileName,
      });
      const { data: managementData } = await API.get("/website/constitution/manage");
      setHistory(Array.isArray(managementData?.history) ? managementData.history : []);
      setMessage(data?.message || `Constitution version ${version} restored.`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to restore the selected constitution version.");
    } finally {
      setRestoringVersion("");
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
            <div><strong>Current file:</strong> {loading ? "Loading..." : fileInfo.fileName} · <strong>Version {currentVersion}</strong></div>
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

        <div className="portal-card" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <strong>Version history</strong>
              <p style={{ margin: "4px 0 0", color: "#666" }}>Previous published PDFs are retained so authorised SuperAdmins can restore an earlier version without deleting the current record.</p>
            </div>
          </div>
          {history.length === 0 ? (
            <div className="portal-empty" style={{ marginTop: 12 }}>No prior constitution versions have been recorded yet.</div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {history.map((item) => (
                <div key={`${item.version}-${item.fileUrl}`} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto", alignItems: "center", border: "1px solid #e7e7ea", borderRadius: 12, padding: 12 }}>
                  <div>
                    <strong>Version {item.version}</strong> · {item.fileName || "Constitution PDF"}<br />
                    <small style={{ color: "#666" }}>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "Date unavailable"}</small>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a className="portal-btn secondary" href={resolveApiUrl(item.fileUrl)} target="_blank" rel="noreferrer"><Eye size={15} /> View</a>
                    <button type="button" className="portal-btn primary" disabled={restoringVersion === String(item.version)} onClick={() => restoreVersion(item.version)}><RotateCcw size={15} /> {restoringVersion === String(item.version) ? "Restoring..." : "Restore"}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
