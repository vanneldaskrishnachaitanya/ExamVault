// src/components/QuoteBanner.jsx
import { useEffect, useState, useCallback } from 'react';
import {
  Quote, Sparkles, ChevronLeft, ChevronRight, RefreshCw,
  BookOpen, X, Check, BarChart2, Clock, Pin,
  EyeOff, Eye, Music, Download,
} from 'lucide-react';
import {
  fetchTodayQuotes, fetchActivePolls, votePoll as apiVotePoll,
  addSavedItem, removeSavedItem as removeSavedItemApi,
  fetchTodaySong,
} from '../api/apiClient';
import { isSavedItem, toggleSavedItem } from '../utils/featureStorage';

const BG_PATTERNS = [
  'radial-gradient(ellipse at 15% 50%, rgba(245,166,35,0.13) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(79,142,247,0.07) 0%, transparent 50%)',
  'radial-gradient(ellipse at 80% 75%, rgba(139,92,246,0.12) 0%, transparent 55%), radial-gradient(ellipse at 20% 25%, rgba(0,212,184,0.07) 0%, transparent 50%)',
  'radial-gradient(ellipse at 50% 0%, rgba(245,166,35,0.11) 0%, transparent 55%), radial-gradient(ellipse at 90% 90%, rgba(244,114,182,0.07) 0%, transparent 50%)',
  'radial-gradient(ellipse at 5% 90%, rgba(34,211,238,0.1) 0%, transparent 55%), radial-gradient(ellipse at 95% 10%, rgba(245,166,35,0.08) 0%, transparent 50%)',
];

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return 'Expired';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  if (d > 0) return `${d}d ${h}h left`;
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

// ── Poll Card ─────────────────────────────────────────────────
function PollCard({ poll: initialPoll }) {
  const [poll,     setPoll]     = useState(initialPoll);
  const [selected, setSelected] = useState([]);
  const [voting,   setVoting]   = useState(false);
  const [toast,    setToast]    = useState('');

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const handleSelect = (optId) => {
    if (poll.userVoted) return;
    if (poll.multiSelect) {
      setSelected(prev => prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]);
    } else {
      setSelected([optId]);
    }
  };

  const handleVote = async () => {
    if (!selected.length) { showToast('Please select an option'); return; }
    setVoting(true);
    try {
      const d = await apiVotePoll(poll._id, selected);
      setPoll(prev => ({ ...prev, options: d.options, totalVotes: d.totalVotes, userVoted: true }));
      setSelected([]);
      showToast('Vote recorded ✓');
    } catch (e) { showToast(e.message); }
    finally { setVoting(false); }
  };

  const maxVotes = Math.max(...poll.options.map(o => o.votes), 1);

  return (
    <div className="poll-card">
      <div className="poll-card__header">
        <div className="poll-card__label">
          <BarChart2 size={11} /><span>POLL</span>
          {poll.multiSelect && <span className="poll-card__multi">multi-select</span>}
        </div>
        <div className="poll-card__timer">
          <Clock size={11} /><span>{timeLeft(poll.expiresAt)}</span>
        </div>
      </div>

      <p className="poll-card__question">{poll.question}</p>

      <div className="poll-card__options">
        {poll.options.map(opt => {
          const pct        = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
          const isSelected = selected.includes(opt._id.toString());
          const isWinner   = poll.userVoted && opt.votes === maxVotes && poll.totalVotes > 0;
          return (
            <button
              key={opt._id}
              className={[
                'poll-option',
                poll.userVoted   ? 'poll-option--result'  : '',
                isSelected       ? 'poll-option--selected' : '',
                poll.userVoted && opt.voted ? 'poll-option--my-vote' : '',
                isWinner         ? 'poll-option--winner'  : '',
              ].filter(Boolean).join(' ')}
              onClick={() => handleSelect(opt._id.toString())}
              disabled={poll.userVoted || voting}
            >
              {poll.userVoted && <div className="poll-option__bar" style={{ width: `${pct}%` }} />}
              <span className="poll-option__check">
                {poll.userVoted && opt.voted ? <Check size={11} /> : isSelected ? <Check size={11} /> : null}
              </span>
              <span className="poll-option__text">{opt.text}</span>
              {poll.userVoted && <span className="poll-option__pct">{pct}%</span>}
            </button>
          );
        })}
      </div>

      {!poll.userVoted && (
        <button className="poll-card__submit" onClick={handleVote} disabled={voting || !selected.length}>
          {voting ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
          {poll.multiSelect ? `Vote (${selected.length} selected)` : 'Submit Vote'}
        </button>
      )}
      {poll.userVoted && (
        <p className="poll-card__votes">{poll.totalVotes} {poll.totalVotes === 1 ? 'vote' : 'votes'} total</p>
      )}
      {toast && <div className="poll-toast">{toast}</div>}
    </div>
  );
}

// ── Main QuoteBanner (tabs: Quote | Poll | Song) ─────────────
export default function QuoteBanner() {
  const [quotes,      setQuotes]      = useState([]);
  const [polls,       setPolls]       = useState([]);
  const [song,        setSong]        = useState(null);
  const [songEnabled, setSongEnabled] = useState(false);
  const [quoteIdx,    setQuoteIdx]    = useState(0);
  const [cardIdx,     setCardIdx]     = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [visible,     setVisible]     = useState(true);
  const [enabled,     setEnabled]     = useState(true);
  const [showAuthor,  setShowAuthor]  = useState(true);
  const [descOpen,    setDescOpen]    = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [hideQuotes,  setHideQuotes]  = useState(() => localStorage.getItem('ev-hide-quote-banner') === '1');
  const [hiddenPolls, setHiddenPolls] = useState(() => readStoredJson('ev-hide-poll-banners', []));
  const [hideSong,    setHideSong]    = useState(() => localStorage.getItem('ev-hide-song-banner') === '1');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qd, pd, sd] = await Promise.all([
        fetchTodayQuotes(),
        fetchActivePolls().catch(() => []),
        fetchTodaySong().catch(() => ({ enabled: false, song: null })),
      ]);
      setEnabled(qd.enabled);
      setShowAuthor(qd.showAuthor !== false);
      if (qd.enabled && qd.quotes?.length) { setQuotes(qd.quotes); setQuoteIdx(0); }
      setPolls(Array.isArray(pd) ? pd : []);
      setSongEnabled(sd?.enabled ?? false);
      setSong(sd?.song || null);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build card list: quotes | poll-0 | poll-1 | ... | song
  const cards = [
    ...(quotes.length ? ['quotes'] : []),
    ...polls.map((_, i) => `poll-${i}`),
    ...(songEnabled && song ? ['song'] : []),
  ];

  const hasCards = quotes.length > 0 || polls.length > 0 || (songEnabled && !!song);
  if (!enabled || (!loading && !hasCards)) return null;

  const q   = quotes[quoteIdx] || {};
  const pat = BG_PATTERNS[quoteIdx % BG_PATTERNS.length];

  const currentCard = cards[cardIdx] || cards[0] || 'quotes';
  const isQuoteCard = currentCard === 'quotes';
  const isSongCard  = currentCard === 'song';
  const pollIdx     = (isQuoteCard || isSongCard) ? -1 : parseInt(currentCard.split('-')[1]);

  const canExpand    = isQuoteCard && !!(q.description?.trim());
  const isPollHidden = !isQuoteCard && !isSongCard && pollIdx >= 0 && hiddenPolls.includes(polls[pollIdx]?._id);

  // Save state
  useEffect(() => {
    if (!isQuoteCard || !q._id) { setSaved(false); return; }
    setSaved(isSavedItem({ type: 'quote', id: q._id }));
  }, [isQuoteCard, q._id]);

  useEffect(() => {
    const sync = () => {
      if (!isQuoteCard || !q._id) return;
      setSaved(isSavedItem({ type: 'quote', id: q._id }));
    };
    window.addEventListener('ev:saved-changed', sync);
    return () => window.removeEventListener('ev:saved-changed', sync);
  }, [isQuoteCard, q._id]);

  const goQuote = (dir) => {
    setVisible(false); setDescOpen(false);
    setTimeout(() => { setQuoteIdx(i => (i + dir + quotes.length) % quotes.length); setVisible(true); }, 180);
  };

  const persistHideQuotes = (next) => {
    setHideQuotes(next);
    localStorage.setItem('ev-hide-quote-banner', next ? '1' : '0');
  };

  const persistHidePoll = (pollId, nextHidden) => {
    setHiddenPolls(prev => {
      const next = nextHidden ? [...new Set([...prev, pollId])] : prev.filter(id => id !== pollId);
      localStorage.setItem('ev-hide-poll-banners', JSON.stringify(next));
      return next;
    });
  };

  const persistHideSong = (next) => {
    setHideSong(next);
    localStorage.setItem('ev-hide-song-banner', next ? '1' : '0');
  };

  const handleSaveQuote = () => {
    if (!q._id) return;
    const query   = encodeURIComponent(q.author || q.sectionName || q.text?.slice(0, 28) || 'quote');
    const payload = {
      type: 'quote', id: q._id,
      title:    q.sectionName ? `${q.sectionName} quote` : 'Daily quote',
      subtitle: q.author || q.text?.slice(0, 60) || 'Inspirational quote',
      href:     `/search?source=quotes&q=${query}`,
      meta:     { text: q.text || '', author: q.author || 'Unknown', description: q.description || '' },
    };
    const sync = async () => {
      try {
        if (saved) {
          await removeSavedItemApi({ type: 'quote', itemId: String(q._id) });
        } else {
          await addSavedItem({ type: 'quote', itemId: String(q._id), title: payload.title, subtitle: payload.subtitle, href: payload.href, meta: payload.meta });
        }
        const next = toggleSavedItem(payload);
        setSaved(next.some(e => e.type === 'quote' && String(e.id) === String(q._id)));
      } catch {}
    };
    sync();
  };

  return (
    <div className="quote-banner-wrap">

      {/* ── Tabs: Quote / Poll / Song ────────────────────── */}
      {cards.length > 1 && (
        <div className="qb-tabs">
          {cards.map((c, i) => (
            <button
              key={c}
              className={`qb-tab${cardIdx === i ? ' qb-tab--active' : ''}`}
              onClick={() => { setCardIdx(i); setDescOpen(false); }}
            >
              {c === 'quotes'
                ? <><Quote size={12} /> Quote</>
                : c === 'song'
                  ? <><Music size={12} /> Song</>
                  : <><BarChart2 size={12} /> Poll {polls.length > 1 ? parseInt(c.split('-')[1]) + 1 : ''}</>}
            </button>
          ))}
        </div>
      )}

      {/* ── Quote Card ────────────────────────────────────── */}
      {isQuoteCard && (
        hideQuotes ? (
          <div className="quote-banner quote-banner--hidden">
            <div className="quote-banner__hidden-state">
              <div className="quote-banner__hidden-copy">
                <span className="quote-banner__hidden-label">Quote section hidden</span>
                <p>Bring back the daily quote card whenever you want.</p>
              </div>
              <button type="button" className="quote-banner__unhide" onClick={() => persistHideQuotes(false)}>
                <Eye size={12} /> Unhide quote
              </button>
            </div>
          </div>
        ) : (
          <div className="quote-banner" aria-label="Daily inspiration">
            <div className="quote-banner__bg" style={{ background: pat }} aria-hidden="true" />
            {q.bgImageUrl && <div className="quote-banner__img" style={{ backgroundImage: `url(${q.bgImageUrl})` }} aria-hidden="true" />}
            <span className="quote-banner__dot quote-banner__dot--1" aria-hidden="true" />
            <span className="quote-banner__dot quote-banner__dot--2" aria-hidden="true" />
            <span className="quote-banner__dot quote-banner__dot--3" aria-hidden="true" />

            <button type="button" className="quote-banner__hide-btn" onClick={() => persistHideQuotes(true)}>
              <EyeOff size={12} /> Hide
            </button>

            {loading ? (
              <div className="quote-banner__loader"><RefreshCw size={15} className="spin" /></div>
            ) : (
              <div className={`quote-banner__body${visible ? ' quote-banner__body--visible' : ''}`}>
                {q.sectionName && (
                  <div className="quote-banner__section">
                    <Sparkles size={10} />
                    <span>{q.sectionName.toUpperCase()}</span>
                    {q.isFallback && <span className="quote-banner__auto">auto</span>}
                  </div>
                )}
                <div className="quote-banner__quote-wrap">
                  <Quote size={16} className="quote-banner__openquote" aria-hidden="true" />
                  <p className="quote-banner__text" style={{ whiteSpace: 'pre-wrap' }}>{q.text}</p>
                </div>
                {showAuthor && q.author && <p className="quote-banner__author">— {q.author}</p>}
                {isQuoteCard && q._id && (
                  <button className={`quote-banner__save${saved ? ' quote-banner__save--active' : ''}`} onClick={handleSaveQuote}>
                    <Pin size={12} /> {saved ? 'Saved' : 'Save quote'}
                  </button>
                )}
                {canExpand && !descOpen && (
                  <button className="quote-banner__learn-more" onClick={() => setDescOpen(true)}>
                    <BookOpen size={12} /> Learn more
                  </button>
                )}
                {descOpen && (
                  <div className="quote-banner__desc">
                    <div className="quote-banner__desc-header">
                      <span>About this quote</span>
                      <button className="quote-banner__desc-close" onClick={() => setDescOpen(false)}><X size={13} /></button>
                    </div>
                    <p className="quote-banner__desc-text" style={{ whiteSpace: 'pre-wrap' }}>{q.description}</p>
                  </div>
                )}
              </div>
            )}

            {quotes.length > 1 && !descOpen && (
              <div className="quote-banner__nav">
                <button className="quote-banner__arrow" onClick={() => goQuote(-1)}><ChevronLeft size={14} /></button>
                <div className="quote-banner__dots">
                  {quotes.map((_, i) => (
                    <button key={i}
                      className={`quote-banner__pip${i === quoteIdx ? ' quote-banner__pip--active' : ''}`}
                      onClick={() => { setVisible(false); setDescOpen(false); setTimeout(() => { setQuoteIdx(i); setVisible(true); }, 180); }}
                    />
                  ))}
                </div>
                <button className="quote-banner__arrow" onClick={() => goQuote(1)}><ChevronRight size={14} /></button>
              </div>
            )}
          </div>
        )
      )}

      {/* ── Poll Card ─────────────────────────────────────── */}
      {!isQuoteCard && !isSongCard && pollIdx >= 0 && polls[pollIdx] && (
        isPollHidden ? (
          <div className="poll-card poll-card--hidden">
            <div className="poll-card__hidden-state">
              <div className="quote-banner__hidden-copy">
                <span className="quote-banner__hidden-label">Poll section hidden</span>
                <p>Unhide this poll to vote and see live results.</p>
              </div>
              <button type="button" className="quote-banner__unhide" onClick={() => persistHidePoll(polls[pollIdx]._id, false)}>
                <Eye size={12} /> Unhide poll
              </button>
            </div>
          </div>
        ) : (
          <div className="poll-card-wrap">
            <button type="button" className="quote-banner__hide-btn quote-banner__hide-btn--poll"
              onClick={() => persistHidePoll(polls[pollIdx]._id, true)}>
              <EyeOff size={12} /> Hide
            </button>
            <PollCard poll={polls[pollIdx]} />
          </div>
        )
      )}

      {/* ── Song Card (tab content) ───────────────────────── */}
      {isSongCard && song && (
        hideSong ? (
          <div className="quote-banner quote-banner--hidden">
            <div className="quote-banner__hidden-state">
              <div className="quote-banner__hidden-copy">
                <span className="quote-banner__hidden-label">Song section hidden</span>
                <p>Bring back the song of the day whenever you want.</p>
              </div>
              <button type="button" className="quote-banner__unhide" onClick={() => persistHideSong(false)}>
                <Eye size={12} /> Unhide song
              </button>
            </div>
          </div>
        ) : (
          <div className="song-card">
            {song.bgImageUrl && (
              <div className="song-card__bg" style={{ backgroundImage: `url(${song.bgImageUrl})` }} aria-hidden="true" />
            )}

            <button type="button" className="quote-banner__hide-btn" onClick={() => persistHideSong(true)}>
              <EyeOff size={12} /> Hide
            </button>

            {/* Title + Artist */}
            <div className="song-card__title-row">
              <Music size={15} className="song-card__icon" />
              <div>
                <p className="song-card__title">{song.title}</p>
                {song.artist && <p className="song-card__artist">— {song.artist}</p>}
              </div>
            </div>

            {/* Audio player + Download */}
            {song.audioUrl && (
              <div className="song-card__audio-wrap">
                <audio controls src={song.audioUrl} className="song-card__audio" preload="none" />
                <a href={song.audioUrl} download={song.audioFileName || 'song.mp3'} className="song-card__download">
                  <Download size={13} /> Download
                </a>
              </div>
            )}

            {/* Lyrics (left) + Images (right, stacked with equal gaps) */}
            <div className="song-card__body">
              {song.lyrics && (
                <div className="song-card__lyrics-wrap">
                  <p className="song-card__lyrics" style={{ whiteSpace: 'pre-wrap' }}>{song.lyrics}</p>
                </div>
              )}
              {song.imageUrls?.length > 0 && (
                <div className="song-card__images">
                  {song.imageUrls.map((url, i) => (
                    <img key={i} src={url} alt={`${song.title} ${i + 1}`} className="song-card__image" loading="lazy" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
