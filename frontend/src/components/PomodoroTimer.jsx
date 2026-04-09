import { useState, useEffect, useRef } from 'react';
import { Timer, RotateCcw, Play, Pause, Bell } from 'lucide-react';

export default function PomodoroTimer() {
  const DEFAULT_WORK = 25 * 60;
  const DEFAULT_BREAK = 5 * 60;
  
  const [timeLeft, setTimeLeft] = useState(DEFAULT_WORK);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  
  const audioRef = useRef(null);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      setIsActive(false);
      setIsBreak(!isBreak);
      setTimeLeft(!isBreak ? DEFAULT_BREAK : DEFAULT_WORK);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, isBreak]);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(DEFAULT_WORK);
  };
  
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = isBreak 
    ? ((DEFAULT_BREAK - timeLeft) / DEFAULT_BREAK) * 100
    : ((DEFAULT_WORK - timeLeft) / DEFAULT_WORK) * 100;

  return (
    <div className={`dash-widget pomodoro-widget ${isBreak ? 'pomodoro-widget--break' : ''}`}>
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />
      <div className="dash-widget__head">
        <Timer size={13} /> Focus Timer
      </div>
      <div className="pomodoro-widget__body">
        <div className="pomodoro-widget__mode">
          {isBreak ? '☕ Break' : '🧠 Work'}
        </div>
        
        <div className="pomodoro-widget__display">
          <div className="pomodoro-widget__time">{formatTime(timeLeft)}</div>
          <svg className="pomodoro-widget__ring" viewBox="0 0 100 100">
            <circle className="pomodoro-widget__ring-bg" cx="50" cy="50" r="45" />
            <circle 
              className="pomodoro-widget__ring-fg" 
              cx="50" cy="50" r="45" 
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progress) / 100}
            />
          </svg>
        </div>
        
        <div className="pomodoro-widget__controls">
          <button className="fc-btn" onClick={toggleTimer} aria-label={isActive ? 'Pause' : 'Start'}>
            {isActive ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="fc-btn" onClick={resetTimer} aria-label="Reset">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
