import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Landing from './pages/Landing'
import Login from './components/auth/Login'
import Register from './components/auth/Register'

// Admin
import AdminLayout from './portals/admin/AdminLayout'
import AdminDashboard from './portals/admin/Dashboard'
import UsersManagement from './portals/admin/UsersManagement'
import AdminAnalytics from './portals/admin/Analytics'

// Recruiter
import RecruiterLayout from './portals/recruiter/RecruiterLayout'
import RecruiterDashboard from './portals/recruiter/Dashboard'
import JobCreate from './portals/recruiter/JobCreate'
import JobList from './portals/recruiter/JobList'
import Applicants from './portals/recruiter/Applicants'
import ScheduleInterview from './portals/recruiter/ScheduleInterview'
import InterviewResults from './portals/recruiter/InterviewResults'

// Candidate
import CandidateLayout from './portals/candidate/CandidateLayout'
import CandidateDashboard from './portals/candidate/Dashboard'
import JobBoard from './portals/candidate/JobBoard'
import JobDetail from './portals/candidate/JobDetail'
import MyApplications from './portals/candidate/MyApplications'
import PracticeArena from './portals/candidate/PracticeArena'
import CandidateProfile from './portals/candidate/Profile'

// Interview
import AIInterviewRoom from './components/interview/AIInterviewRoom'
import VideoInterviewRoom from './components/interview/VideoInterviewRoom'
import InterviewReport from './components/interview/InterviewReport'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />
  }
  return children
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin Portal */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="analytics" element={<AdminAnalytics />} />
      </Route>

      {/* Recruiter Portal */}
      <Route path="/recruiter" element={
        <ProtectedRoute allowedRoles={['recruiter']}>
          <RecruiterLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<RecruiterDashboard />} />
        <Route path="jobs" element={<JobList />} />
        <Route path="jobs/create" element={<JobCreate />} />
        <Route path="jobs/:id/edit" element={<JobCreate editMode />} />
        <Route path="applicants" element={<Applicants />} />
        <Route path="schedule" element={<ScheduleInterview />} />
        <Route path="results/:sessionId" element={<InterviewResults />} />
      </Route>

      {/* Candidate Portal */}
      <Route path="/candidate" element={
        <ProtectedRoute allowedRoles={['candidate']}>
          <CandidateLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CandidateDashboard />} />
        <Route path="jobs" element={<JobBoard />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="applications" element={<MyApplications />} />
        <Route path="practice" element={<PracticeArena />} />
        <Route path="profile" element={<CandidateProfile />} />
      </Route>

      {/* Interview Rooms (standalone, no portal sidebar) */}
      <Route path="/interview/ai/:interviewId" element={
        <ProtectedRoute allowedRoles={['candidate']}>
          <AIInterviewRoom />
        </ProtectedRoute>
      } />
      <Route path="/interview/video/:roomId" element={
        <ProtectedRoute allowedRoles={['recruiter', 'candidate']}>
          <VideoInterviewRoom />
        </ProtectedRoute>
      } />
      <Route path="/interview/practice/:sessionId" element={
        <ProtectedRoute allowedRoles={['candidate']}>
          <AIInterviewRoom isPractice />
        </ProtectedRoute>
      } />
      <Route path="/interview/report/:sessionId" element={
        <ProtectedRoute allowedRoles={['recruiter', 'candidate']}>
          <InterviewReport />
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
