import { useEffect, useState } from 'react';
import { BarChart2, Users, FileText, Folder, Clock, TrendingDown, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { fetchAnalytics } from '../api/apiClient';

const StatCard = ({ icon, label, value, color }) => (
  <div className="stat-card" style={{ borderColor: color + '40' }}>
    <div className="stat-card__icon" style={{ background: color + '15', color }}>{icon}</div>
    <div className="stat-card__body">
      <p className="stat-card__value" data-target={value}>{value}</p>
      <p className="stat-card__label">{label}</p>
    </div>
  </div>
);

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics().then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="sp-state sp-state--loading"><Loader2 size={30} className="spin" /><span>Loading analytics…</span></div>;
  if (error)   return <div className="sp-state sp-state--error">{error}</div>;
  if (!data)   return null;

  const { overview, topDownloaded, uploadsByBranch, recentUploads } = data;
  const maxBranchCount = Math.max(...(uploadsByBranch.map(b => b.count)), 1);

  return (
    <div className="analytics-page">
      <h1 className="analytics-page__title">
        <BarChart2 size={22} /> Analytics
        {/* SVG pulse rings */}
        <svg width="32" height="32" viewBox="0 0 32 32" style={{marginLeft:'0.5rem',flexShrink:0}} aria-hidden="true">
          <circle cx="16" cy="16" r="6" fill="var(--amber)" opacity="0.9"/>
          <circle cx="16" cy="16" r="6" fill="none" stroke="var(--amber)" strokeWidth="1.5" opacity="0.7">
            <animate attributeName="r" from="6" to="14" dur="1.8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.7" to="0" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="16" cy="16" r="6" fill="none" stroke="var(--amber)" strokeWidth="1.5" opacity="0.7">
            <animate attributeName="r" from="6" to="14" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
            <animate attributeName="opacity" from="0.7" to="0" dur="1.8s" begin="0.6s" repeatCount="indefinite"/>
          </circle>
        </svg>
      </h1>

      {/* Overview stats */}
      <div className="analytics-stats">
        <StatCard icon={<FileText size={20} />} label="Total Files"    value={overview.totalFiles}    color="var(--amber)" />
        <StatCard icon={<Users size={20} />}    label="Students"       value={overview.totalUsers}    color="var(--blue)" />
        <StatCard icon={<Folder size={20} />}   label="Subject Folders" value={overview.totalFolders} color="var(--teal)" />
        <StatCard icon={<Clock size={20} />}    label="Pending"        value={overview.pendingFiles}  color="var(--warning)" />
        <StatCard icon={<CheckCircle size={20} />} label="Approved"    value={overview.approvedFiles} color="var(--success)" />
        <StatCard icon={<XCircle size={20} />}  label="Rejected"       value={overview.rejectedFiles} color="var(--danger)" />
      </div>

      <div className="analytics-grid">
        {/* Uploads by branch */}
        <div className="analytics-card">
          <h2 className="analytics-card__title">Uploads by Branch</h2>
          <div className="branch-bars">
            {uploadsByBranch.map(b => (
              <div key={b._id} className="branch-bar-row">
                <span className="branch-bar-label">{b._id || 'Unknown'}</span>
                <div className="branch-bar-track">
                  <div className="branch-bar-fill" style={{ width: `${(b.count / maxBranchCount) * 100}%` }} />
                </div>
                <span className="branch-bar-count">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top downloaded */}
        <div className="analytics-card">
          <h2 className="analytics-card__title"><TrendingDown size={15} /> Most Downloaded</h2>
          <div className="top-files">
            {topDownloaded.length === 0
              ? <p className="analytics-empty">No downloads yet</p>
              : topDownloaded.map((f, i) => (
                <div key={f._id} className="top-file-row">
                  <span className="top-file-rank">#{i + 1}</span>
                  <div className="top-file-body">
                    <p className="top-file-name">{f.originalName}</p>
                    <p className="top-file-meta">{f.regulation} · {f.branch} · {f.subject}</p>
                  </div>
                  <span className="top-file-count">{f.downloadCount} ↓</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Recent uploads */}
        <div className="analytics-card analytics-card--wide">
          <h2 className="analytics-card__title">Recent Uploads</h2>
          <div className="recent-uploads">
            {recentUploads.map(f => (
              <div key={f._id} className="recent-upload-row">
                <FileText size={14} />
                <div className="recent-upload-body">
                  <p className="recent-upload-name">{f.originalName}</p>
                  <p className="recent-upload-meta">{f.branch} · {f.subject} · by {f.uploadedBy?.name || 'Unknown'}</p>
                </div>
                <span className={`fc-status status--${f.status}`}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
