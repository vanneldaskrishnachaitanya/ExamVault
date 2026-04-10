import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Pause, Play, RotateCcw, Timer, X } from 'lucide-react';

const DEFAULT_WORK = 25 * 60;
const DEFAULT_BREAK = 5 * 60;
const STORAGE_KEY = 'ev-pomodoro-v2';
const START_EVENT = 'ev:pomodoro:start';

const getInitialState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        timeLeft: DEFAULT_WORK,
        isActive: false,
        phase: 'work',
        viewMode: 'minimized',
        isClosed: false,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      timeLeft: Number.isFinite(parsed.timeLeft) ? Math.max(0, parsed.timeLeft) : DEFAULT_WORK,
      isActive: !!parsed.isActive,
      phase: parsed.phase === 'break' ? 'break' : 'work',
      viewMode: parsed.viewMode === 'fullscreen' ? 'fullscreen' : 'minimized',
      isClosed: !!parsed.isClosed,
    };
  } catch {
    return {
      timeLeft: DEFAULT_WORK,
      isActive: false,
      phase: 'work',
      viewMode: 'minimized',
      isClosed: false,
    };
  }
};

export default function PomodoroTimer() {
  const [{ timeLeft, isActive, phase, viewMode, isClosed, hasStarted }, setPomodoroState] = useState(() => ({
    ...getInitialState(),
    isClosed: true,
    hasStarted: false,
  }));
  const audioRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timeLeft, isActive, phase, viewMode, isClosed }));
  }, [timeLeft, isActive, phase, viewMode, isClosed]);

  useEffect(() => {
    const onStartTimer = () => {
      setPomodoroState((prev) => ({
        ...prev,
        hasStarted: true,
        isClosed: false,
        isActive: true,
        viewMode: 'fullscreen',
        phase: prev.phase || 'work',
        timeLeft: prev.timeLeft > 0 ? prev.timeLeft : DEFAULT_WORK,
      }));
    };

    window.addEventListener(START_EVENT, onStartTimer);
    return () => window.removeEventListener(START_EVENT, onStartTimer);
  }, []);

  useEffect(() => {
    if (!isActive) return undefined;

    if (timeLeft === 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      setPomodoroState((prev) => {
        const nextPhase = prev.phase === 'work' ? 'break' : 'work';
        return {
          ...prev,
          phase: nextPhase,
          timeLeft: nextPhase === 'work' ? DEFAULT_WORK : DEFAULT_BREAK,
          isActive: true,
          viewMode: 'fullscreen',
          isClosed: false,
        };
      });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPomodoroState((prev) => ({ ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) }));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isActive, timeLeft]);

  const setFullscreen = () => {
    setPomodoroState((prev) => ({ ...prev, viewMode: 'fullscreen', isClosed: false, hasStarted: true }));
  };

  const setMinimized = () => {
    setPomodoroState((prev) => ({ ...prev, viewMode: 'minimized', isClosed: false, hasStarted: true }));
  };

  const closeTimer = () => {
    setPomodoroState({
      timeLeft: DEFAULT_WORK,
      isActive: false,
      phase: 'work',
      viewMode: 'minimized',
      isClosed: true,
      hasStarted: false,
    });
  };

  const toggleTimer = () => {
    setPomodoroState((prev) => {
      const nextActive = !prev.isActive;
      return {
        ...prev,
        isActive: nextActive,
        isClosed: false,
        hasStarted: true,
        viewMode: nextActive ? 'fullscreen' : prev.viewMode,
      };
    });
  };

  const resetTimer = () => {
    setPomodoroState((prev) => ({
      ...prev,
      isActive: false,
      phase: 'work',
      timeLeft: DEFAULT_WORK,
      isClosed: false,
      hasStarted: true,
    }));
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isBreak = phase === 'break';
  const progress = isBreak
    ? ((DEFAULT_BREAK - timeLeft) / DEFAULT_BREAK) * 100
    : ((DEFAULT_WORK - timeLeft) / DEFAULT_WORK) * 100;

  if (!hasStarted || isClosed) {
    return null;
  }

  const isFullscreen = viewMode === 'fullscreen';

  return (
    <div className={`pomodoro-shell ${isFullscreen ? 'pomodoro-shell--fullscreen' : 'pomodoro-shell--minimized'} ${isBreak ? 'pomodoro-shell--break' : ''}`}>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
      <div className="pomodoro-shell__head">
        <div className="pomodoro-shell__title">
          <Timer size={16} />
          <span>{isBreak ? 'Rest Time' : 'Focus Time'}</span>
        </div>
        <div className="pomodoro-shell__window-actions">
          <button className="fc-btn pomodoro-shell__window-btn" onClick={setMinimized} aria-label="Minimize timer">
            <Minimize2 size={14} />
            Minimize
          </button>
          <button className="fc-btn pomodoro-shell__window-btn pomodoro-shell__window-btn--danger" onClick={closeTimer} aria-label="Close timer">
            <X size={14} />
            Close
          </button>
        </div>
      </div>
      <div className="pomodoro-shell__body">
        <div className="pomodoro-shell__mode">
          {isBreak ? 'Take a short break and breathe' : 'Stay locked in and avoid distractions'}
        </div>

        <div className="pomodoro-shell__display">
          <div className="pomodoro-shell__time">{formatTime(timeLeft)}</div>
          <svg className="pomodoro-shell__ring" viewBox="0 0 100 100">
            <circle className="pomodoro-shell__ring-bg" cx="50" cy="50" r="45" />
            <circle
              className="pomodoro-shell__ring-fg"
              cx="50"
              cy="50"
              r="45"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progress) / 100}
            />
          </svg>
        </div>

        <div className="pomodoro-shell__controls">
          <button className="fc-btn" onClick={toggleTimer} aria-label={isActive ? 'Pause' : 'Start'}>
            {isActive ? <Pause size={16} /> : <Play size={16} />}
            {isActive ? 'Pause' : 'Play'}
          </button>
          <button className="fc-btn" onClick={resetTimer} aria-label="Reset">
            <RotateCcw size={16} />
            Reset
          </button>
          {!isFullscreen && (
            <button className="fc-btn" onClick={setFullscreen} aria-label="Open full screen timer">
              <Maximize2 size={16} />
              Fullscreen
            </button>
          )}
          {isFullscreen && (
            <button className="fc-btn" onClick={setMinimized} aria-label="Minimize timer">
              <Minimize2 size={16} />
              Minimize
            </button>
          )}
          <button className="fc-btn fc-btn--delete" onClick={closeTimer} aria-label="Close timer">
            <X size={16} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
