import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Star, Users, Clock, BadgeCheck, CheckCircle2, PlayCircle } from "lucide-react";
import Layout from "../components/layout/Layout";
import { PageLoader } from "../components/ui/Spinner";
import { courseApi } from "../api/course.api";
import { enrollmentApi } from "../api/enrollment.api";
import { paymentApi } from "../api/payment.api";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/constants";

const CourseDetails = () => {
  const { idOrSlug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    courseApi
      .getOne(idOrSlug)
      .then(setCourse)
      .catch(() => toast.error("Course not found"))
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  const handleEnroll = async () => {
    if (!user) return navigate("/login");
    setEnrolling(true);
    try {
      const price = course.discountPrice > 0 ? course.discountPrice : course.price;
      if (price > 0) {
        const { paymentId } = await paymentApi.createOrder({ courseId: course._id });
        // Mock/test-mode: instantly verify (in production this would happen after checkout widget)
        await paymentApi.verify({ paymentId, providerOrderId: "mock", providerPaymentId: "mock", signature: "mock" });
        await enrollmentApi.enroll({ courseId: course._id, paymentId });
      } else {
        await enrollmentApi.enroll({ courseId: course._id });
      }
      toast.success("Enrolled successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;
  if (!course) return null;

  const price = course.discountPrice > 0 ? course.discountPrice : course.price;

  return (
    <Layout>
      <div className="bg-brand-gradient-soft border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <span className="badge-brand bg-white mb-4">{course.subject}</span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight mb-4">{course.title}</h1>
            <p className="text-slate-600 mb-5">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1"><Star size={15} className="text-amber-400 fill-amber-400" /> {course.ratingAverage?.toFixed(1) || "New"} ({course.ratingCount || 0} reviews)</span>
              <span className="flex items-center gap-1"><Users size={15} /> {course.enrollmentCount || 0} students</span>
              {course.duration && <span className="flex items-center gap-1"><Clock size={15} /> {course.duration}</span>}
            </div>
            <div className="flex items-center gap-3 mt-6 p-4 bg-white rounded-2xl border border-slate-100 max-w-md">
              <span className="w-11 h-11 rounded-full bg-brand-gradient text-white font-bold flex items-center justify-center">
                {course.teacher?.name?.[0]}
              </span>
              <div>
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  {course.teacher?.name} {course.teacher?.isVerifiedTeacher && <BadgeCheck size={15} className="text-brand-500" />}
                </p>
                <p className="text-xs text-slate-500">{course.teacher?.bio || "Instructor"}</p>
              </div>
            </div>
          </div>

          <div className="card p-6 h-fit sticky top-24">
            <div className="mb-4">
              {price > 0 ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">{formatCurrency(price)}</span>
                  {course.discountPrice > 0 && <span className="text-slate-400 line-through text-sm">{formatCurrency(course.price)}</span>}
                </div>
              ) : (
                <span className="text-3xl font-extrabold text-emerald-600">Free</span>
              )}
            </div>
            <button onClick={handleEnroll} disabled={enrolling} className="btn-primary w-full justify-center py-3 mb-3">
              {enrolling ? "Processing..." : price > 0 ? "Buy & Enroll" : "Enroll for free"}
            </button>
            <p className="text-xs text-center text-slate-400">Instant access • Learn at your own pace</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-xl font-bold text-slate-900 mb-5">Course content</h2>
        <div className="space-y-3 max-w-3xl">
          {course.modules?.length ? (
            course.modules.map((m, i) => (
              <div key={i} className="card p-4 flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 font-semibold flex items-center justify-center text-sm shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-slate-800 flex items-center gap-2">
                    <PlayCircle size={16} className="text-slate-400" /> {m.title}
                  </p>
                  {m.description && <p className="text-sm text-slate-500 mt-1">{m.description}</p>}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">Module details will be added soon.</p>
          )}
        </div>

        <h2 className="text-xl font-bold text-slate-900 mt-12 mb-4">What you'll get</h2>
        <ul className="grid sm:grid-cols-2 gap-3 max-w-3xl">
          {["Lifetime access to course content", "Downloadable notes & resources", "AI-generated practice quizzes", "Access to subject community", "Certificate on completion"].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> {f}
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
};

export default CourseDetails;
