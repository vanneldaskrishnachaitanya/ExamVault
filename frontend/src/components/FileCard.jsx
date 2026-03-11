import {
  Download,
  Eye,
  FileText,
  Flag,
  Image,
  Presentation,
  FileSpreadsheet,
  Calendar,
  User,
  Clock,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Timer,
  Trash2
} from "lucide-react";

import api from "../api/apiClient";
import { useAuth } from "../hooks/useAuth";

/* ───────────────── MIME CONFIG ───────────────── */

const MIME_CONFIG = {
  "application/pdf": { icon: <FileText size={22} />, label: "PDF", color: "file-icon--pdf" },
  "image/png": { icon: <Image size={22} />, label: "Image", color: "file-icon--img" },
  "image/jpeg": { icon: <Image size={22} />, label: "Image", color: "file-icon--img" },
  "image/webp": { icon: <Image size={22} />, label: "Image", color: "file-icon--img" },
  "application/vnd.ms-powerpoint": { icon: <Presentation size={22} />, label: "PPT", color: "file-icon--ppt" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    icon: <Presentation size={22} />,
    label: "PPTX",
    color: "file-icon--ppt"
  },
  "application/vnd.ms-excel": { icon: <FileSpreadsheet size={22} />, label: "XLS", color: "file-icon--xls" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    icon: <FileSpreadsheet size={22} />,
    label: "XLSX",
    color: "file-icon--xls"
  }
};

const getMimeConfig = (mime) =>
  MIME_CONFIG[mime] || { icon: <FileText size={22} />, label: "FILE", color: "file-icon--default" };

/* ───────────────── HELPERS ───────────────── */

const formatBytes = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

/* ───────────────── STATUS DOT ───────────────── */

const StatusDot = ({ status }) => {
  const config = {
    approved: { icon: <CheckCircle size={11} />, cls: "status--approved", label: "Approved" },
    pending: { icon: <Timer size={11} />, cls: "status--pending", label: "Pending" },
    rejected: { icon: <AlertCircle size={11} />, cls: "status--rejected", label: "Rejected" }
  };

  const { icon, cls, label } = config[status] || config.pending;

  return (
    <span className={`fc-status ${cls}`}>
      {icon}
      {label} </span>
  );
};

/* ───────────────── COMPONENT ───────────────── */

export default function FileCard({ file, showStatus = false, onReport, compact = false }) {

  const { backendUser } = useAuth();
  const isAdmin = backendUser?.role === "admin";

  const mime = getMimeConfig(file.mimeType);

  const canPreview =
    file.mimeType === "application/pdf" ||
    file.mimeType?.startsWith("image/");

  const uploaderName =
    file.uploadedBy?.name ||
    file.uploadedBy?.email?.split("@")[0] ||
    "Unknown";

  const dateStr = formatDate(file.uploadedAt || file.createdAt);

  /* ───────── PREVIEW ───────── */

  const handlePreview = () => {
    if (!file.filePath) {
      alert("Preview not available");
      return;
    }
    window.open(file.filePath, "_blank");

  };

  /* ───────── DOWNLOAD ───────── */

  const handleDownload = () => {
    if (!file.filePath) {
      alert("Download not available");
      return;
    }

    let url = file.filePath;

    if (url.includes("cloudinary.com")) {

      const encoded = encodeURIComponent(file.originalName || "file");

      if (url.includes("/upload/")) {
        url = url.replace("/upload/", `/upload/fl_attachment:${encoded}/`);
      }

      if (url.includes("/raw/upload/")) {
        url = url.replace("/raw/upload/", `/raw/upload/fl_attachment:${encoded}/`);
      }

    }

    window.open(url, "_blank");


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

  /* ───────────────── UI ───────────────── */

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
            <span className="file-card__chip">
              {formatBytes(file.fileSize)}
            </span>
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
