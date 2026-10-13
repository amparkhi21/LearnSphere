import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Search, Upload, FileText, Video, Link2, Image as ImageIcon, Download, Eye, Pencil, Trash2 } from "lucide-react";
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
  const [editingResource, setEditingResource] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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
      if (editingResource) {
        await resourceApi.update(editingResource._id, fd);
        toast.success("Resource updated!");
      } else {
        await resourceApi.upload(fd);
        toast.success("Resource uploaded!");
      }
      setShowUpload(false);
      setEditingResource(null);
      setUploadForm({ title: "", description: "", type: "note", stream: "", subject: "", linkUrl: "" });
      setFile(null);
      await fetchResources();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (resource) => {
    setEditingResource(resource);
    setUploadForm({ title: resource.title || "", description: resource.description || "", type: resource.type || "note", stream: resource.stream || "", subject: resource.subject || "", linkUrl: resource.linkUrl || "" });
    setFile(null);
    setShowUpload(true);
  };

  const closeForm = () => {
    if (uploading) return;
    setShowUpload(false);
    setEditingResource(null);
    setFile(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id);
    try {
      await resourceApi.remove(deleteTarget._id);
      setResources((current) => current.filter((resource) => resource._id !== deleteTarget._id));
      toast.success("Resource deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || "Could not delete resource");
    } finally {
      setDeletingId(null);
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
          {user?.role === "teacher" && (
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
              const ownerId = typeof r.uploadedBy === "object" ? r.uploadedBy?._id : r.uploadedBy;
              const isOwner = user?.role === "teacher" && String(user?._id || user?.id) === String(ownerId);
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
                  {isOwner && <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => openEdit(r)} className="btn-ghost flex-1 justify-center text-sm"><Pencil size={14} /> Edit</button>
                    <button type="button" onClick={() => setDeleteTarget(r)} className="btn-ghost flex-1 justify-center text-sm text-red-600 hover:text-red-700"><Trash2 size={14} /> Delete</button>
                  </div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showUpload} onClose={closeForm} title={editingResource ? "Edit resource" : "Upload a resource"}>
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
              <input required type="url" className="input" placeholder="https://..." value={uploadForm.linkUrl} onChange={(e) => setUploadForm({ ...uploadForm, linkUrl: e.target.value })} />
            </div>
          ) : (
            <div>
              <label className="label">File</label>
              {editingResource?.fileUrl && <p className="text-xs text-slate-500 mb-2">Current file will be kept unless you select a replacement.</p>}
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" required={!editingResource || (!editingResource.fileUrl && uploadForm.type !== "link")} className="input" onChange={(e) => setFile(e.target.files[0] || null)} />
            </div>
          )}
          <button type="submit" disabled={uploading} className="btn-primary w-full justify-center py-2.5">
            {uploading ? (editingResource ? "Saving..." : "Uploading...") : editingResource ? "Save changes" : "Upload"}
          </button>
        </form>
      </Modal>
      <Modal open={Boolean(deleteTarget)} onClose={() => deletingId || setDeleteTarget(null)} title="Delete resource" footer={<><button type="button" disabled={Boolean(deletingId)} onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button><button type="button" disabled={Boolean(deletingId)} onClick={handleDelete} className="btn-primary bg-red-600 hover:bg-red-700">{deletingId ? "Deleting..." : "Confirm Delete"}</button></>}>
        <p className="text-sm text-slate-600">Are you sure you want to delete {deleteTarget?.title}? This action cannot be undone.</p>
      </Modal>
    </Layout>
  );
};

export default ResourceLibrary;
