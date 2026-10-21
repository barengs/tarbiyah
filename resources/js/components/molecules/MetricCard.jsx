import React from 'react';
import { Card } from '../atoms/Card';
import Badge from '../atoms/Badge';

const ACCENTS = {
    green: { bar: 'border-l-[#093c30]', icon: 'bg-[#093c30]/10 text-[#093c30]' },
    emerald: { bar: 'border-l-emerald-500', icon: 'bg-emerald-50 text-emerald-700' },
    terracotta: { bar: 'border-l-[#b45309]', icon: 'bg-orange-50 text-[#b45309]' },
    blue: { bar: 'border-l-sky-500', icon: 'bg-sky-50 text-sky-700' },
    amber: { bar: 'border-l-amber-500', icon: 'bg-amber-50 text-amber-700' },
};

/**
 * Kartu metrik KPI pada Konsol Mudir.
 * Props: label, value, unit, icon, accent, badge {label,variant}, stats[], children
 */
export default function MetricCard({
    label,
    value,
    unit,
    icon: Icon,
    accent = 'green',
    badge,
    stats = [],
    footer,
    children,
    className = '',
}) {
    const a = ACCENTS[accent] || ACCENTS.green;

    return (
        <Card className={`border-l-4 ${a.bar} p-5 h-full flex flex-col ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        {label}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">
                            {value}
                        </span>
                        {unit && <span className="text-sm text-slate-500 font-medium">{unit}</span>}
                        {badge && (
                            <Badge variant={badge.variant || 'emerald'} size="sm" dot>
                                {badge.label}
                            </Badge>
                        )}
                    </div>
                </div>
                {Icon && (
                    <div className={`p-2.5 rounded-xl shrink-0 ${a.icon}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}
            </div>

            {stats.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                    {stats.map((s) => (
                        <span
                            key={s.label}
                            className="flex items-center gap-1.5 text-xs text-slate-600"
                        >
                            {s.dot && (
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                            )}
                            <span className="text-slate-500">{s.label}</span>
                            <span className="font-bold text-slate-800">{s.value}</span>
                        </span>
                    ))}
                </div>
            )}

            {children}
            {footer && <div className="mt-auto pt-4">{footer}</div>}
        </Card>
    );
}
