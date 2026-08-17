import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, BookOpen, Users, Brain, Target, Upload, MessageSquare } from "lucide-react";
import Layout from "../components/layout/Layout";
import CourseCard from "../components/ui/CourseCard";
import { courseApi } from "../api/course.api";

const features = [
  { icon: Brain, title: "AI Study Plans", desc: "Get a personalized week-by-week syllabus tailored to your exam and pace." },
  { icon: Target, title: "AI Practice Quizzes", desc: "Instantly generate topic-wise MCQs with explanations to test yourself." },
  { icon: Upload, title: "Share Resources", desc: "Upload notes, PDFs and links — discover what other learners are sharing." },
  { icon: MessageSquare, title: "Doubt-Solving Communities", desc: "Ask questions in subject communities and get help from peers & mentors." },
  { icon: BookOpen, title: "Low-Cost Courses", desc: "Learn from verified teachers at prices built for students, not corporates." },
  { icon: Users, title: "Progress Tracking", desc: "Dashboards that show exactly where you stand and what to do next." },
];

const LandingPage = () => {
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    courseApi
      .list({ limit: 4 })
      .then((d) => setCourses(d.courses || []))
      .catch(() => {});
  }, []);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-gradient-soft" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-200/40 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <span className="inline-flex items-center gap-1.5 badge-brand bg-white shadow-soft mb-6">
            <Sparkles size={14} /> AI-Powered Exam Prep
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.1]">
            Learn smarter with{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">AI-personalized</span> study plans
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Buy low-cost courses from real teachers, generate a custom syllabus in seconds, practice with
            AI-generated quizzes, and get your doubts solved in subject communities — all in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="btn-primary px-7 py-3 text-base">
              Get started free <ArrowRight size={18} />
            </Link>
            <Link to="/courses" className="btn-secondary px-7 py-3 text-base">
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="section-title">Everything you need to ace your exam</h2>
          <p className="text-slate-500 mt-2">One platform for courses, resources, community, and AI-driven prep.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="w-11 h-11 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-4">
                <f.icon size={20} className="text-brand-600" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-1.5">{f.title}</h3>
              <p className="text-sm text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Courses */}
      {courses.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="section-title">Popular courses</h2>
            <Link to="/courses" className="text-sm font-semibold text-brand-600 flex items-center gap-1 hover:gap-2 transition-all">
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {courses.map((c) => (
              <CourseCard key={c._id} course={c} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="rounded-3xl bg-brand-gradient p-10 sm:p-14 text-center text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-2xl" />
          <h2 className="text-3xl font-extrabold mb-3">Ready to study smarter?</h2>
          <p className="text-brand-100 mb-8 max-w-xl mx-auto">
            Join thousands of students generating AI study plans and passing their exams with confidence.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-7 py-3 rounded-xl hover:shadow-elevated transition-all">
            Create your free account <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default LandingPage;
