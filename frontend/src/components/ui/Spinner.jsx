import React from "react";

const Spinner = ({ size = 24, className = "" }) => (
  <div
    className={`animate-spin rounded-full border-2 border-slate-200 border-t-brand-500 ${className}`}
    style={{ width: size, height: size }}
  />
);

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Spinner size={36} />
  </div>
);

export default Spinner;
