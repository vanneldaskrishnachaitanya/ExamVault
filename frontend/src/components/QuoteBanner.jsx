// src/components/QuoteBanner.jsx
import { useEffect, useState, useCallback } from 'react';
import { Quote, Sparkles, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { fetchTodayQuotes } from '../api/apiClient';

// Beautiful background patterns (CSS gradients) used when no image is set
const BG_PATTERNS = [
  'radial-gradient(ellipse at 20% 50%, rgba(245,166,35,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(79,142,247,0.08) 0%, transparent 50%)',
  'radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.12) 0%, transparent 60%), radial-gradient(ellipse at 20% 30%, rgba(0,212,184,0.07) 0%, transparent 50%)',
  'radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.1) 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(244,114,182,0.07) 0%, transparent 50%)',
  'radial-gradient(ellipse at 0% 100%, rgba(34,211,238,0.1) 0%, transparent 60%), radial-gradient(ellipse at 100% 0%, rgba(245,166,35,0.08) 0%, transparent 50%)',
];

export default function QuoteBanner() {
  const [quotes,  setQuotes]  = useState([]);
  const [idx,     setIdx]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true); // fade transition
  const [enabled, setEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchTodayQuotes();
      setEnabled(d.enabled);
      if (d.enabled && d.quotes?.length) {
        setQuotes(d.quotes);
        setIdx(0);
      }
    } catch { /* silently fail — non-critical widget */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const go = (dir) => {
    setVisible(false);
    setTimeout(() => {
      setIdx(i => (i + dir + quotes.length) % quotes.length);
      setVisible(true);
    }, 200);
  };

  // Nothing to show
  if (!enabled || (!loading && quotes.length === 0)) return null;

  const q    = quotes[idx] || {};
  const pat  = BG_PATTERNS[idx % BG_PATTERNS.length];

  return (
    <div className="quote-banner" aria-label="Daily inspiration">
      {/* Ambient background */}
      <div className="quote-banner__bg" style={{ background: pat }} aria-hidden="true" />

      {/* Optional dim image */}
      {q.bgImageUrl && (
        <div
          className="quote-banner__img"
          style={{ backgroundImage: `url(${q.bgImageUrl})` }}
          aria-hidden="true"
        />
      )}

      {/* Floating sparkle dots */}
      <span className="quote-banner__dot quote-banner__dot--1" aria-hidden="true" />
      <span className="quote-banner__dot quote-banner__dot--2" aria-hidden="true" />
      <span className="quote-banner__dot quote-banner__dot--3" aria-hidden="true" />

      {loading ? (
        <div className="quote-banner__loader">
          <RefreshCw size={16} className="spin" />
        </div>
      ) : (
        <div className={`quote-banner__body${visible ? ' quote-banner__body--visible' : ''}`}>

          {/* Section label */}
          {q.sectionName && (
            <div className="quote-banner__section">
              <Sparkles size={11} />
              {q.sectionName}
              {q.isFallback && <span className="quote-banner__auto">auto</span>}
            </div>
          )}

          {/* Quote mark + text */}
          <div className="quote-banner__quote-wrap">
            <Quote size={18} className="quote-banner__openquote" aria-hidden="true" />
            <p className="quote-banner__text">{q.text}</p>
          </div>

          {/* Author */}
          {q.author && (
            <p className="quote-banner__author">— {q.author}</p>
          )}
        </div>
      )}

      {/* Navigation dots / arrows — only if multiple quotes */}
      {quotes.length > 1 && (
        <div className="quote-banner__nav">
          <button className="quote-banner__arrow" onClick={() => go(-1)} aria-label="Previous quote">
            <ChevronLeft size={14} />
          </button>
          <div className="quote-banner__dots">
            {quotes.map((_, i) => (
              <button
                key={i}
                className={`quote-banner__pip${i === idx ? ' quote-banner__pip--active' : ''}`}
                onClick={() => { setVisible(false); setTimeout(() => { setIdx(i); setVisible(true); }, 200); }}
                aria-label={`Quote ${i + 1}`}
              />
            ))}
          </div>
          <button className="quote-banner__arrow" onClick={() => go(1)} aria-label="Next quote">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
