import React from 'react';

/**
 * Ikon + judul + deskripsi mini (dipakai pada AuthTemplate trust bar).
 */
export default function FeatureTrustBadge({ icon: Icon, title, subtitle, className = '' }) {
    return (
        <div className={`flex items-start gap-3 ${className}`}>
            <span className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                <Icon className="w-4 h-4 text-[#093c30]" />
            </span>
            <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-800 leading-tight">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
        </div>
    );
}
