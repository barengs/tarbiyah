import React from 'react';

export default function ProgressBar({
    value = 0,
    max = 100,
    color = 'emerald',
    height = 'h-1.5',
    className = '',
}) {
    const percent = Math.min(100, Math.max(0, (value / max) * 100));

    const colors = {
        emerald: 'bg-emerald-500',
        darkGreen: 'bg-[#093c30]',
        blue: 'bg-sky-500',
        amber: 'bg-amber-500',
        terracotta: 'bg-[#b45309]',
        rose: 'bg-rose-500',
    };

    return (
        <div className={`w-full ${height} bg-slate-100 rounded-full overflow-hidden ${className}`}>
            <div
                className={`${height} rounded-full ${colors[color] || colors.emerald} transition-all duration-700 ease-out`}
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}
