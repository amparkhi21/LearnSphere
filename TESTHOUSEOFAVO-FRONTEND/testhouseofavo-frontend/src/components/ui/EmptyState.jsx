import React from "react";

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
    {Icon && (
      <div className="w-14 h-14 rounded-2xl bg-brand-gradient-soft flex items-center justify-center mb-4">
        <Icon size={26} className="text-brand-500" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
    {description && <p className="text-sm text-slate-500 mt-1.5 max-w-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
