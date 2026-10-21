import React, { useState, useRef, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export default function NotificationBell({ items = [], className = '' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unread = items.filter((i) => !i.read).length;

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-label="Notifikasi"
                className="relative w-8 h-8 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
            >
                <Bell className="w-4 h-4" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border border-white">
                        {unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-md shadow-md z-50 overflow-hidden transition-all duration-150">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                        <span className="text-sm font-bold text-slate-800">Notifikasi Terkini</span>
                        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                        {items.length === 0 && (
                            <p className="px-4 py-6 text-xs text-slate-400 text-center">Belum ada notifikasi.</p>
                        )}
                        {items.map((n) => (
                            <div
                                key={n.id}
                                className={`px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors ${
                                    n.read ? '' : 'bg-sky-50/40'
                                }`}
                            >
                                <span
                                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                                        n.read ? 'bg-slate-300' : 'bg-sky-500'
                                    }`}
                                />
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-slate-800 leading-snug">{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.desc}</p>
                                    <p className="text-[11px] text-slate-400 mt-1">{n.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
