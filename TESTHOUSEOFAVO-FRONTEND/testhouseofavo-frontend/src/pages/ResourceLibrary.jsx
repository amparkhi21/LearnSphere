import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, Upload, FileText, Video, Link2, Image as ImageIcon, Download, Eye } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import Modal from "../components/ui/Modal";
import { PageLoader } from "../components/ui/Spinner";
import { resourceApi } from "../api/resource.api";
import { useAuth } from "../context/AuthContext";
import { STREAMS, RESOURCE_TYPES } from "../utils/constants";

const typeIcons = { pdf: FileText, note: FileText, video: Video, link: Link2, image: ImageIcon };

const ResourceLibrary = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ q: "", stream: "", type: "" });
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", type: "note", stream: "", subject: "", linkUrl: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => v && (params[k] = v));
      const data = await resourceApi.list(params);
      setResources(data.resources || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchResources, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const fd = new FormData();
      Object.entries(uploadForm).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);
      await resourceApi.upload(fd);
      toast.success("Resource uploaded!");
      setShowUpload(false);
      setUploadForm({ title: "", description: "", type: "note", stream: "", subject: "", linkUrl: "" });
      setFile(null);
      fetchResources();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (r) => {
    try {
      const data = await resourceApi.trackDownload(r._id);
      const url = data.fileUrl?.startsWith("http") ? data.fileUrl : `${import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "")}${data.fileUrl}`;
      window.open(data.linkUrl || url, "_blank");
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="section-title">Resource Library</h1>
            <p className="text-slate-500 mt-1">Notes, PDFs, and links shared by the community.</p>
          </div>
          {user && (
            <button onClick={() => setShowUpload(true)} className="btn-primary">
              <Upload size={16} /> Upload resource
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-11" placeholder="Search resources..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          </div>
          <select className="input sm:w-48" value={filters.stream} onChange={(e) => setFilters({ ...filters, stream: e.target.value })}>
            <option value="">All streams</option>
            {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input sm:w-40" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">All types</option>
            {RESOURCE_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
        </div>

        {loading ? (
          <PageLoader />
        ) : resources.length === 0 ? (
          <EmptyState icon={FileText} title="No resources found" description="Be the first to share something useful." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((r) => {
              const Icon = typeIcons[r.type] || FileText;
              return (
                <div key={r._id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="w-10 h-10 rounded-xl bg-brand-gradient-soft flex items-center justify-center">
                      <Icon size={18} className="text-brand-600" />
                    </span>
                    <span className="badge-brand capitalize">{r.type}</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1 line-clamp-2">{r.title}</h3>
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{r.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                    <span>{r.uploadedBy?.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5"><Eye size={12} /> {r.viewCount || 0}</span>
                      <span className="flex items-center gap-0.5"><Download size={12} /> {r.downloadCount || 0}</span>
                    </span>
                  </div>
                  <button onClick={() => handleDownload(r)} className="btn-secondary w-full justify-center text-sm py-2">
                    View / Download
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload a resource">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input required className="input" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="input" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={uploadForm.type} onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}>
                {RESOURCE_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Stream</label>
              <select className="input" value={uploadForm.stream} onChange={(e) => setUploadForm({ ...uploadForm, stream: e.target.value })}>
                <option value="">Select</option>
                {STREAMS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" placeholder="e.g. Physics" value={uploadForm.subject} onChange={(e) => setUploadForm({ ...uploadForm, subject: e.target.value })} />
          </div>
          {uploadForm.type === "link" ? (
            <div>
              <label className="label">URL</label>
              <input className="input" placeholder="https://..." value={uploadForm.linkUrl} onChange={(e) => setUploadForm({ ...uploadForm, linkUrl: e.target.value })} />
            </div>
          ) : (
            <div>
              <label className="label">File</label>
              <input type="file" className="input" onChange={(e) => setFile(e.target.files[0])} />
            </div>
          )}
          <button type="submit" disabled={uploading} className="btn-primary w-full justify-center py-2.5">
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
};

export default ResourceLibrary;
