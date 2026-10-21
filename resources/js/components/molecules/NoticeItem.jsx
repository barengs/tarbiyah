import React from 'react';
import Badge from '../atoms/Badge';
import { ShieldAlert, HeartPulse, Users, Trophy, FileText } from 'lucide-react';

const ICON_MAP = {
    rose: HeartPulse,
    blue: Users,
    emerald: Trophy,
    amber: FileText,
};

/**
 * Satu entri feed Maklumat & Disiplin (Biro Pengasuhan).
 */
export default function NoticeItem({ type, tag, tag_type = 'slate', title, desc, time }) {
    const Icon = ICON_MAP[tag_type] || ShieldAlert;

    const iconStyles = {
        rose: 'bg-rose-50 text-rose-600',
        blue: 'bg-sky-50 text-sky-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
    };

    return (
        <div className="flex gap-3">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${iconStyles[tag_type] || 'bg-slate-100 text-slate-500'}`}>
                <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-slate-700 leading-snug">{type}</p>
                    <Badge variant={tag_type} size="xs">{tag}</Badge>
                </div>
                <p className="text-[13px] font-bold text-slate-900 mt-1 leading-snug">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{time}</p>
            </div>
        </div>
    );
}
