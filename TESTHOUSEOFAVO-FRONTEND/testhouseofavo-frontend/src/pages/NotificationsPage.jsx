import React, { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import Layout from "../components/layout/Layout";
import EmptyState from "../components/ui/EmptyState";
import { PageLoader } from "../components/ui/Spinner";
import { notificationApi } from "../api/notification.api";

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    notificationApi
      .mine()
      .then((d) => setNotifications(d.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    await notificationApi.markAllRead();
    load();
  };

  const markRead = async (id) => {
    await notificationApi.markRead(id);
    load();
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="section-title">Notifications</h1>
          {notifications.length > 0 && (
            <button onClick={markAllRead} className="btn-ghost text-sm">
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => markRead(n._id)}
                className={`w-full text-left card p-4 flex gap-3 ${!n.isRead ? "border-brand-200 bg-brand-50/40" : ""}`}
              >
                {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />}
                <div>
                  <p className="font-medium text-slate-800 text-sm">{n.title}</p>
                  <p className="text-sm text-slate-500">{n.message}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;
