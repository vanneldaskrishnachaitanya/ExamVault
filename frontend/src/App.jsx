// src/App.jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import MainLayout    from './layouts/MainLayout';
import Login         from './pages/Login';
import FacultyLogin  from './pages/FacultyLogin';
import AdminLogin    from './pages/AdminLogin';
import Dashboard     from './pages/Dashboard';
import RegulationPage from './pages/RegulationPage';
import SubjectPage   from './pages/SubjectPage';
import AdminPanel    from './pages/AdminPanel';
import ProfilePage         from './pages/ProfilePage';
import AnalyticsPage        from './pages/AnalyticsPage';
import GlobalSearchPage     from './pages/GlobalSearchPage';
import DownloadHistoryPage  from './pages/DownloadHistoryPage';
import UserManagementPage   from './pages/UserManagementPage';
import FeedbackPage         from './pages/FeedbackPage';
import CGPACalculatorPage   from './pages/CGPACalculatorPage';
import NotFoundPage         from './pages/NotFoundPage';
import CodingPage           from './pages/CodingPage';
import SyllabusPage         from './pages/SyllabusPage';
import ExamSchedulePage     from './pages/ExamSchedulePage';
import TimetablePage        from './pages/TimetablePage';
import EventsPage           from './pages/EventsPage';

// ── Route guards ──────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/admin-login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

// Student login page — redirect away if already authenticated as student
function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

// Admin login page — redirect away if already authenticated as admin
function AdminGuestRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function AppLoader() {
  return (
    <div className="app-loader">
      <div className="app-loader__ring" />
      <span className="app-loader__text">Tamso Maa Jyotirgamaya</span>
    </div>
  );
}

// ── Route tree ────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>

      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/login" element={
        <GuestRoute><Login /></GuestRoute>
      } />

      <Route path="/faculty-login" element={
        <GuestRoute><FacultyLogin /></GuestRoute>
      } />

      <Route path="/admin-login" element={
        <AdminGuestRoute><AdminLogin /></AdminGuestRoute>
      } />

      {/* ── Student (protected) ────────────────────────────── */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard"                          element={<Dashboard />} />
        <Route path="/r/:regulation"                      element={<RegulationPage />} />
        <Route path="/r/:regulation/:branch/:subject"     element={<SubjectPage />} />
        <Route path="/profile"                            element={<ProfilePage />} />
        <Route path="/search"                             element={<GlobalSearchPage />} />
        <Route path="/downloads"                          element={<DownloadHistoryPage />} />
        <Route path="/coding"                             element={<CodingPage />} />
        <Route path="/syllabus"                           element={<SyllabusPage />} />
        <Route path="/exams"                              element={<ExamSchedulePage />} />
        <Route path="/timetable"                          element={<TimetablePage />} />
        <Route path="/events"                             element={<EventsPage />} />
        <Route path="/cgpa"                               element={<CGPACalculatorPage />} />
        <Route path="/feedback"                            element={<FeedbackPage />} />
      </Route>

      {/* ── Admin (protected + role check) ─────────────────── */}
      <Route path="/admin" element={<AdminRoute><MainLayout /></AdminRoute>}>
        <Route index element={<AdminPanel />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users"     element={<UserManagementPage />} />
      </Route>

      {/* ── Catch-all ──────────────────────────────────────── */}
      <Route path="/"  element={<Navigate to="/login"   replace />} />
      <Route path="*"  element={<NotFoundPage />} />
    </Routes>
  );
}
