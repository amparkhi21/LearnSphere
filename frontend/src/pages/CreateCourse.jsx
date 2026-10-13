import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import Layout from "../components/layout/Layout";
import { courseApi } from "../api/course.api";
import { aiApi } from "../api/ai.api";
import { STREAMS, EXAM_TAGS, LEVELS } from "../utils/constants";

const CreateCourse = () => {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const editing = Boolean(courseId);
  const [form, setForm] = useState({
    title: "", description: "", stream: "", subject: "", price: 0, discountPrice: 0,
    level: "beginner", duration: "", examTags: [],
  });
  const [modules, setModules] = useState([]);
  const [courseStatus, setCourseStatus] = useState("published");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [existingThumbnail, setExistingThumbnail] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(existingThumbnail);
      return undefined;
    }
    const previewUrl = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [thumbnailFile, existingThumbnail]);

  useEffect(() => {
    if (!editing) return;
    courseApi.getOne(courseId).then((course) => {
      setForm({ title: course.title || "", description: course.description || "", stream: course.stream || "", subject: course.subject || "", price: course.price ?? 0, discountPrice: course.discountPrice ?? 0, level: course.level || "beginner", duration: course.duration || "", examTags: course.examTags || [] });
      setCourseStatus(course.status || "published");
      setExistingThumbnail(course.thumbnail || "");
      setModules((course.modules || []).map((module) => ({ ...module, resources: (module.resources || []).map((resource) => typeof resource === "object" ? resource._id : resource) })));
    }).catch((err) => {
      toast.error(err.message || "Could not load course");
      navigate("/teacher/dashboard");
    }).finally(() => setLoading(false));
  }, [courseId, editing, navigate]);

  const handleGenerateOutline = async () => {
    if (!form.title || !form.subject) return toast.error("Add a title and subject first");
    setGenerating(true);
    try {
      const { modules: aiModules } = await aiApi.courseOutline({ title: form.title, subject: form.subject, level: form.level });
      setModules(aiModules.map((m) => ({ ...m, resources: [], order: 0 })));
      toast.success("AI outline generated — feel free to edit it");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const updateModule = (i, field, value) => {
    setModules((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  };

  const removeModule = (i) => setModules((prev) => prev.filter((_, idx) => idx !== i));
  const addModule = () => setModules((prev) => [...prev, { title: "", description: "" }]);

  const handleThumbnailChange = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) {
      toast.error("Choose a JPEG, PNG, or WebP image");
      event.target.value = "";
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      toast.error("Course images must be 5 MB or smaller");
      event.target.value = "";
      return;
    }
    event.target.value = "";
    setThumbnailFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        discountPrice: Number(form.discountPrice),
        modules: modules.map((m, i) => ({ ...m, order: i })),
        status: courseStatus,
      };
      let requestData = payload;
      if (thumbnailFile) {
        requestData = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          requestData.append(key, value && typeof value === "object" ? JSON.stringify(value) : String(value));
        });
        requestData.append("thumbnail", thumbnailFile);
      }
      const course = editing ? await courseApi.update(courseId, requestData) : await courseApi.create(requestData);
      toast.success(editing ? "Course updated successfully!" : "Course created successfully!");
      setExistingThumbnail(course.thumbnail || "");
      setThumbnailFile(null);
      navigate(`/courses/${course.slug || course._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="section-title mb-2">{editing ? "Edit course" : "Create a new course"}</h1>
        <p className="text-slate-500 mb-8">Fill in the details below — use AI to draft your module outline instantly.</p>

        {loading ? <div className="card p-6 text-slate-500">Loading course…</div> : <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card p-6 space-y-4">
            <div>
              <label className="label">Course title</label>
              <input required className="input" placeholder="e.g. JEE Physics Mastery" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea required rows={4} className="input" placeholder="What will students learn?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Course Image / Course Thumbnail</label>
              <p className="text-xs text-slate-500 mb-3">Upload a course cover image. Recommended: landscape image with a 16:9 aspect ratio.</p>
              {thumbnailPreview && <div className="mb-3 overflow-hidden rounded-xl border border-slate-100 aspect-video max-w-xl bg-slate-50"><img src={thumbnailPreview} alt="Course thumbnail preview" className="w-full h-full object-cover" /></div>}
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-secondary cursor-pointer">
                  <span>{thumbnailFile || existingThumbnail ? "Replace image" : "Choose Image"}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleThumbnailChange} />
                </label>
                {thumbnailFile && <button type="button" onClick={() => setThumbnailFile(null)} className="btn-ghost text-sm">Remove selected image</button>}
                {!thumbnailFile && existingThumbnail && <span className="text-xs text-slate-500">Existing image will be kept if you make no selection.</span>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Stream</label>
                <select required className="input" value={form.stream} onChange={(e) => setForm({ ...form, stream: e.target.value })}>
                  <option value="">Select</option>
                  {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Subject</label>
                <input required className="input" placeholder="e.g. Physics" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Price (₹)</label>
                <input type="number" min={0} className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="label">Discount price (₹)</label>
                <input type="number" min={0} className="input" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} />
              </div>
              <div>
                <label className="label">Level</label>
                <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Duration</label>
              <input className="input" placeholder="e.g. 10 weeks" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
            </div>
            <div>
              <label className="label">Exam tags</label>
              <div className="flex flex-wrap gap-2">
                {EXAM_TAGS.map((tag) => {
                  const active = form.examTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() =>
                        setForm({
                          ...form,
                          examTags: active ? form.examTags.filter((t) => t !== tag) : [...form.examTags, tag],
                        })
                      }
                      className={`badge ${active ? "bg-brand-gradient text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Course modules</h3>
              <button type="button" onClick={handleGenerateOutline} disabled={generating} className="btn-secondary text-sm">
                <Sparkles size={15} className="text-brand-500" /> {generating ? "Generating..." : "AI-generate outline"}
              </button>
            </div>

            {modules.length === 0 ? (
              <p className="text-sm text-slate-500 mb-4">No modules yet — add manually or generate with AI.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {modules.map((m, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-100 flex gap-2 items-start">
                    <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">{i + 1}</span>
                    <div className="flex-1 space-y-2">
                      <input className="input" placeholder="Module title" value={m.title} onChange={(e) => updateModule(i, "title", e.target.value)} />
                      <input className="input" placeholder="Module description" value={m.description} onChange={(e) => updateModule(i, "description", e.target.value)} />
                    </div>
                    <button type="button" onClick={() => removeModule(i)} className="text-slate-400 hover:text-red-500 mt-1.5">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={addModule} className="btn-ghost text-sm">
              <Plus size={15} /> Add module manually
            </button>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
            {saving ? "Saving..." : editing ? "Save changes" : "Publish course"}
          </button>
        </form>}
      </div>
    </Layout>
  );
};

export default CreateCourse;
