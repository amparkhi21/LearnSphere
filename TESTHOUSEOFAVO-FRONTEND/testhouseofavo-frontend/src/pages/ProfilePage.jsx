import React, { useState } from "react";
import toast from "react-hot-toast";
import { User, BadgeCheck } from "lucide-react";
import Layout from "../components/layout/Layout";
import { useAuth } from "../context/AuthContext";
import { userApi } from "../api/user.api";
import { STREAMS, EXAM_TAGS } from "../utils/constants";

const ProfilePage = () => {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    stream: user?.stream || "",
    examTarget: user?.examTarget || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await userApi.updateMe(form);
      setUser(updated);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <span className="w-16 h-16 rounded-2xl bg-brand-gradient text-white text-2xl font-bold flex items-center justify-center">
            {user.name?.[0]}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              {user.name} {user.isVerifiedTeacher && <BadgeCheck size={18} className="text-brand-500" />}
            </h1>
            <span className="badge-brand capitalize">{user.role}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea rows={3} className="input" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          {user.role === "student" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Stream</label>
                <select className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}>
                  <option value="">Select</option>
                  {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Exam target</label>
                <select className="input" value={form.examTarget} onChange={(e) => setForm({ ...form, examTarget: e.target.value })}>
                  <option value="">Select</option>
                  {EXAM_TAGS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input disabled className="input bg-slate-50 text-slate-400" value={user.email} />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default ProfilePage;
