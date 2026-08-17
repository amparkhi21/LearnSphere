import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowUp, ThumbsUp, Sparkles, CheckCircle2, HelpCircle } from "lucide-react";
import Layout from "../components/layout/Layout";
import { PageLoader } from "../components/ui/Spinner";
import { postApi, commentApi } from "../api/community.api";
import { aiApi } from "../api/ai.api";
import { useAuth } from "../context/AuthContext";

const PostDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = await postApi.getOne(id);
      setPost(p);
      const c = await commentApi.listForPost(id);
      setComments(c || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Log in to comment");
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      await commentApi.create({ post: id, content: newComment });
      setNewComment("");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleAiSuggest = async () => {
    setAiSuggesting(true);
    try {
      const { answer } = await aiApi.doubtAssist({ question: post.content, subject: post.community?.subject });
      setNewComment(answer);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleUpvoteComment = async (commentId) => {
    if (!user) return toast.error("Log in to vote");
    await commentApi.upvote(commentId);
    load();
  };

  const handleResolve = async (commentId) => {
    try {
      await postApi.resolve(post._id, { acceptedAnswer: commentId });
      toast.success("Marked as resolved");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;
  if (!post) return null;

  const isAuthor = user && post.author?._id === user._id;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            {post.isDoubt && <span className="badge-amber flex items-center gap-1"><HelpCircle size={11} /> Doubt</span>}
            {post.isResolved && <span className="badge-green flex items-center gap-1"><CheckCircle2 size={11} /> Resolved</span>}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{post.title}</h1>
          <p className="text-slate-600 whitespace-pre-wrap mb-4">{post.content}</p>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center">
              {post.author?.name?.[0]}
            </span>
            {post.author?.name}
          </div>
        </div>

        <h2 className="font-semibold text-slate-800 mb-4">{comments.length} Answers / Comments</h2>
        <div className="space-y-4 mb-8">
          {comments.map((c) => (
            <div key={c._id} className={`card p-4 ${c.isAcceptedAnswer ? "border-emerald-300 bg-emerald-50/40" : ""}`}>
              <p className="text-sm text-slate-700 whitespace-pre-wrap mb-3">{c.content}</p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{c.author?.name}</span>
                <div className="flex items-center gap-3">
                  {c.isAcceptedAnswer && <span className="badge-green flex items-center gap-1"><CheckCircle2 size={11} /> Accepted</span>}
                  <button onClick={() => handleUpvoteComment(c._id)} className="flex items-center gap-1 hover:text-brand-500">
                    <ThumbsUp size={12} /> {c.upvotes?.length || 0}
                  </button>
                  {isAuthor && post.isDoubt && !post.isResolved && (
                    <button onClick={() => handleResolve(c._id)} className="text-brand-600 font-semibold hover:underline">
                      Mark as answer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleComment} className="card p-5">
          <label className="label">Add a comment / answer</label>
          <textarea rows={4} className="input mb-3" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write your answer..." />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={posting} className="btn-primary">
              {posting ? "Posting..." : "Post comment"}
            </button>
            {post.isDoubt && (
              <button type="button" onClick={handleAiSuggest} disabled={aiSuggesting} className="btn-secondary">
                <Sparkles size={15} className="text-brand-500" /> {aiSuggesting ? "Thinking..." : "AI suggest answer"}
              </button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default PostDetail;
