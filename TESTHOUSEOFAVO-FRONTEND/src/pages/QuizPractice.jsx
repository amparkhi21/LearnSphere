import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, Target, Clock, Plus } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import { PageLoader } from "../components/ui/Spinner";
import { quizApi } from "../api/quiz.api";
import { useAuth } from "../context/AuthContext";
import { DIFFICULTIES } from "../utils/constants";

const QuizPractice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [form, setForm] = useState({ subject: "", topic: "", difficulty: "medium", count: 5 });
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await quizApi.list({});
      setQuizzes(data.quizzes || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Log in to generate a quiz");
    setGenerating(true);
    try {
      const quiz = await quizApi.generate(form);
      toast.success("Quiz generated!");
      navigate(`/quizzes/${quiz._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="section-title">Practice Quizzes</h1>
            <p className="text-slate-500 mt-1">Test yourself with topic-wise MCQs.</p>
          </div>
          <button onClick={() => setShowGenerate(true)} className="btn-primary">
            <Sparkles size={16} /> AI-generate quiz
          </button>
        </div>

        {loading ? (
          <PageLoader />
        ) : quizzes.length === 0 ? (
          <EmptyState icon={Target} title="No quizzes yet" description="Generate one with AI to get started." action={<button onClick={() => setShowGenerate(true)} className="btn-primary">Generate a quiz</button>} />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {quizzes.map((q) => (
              <Link key={q._id} to={`/quizzes/${q._id}`} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="badge-brand">{q.subject}</span>
                  {q.isAIGenerated && <span className="badge-accent flex items-center gap-1"><Sparkles size={10} /> AI</span>}
                </div>
                <h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">{q.title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="capitalize">{q.difficulty}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {q.timeLimitMinutes} min</span>
                  <span>{q.questions?.length || 0} Qs</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal open={showGenerate} onClose={() => setShowGenerate(false)} title="AI-generate a practice quiz">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input required className="input" placeholder="e.g. Physics" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <label className="label">Topic (optional)</label>
            <input className="input" placeholder="e.g. Mechanics" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                {DIFFICULTIES.map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Number of questions</label>
              <input type="number" min={3} max={15} className="input" value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} />
            </div>
          </div>
          <button type="submit" disabled={generating} className="btn-primary w-full justify-center py-2.5">
            <Sparkles size={15} /> {generating ? "Generating..." : "Generate quiz"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default QuizPractice;
