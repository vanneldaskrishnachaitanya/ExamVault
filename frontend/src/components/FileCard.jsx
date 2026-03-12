// src/components/FileCard.jsx
import {
  Download, Eye, FileText, Flag, Image,
  Presentation, FileSpreadsheet, Calendar,
  User, Clock, TrendingDown, CheckCircle,
  AlertCircle, Timer, Trash2
} from "lucide-react";

import api from "../api/apiClient";
import { useAuth } from "../hooks/useAuth";

const MIME_CONFIG = {
  "application/pdf": { icon: <FileText size={22} />, label: "PDF",   color: "file-icon--pdf" },
  "image/png":       { icon: <Image size={22} />,    label: "Image", color: "file-icon--img" },
  "image/jpeg":      { icon: <Image size={22} />,    label: "Image", color: "file-icon--img" },
  "image/webp":      { icon: <Image size={22} />,    label: "Image", color: "file-icon--img" },
  "application/vnd.ms-powerpoint": { icon: <Presentation size={22} />, label: "PPT",  color: "file-icon--ppt" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { icon: <Presentation size={22} />, label: "PPTX", color: "file-icon--ppt" },
  "application/vnd.ms-excel": { icon: <FileSpreadsheet size={22} />, label: "XLS",  color: "file-icon--xls" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { icon: <FileSpreadsheet size={22} />, label: "XLSX", color: "file-icon--xls" },
};

const getMimeConfig = (mime) =>
  MIME_CONFIG[mime] || { icon: <FileText size={22} />, label: "FILE", color: "file-icon--default" };

const formatBytes = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
};

const StatusDot = ({ status }) => {
  const config = {
    approved: { icon: <CheckCircle size={11} />, cls: "status--approved", label: "Approved" },
    pending:  { icon: <Timer size={11} />,       cls: "status--pending",  label: "Pending"  },
    rejected: { icon: <AlertCircle size={11} />, cls: "status--rejected", label: "Rejected" },
  };
  const { icon, cls, label } = config[status] || config.pending;
  return <span className={`fc-status ${cls}`}>{icon}{label}</span>;
};

export default function FileCard({ file, showStatus = false, onReport, compact = false }) {

  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === "admin";

  const mime = getMimeConfig(file.mimeType);

  const canPreview =
    file.mimeType === "application/pdf" ||
    file.mimeType?.startsWith("image/") ||
    file.mimeType?.includes("word") ||
    file.mimeType?.includes("powerpoint") ||
    file.mimeType?.includes("presentation") ||
    file.mimeType?.includes("spreadsheet") ||
    file.mimeType?.includes("excel");

  const uploaderName =
    file.uploadedBy?.name ||
    file.uploadedBy?.email?.split("@")[0] ||
    "Unknown";

  const dateStr = formatDate(file.uploadedAt || file.createdAt);

  /* ───────── PREVIEW ───────── */
  const handlePreview = () => {
    if (!file.filePath) return alert("Preview not available.");

    // Images — open directly
    if (file.mimeType?.startsWith("image/")) {
      window.open(file.filePath, "_blank");
      return;
    }

    // PDFs and Office files — use Google Docs viewer
    const url = `https://docs.google.com/viewer?url=${encodeURIComponent(file.filePath)}&embedded=false`;
    window.open(url, "_blank");
  };

  /* ───────── DOWNLOAD ───────── */
  const handleDownload = async () => {
    if (!file.filePath) return alert("Download not available.");

    try {
      // Fetch the file as a blob so we can rename it to originalName
      const response = await fetch(file.filePath);
      const blob = await response.blob();

      // Create object URL and trigger download with clean original filename
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.originalName; // ← clean filename, no timestamp
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

    } catch (err) {
      console.error("Download failed", err);
      // Fallback — open directly in new tab
      window.open(file.filePath, "_blank");
    }
  };

  /* ───────── DELETE (ADMIN) ───────── */
  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.originalName}" ?`)) return;
    try {
      await api.delete(`/admin/files/${file._id}`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <article className={`file-card ${compact ? "file-card--compact" : ""}`}>

      <div className={`file-card__icon ${mime.color}`}>
        {mime.icon}
        <span className="file-card__type-label">{mime.label}</span>
      </div>

      <div className="file-card__info">
        <div className="file-card__title-row">
          <h3 className="file-card__name" title={file.originalName}>
            {file.originalName}
          </h3>
          {showStatus && <StatusDot status={file.status} />}
        </div>

        <div className="file-card__meta">
          <span className="file-card__chip">
            <User size={11} /> {uploaderName}
          </span>
          {dateStr && (
            <span className="file-card__chip">
              <Calendar size={11} /> {dateStr}
            </span>
          )}
          {file.fileSize > 0 && (
            <span className="file-card__chip">{formatBytes(file.fileSize)}</span>
          )}
          {file.downloadCount > 0 && (
            <span className="file-card__chip">
              <TrendingDown size={11} /> {file.downloadCount}
            </span>
          )}
          {file.year && (
            <span className="file-card__chip">
              <Clock size={11} /> {file.year}
            </span>
          )}
        </div>
      </div>

      <div className="file-card__actions">
        {canPreview && (
          <button className="fc-btn fc-btn--preview" onClick={handlePreview}>
            <Eye size={14} />
            <span>Preview</span>
          </button>
        )}

        <button className="fc-btn fc-btn--download" onClick={handleDownload}>
          <Download size={14} />
          <span>Download</span>
        </button>

        {isAdmin && (
          <button className="fc-btn fc-btn--delete" onClick={handleDelete}>
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        )}

        {!isAdmin && onReport && (
          <button className="fc-btn fc-btn--flag" onClick={() => onReport(file)}>
            <Flag size={13} />
          </button>
        )}

      </div>
    </article>
  );
}
