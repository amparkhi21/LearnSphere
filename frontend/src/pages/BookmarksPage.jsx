import React, { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { bookmarkApi } from "../api/bookmark.api";

const BookmarksPage = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    bookmarkApi
      .mine()
      .then(setBookmarks)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = async (id) => {
    try {
      await bookmarkApi.remove(id);
      toast.success("Bookmark removed");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="section-title mb-8">My Bookmarks</h1>
        {bookmarks.length === 0 ? (
          <EmptyState icon={Bookmark} title="No bookmarks yet" description="Save courses, resources, or quizzes to find them here later." />
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {bookmarks.map((b) => (
              <div key={b._id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="badge-brand capitalize mb-1">{b.itemType}</span>
                  <p className="font-medium text-slate-800 truncate">{b.itemId?.title || b.itemId?.name || "Item"}</p>
                </div>
                <button onClick={() => handleRemove(b._id)} className="text-slate-400 hover:text-red-500 shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BookmarksPage;
