import React from "react";
import { Link } from "react-router-dom";
import { Home } from "lucide-react";
import Layout from "../components/layout/Layout";

const NotFound = () => (
  <Layout noFooter>
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <span className="text-7xl font-black bg-brand-gradient bg-clip-text text-transparent mb-4">404</span>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
      <p className="text-slate-500 mb-6 max-w-sm">The page you're looking for doesn't exist or may have been moved.</p>
      <Link to="/" className="btn-primary">
        <Home size={16} /> Back to home
      </Link>
    </div>
  </Layout>
);

export default NotFound;
