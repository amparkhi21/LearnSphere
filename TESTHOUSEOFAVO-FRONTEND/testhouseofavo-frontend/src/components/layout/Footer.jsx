import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-slate-100 bg-white mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2 md:col-span-1">
        <div className="flex items-center gap-2 font-extrabold text-slate-900 mb-2">
          <span className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
            <GraduationCap size={16} />
          </span>
          LearnSphere
        </div>
        <p className="text-sm text-slate-500">AI-powered learning marketplace & exam prep platform.</p>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">Explore</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li><Link to="/courses" className="hover:text-brand-600">Courses</Link></li>
          <li><Link to="/resources" className="hover:text-brand-600">Resources</Link></li>
          <li><Link to="/community" className="hover:text-brand-600">Community</Link></li>
          <li><Link to="/quizzes" className="hover:text-brand-600">Practice Quizzes</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">Account</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li><Link to="/login" className="hover:text-brand-600">Log in</Link></li>
          <li><Link to="/register" className="hover:text-brand-600">Sign up</Link></li>
          <li><Link to="/profile" className="hover:text-brand-600">Profile</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-slate-800 mb-3">For Teachers</h4>
        <ul className="space-y-2 text-sm text-slate-500">
          <li><Link to="/register" className="hover:text-brand-600">Become an instructor</Link></li>
          <li><Link to="/teacher/dashboard" className="hover:text-brand-600">Teacher dashboard</Link></li>
        </ul>
      </div>
    </div>
    <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-400">
      © {new Date().getFullYear()} LearnSphere. Built for learners, by learners.
    </div>
  </footer>
);

export default Footer;
