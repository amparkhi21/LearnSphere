import React from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CourseMarketplace from "./pages/CourseMarketplace";
import CourseDetails from "./pages/CourseDetails";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateCourse from "./pages/CreateCourse";
import SyllabusGenerator from "./pages/SyllabusGenerator";
import ResourceLibrary from "./pages/ResourceLibrary";
import CommunityList from "./pages/CommunityList";
import CommunityDetail from "./pages/CommunityDetail";
import PostDetail from "./pages/PostDetail";
import QuizPractice from "./pages/QuizPractice";
import QuizAttemptPage from "./pages/QuizAttemptPage";
import ProfilePage from "./pages/ProfilePage";
import BookmarksPage from "./pages/BookmarksPage";
import NotificationsPage from "./pages/NotificationsPage";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/courses" element={<CourseMarketplace />} />
      <Route path="/courses/:idOrSlug" element={<CourseDetails />} />
      <Route path="/resources" element={<ResourceLibrary />} />
      <Route path="/community" element={<CommunityList />} />
      <Route path="/community/:slug" element={<CommunityDetail />} />
      <Route path="/community/posts/:id" element={<PostDetail />} />
      <Route path="/quizzes" element={<QuizPractice />} />
      <Route path="/quizzes/:id" element={<QuizAttemptPage />} />

      {/* Student */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={["student"]}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/syllabus-generator"
        element={
          <ProtectedRoute roles={["student"]}>
            <SyllabusGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/syllabus-generator/:id"
        element={
          <ProtectedRoute roles={["student"]}>
            <SyllabusGenerator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookmarks"
        element={
          <ProtectedRoute>
            <BookmarksPage />
          </ProtectedRoute>
        }
      />

      {/* Teacher */}
      <Route
        path="/teacher/dashboard"
        element={
          <ProtectedRoute roles={["teacher", "admin"]}>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher/courses/new"
        element={
          <ProtectedRoute roles={["teacher", "admin"]}>
            <CreateCourse />
          </ProtectedRoute>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      {/* Shared authenticated */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
