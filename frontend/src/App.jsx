// src/App.jsx
import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Login = lazy(() => import('./pages/Login'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RegulationPage = lazy(() => import('./pages/RegulationPage'));
const SubjectPage = lazy(() => import('./pages/SubjectPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const GlobalSearchPage = lazy(() => import('./pages/GlobalSearchPage'));
const DownloadHistoryPage = lazy(() => import('./pages/DownloadHistoryPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const CGPACalculatorPage = lazy(() => import('./pages/CGPACalculatorPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CodingPage = lazy(() => import('./pages/CodingPage'));
const SyllabusPage = lazy(() => import('./pages/SyllabusPage'));
const ExamSchedulePage = lazy(() => import('./pages/ExamSchedulePage'));
const TimetablePage = lazy(() => import('./pages/TimetablePage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));

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

function LazyPage({ children }) {
  return <Suspense fallback={<AppLoader />}>{children}</Suspense>;
}

// ── Route tree ────────────────────────────────────────────────
export default function App() {
  return (
    <div className="app-shell">
      <div className="app-bg-video" aria-hidden="true">
        <video autoPlay muted loop playsInline>
          <source src="/Background.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="app-shell__content">
        <Routes>

      {/* ── Public ─────────────────────────────────────────── */}
      <Route path="/login" element={
        <GuestRoute><LazyPage><Login /></LazyPage></GuestRoute>
      } />

      <Route path="/admin-login" element={
        <AdminGuestRoute><LazyPage><AdminLogin /></LazyPage></AdminGuestRoute>
      } />

      {/* ── Student (protected) ────────────────────────────── */}
      <Route element={<ProtectedRoute><LazyPage><MainLayout /></LazyPage></ProtectedRoute>}>
        <Route path="/dashboard"                          element={<LazyPage><Dashboard /></LazyPage>} />
        <Route path="/r/:regulation"                      element={<LazyPage><RegulationPage /></LazyPage>} />
        <Route path="/r/:regulation/:branch/:subject"     element={<LazyPage><SubjectPage /></LazyPage>} />
        <Route path="/profile"                            element={<LazyPage><ProfilePage /></LazyPage>} />
        <Route path="/search"                             element={<LazyPage><GlobalSearchPage /></LazyPage>} />
        <Route path="/downloads"                          element={<LazyPage><DownloadHistoryPage /></LazyPage>} />
        <Route path="/coding"                             element={<LazyPage><CodingPage /></LazyPage>} />
        <Route path="/syllabus"                           element={<LazyPage><SyllabusPage /></LazyPage>} />
        <Route path="/exams"                              element={<LazyPage><ExamSchedulePage /></LazyPage>} />
        <Route path="/timetable"                          element={<LazyPage><TimetablePage /></LazyPage>} />
        <Route path="/events"                             element={<LazyPage><EventsPage /></LazyPage>} />
        <Route path="/cgpa"                               element={<LazyPage><CGPACalculatorPage /></LazyPage>} />
        <Route path="/feedback"                           element={<LazyPage><FeedbackPage /></LazyPage>} />
      </Route>

      {/* ── Admin (protected + role check) ─────────────────── */}
      <Route path="/admin" element={<AdminRoute><LazyPage><MainLayout /></LazyPage></AdminRoute>}>
        <Route index element={<LazyPage><AdminPanel /></LazyPage>} />
        <Route path="analytics" element={<LazyPage><AnalyticsPage /></LazyPage>} />
        <Route path="users"     element={<LazyPage><UserManagementPage /></LazyPage>} />
      </Route>

      {/* ── Catch-all ──────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to="/login"   replace />} />
          <Route path="*"  element={<LazyPage><NotFoundPage /></LazyPage>} />
        </Routes>
      </div>
    </div>
  );
}
