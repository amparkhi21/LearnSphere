import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, Plus, X, Calendar, CheckCircle2 } from "lucide-react";
import Layout from "../components/layout/Layout";
import { PageLoader } from "../components/ui/Spinner";
import { studyPlanApi } from "../api/studyPlan.api";
import { EXAM_TAGS, STREAMS } from "../utils/constants";

const SyllabusGenerator = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ examTarget: "", stream: "", subjects: [], durationWeeks: 8, hoursPerDay: 2 });
  const [subjectInput, setSubjectInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(!!id);
  const [activeWeek, setActiveWeek] = useState(1);

  useEffect(() => {
    if (id) {
      studyPlanApi
        .getOne(id)
        .then(setPlan)
        .catch(() => toast.error("Plan not found"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const addSubject = () => {
    if (subjectInput.trim() && !form.subjects.includes(subjectInput.trim())) {
      setForm({ ...form, subjects: [...form.subjects, subjectInput.trim()] });
      setSubjectInput("");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.examTarget || form.subjects.length === 0) return toast.error("Add an exam target and at least one subject");
    setGenerating(true);
    try {
      const newPlan = await studyPlanApi.generate(form);
      toast.success("Your AI study plan is ready!");
      navigate(`/syllabus-generator/${newPlan._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  if (plan) {
    const week = plan.weeklyPlan?.find((w) => w.week === activeWeek) || plan.weeklyPlan?.[0];
    return (
      <Layout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-2">
            <span className="badge-brand"><Sparkles size={12} /> AI-generated</span>
          </div>
          <h1 className="section-title mb-1">{plan.title}</h1>
          <p className="text-slate-500 mb-8">{plan.examTarget} • {plan.hoursPerDay}h/day • {plan.durationWeeks} weeks</p>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <h3 className="font-semibold text-slate-800 mb-3">Syllabus overview</h3>
              <div className="space-y-3">
                {plan.syllabus?.map((s) => (
                  <div key={s.subject} className="card p-4">
                    <p className="font-semibold text-sm text-slate-800 mb-2">{s.subject}</p>
                    <ul className="space-y-1">
                      {s.topics?.map((t) => (
                        <li key={t} className="text-xs text-slate-500 flex items-start gap-1.5">
                          <CheckCircle2 size={12} className="text-brand-400 mt-0.5 shrink-0" /> {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Calendar size={16} /> Weekly plan
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                {plan.weeklyPlan?.map((w) => (
                  <button
                    key={w.week}
                    onClick={() => setActiveWeek(w.week)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      activeWeek === w.week ? "bg-brand-gradient text-white shadow-soft" : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    Week {w.week}
                  </button>
                ))}
              </div>
              {week && (
                <div className="card p-6 fade-in">
                  <p className="font-semibold text-slate-800 mb-4">{week.focus}</p>
                  <ul className="space-y-2.5">
                    {week.tasks?.map((t, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="w-5 h-5 rounded-full border-2 border-brand-300 shrink-0 mt-0.5" />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button onClick={() => { setPlan(null); navigate("/syllabus-generator"); }} className="btn-secondary">
              Generate another plan
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 badge-brand mb-4"><Sparkles size={14} /> AI Study Plan Generator</span>
          <h1 className="section-title mb-2">Get a personalized syllabus in seconds</h1>
          <p className="text-slate-500">Tell us your target exam and available time — we'll build the plan.</p>
        </div>

        <form onSubmit={handleGenerate} className="card p-8 space-y-5">
          <div>
            <label className="label">Target exam</label>
            <select required className="input" value={form.examTarget} onChange={(e) => setForm({ ...form, examTarget: e.target.value })}>
              <option value="">Select your exam</option>
              {EXAM_TAGS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Stream</label>
            <select className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}>
              <option value="">Select your stream</option>
              {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subjects to cover</label>
            <div className="flex gap-2 mb-2">
              <input
                className="input"
                placeholder="e.g. Physics"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubject())}
              />
              <button type="button" onClick={addSubject} className="btn-secondary px-3">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.subjects.map((s) => (
                <span key={s} className="badge-brand flex items-center gap-1">
                  {s}
                  <button type="button" onClick={() => setForm({ ...form, subjects: form.subjects.filter((x) => x !== s) })}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duration (weeks)</label>
              <input type="number" min={1} max={52} className="input" value={form.durationWeeks} onChange={(e) => setForm({ ...form, durationWeeks: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Hours per day</label>
              <input type="number" min={1} max={16} className="input" value={form.hoursPerDay} onChange={(e) => setForm({ ...form, hoursPerDay: Number(e.target.value) })} />
            </div>
          </div>
          <button type="submit" disabled={generating} className="btn-primary w-full justify-center py-3">
            <Sparkles size={16} /> {generating ? "Generating your plan..." : "Generate my study plan"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default SyllabusGenerator;
