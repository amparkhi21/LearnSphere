import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Brain, Target, Bookmark, ArrowRight, TrendingUp, Video, CalendarDays, RefreshCw } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { enrollmentApi } from "../api/enrollment.api";
import { studyPlanApi } from "../api/studyPlan.api";
import { quizAttemptApi, quizApi } from "../api/quiz.api";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/constants";
import { resourceApi } from "../api/resource.api";
import { liveClassApi } from "../api/liveClass.api";

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

const LiveClassCard = ({ item }) => {
  const isLive = item.status === "live";
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <span className={`badge ${isLive ? "badge-green" : "badge-amber"}`}>{isLive ? "Live now" : "Upcoming"}</span>
        <span className="text-xs text-slate-500 truncate">{item.course?.title}</span>
      </div>
      <h3 className="font-semibold text-slate-900 mt-3">{item.title}</h3>
      <p className="text-sm text-slate-500">{item.subject || item.course?.subject} · {item.teacher?.name}</p>
      <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><CalendarDays size={13} />{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))} · {item.durationMinutes} min</p>
      {isLive && <Link to={`/live-classes/${item._id}/room`} className="btn-primary mt-4 justify-center"><Video size={15} /> Join Live Class</Link>}
    </article>
  );
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [studyPlans, setStudyPlans] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [resources, setResources] = useState([]);
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveClasses, setLiveClasses] = useState([]);
  const [liveClassesLoading, setLiveClassesLoading] = useState(true);
  const [liveClassesError, setLiveClassesError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEnrollments([]);
    setStudyPlans([]);
    setAttempts([]);
    setResources([]);
    setMyQuizzes([]);
    Promise.all([enrollmentApi.mine(), studyPlanApi.mine(), quizAttemptApi.mine(), resourceApi.list({ limit: 4 }), quizApi.mine({ limit: 4 })])
      .then(([e, s, a, r, q]) => {
        if (!active) return;
        setEnrollments(e || []);
        setStudyPlans(s || []);
        setAttempts(a || []);
        setResources(r?.resources || []);
        setMyQuizzes(q?.quizzes || []);
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?._id]);

  useEffect(() => {
    let active = true;
    setLiveClasses([]);
    const refreshClasses = (initial = false) => {
      if (initial) setLiveClassesLoading(true);
      liveClassApi.studentMine()
        .then((items) => { if (active) { setLiveClasses(items || []); setLiveClassesError(""); } })
        .catch((err) => { if (active) setLiveClassesError(err.message || "Could not load live classes."); })
        .finally(() => { if (active && initial) setLiveClassesLoading(false); });
    };
    refreshClasses(true);
    const timer = setInterval(() => refreshClasses(), 30000);
    return () => { active = false; clearInterval(timer); };
  }, [user?._id]);

  if (loading) return <Layout><PageLoader /></Layout>;

  const avgScore = attempts.length ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length) : 0;
  const liveNow = liveClasses.filter((item) => item.status === "live");
  const upcomingClasses = liveClasses.filter((item) => item.status === "scheduled");

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="section-title">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-slate-500 mt-1">Here's where you left off.</p>
        </div>
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Learning Resources</h2><Link to="/resources" className="text-sm font-semibold text-brand-600 flex items-center gap-1">Browse library <ArrowRight size={14} /></Link></div>
          {resources.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{resources.map((r) => <Link key={r._id} to="/resources" className="card p-4"><p className="font-semibold text-sm">{r.title}</p><p className="text-xs text-slate-500 mt-1">{r.subject} · {r.uploadedBy?.name || "Teacher"}</p></Link>)}</div> : <p className="text-sm text-slate-500">No teacher resources available yet.</p>}
        </section>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard icon={BookOpen} label="Enrolled courses" value={enrollments.length} color="bg-brand-gradient" />
          <StatCard icon={Brain} label="AI study plans" value={studyPlans.length} color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
          <StatCard icon={Target} label="Quizzes attempted" value={attempts.length} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
          <StatCard icon={TrendingUp} label="Avg. quiz score" value={`${avgScore}%`} color="bg-gradient-to-br from-amber-500 to-amber-600" />
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Video size={18} className="text-brand-600" /> Live Classes</h2></div>
          {liveClassesLoading ? <p role="status" className="text-sm text-slate-500">Loading live classes…</p> : liveClassesError ? <div role="alert" className="flex items-center gap-3 text-sm text-red-700">{liveClassesError}<button onClick={() => { setLiveClassesError(""); setLiveClassesLoading(true); liveClassApi.studentMine().then((items) => setLiveClasses(items || [])).catch((err) => setLiveClassesError(err.message)).finally(() => setLiveClassesLoading(false)); }} className="btn-secondary"><RefreshCw size={14} /> Retry</button></div> : <div className="space-y-7">
            <section aria-labelledby="live-now-heading">
              <h3 id="live-now-heading" className="font-semibold text-slate-800 mb-3">Live Now</h3>
              {liveNow.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{liveNow.map((item) => <LiveClassCard key={item._id} item={item} />)}</div> : <p className="text-sm text-slate-500">No live classes right now.</p>}
            </section>
            <section aria-labelledby="upcoming-live-classes-heading">
              <h3 id="upcoming-live-classes-heading" className="font-semibold text-slate-800 mb-3">Upcoming Classes</h3>
              {upcomingClasses.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{upcomingClasses.map((item) => <LiveClassCard key={item._id} item={item} />)}</div> : <p className="text-sm text-slate-500">No upcoming live classes for your enrolled courses.</p>}
            </section>
          </div>}
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">My Generated Quizzes</h2><Link to="/quizzes" className="text-sm font-semibold text-brand-600 flex items-center gap-1">Practice quizzes <ArrowRight size={14} /></Link></div>
          {myQuizzes.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{myQuizzes.map((quiz) => <Link key={quiz._id} to={`/quizzes/${quiz._id}`} className="card p-4"><p className="font-semibold text-sm text-slate-800">{quiz.title}</p><p className="text-xs text-slate-500 mt-1">{quiz.subject} · {quiz.questions?.length || 0} questions</p></Link>)}</div> : <p className="text-sm text-slate-500">You haven't generated a quiz yet.</p>}
        </section>

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
              <Link to="/study-plan" className="text-sm font-semibold text-brand-600 flex items-center gap-1">
                New <ArrowRight size={14} />
              </Link>
            </div>
            {studyPlans.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No study plan yet"
                description="Generate a personalized plan in seconds."
                action={<Link to="/study-plan" className="btn-primary text-sm">Generate plan</Link>}
              />
            ) : (
              <div className="space-y-3">
                {studyPlans.slice(0, 4).map((p) => (
                  <Link key={p._id} to={`/study-plan/${p._id}`} className="card p-4 block">
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
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-900">Learning Resources</h2><Link to="/resources" className="text-sm font-semibold text-brand-600 flex items-center gap-1">Browse library <ArrowRight size={14} /></Link></div>
          {resources.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{resources.map((r) => <Link key={r._id} to="/resources" className="card p-4"><p className="font-semibold text-sm">{r.title}</p><p className="text-xs text-slate-500 mt-1">{r.subject} · {r.uploadedBy?.name || "Teacher"}</p></Link>)}</div> : <p className="text-sm text-slate-500">No teacher resources available yet.</p>}
        </section>
      </div>
    </Layout>
  );
};

export default StudentDashboard;
