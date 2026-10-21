import React from 'react';

/**
 * Atom Badge dengan border-radius minimal (rounded / 4px)
 */
export default function Badge({
    children,
    variant = 'slate',
    size = 'sm',
    dot = false,
    className = '',
}) {
    const variants = {
        slate: 'bg-slate-100 text-slate-700 border-slate-200',
        emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
        darkGreen: 'bg-[#093c30]/10 text-[#093c30] border-[#093c30]/20 font-semibold',
        blue: 'bg-blue-50 text-blue-700 border-blue-200/60',
        cyan: 'bg-sky-50 text-sky-700 border-sky-200/60',
        amber: 'bg-amber-50 text-amber-800 border-amber-200/60',
        terracotta: 'bg-orange-50 text-orange-800 border-orange-200/60',
        rose: 'bg-rose-50 text-rose-700 border-rose-200/60',
        purple: 'bg-purple-50 text-purple-700 border-purple-200/60',
    };

    const dotColors = {
        slate: 'bg-slate-500',
        emerald: 'bg-emerald-500',
        darkGreen: 'bg-[#093c30]',
        blue: 'bg-blue-500',
        cyan: 'bg-sky-500',
        amber: 'bg-amber-500',
        terracotta: 'bg-orange-500',
        rose: 'bg-rose-500',
        purple: 'bg-purple-500',
    };

    const sizes = {
        xs: 'text-[10px] px-1.5 py-0.5 font-medium rounded',
        sm: 'text-xs px-2 py-0.5 font-medium rounded',
        md: 'text-sm px-2.5 py-1 font-medium rounded',
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 border ${variants[variant] || variants.slate} ${sizes[size] || sizes.sm} ${className}`}
        >
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-current'}`} />}
            {children}
        </span>
    );
}
