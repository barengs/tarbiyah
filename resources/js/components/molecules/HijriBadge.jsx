import React from 'react';
import { CalendarDays, GraduationCap } from 'lucide-react';

export default function HijriBadge({ hijri, semester, academicYear, className = '' }) {
    return (
        <div
            className={`hidden lg:flex items-center gap-2 bg-sky-50 border border-sky-100 text-slate-700 rounded-md px-2.5 py-1 ${className}`}
        >
            <span className="flex items-center gap-1.5 text-xs font-semibold">
                <CalendarDays className="w-3.5 h-3.5 text-sky-600" />
                {hijri}
            </span>
            <span className="w-px h-3 bg-sky-200" />
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                Semester {semester}
                {academicYear ? ` ${academicYear}` : ''}
            </span>
        </div>
    );
}
