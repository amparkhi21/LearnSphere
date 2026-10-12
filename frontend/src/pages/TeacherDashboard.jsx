import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, Users, Star, IndianRupee } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { courseApi } from "../api/course.api";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/constants";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  </div>
);

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    courseApi
      .mine()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><PageLoader /></Layout>;

  const totalStudents = courses.reduce((s, c) => s + (c.enrollmentCount || 0), 0);
  const avgRating = courses.length ? (courses.reduce((s, c) => s + (c.ratingAverage || 0), 0) / courses.length).toFixed(1) : 0;
  const totalEarnings = courses.reduce((s, c) => s + (c.enrollmentCount || 0) * (c.discountPrice > 0 ? c.discountPrice : c.price), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title">Teacher Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage your courses, {user?.name?.split(" ")[0]}.</p>
          </div>
          <Link to="/teacher/courses/new" className="btn-primary">
            <Plus size={16} /> New course
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={BookOpen} label="Total courses" value={courses.length} color="bg-brand-gradient" />
          <StatCard icon={Users} label="Total students" value={totalStudents} color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
          <StatCard icon={Star} label="Avg. rating" value={avgRating} color="bg-gradient-to-br from-amber-500 to-amber-600" />
          <StatCard icon={IndianRupee} label="Estimated earnings" value={formatCurrency(totalEarnings)} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
        </div>

        <h2 className="text-lg font-bold text-slate-900 mb-4">Your courses</h2>
        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses created yet"
            description="Create your first course — you can use AI to generate a module outline in seconds."
            action={<Link to="/teacher/courses/new" className="btn-primary">Create a course</Link>}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => (
              <div key={c._id} className="card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${c.status === "published" ? "badge-green" : "badge-amber"}`}>{c.status}</span>
                  <span className="text-xs text-slate-400">{c.enrollmentCount || 0} students</span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">{c.title}</h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-900">{formatCurrency(c.discountPrice > 0 ? c.discountPrice : c.price)}</span>
                  <Link to={`/courses/${c.slug || c._id}`} className="text-brand-600 font-semibold text-sm hover:underline">
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TeacherDashboard;
