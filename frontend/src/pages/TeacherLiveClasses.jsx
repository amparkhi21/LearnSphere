import React, { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock3, Video, Radio, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { courseApi } from "../api/course.api";
import { liveClassApi } from "../api/liveClass.api";

const initialForm = { title: "", courseId: "", subject: "", description: "", startsAt: "", durationMinutes: 60 };
const displayDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
const localDateTimeInputValue = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const TeacherLiveClasses = () => {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try { setClasses(await liveClassApi.teacherMine()); }
    catch (err) { setError(err.message || "Could not load live classes."); }
  }, []);

  useEffect(() => {
    Promise.all([courseApi.mine(), liveClassApi.teacherMine()])
      .then(([ownedCourses, ownClasses]) => { setCourses(ownedCourses || []); setClasses(ownClasses || []); })
      .catch((err) => setError(err.message || "Could not load live class data."))
      .finally(() => setLoading(false));
  }, []);

  const schedule = async (event) => {
    event.preventDefault();
    if (!form.courseId) return toast.error("Choose one of your courses.");
    const selectedCourse = courses.find((course) => course._id === form.courseId);
    if (!selectedCourse) return toast.error("Choose a valid course you teach.");
    setSaving(true);
    try {
      await liveClassApi.schedule({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        subject: form.subject || selectedCourse.subject,
      });
      toast.success("Live class scheduled.");
      setForm(initialForm);
      await refresh();
    } catch (err) { toast.error(err.message || "Could not schedule this class."); }
    finally { setSaving(false); }
  };

  const act = async (liveClass, action) => {
    setActionId(liveClass._id);
    try {
      if (action === "cancel" && !window.confirm("Cancel this scheduled class?")) return;
      if (action === "start") {
        await liveClassApi.start(liveClass._id);
        window.location.assign(`/live-classes/${liveClass._id}/room`);
        return;
      }
      if (action === "end") await liveClassApi.end(liveClass._id);
      else await liveClassApi.cancel(liveClass._id);
      toast.success(action === "end" ? "Live class ended." : "Class cancelled.");
      await refresh();
    } catch (err) { toast.error(err.message || "Class action failed."); }
    finally { setActionId(""); }
  };

  if (loading) return <Layout><PageLoader /></Layout>;
  const groups = [
    ["Live Now", classes.filter((item) => item.status === "live"), "live"],
    ["Upcoming Classes", classes.filter((item) => item.status === "scheduled" || item.status === "starting"), "scheduled"],
    ["Completed Classes", classes.filter((item) => item.status === "completed"), "completed"],
    ["Cancelled Classes", classes.filter((item) => item.status === "cancelled"), "cancelled"],
  ];

  return <Layout><main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
    <header className="mb-8"><span className="badge-brand"><Video size={13} /> Teacher tools</span><h1 className="section-title mt-3">Live Classes</h1><p className="text-slate-500 mt-1">Schedule and manage interactive classes for your enrolled students.</p></header>
    {error && <div role="alert" className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-red-700 flex items-center justify-between"><span>{error}</span><button onClick={refresh} className="btn-secondary"><RefreshCw size={14} /> Retry</button></div>}
    <form onSubmit={schedule} className="card p-6 sm:p-8 mb-10">
      <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2"><CalendarDays size={19} className="text-brand-600" /> Schedule a Class</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="label">Class title</label><input required maxLength={120} className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
        <div><label className="label">Course</label><select required className="input" value={form.courseId} onChange={(e) => { const course = courses.find((item) => item._id === e.target.value); setForm({ ...form, courseId: e.target.value, subject: course?.subject || "" }); }}><option value="">Select one of your courses</option>{courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}</select></div>
        <div><label className="label">Subject or topic</label><input maxLength={120} className="input" placeholder="Optional" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
        <div><label className="label">Class date and start time</label><input required type="datetime-local" className="input" min={localDateTimeInputValue(new Date(Date.now() + 60000))} value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></div>
        <div><label className="label">Expected duration (minutes)</label><input required type="number" min={15} max={240} step={1} className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} /></div>
        <div className="md:col-span-2"><label className="label">Short description</label><textarea rows={3} maxLength={1000} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      </div>
      <button type="submit" disabled={saving || !courses.length} className="btn-primary mt-5"><CalendarDays size={16} /> {saving ? "Scheduling..." : "Schedule Class"}</button>
      {!courses.length && <p className="mt-3 text-sm text-slate-500">Create a course first to schedule a class.</p>}
    </form>
    <div className="space-y-9">{groups.map(([heading, items]) => <section key={heading}>
      <h2 className="text-lg font-bold text-slate-900 mb-4">{heading}</h2>
      {!items.length ? <p className="text-sm text-slate-500">No {heading.toLowerCase()}.</p> : <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{items.map((item) => <article key={item._id} className="card p-5">
        <div className="flex justify-between gap-3"><span className={`badge ${item.status === "live" ? "badge-green" : item.status === "scheduled" ? "badge-amber" : "badge-brand"}`}>{item.status}</span>{item.status === "live" && <Radio size={17} className="text-red-500" />}</div>
        <h3 className="font-semibold text-slate-900 mt-3">{item.title}</h3><p className="text-sm text-slate-500">{item.course?.title} · {item.subject}</p>
        <p className="text-sm text-slate-500 mt-3 flex items-center gap-2"><CalendarDays size={14} /> {displayDate(item.startsAt)}</p><p className="text-sm text-slate-500 mt-1 flex items-center gap-2"><Clock3 size={14} /> {item.durationMinutes} minutes</p>
        {item.description && <p className="text-sm text-slate-600 mt-3">{item.description}</p>}
        <div className="flex gap-2 mt-4">{item.status === "scheduled" && <><button disabled={actionId === item._id} onClick={() => act(item, "start")} className="btn-primary"><Video size={15} /> Start Live Class</button><button disabled={actionId === item._id} onClick={() => act(item, "cancel")} className="btn-secondary"><XCircle size={15} /> Cancel</button></>}{item.status === "live" && <><button onClick={() => window.location.assign(`/live-classes/${item._id}/room`)} className="btn-secondary"><Video size={15} /> Rejoin</button><button disabled={actionId === item._id} onClick={() => act(item, "end")} className="btn-primary"><CheckCircle2 size={15} /> End Class</button></>}</div>
      </article>)}</div>}
    </section>)}</div>
  </main></Layout>;
};

export default TeacherLiveClasses;
