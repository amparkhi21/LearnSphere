import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import Layout from "../components/layout/Layout";
import CourseCard from "../components/ui/CourseCard";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { courseApi } from "../api/course.api";
import { enrollmentApi } from "../api/enrollment.api";
import { useAuth } from "../context/AuthContext";
import { STREAMS, EXAM_TAGS, LEVELS } from "../utils/constants";

const CourseMarketplace = () => {
  const { user, loading: authLoading } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", stream: "", examTag: "", level: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [enrollmentIds, setEnrollmentIds] = useState(new Set());
  const [enrollmentStatus, setEnrollmentStatus] = useState("loading");
  const enrollmentRequestId = useRef(0);

  const refreshEnrollments = useCallback(async () => {
    const requestId = ++enrollmentRequestId.current;
    setEnrollmentStatus("loading");
    try {
      const enrollments = await enrollmentApi.mine();
      if (requestId !== enrollmentRequestId.current) return;
      setEnrollmentIds(new Set((enrollments || []).map((item) => {
        const enrolledCourse = item.course;
        return String(typeof enrolledCourse === "object" ? enrolledCourse?._id : enrolledCourse);
      })));
      setEnrollmentStatus("ready");
    } catch (_) {
      if (requestId === enrollmentRequestId.current) setEnrollmentStatus("error");
    }
  }, []);

  useEffect(() => {
    if (authLoading) {
      enrollmentRequestId.current += 1;
      return;
    }
    setEnrollmentIds(new Set());
    if (user?.role === "student") refreshEnrollments();
    else {
      enrollmentRequestId.current += 1;
      setEnrollmentStatus("not-applicable");
    }
  }, [authLoading, user?._id, user?.id, user?.role, refreshEnrollments]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
      const data = await courseApi.list(params);
      setCourses(data.courses || []);
    } catch (e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(fetchCourses, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="section-title mb-2">Course Marketplace</h1>
          <p className="text-slate-500">Find the right course for your stream and exam.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-11"
              placeholder="Search courses, subjects, topics..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>
          <button onClick={() => setShowFilters((s) => !s)} className="btn-secondary">
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-3 gap-3 mb-8 p-4 rounded-2xl bg-white border border-slate-100 fade-in">
            <select className="input" value={filters.stream} onChange={(e) => setFilters({ ...filters, stream: e.target.value })}>
              <option value="">All streams</option>
              {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input" value={filters.examTag} onChange={(e) => setFilters({ ...filters, examTag: e.target.value })}>
              <option value="">All exams</option>
              {EXAM_TAGS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input" value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
              <option value="">All levels</option>
              {LEVELS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
        )}

        {enrollmentStatus === "error" && user?.role === "student" && <div role="alert" className="mb-5 flex items-center gap-3 text-sm text-amber-800">Could not check your enrollment status. <button type="button" onClick={refreshEnrollments} className="btn-secondary">Retry</button></div>}

        {loading ? (
          <PageLoader />
        ) : courses.length === 0 ? (
          <EmptyState icon={Search} title="No courses found" description="Try adjusting your search or filters." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((c) => (
              <CourseCard key={c._id} course={c} enrollmentStatus={user?.role === "student" ? (enrollmentStatus === "ready" ? (enrollmentIds.has(String(c._id)) ? "enrolled" : "not-enrolled") : enrollmentStatus) : "not-applicable"} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CourseMarketplace;
