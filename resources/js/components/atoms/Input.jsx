import React from 'react';

/**
 * Atom Input dengan border-radius minimal (rounded-md / 6px)
 */
export default function Input({
    label,
    id,
    type = 'text',
    value,
    onChange,
    placeholder,
    helperText,
    error,
    required = false,
    disabled = false,
    icon: Icon,
    trailing,
    className = '',
    inputClassName = '',
    ...props
}) {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
        <div className={className}>
            {label && (
                <label htmlFor={inputId} className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                    {label} {required && <span className="text-rose-500">*</span>}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Icon className="w-4 h-4" />
                    </div>
                )}
                <input
                    id={inputId}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    className={`block w-full rounded-md border text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 bg-white disabled:bg-slate-50 disabled:text-slate-500 ${
                        Icon ? 'pl-9' : 'pl-3'
                    } ${trailing ? 'pr-10' : 'pr-3'} py-2 focus:outline-none ${
                        error
                            ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20'
                            : 'border-slate-300 focus:border-[#093c30] focus:ring-1 focus:ring-[#093c30]/20'
                    } ${inputClassName}`}
                    {...props}
                />
                {trailing && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{trailing}</div>
                )}
            </div>
            {error ? (
                <p className="mt-1 text-xs text-rose-600 font-medium">{error}</p>
            ) : helperText ? (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            ) : null}
        </div>
    );
}
