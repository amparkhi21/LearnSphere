import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Users, Search, Plus, MessageSquare } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import { PageLoader } from "../components/ui/Spinner";
import { communityApi } from "../api/community.api";
import { useAuth } from "../context/AuthContext";
import { STREAMS } from "../utils/constants";

const CommunityList = () => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", subject: "" });
  const [creating, setCreating] = useState(false);

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      const data = await communityApi.list(q ? { q } : {});
      setCommunities(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchCommunities, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const community = await communityApi.create(form);
      toast.success("Community created!");
      setShowCreate(false);
      window.location.href = `/community/${community.slug}`;
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="section-title">Communities</h1>
            <p className="text-slate-500 mt-1">Join subject communities, share doubts, and help each other.</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              <Plus size={16} /> Create community
            </button>
          )}
        </div>

        <div className="relative mb-8 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-11" placeholder="Search communities..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <PageLoader />
        ) : communities.length === 0 ? (
          <EmptyState icon={Users} title="No communities yet" description="Start one for your subject or exam." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {communities.map((c) => (
              <Link key={c._id} to={`/community/${c.slug}`} className="card p-5">
                <div className="w-11 h-11 rounded-xl bg-brand-gradient-soft flex items-center justify-center mb-3">
                  <MessageSquare size={18} className="text-brand-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">{c.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-3">{c.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Users size={12} /> {c.memberCount || 0} members</span>
                  <span>{c.postCount || 0} posts</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create a community">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Subject</label>
            <select required className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
              <option value="">Select</option>
              {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" disabled={creating} className="btn-primary w-full justify-center py-2.5">
            {creating ? "Creating..." : "Create community"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default CommunityList;
