import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Bell, Menu, X, LogOut, User, LayoutDashboard } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const dashboardPath =
    user?.role === "admin" ? "/admin" : user?.role === "teacher" ? "/teacher/dashboard" : "/dashboard";

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navLinks = [
    { label: "Courses", to: "/courses" },
    { label: "Resources", to: "/resources" },
    { label: "Community", to: "/community" },
    { label: "Practice", to: "/quizzes" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-extrabold text-lg text-slate-900">
          <span className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white">
            <GraduationCap size={20} />
          </span>
          LearnSphere
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          {user?.role === "student" && (
            <Link
              to="/syllabus-generator"
              className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              AI Study Plan
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 hover:border-brand-300 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center">
                  {user.name?.[0]?.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-slate-700">{user.name?.split(" ")[0]}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-elevated border border-slate-100 py-1.5 fade-in"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link to={dashboardPath} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <User size={16} /> Profile
                  </Link>
                  <Link to="/notifications" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Bell size={16} /> Notifications
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Log in
              </Link>
              <Link to="/register" className="btn-primary">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-slate-700" onClick={() => setOpen((o) => !o)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-1 fade-in">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link to={dashboardPath} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                Dashboard
              </Link>
              <button onClick={handleLogout} className="text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                Log in
              </Link>
              <Link to="/register" onClick={() => setOpen(false)} className="btn-primary mt-1 justify-center">
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
