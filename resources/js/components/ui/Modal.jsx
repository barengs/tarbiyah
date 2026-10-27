import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, children, footer, maxWidth = 'max-w-lg' }) {
    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (open) window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity" onClick={onClose}></div>
            <div className="flex min-h-full items-center justify-center p-4">
                <div className={`relative w-full ${maxWidth} bg-white rounded-lg shadow-xl border border-slate-200 transform transition-all overflow-hidden`}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-base font-bold text-slate-900">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            aria-label="Tutup"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="px-6 py-5">{children}</div>
                    {footer && (
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">{footer}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
