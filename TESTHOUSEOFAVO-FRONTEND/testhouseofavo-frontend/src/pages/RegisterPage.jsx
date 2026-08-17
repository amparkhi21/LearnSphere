import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { GraduationCap, Mail, Lock, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { STREAMS, EXAM_TAGS } from "../utils/constants";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", stream: "", examTarget: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(form);
      toast.success(`Welcome to LearnSphere, ${user.name.split(" ")[0]}!`);
      navigate(user.role === "teacher" ? "/teacher/dashboard" : "/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-gradient-soft px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 font-extrabold text-xl text-slate-900 mb-8">
          <span className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </span>
          LearnSphere
        </Link>
        <div className="card p-8 fade-in">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 mb-6">Start learning or start teaching — it's free.</p>

          <div className="grid grid-cols-2 gap-2 mb-5">
            {["student", "teacher"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, role: r })}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  form.role === r ? "bg-brand-gradient text-white border-transparent shadow-soft" : "border-slate-200 text-slate-600"
                }`}
              >
                {r === "student" ? "I'm a Student" : "I'm a Teacher"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required className="input pl-10" placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" required className="input pl-10" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="password" required minLength={6} className="input pl-10" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>

            {form.role === "student" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Stream</label>
                  <select className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}>
                    <option value="">Select</option>
                    {STREAMS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Exam target</label>
                  <select className="input" value={form.examTarget} onChange={(e) => setForm({ ...form, examTarget: e.target.value })}>
                    <option value="">Select</option>
                    {EXAM_TAGS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
