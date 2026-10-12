import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, Plus, X, Calendar, CheckCircle2, Clock3 } from "lucide-react";
import Layout from "../components/layout/Layout";
import { PageLoader } from "../components/ui/Spinner";
import { studyPlanApi } from "../api/studyPlan.api";
import { EXAM_TAGS, STREAMS } from "../utils/constants";
import { createStudyPlanRequest, normalizeSubjectList } from "../utils/studyPlanForm";

const initialForm = { examTarget: "", stream: "", subjects: [], durationWeeks: 8, hoursPerDay: 2 };

const StudyPlanDetail = ({ plan }) => {
  const [activeWeek, setActiveWeek] = useState(plan.weeklyPlan?.[0]?.week || 1);
  const week = plan.weeklyPlan?.find((item) => item.week === activeWeek) || plan.weeklyPlan?.[0];

  return (
    <>
      <div className="flex items-center gap-2 mb-2"><span className="badge-brand"><Sparkles size={12} /> AI-generated</span>{plan.progress > 0 && <span className="badge-accent">{plan.progress}% complete</span>}</div>
      <h1 className="section-title mb-1">{plan.title}</h1>
      <p className="text-slate-500 mb-8">{plan.examTarget} · {plan.hoursPerDay}h/day · {plan.durationWeeks} weeks</p>
      <div className="grid lg:grid-cols-3 gap-8">
        <section>
          <h2 className="font-semibold text-slate-800 mb-3">Syllabus overview</h2>
          <div className="space-y-3">{plan.syllabus?.map((subject) => <article key={subject.subject} className="card p-4"><h3 className="font-semibold text-sm text-slate-800 mb-2">{subject.subject}</h3><ul className="space-y-1">{subject.topics?.map((topic) => <li key={topic} className="text-xs text-slate-500 flex items-start gap-1.5"><CheckCircle2 size={12} className="text-brand-400 mt-0.5 shrink-0" />{topic}</li>)}</ul></article>)}</div>
        </section>
        <section className="lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Calendar size={16} /> Weekly plan</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">{plan.weeklyPlan?.map((item) => <button key={item.week} onClick={() => setActiveWeek(item.week)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeWeek === item.week ? "bg-brand-gradient text-white shadow-soft" : "bg-white border border-slate-200 text-slate-600"}`}>Week {item.week}</button>)}</div>
          {week && <article className="card p-6 fade-in"><p className="font-semibold text-slate-800 mb-4">{week.focus}</p><ul className="space-y-2.5">{week.tasks?.map((task, index) => <li key={`${index}-${task}`} className="flex items-start gap-2.5 text-sm text-slate-600"><span className="w-5 h-5 rounded-full border-2 border-brand-300 shrink-0 mt-0.5" />{task}</li>)}</ul></article>}
        </section>
      </div>
    </>
  );
};

const StudyPlanGenerator = () => {
  const { id } = useParams();
  const [form, setForm] = useState(initialForm);
  const [subjectInput, setSubjectInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setPlan(null);
    const request = id ? studyPlanApi.getOne(id).then((result) => {
      if (active) setPlan(result);
    }) : studyPlanApi.mine().then((results) => {
      if (active) setSavedPlans(results || []);
    });
    request.catch((error) => {
      if (!active) return;
      const message = error.message || "Could not load your saved study plans.";
      if (id) toast.error(message);
      else setLoadError(message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const addSubject = () => {
    if (!subjectInput.trim()) return toast.error("Enter a subject before adding it.");
    const subjects = normalizeSubjectList(form.subjects, subjectInput);
    if (subjects.length === form.subjects.length) toast("That subject is already selected.");
    setForm((current) => ({ ...current, subjects }));
    setSubjectInput("");
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    const request = createStudyPlanRequest(form, subjectInput);
    if (!form.examTarget || !form.stream) return toast.error("Select an exam and stream for your Study Plan.");
    if (!request.subjects.length) return toast.error("Add at least one subject to your Study Plan.");
    setForm((current) => ({ ...current, subjects: request.subjects }));
    setGenerating(true);
    try {
      const result = await studyPlanApi.generate(request);
      setGeneratedPlan(result);
      setSavedPlans((current) => [result, ...current.filter((item) => item._id !== result._id)]);
      toast.success("Your AI study plan is ready!");
    } catch (error) {
      toast.error(error.message || "Study plan generation failed. Please retry.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  return <Layout><main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
    {plan ? <>
      <div className="mb-6"><Link to="/study-plan" className="text-sm font-semibold text-brand-600 hover:underline">← All study plans</Link></div>
      <StudyPlanDetail plan={plan} />
      <div className="mt-8 flex justify-center"><Link to="/study-plan" className="btn-secondary">Generate another plan</Link></div>
    </> : <>
      <header className="mb-8"><span className="badge-brand"><Sparkles size={14} /> Study tools</span><h1 className="section-title mt-3 mb-2">Study Plan Generator</h1><p className="text-slate-500">Build a personalized week-by-week plan around your exam and available time.</p></header>
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <form onSubmit={handleGenerate} className="card p-6 sm:p-8 space-y-5">
          <div><label className="label">Target exam</label><select required className="input" value={form.examTarget} onChange={(event) => setForm((current) => ({ ...current, examTarget: event.target.value }))}><option value="">Select your exam</option>{EXAM_TAGS.map((exam) => <option key={exam} value={exam}>{exam}</option>)}</select></div>
          <div><label className="label">Stream</label><select required className="input" value={form.stream} onChange={(event) => setForm((current) => ({ ...current, stream: event.target.value }))}><option value="">Select your stream</option>{STREAMS.map((stream) => <option key={stream} value={stream}>{stream}</option>)}</select></div>
          <div><label className="label">Subjects to cover</label><div className="flex gap-2 mb-2"><input className="input" placeholder="e.g. Physics" value={subjectInput} onChange={(event) => setSubjectInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addSubject())} /><button type="button" onClick={addSubject} className="btn-secondary px-3" aria-label="Add subject"><Plus size={16} /></button></div><div className="flex flex-wrap gap-2">{form.subjects.map((subject) => <span key={subject} className="badge-brand flex items-center gap-1">{subject}<button type="button" aria-label={`Remove ${subject}`} onClick={() => setForm((current) => ({ ...current, subjects: current.subjects.filter((item) => item !== subject) }))}><X size={12} /></button></span>)}</div></div>
          <div className="grid grid-cols-2 gap-4"><div><label className="label">Duration (weeks)</label><input type="number" min={1} max={52} className="input" value={form.durationWeeks} onChange={(event) => setForm((current) => ({ ...current, durationWeeks: Number(event.target.value) }))} /></div><div><label className="label">Hours available per day</label><input type="number" min={1} max={16} className="input" value={form.hoursPerDay} onChange={(event) => setForm((current) => ({ ...current, hoursPerDay: Number(event.target.value) }))} /></div></div>
          <button type="submit" disabled={generating} className="btn-primary w-full justify-center py-3"><Sparkles size={16} />{generating ? "Generating your plan..." : "Generate Study Plan"}</button>
        </form>

        <section className="space-y-5" aria-live="polite">
          {generatedPlan ? <article className="card p-6"><span className="badge-brand"><Sparkles size={12} /> Generated study plan</span><h2 className="text-xl font-bold text-slate-900 mt-3">{generatedPlan.title}</h2><p className="text-sm text-slate-500 mt-1">{generatedPlan.examTarget} · {generatedPlan.durationWeeks} weeks · {generatedPlan.hoursPerDay}h/day</p><div className="mt-4 space-y-3">{generatedPlan.weeklyPlan?.slice(0, 3).map((week) => <article key={week.week} className="border-t border-slate-100 pt-3"><h3 className="font-semibold text-sm text-slate-800">Week {week.week}: {week.focus}</h3><ul className="mt-1 list-disc pl-5 text-sm text-slate-600">{week.tasks?.map((task, index) => <li key={`${index}-${task}`}>{task}</li>)}</ul></article>)}</div><Link to={`/study-plan/${generatedPlan._id}`} className="btn-secondary mt-5">Open full study plan</Link></article> : <div className="card min-h-64 p-6 flex flex-col items-center justify-center text-center"><Clock3 size={26} className="text-brand-500" /><h2 className="font-semibold text-slate-800 mt-3">Your study plan will appear here</h2><p className="text-sm text-slate-500 mt-1">Choose your exam, subjects, and study schedule to get started.</p></div>}
          <div className="card p-6"><div className="flex items-center justify-between mb-4"><h2 className="font-bold text-slate-900">Saved Study Plans</h2><span className="text-xs text-slate-500">{savedPlans.length}</span></div>{loadError ? <div role="alert" className="text-sm text-red-700">{loadError}<button className="ml-2 underline" onClick={() => window.location.reload()}>Retry</button></div> : savedPlans.length ? <div className="space-y-2">{savedPlans.map((item) => <Link key={item._id} to={`/study-plan/${item._id}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:border-brand-200"><span className="min-w-0"><span className="block text-sm font-semibold text-slate-800 truncate">{item.title}</span><span className="block text-xs text-slate-500">{item.examTarget} · {item.durationWeeks} weeks</span></span><span className="text-xs text-brand-600 shrink-0">Open</span></Link>)}</div> : <p className="text-sm text-slate-500">Your saved plans will appear here after generation.</p>}</div>
        </section>
      </div>
    </>}
  </main></Layout>;
};

export default StudyPlanGenerator;
