import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, Target, Clock, AlertCircle, RefreshCw } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import Spinner, { PageLoader } from "../components/ui/Spinner";
import { quizApi } from "../api/quiz.api";
import { useAuth } from "../context/AuthContext";
import { DIFFICULTIES } from "../utils/constants";
import { assertValidQuiz, clampQuestionCount } from "../utils/quizValidation";

const QuizPractice = () => {
  const { user } = useAuth();
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [form, setForm] = useState({ subject: "", topic: "", difficulty: "medium", count: 5 });
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const abortRef = useRef(null);
  const loadRequestRef = useRef(0);

  const load = async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError("");
    setMyQuizzes([]);
    try {
      const personalData = user ? await quizApi.mine({}) : { quizzes: [] };
      if (requestId !== loadRequestRef.current) return;
      setMyQuizzes(personalData?.quizzes || []);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      setLoadError(err.message || "Could not load quizzes.");
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => abortRef.current?.abort(); // cancel an in-flight generation if the page is left
  }, [user?._id]);

  const closeGenerate = () => {
    abortRef.current?.abort(); // closing the dialog cancels the request so we never navigate unexpectedly
    setGenerating(false);
    setGenError("");
    setShowGenerate(false);
  };

  // Used by both the form submit and the Retry button.
  const runGeneration = async () => {
    if (generating) return; // ignore double clicks
    if (!user) return toast.error("Log in to generate a quiz");

    const payload = {
      subject: form.subject.trim(),
      topic: form.topic.trim(),
      difficulty: form.difficulty,
      count: clampQuestionCount(form.count),
    };
    if (!payload.subject) {
      setGenError("Please enter a subject.");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setGenError("");
    setGenerating(true);
    try {
      const quiz = await quizApi.generate(payload, { signal: controller.signal });
      assertValidQuiz(quiz); // only proceed with real, well-formed questions
      toast.success("Quiz generated!");
      setShowGenerate(false);
      await load();
    } catch (err) {
      if (err?.isCanceled) return; // user closed the dialog
      setGenError(err?.message || "Could not generate the quiz. Please try again.");
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setGenerating(false);
      }
    }
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    runGeneration();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="section-title">Practice Quizzes</h1>
            <p className="text-slate-500 mt-1">Test yourself with topic-wise MCQs.</p>
          </div>
          <button onClick={() => setShowGenerate(true)} className="btn-primary shrink-0">
            <Sparkles size={16} aria-hidden="true" /> AI Generate Quiz
          </button>
        </div>

        {loading ? (
          <PageLoader />
        ) : loadError ? (
          <EmptyState
            icon={AlertCircle}
            title="Couldn't load quizzes"
            description={loadError}
            action={
              <button onClick={load} className="btn-primary">
                <RefreshCw size={15} /> Retry
              </button>
            }
          />
        ) : (
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">My Generated Quizzes</h2>
              {myQuizzes.length === 0 ? <EmptyState icon={Target} title="No generated quizzes yet" description="You haven't generated any quizzes yet. Click AI Generate Quiz to create your first quiz." /> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{myQuizzes.map((q) => <Link key={q._id} to={`/quizzes/${q._id}`} className="card p-5"><div className="flex items-center justify-between mb-3"><span className="badge-brand">{q.subject}</span><span className="badge-accent flex items-center gap-1"><Sparkles size={10} /> AI</span></div><h3 className="font-semibold text-slate-800 mb-2 line-clamp-2">{q.title}</h3><div className="flex items-center gap-3 text-xs text-slate-500"><span className="capitalize">{q.difficulty}</span><span className="flex items-center gap-1"><Clock size={12} /> {q.timeLimitMinutes} min</span><span>{q.questions?.length || 0} Qs</span></div></Link>)}</div>}
            </section>
          </div>
        )}
      </div>

      <Modal open={showGenerate} onClose={closeGenerate} title="AI-generate a practice quiz">
        <form onSubmit={handleGenerate} className="space-y-4">
          <fieldset disabled={generating} className="space-y-4 min-w-0">
            <div>
              <label className="label">Subject</label>
              <input required maxLength={100} className="input" placeholder="e.g. Physics" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Topic (optional)</label>
              <input maxLength={150} className="input" placeholder="e.g. Mechanics" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
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
                <input
                  type="number"
                  inputMode="numeric"
                  min={3}
                  max={15}
                  className="input"
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: e.target.value === "" ? "" : Number(e.target.value) })}
                  onBlur={() => setForm((f) => ({ ...f, count: clampQuestionCount(f.count) }))}
                />
              </div>
            </div>
          </fieldset>

          {generating && (
            <div role="status" aria-live="polite" className="flex items-center gap-3 rounded-xl bg-brand-50 text-brand-700 px-4 py-3 text-sm">
              <Spinner size={18} className="shrink-0" />
              <span>Generating your questions with AI&hellip; this can take up to 30 seconds.</span>
            </div>
          )}

          {genError && !generating && (
            <div role="alert" className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="break-words">{genError}</p>
              </div>
              <button type="button" onClick={runGeneration} className="btn-secondary mt-3 w-full sm:w-auto justify-center">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          <button type="submit" disabled={generating} className="btn-primary w-full justify-center py-2.5">
            <Sparkles size={15} /> {generating ? "Generating..." : "Generate quiz"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default QuizPractice;
