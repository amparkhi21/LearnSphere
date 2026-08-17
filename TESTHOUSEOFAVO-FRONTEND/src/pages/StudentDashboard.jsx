import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Brain, Target, Bookmark, ArrowRight, TrendingUp } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { enrollmentApi } from "../api/enrollment.api";
import { studyPlanApi } from "../api/studyPlan.api";
import { quizAttemptApi } from "../api/quiz.api";
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

const StudentDashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [studyPlans, setStudyPlans] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([enrollmentApi.mine(), studyPlanApi.mine(), quizAttemptApi.mine()])
      .then(([e, s, a]) => {
        setEnrollments(e || []);
        setStudyPlans(s || []);
        setAttempts(a || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Layout><PageLoader /></Layout>;

  const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="section-title">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-slate-500 mt-1">Here's where you left off.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={BookOpen} label="Enrolled courses" value={enrollments.length} color="bg-brand-gradient" />
          <StatCard icon={Brain} label="AI study plans" value={studyPlans.length} color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
          <StatCard icon={Target} label="Quizzes attempted" value={attempts.length} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <StatCard icon={TrendingUp} label="Avg. quiz score" value={`${avgScore}%`} color="bg-gradient-to-br from-amber-500 to-amber-600" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">My Courses</h2>
              <Link to="/courses" className="text-sm font-semibold text-brand-600 flex items-center gap-1">
                Browse more <ArrowRight size={14} />
              </Link>
            </div>
            {enrollments.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No courses yet"
                description="Enroll in a course to start tracking your progress here."
                action={<Link to="/courses" className="btn-primary">Browse courses</Link>}
              />
            ) : (
              <div className="space-y-3">
                {enrollments.map((e) => (
                  <Link key={e._id} to={`/courses/${e.course?.slug || e.course?._id}`} className="card p-4 flex items-center gap-4">
                    <span className="w-12 h-12 rounded-xl bg-brand-gradient-soft flex items-center justify-center font-bold text-brand-600 shrink-0">
                      {e.course?.subject?.[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{e.course?.title}</p>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-brand-gradient h-1.5 rounded-full" style={{ width: `${e.progress}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-500 shrink-0">{e.progress}%</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">AI Study Plans</h2>
              <Link to="/syllabus-generator" className="text-sm font-semibold text-brand-600 flex items-center gap-1">
                New <ArrowRight size={14} />
              </Link>
            </div>
            {studyPlans.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No study plan yet"
                description="Generate a personalized plan in seconds."
                action={<Link to="/syllabus-generator" className="btn-primary text-sm">Generate plan</Link>}
              />
            ) : (
              <div className="space-y-3">
                {studyPlans.slice(0, 4).map((p) => (
                  <Link key={p._id} to={`/syllabus-generator/${p._id}`} className="card p-4 block">
                    <p className="font-semibold text-slate-800 text-sm">{p.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{p.durationWeeks} weeks • {p.hoursPerDay}h/day</p>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Link to="/bookmarks" className="card p-4 flex-1 text-center">
                <Bookmark size={18} className="mx-auto text-brand-500 mb-1" />
                <span className="text-xs font-semibold text-slate-600">Bookmarks</span>
              </Link>
              <Link to="/quizzes" className="card p-4 flex-1 text-center">
                <Target size={18} className="mx-auto text-brand-500 mb-1" />
                <span className="text-xs font-semibold text-slate-600">Practice</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudentDashboard;
