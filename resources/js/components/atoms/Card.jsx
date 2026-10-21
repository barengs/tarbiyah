import React from 'react';

/**
 * Atom Card dengan border-radius minimal (rounded-md / 6px)
 * elegan, presisi, dan modern tanpa sudut tajam mentah.
 */
export function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white rounded-md border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden transition-all duration-150 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

export function CardHeader({ children, className = '', ...props }) {
    return (
        <div className={`p-5 pb-3 border-b border-slate-100 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardTitle({ children, className = '', ...props }) {
    return (
        <h3 className={`text-base font-bold text-slate-900 tracking-tight ${className}`} {...props}>
            {children}
        </h3>
    );
}

export function CardDescription({ children, className = '', ...props }) {
    return (
        <p className={`text-xs text-slate-500 mt-1 leading-relaxed ${className}`} {...props}>
            {children}
        </p>
    );
}

export function CardContent({ children, className = '', ...props }) {
    return (
        <div className={`p-5 ${className}`} {...props}>
            {children}
        </div>
    );
}

export function CardFooter({ children, className = '', ...props }) {
    return (
        <div className={`p-3.5 px-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 ${className}`} {...props}>
            {children}
        </div>
    );
}

export default Card;
