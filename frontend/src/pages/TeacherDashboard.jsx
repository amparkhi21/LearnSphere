import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, BookOpen, Users, Star, IndianRupee, Archive } from "lucide-react";
import toast from "react-hot-toast";
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
  const [archivingId, setArchivingId] = useState(null);

  useEffect(() => {
    courseApi
      .mine()
      .then(setCourses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleArchive = async (course) => {
    if (!window.confirm(`Archive “${course.title}”? Student enrollments will be preserved.`)) return;
    setArchivingId(course._id);
    try {
      await courseApi.remove(course._id);
      setCourses((current) => current.filter((item) => item._id !== course._id));
      toast.success("Course archived");
    } catch (err) {
      toast.error(err.message || "Could not archive course");
    } finally { setArchivingId(null); }
  };

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
                <Link to={`/courses/${c.slug || c._id}`} className="block cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 focus-visible:outline-offset-4">
                <div className="relative h-32 rounded-xl bg-brand-gradient-soft overflow-hidden flex items-center justify-center mb-3">
                  <span className="text-4xl font-black text-brand-200">{c.subject?.[0] || "C"}</span>
                  {c.thumbnail && <img src={c.thumbnail} alt={`${c.title} course cover`} className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge ${c.status === "published" ? "badge-green" : "badge-amber"}`}>{c.status}</span>
                  <span className="text-xs text-slate-400">{c.enrollmentCount || 0} students</span>
                </div>
                <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2 hover:text-brand-600">{c.title}</h3>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(c.discountPrice > 0 ? c.discountPrice : c.price)}</span>
                </Link>
                <div className="flex justify-end mt-3">
                  <button type="button" onClick={() => handleArchive(c)} disabled={archivingId === c._id} className="inline-flex items-center gap-1 text-red-600 font-semibold text-sm hover:underline disabled:opacity-50"><Archive size={14} /> {archivingId === c._id ? "Archiving…" : "Delete"}</button>
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
