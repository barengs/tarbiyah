import React from 'react';
import Badge from '../atoms/Badge';
import { MapPin, User, Clock } from 'lucide-react';

const ACCENT_BY_CATEGORY = {
    Diniyah: { icon: 'bg-[#093c30] text-white', badge: 'terracotta' },
    Formal: { icon: 'bg-sky-600 text-white', badge: 'blue' },
    Tahfizh: { icon: 'bg-amber-500 text-white', badge: 'amber' },
    'Diniyah MTs': { icon: 'bg-orange-600 text-white', badge: 'terracotta' },
};

/**
 * Satu baris jadwal KBM / Halaqah yang sedang berlangsung.
 */
export default function ScheduleItem({ subject, category = 'Diniyah', teacher, room, time, status, remaining, studyType }) {
    const accent = ACCENT_BY_CATEGORY[category] || ACCENT_BY_CATEGORY.Diniyah;

    return (
        <div className="flex items-start gap-3 p-3.5 rounded-md border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all group">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${accent.icon}`}>
                <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900 truncate">{subject}</p>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                            <User className="w-3 h-3 shrink-0" /> {teacher}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={accent.badge} size="xs">{studyType || category}</Badge>
                        {status && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {status}
                            </span>
                        )}
                    </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {room}
                    </span>
                    <span className="text-slate-400">{time}</span>
                    {remaining && <span className="font-semibold text-amber-600">{remaining}</span>}
                </div>
            </div>
        </div>
    );
}
