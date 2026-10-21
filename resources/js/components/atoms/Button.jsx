import React from 'react';

/**
 * Atom Button dengan border-radius minimal (rounded-md / 6px)
 */
export default function Button({
    children,
    type = 'button',
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    onClick,
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

    const variants = {
        primary: 'bg-[#093c30] hover:bg-[#062c23] text-white shadow-xs focus:ring-[#093c30]/40',
        emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs focus:ring-emerald-500/40',
        terracotta: 'bg-[#b45309] hover:bg-[#92400e] text-white shadow-xs focus:ring-[#b45309]/40',
        secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs focus:ring-slate-300',
        outline: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 focus:ring-slate-300',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 focus:ring-slate-200',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus:ring-rose-500/40',
        whatsapp: 'bg-[#10b981] hover:bg-[#059669] text-white shadow-xs focus:ring-emerald-400',
    };

    const sizes = {
        xs: 'text-xs px-2.5 py-1.5 gap-1.5',
        sm: 'text-xs px-3 py-1.5 gap-1.5',
        md: 'text-sm px-4 py-2 gap-2',
        lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
            )}
            {!loading && Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
            <span>{children}</span>
            {!loading && Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </button>
    );
}
