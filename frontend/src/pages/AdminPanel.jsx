import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Users, Ban, ShieldCheck, Search } from "lucide-react";
import Layout from "../components/layout/Layout";
import { PageLoader } from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import { userApi } from "../api/user.api";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await userApi.list(roleFilter ? { role: roleFilter } : {});
      setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleToggleBan = async (id) => {
    try {
      await userApi.toggleBan(id);
      toast.success("User status updated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="section-title">Admin Panel</h1>
            <p className="text-slate-500 mt-1">Manage all users on the platform.</p>
          </div>
          <div className="flex items-center gap-2">
            {["", "student", "teacher", "admin"].map((r) => (
              <button
                key={r || "all"}
                onClick={() => setRoleFilter(r)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize ${
                  roleFilter === r ? "bg-brand-gradient text-white" : "bg-white border border-slate-200 text-slate-600"
                }`}
              >
                {r || "All"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <PageLoader />
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Role</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t border-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800 flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center">
                        {u.name?.[0]}
                      </span>
                      {u.name}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className="badge-brand capitalize">{u.role}</span>
                    </td>
                    <td className="px-5 py-3">
                      {u.isBanned ? (
                        <span className="badge bg-red-50 text-red-600">Banned</span>
                      ) : (
                        <span className="badge-green">Active</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleToggleBan(u._id)}
                        className={`text-xs font-semibold flex items-center gap-1 ml-auto ${u.isBanned ? "text-emerald-600" : "text-red-500"}`}
                      >
                        {u.isBanned ? <ShieldCheck size={14} /> : <Ban size={14} />}
                        {u.isBanned ? "Unban" : "Ban"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPanel;
