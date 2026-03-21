import { Link } from 'react-router-dom';
import { BookOpen, Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="notfound-page">
      <div className="notfound-glow" />

      <div className="notfound-content">
        <div className="notfound-icon">📚</div>
        <h1 className="notfound-code">404</h1>
        <h2 className="notfound-title">Lost in the exam hall?</h2>
        <p className="notfound-desc">
          This page doesn't exist — maybe it got rejected by admin? 😅<br />
          Let's get you back to the right place.
        </p>

        <div className="notfound-actions">
          <Link to="/dashboard" className="btn btn--primary">
            <Home size={15} /> Go to Dashboard
          </Link>
          <Link to="/search" className="btn btn--ghost">
            <Search size={15} /> Search Files
          </Link>
          <button className="btn btn--ghost" onClick={() => window.history.back()}>
            <ArrowLeft size={15} /> Go Back
          </button>
        </div>

        <div className="notfound-links">
          <Link to="/r/R22" className="notfound-link"><BookOpen size={13} /> R22 Papers</Link>
          <Link to="/r/R25" className="notfound-link"><BookOpen size={13} /> R25 Papers</Link>
          <Link to="/syllabus" className="notfound-link"><BookOpen size={13} /> Syllabus</Link>
          <Link to="/timetable" className="notfound-link"><BookOpen size={13} /> Timetable</Link>
        </div>
      </div>
    </div>
  );
}
