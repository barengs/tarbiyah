import React from 'react';

export default function StatusDot({ status = 'online', label, pulse = false, className = '' }) {
    const colors = {
        online: 'bg-emerald-500',
        offline: 'bg-slate-400',
        warning: 'bg-amber-500',
        danger: 'bg-rose-500',
        syncing: 'bg-sky-500',
    };

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span className="relative flex h-2 w-2">
                {pulse && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${colors[status]}`} />
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status]}`} />
            </span>
            {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
        </span>
    );
}
