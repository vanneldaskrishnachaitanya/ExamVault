import { useEffect, useState } from 'react';
import { Trophy, Loader2, Medal, TrendingUp, Download, BarChart2 } from 'lucide-react';
import { fetchLeaderboard } from '../api/apiClient';
import { Link } from 'react-router-dom';

const MEDAL = ['#C8922A','#8b92a8','#c87533'];

export default function LeaderboardPage() {
  const [data,    setData]    = useState({ topUploaders:[], topDownloaded:[] });
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('uploaders');

  useEffect(() => {
    fetchLeaderboard().then(d => setData(d)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const list = tab === 'uploaders' ? data.topUploaders : data.topDownloaded;

  return (
    <div className="leader-page">
      <div className="leader-hero">
        <div className="leader-hero__glow" />
        <Trophy size={38} className="leader-hero__icon" />
        <h1 className="leader-hero__title">Leaderboard</h1>
        <p className="leader-hero__sub">Top contributors keeping the repository alive 🔥</p>
      </div>

      <div className="coding-tabs" style={{marginBottom:'1.5rem'}}>
        <button className={`coding-tab${tab==='uploaders'?' coding-tab--active':''}`} onClick={()=>setTab('uploaders')}>
          <TrendingUp size={14}/> Top Uploaders
        </button>
        <button className={`coding-tab${tab==='downloaded'?' coding-tab--active':''}`} onClick={()=>setTab('downloaded')}>
          <Download size={14}/> Most Downloaded
        </button>
      </div>

      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'1rem'}}>
        <Link to="/progress" className="btn btn--ghost btn--sm">
          <BarChart2 size={14}/> Upload Progress →
        </Link>
      </div>

      {loading ? (
        <div className="sp-state sp-state--loading"><Loader2 size={26} className="spin"/></div>
      ) : list.length === 0 ? (
        <div className="sp-state sp-state--empty"><Trophy size={36}/><p>No data yet — start uploading!</p></div>
      ) : (
        <div className="leader-list">
          {list.map((item, i) => (
            <div key={i} className={`leader-row${i<3?' leader-row--top':''}`}>
              <div className="leader-rank">
                {i < 3
                  ? <Medal size={22} style={{color: MEDAL[i]}}/>
                  : <span className="leader-rank__num">#{i+1}</span>}
              </div>

              {tab === 'uploaders' ? (
                <>
                  <div className="leader-avatar">
                    {item.avatarUrl
                      ? <img src={item.avatarUrl} alt={item.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/avatar-placeholder.svg'; }} />
                      : <span>{(item.name||'?').slice(0,2).toUpperCase()}</span>}
                  </div>
                  <div className="leader-body">
                    <p className="leader-name">{item.name}</p>
                    <p className="leader-meta">{item.email}</p>
                  </div>
                  <div className="leader-score">
                    <span className="leader-score__val">{item.uploadCount}</span>
                    <span className="leader-score__label">uploads</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="leader-body" style={{marginLeft:0}}>
                    <p className="leader-name">{item.originalName}</p>
                    <p className="leader-meta">{item.regulation} · {item.branch} · {item.subject}</p>
                  </div>
                  <div className="leader-score">
                    <span className="leader-score__val">{item.downloadCount}</span>
                    <span className="leader-score__label">downloads</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
