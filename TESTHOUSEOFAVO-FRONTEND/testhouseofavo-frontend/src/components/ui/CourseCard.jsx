import React from "react";
import { Link } from "react-router-dom";
import { Star, Users, Clock } from "lucide-react";
import { formatCurrency } from "../../utils/constants";

const CourseCard = ({ course }) => {
  const price = course.discountPrice > 0 ? course.discountPrice : course.price;
  const hasDiscount = course.discountPrice > 0 && course.discountPrice < course.price;

  return (
    <Link to={`/courses/${course.slug || course._id}`} className="card overflow-hidden group flex flex-col">
      <div className="h-36 bg-brand-gradient-soft relative overflow-hidden flex items-center justify-center">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-black text-brand-200 select-none">{course.subject?.[0] || "C"}</span>
        )}
        <span className="absolute top-3 left-3 badge-brand bg-white/90">{course.subject}</span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-brand-600 transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-slate-500">{course.teacher?.name || "Instructor"}</p>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <Star size={13} className="text-amber-400 fill-amber-400" /> {course.ratingAverage?.toFixed(1) || "New"}
          </span>
          <span className="flex items-center gap-1">
            <Users size={13} /> {course.enrollmentCount || 0}
          </span>
          {course.duration && (
            <span className="flex items-center gap-1">
              <Clock size={13} /> {course.duration}
            </span>
          )}
        </div>
        <div className="mt-auto pt-2 flex items-center gap-2">
          {price > 0 ? (
            <>
              <span className="font-bold text-slate-900">{formatCurrency(price)}</span>
              {hasDiscount && <span className="text-xs text-slate-400 line-through">{formatCurrency(course.price)}</span>}
            </>
          ) : (
            <span className="font-bold text-emerald-600">Free</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
