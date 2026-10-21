import React from 'react';

function getInitials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

export default function Avatar({
    name = '',
    src,
    size = 'md',
    status,
    className = '',
}) {
    const sizes = {
        xs: 'w-6 h-6 text-[9px]',
        sm: 'w-8 h-8 text-[11px]',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    };

    const statusColors = {
        online: 'bg-emerald-500',
        offline: 'bg-slate-400',
        busy: 'bg-rose-500',
    };

    return (
        <div className={`relative shrink-0 ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={name || 'avatar'}
                    className={`${sizes[size] || sizes.md} rounded-full object-cover ring-2 ring-white shadow-sm`}
                />
            ) : (
                <div
                    className={`${sizes[size] || sizes.md} rounded-full bg-gradient-to-br from-[#0f4c3a] to-[#093c30] text-white font-semibold flex items-center justify-center ring-2 ring-white shadow-sm`}
                >
                    {getInitials(name)}
                </div>
            )}
            {status && (
                <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        statusColors[status] || statusColors.online
                    }`}
                />
            )}
        </div>
    );
}
