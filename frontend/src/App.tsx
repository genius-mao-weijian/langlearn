import { Routes, Route } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LearnPage from './pages/LearnPage';
import ExercisePage from './pages/ExercisePage';
import DashboardPage from './pages/DashboardPage';
import AchievementsPage from './pages/AchievementsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/exercise/:id" element={<ProtectedRoute><ExercisePage /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
        <Route path="*" element={
          <div className="container center" style={{ minHeight: 400 }}>
            <div className="empty">
              <div className="empty__icon">🧭</div>
              <h2>404 · 页面未找到</h2>
              <p className="muted">
                <a href="/" style={{ color: '#4f46e5' }}>返回首页</a>
              </p>
            </div>
          </div>
        } />
      </Route>
    </Routes>
  );
}
