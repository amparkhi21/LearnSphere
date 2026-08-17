import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle, Trophy } from "lucide-react";
import Layout from "../components/layout/Layout";
import { PageLoader } from "../components/ui/Spinner";
import { quizApi, quizAttemptApi } from "../api/quiz.api";
import { useAuth } from "../context/AuthContext";

const QuizAttemptPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    quizApi
      .getOne(id)
      .then(setQuiz)
      .catch(() => toast.error("Quiz not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!user) return toast.error("Log in to submit your attempt");
    if (Object.keys(answers).length < quiz.questions.length) {
      if (!window.confirm("You haven't answered all questions. Submit anyway?")) return;
    }
    setSubmitting(true);
    try {
      const payload = {
        quizId: quiz._id,
        answers: Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({ questionId, selectedOptionIndex })),
        timeTakenSeconds: Math.round((Date.now() - startTime) / 1000),
      };
      const { attempt, reviewQuestions } = await quizAttemptApi.submit(payload);
      setResult({ attempt, reviewQuestions });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;
  if (!quiz) return null;

  if (result) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto mb-4">
              <Trophy size={28} className="text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900">{result.attempt.percentage}% Score</h1>
            <p className="text-slate-500 mt-1">{result.attempt.score} / {result.attempt.totalQuestions} correct</p>
          </div>

          <div className="space-y-4">
            {result.reviewQuestions.map((q, i) => {
              const userAnswer = answers[q._id];
              const isCorrect = userAnswer === q.correctOptionIndex;
              return (
                <div key={q._id} className="card p-5">
                  <p className="font-semibold text-slate-800 mb-3">
                    {i + 1}. {q.questionText}
                  </p>
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                          oi === q.correctOptionIndex
                            ? "bg-emerald-50 text-emerald-700"
                            : oi === userAnswer
                            ? "bg-red-50 text-red-600"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {oi === q.correctOptionIndex ? <CheckCircle2 size={14} /> : oi === userAnswer ? <XCircle size={14} /> : <span className="w-3.5" />}
                        {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && <p className="text-xs text-slate-500 italic">{q.explanation}</p>}
                </div>
              );
            })}
          </div>

          <div className="flex justify-center mt-8">
            <button onClick={() => navigate("/quizzes")} className="btn-primary">Back to quizzes</button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <span className="badge-brand mb-3">{quiz.subject}</span>
          <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
          <p className="text-slate-500 mt-1">{quiz.questions.length} questions • {quiz.timeLimitMinutes} min</p>
        </div>

        <div className="space-y-6">
          {quiz.questions.map((q, i) => (
            <div key={q._id} className="card p-5">
              <p className="font-semibold text-slate-800 mb-4">
                {i + 1}. {q.questionText}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => handleSelect(q._id, oi)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-all ${
                      answers[q._id] === oi ? "border-brand-400 bg-brand-50 text-brand-700 font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full justify-center py-3 mt-8">
          {submitting ? "Submitting..." : "Submit quiz"}
        </button>
      </div>
    </Layout>
  );
};

export default QuizAttemptPage;
