import React from 'react';
import { Search, Command } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Cari menu, santri, atau data...', className = '' }) {
    return (
        <div className={`relative hidden md:block ${className}`}>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
                type="search"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="w-56 xl:w-72 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-12 py-1.5 text-[13px] text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#093c30]/40 focus:ring-1 focus:ring-[#093c30]/20 transition-all"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden xl:flex items-center gap-0.5 border border-slate-200 bg-white rounded-xs px-1 py-0.5 text-[10px] font-medium text-slate-400">
                <Command className="w-2.5 h-2.5" /> K
            </kbd>
        </div>
    );
}
