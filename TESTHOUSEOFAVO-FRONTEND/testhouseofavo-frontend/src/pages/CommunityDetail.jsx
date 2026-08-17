import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Users, Plus, ArrowUp, ArrowDown, MessageCircle, CheckCircle2, HelpCircle } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import { PageLoader } from "../components/ui/Spinner";
import { communityApi, postApi } from "../api/community.api";
import { useAuth } from "../context/AuthContext";

const CommunityDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", isDoubt: false });
  const [posting, setPosting] = useState(false);
  const [filterDoubts, setFilterDoubts] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await communityApi.getOne(slug);
      setCommunity(c);
      const p = await postApi.list({ community: c._id, ...(filterDoubts ? { isDoubt: true } : {}) });
      setPosts(p.posts || []);
    } catch (err) {
      toast.error("Community not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, filterDoubts]);

  const handleJoin = async () => {
    if (!user) return toast.error("Log in to join");
    try {
      await communityApi.join(community._id);
      toast.success("Joined community!");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      await postApi.create({ community: community._id, ...form });
      toast.success(form.isDoubt ? "Doubt posted!" : "Post created!");
      setShowNewPost(false);
      setForm({ title: "", content: "", isDoubt: false });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleVote = async (postId, direction) => {
    if (!user) return toast.error("Log in to vote");
    try {
      await postApi.vote(postId, direction);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;
  if (!community) return null;

  const isMember = user && community.members?.some((m) => (m._id || m) === user._id);

  return (
    <Layout>
      <div className="bg-brand-gradient-soft border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{community.name}</h1>
            <p className="text-slate-600 mt-1">{community.description}</p>
            <span className="flex items-center gap-1 text-sm text-slate-500 mt-2"><Users size={14} /> {community.memberCount} members</span>
          </div>
          {!isMember && (
            <button onClick={handleJoin} className="btn-primary">Join community</button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2">
            <button onClick={() => setFilterDoubts(false)} className={`px-4 py-2 rounded-xl text-sm font-semibold ${!filterDoubts ? "bg-brand-gradient text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              All posts
            </button>
            <button onClick={() => setFilterDoubts(true)} className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${filterDoubts ? "bg-brand-gradient text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
              <HelpCircle size={14} /> Doubts
            </button>
          </div>
          {user && (
            <button onClick={() => setShowNewPost(true)} className="btn-secondary">
              <Plus size={15} /> New post
            </button>
          )}
        </div>

        {posts.length === 0 ? (
          <EmptyState icon={MessageCircle} title="No posts yet" description="Start the conversation." />
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <div key={p._id} className="card p-5 flex gap-4">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button onClick={() => handleVote(p._id, "up")} className="text-slate-400 hover:text-brand-500">
                    <ArrowUp size={18} />
                  </button>
                  <span className="text-sm font-semibold text-slate-700">{(p.upvotes?.length || 0) - (p.downvotes?.length || 0)}</span>
                  <button onClick={() => handleVote(p._id, "down")} className="text-slate-400 hover:text-red-500">
                    <ArrowDown size={18} />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {p.isDoubt && <span className="badge-amber flex items-center gap-1"><HelpCircle size={11} /> Doubt</span>}
                    {p.isResolved && <span className="badge-green flex items-center gap-1"><CheckCircle2 size={11} /> Resolved</span>}
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{p.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-3 mb-3">{p.content}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{p.author?.name}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12} /> {p.commentCount || 0} comments</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showNewPost} onClose={() => setShowNewPost(false)} title="Create a post">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Content</label>
            <textarea required rows={5} className="input" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.isDoubt} onChange={(e) => setForm({ ...form, isDoubt: e.target.checked })} />
            Mark this as a doubt / question
          </label>
          <button type="submit" disabled={posting} className="btn-primary w-full justify-center py-2.5">
            {posting ? "Posting..." : "Post"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default CommunityDetail;
