import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FileText, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import Layout from "../components/layout/Layout";
import { studyPlanApi } from "../api/studyPlan.api";
import { EXAM_TAGS, STREAMS } from "../utils/constants";
import { createSyllabusRequest, normalizeSubjectList } from "../utils/studyPlanForm";

const initialForm = { examTarget: "", stream: "", subjects: [] };
const readSessionValue = (key, fallback) => {
  try { return typeof window === "undefined" ? fallback : JSON.parse(window.sessionStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const restoreSyllabusForm = () => {
  const value = readSessionValue("learnsphere.syllabus.form", initialForm);
  return value && typeof value === "object" && typeof value.examTarget === "string" && typeof value.stream === "string" && Array.isArray(value.subjects) && value.subjects.every((subject) => typeof subject === "string")
    ? value
    : initialForm;
};
const saveSessionValue = (key, value) => {
  try { window.sessionStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Keep the page usable if browser storage is unavailable. */ }
};

const SyllabusResults = ({ syllabus }) => (
  <div className="space-y-4">
    {syllabus.source && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-3">{syllabus.source}</p>}
    {syllabus.subjects?.map((subject) => <article key={subject.subject} className="rounded-xl border border-slate-100 p-4 sm:p-5">
      <h3 className="text-base font-bold text-slate-900">{subject.subject}</h3>
      <div className="mt-4 space-y-4">
        {subject.units?.map((unit, index) => <section key={`${index}-${unit.title}`} className="border-l-2 border-cyan-200 pl-4">
          <h4 className="font-semibold text-brand-700">{unit.title || `Unit ${index + 1}`}</h4>
          {unit.topics?.length > 0 && <ul className="mt-2 space-y-2">{unit.topics.map((topic, topicIndex) => <li key={`${topicIndex}-${topic}`} className="text-sm text-slate-700 flex items-start gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />{topic}</li>)}</ul>}
          {unit.subtopics?.length > 0 && <ul className="mt-2 ml-4 space-y-1">{unit.subtopics.map((subtopic, subtopicIndex) => <li key={`${subtopicIndex}-${subtopic}`} className="text-sm text-slate-500 list-disc">{subtopic}</li>)}</ul>}
        </section>)}
      </div>
    </article>)}
    {!syllabus.subjects?.length && <p className="text-sm text-slate-500">The response did not include syllabus subjects. Try generating again.</p>}
  </div>
);

const SyllabusGenerator = () => {
  const [form, setForm] = useState(restoreSyllabusForm);
  const [subjectInput, setSubjectInput] = useState("");
  const [syllabus, setSyllabus] = useState(() => readSessionValue("learnsphere.syllabus.result", null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRequest, setLastRequest] = useState(null);

  useEffect(() => {
    saveSessionValue("learnsphere.syllabus.form", form);
  }, [form]);

  useEffect(() => {
    if (syllabus) saveSessionValue("learnsphere.syllabus.result", syllabus);
    else {
      try { window.sessionStorage.removeItem("learnsphere.syllabus.result"); }
      catch { /* Storage may be disabled by the browser. */ }
    }
  }, [syllabus]);

  const addSubject = () => {
    if (!subjectInput.trim()) return toast.error("Enter a subject before adding it.");
    const subjects = normalizeSubjectList(form.subjects, subjectInput);
    if (subjects.length === form.subjects.length) toast("That subject is already selected.");
    setForm((current) => ({ ...current, subjects }));
    setSubjectInput("");
  };

  const generate = async (request) => {
    setLastRequest(request);
    setLoading(true);
    setError("");
    try {
      const result = await studyPlanApi.generateSyllabus(request);
      setSyllabus(result);
      setSubjectInput("");
    } catch (requestError) {
      setSyllabus(null);
      setError(requestError.message || "Syllabus generation failed. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const request = createSyllabusRequest(form, subjectInput);
    if (!request.examTarget || !request.stream) { setLastRequest(null); return setError("Select a target exam and stream before generating."); }
    if (!request.subjects.length) { setLastRequest(null); return setError("Add at least one subject before generating."); }
    setForm((current) => ({ ...current, subjects: request.subjects }));
    await generate(request);
  };

  const removeSubject = (subject) => setForm((current) => ({ ...current, subjects: current.subjects.filter((item) => item !== subject) }));

  return <Layout><main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
    <header className="mb-8"><span className="badge-brand"><FileText size={14} /> Study tools</span><h1 className="section-title mt-3 mb-2">Syllabus Generator</h1><p className="text-slate-500">Create a subject-by-subject outline for your target exam.</p></header>
    <div className="grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-5">
        <div><h2 className="text-lg font-bold text-slate-900">Syllabus inputs</h2><p className="text-sm text-slate-500 mt-1">Choose an exam, stream, and one or more subjects.</p></div>
        <div><label className="label" htmlFor="syllabus-exam">Target exam</label><select id="syllabus-exam" required className="input" value={form.examTarget} onChange={(event) => setForm((current) => ({ ...current, examTarget: event.target.value }))}><option value="">Select your exam</option>{EXAM_TAGS.map((exam) => <option key={exam} value={exam}>{exam}</option>)}</select></div>
        <div><label className="label" htmlFor="syllabus-stream">Stream</label><select id="syllabus-stream" required className="input" value={form.stream} onChange={(event) => setForm((current) => ({ ...current, stream: event.target.value }))}><option value="">Select your stream</option>{STREAMS.map((stream) => <option key={stream} value={stream}>{stream}</option>)}</select></div>
        <div><label className="label" htmlFor="syllabus-subject">Subjects to cover</label><div className="flex gap-2"><input id="syllabus-subject" className="input min-w-0" placeholder="e.g. Physics" value={subjectInput} onChange={(event) => setSubjectInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addSubject())} /><button type="button" onClick={addSubject} className="btn-secondary px-3" aria-label="Add subject"><Plus size={16} /></button></div>
          <div className="flex flex-wrap gap-2 mt-3">{form.subjects.map((subject) => <span key={subject} className="badge-brand flex items-center gap-1">{subject}<button type="button" aria-label={`Remove ${subject}`} onClick={() => removeSubject(subject)}><X size={12} /></button></span>)}</div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3"><Sparkles size={16} />{loading ? "Generating syllabus..." : "Generate Syllabus"}</button>
        {error && <p className="text-xs text-slate-500">Update your choices here, then retry generation in the results panel.</p>}
      </form>

      <section className="card min-h-[26rem] p-6 sm:p-8" aria-live="polite" aria-busy={loading}>
        <div className="mb-5"><span className="badge-accent">Generated result</span><h2 className="text-xl font-bold text-slate-900 mt-3">Your syllabus</h2></div>
        {loading ? <div className="min-h-64 flex flex-col items-center justify-center text-center" role="status"><LoaderCircle size={28} className="animate-spin text-brand-600" /><p className="text-sm text-slate-600 mt-3">Generating your syllabus…</p><p className="text-xs text-slate-500 mt-1">Your result will appear here.</p></div>
          : error ? <div className="min-h-64 flex flex-col items-center justify-center text-center"><p role="alert" className="text-sm text-red-700">{error}</p>{lastRequest && <button className="btn-secondary mt-4" onClick={() => generate(lastRequest)}>Retry</button>}</div>
            : syllabus ? <SyllabusResults syllabus={syllabus} />
              : <div className="min-h-64 flex flex-col items-center justify-center text-center"><FileText size={28} className="text-brand-500" /><p className="font-semibold text-slate-800 mt-3">Your generated syllabus will appear here</p><p className="text-sm text-slate-500 mt-1 max-w-sm">Select your exam, stream, and subjects to generate your syllabus.</p></div>}
      </section>
    </div>
  </main></Layout>;
};

export default SyllabusGenerator;
