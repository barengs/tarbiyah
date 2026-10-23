import React from 'react';

/**
 * KOMPONEN FLAT TABS
 *
 * Aturan:
 * - Tidak ada rounded (rounded-none).
 * - Tidak ada jarak antar tab (gap-0).
 * - Tab aktif memiliki warna latar belakang yang jelas dan garis penanda aktif bawah.
 */
export default function FlatTabs({
    tabs = [],
    activeTab,
    onChange,
    className = '',
}) {
    return (
        <div className={`border-b border-slate-200 flex items-stretch gap-0 overflow-x-auto ${className}`}>
            {tabs.map((tab, idx) => {
                const tabVal = tab.value !== undefined ? tab.value : (tab.id ?? idx);
                const isActive = activeTab === tabVal || (tab.id !== undefined && activeTab === tab.id);
                const Icon = tab.icon;

                return (
                    <button
                        key={String(tabVal)}
                        type="button"
                        onClick={() => onChange(tabVal)}
                        className={`group px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 inline-flex items-center gap-2 rounded-none border-b-2 border-r border-slate-200 first:border-l select-none -mb-px cursor-pointer ${
                            isActive
                                ? 'bg-[#093c30]/[0.08] text-[#093c30] border-b-[#093c30] font-bold'
                                : 'bg-transparent text-slate-500 border-b-transparent hover:text-slate-800 hover:bg-slate-100/60'
                        }`}
                    >
                        {Icon && (
                            <Icon
                                className={`w-4 h-4 transition-colors ${
                                    isActive ? 'text-[#093c30]' : 'text-slate-400 group-hover:text-slate-600'
                                }`}
                            />
                        )}
                        <span>{tab.label || tab.name}</span>

                        {tab.count !== undefined && tab.count !== null && (
                            <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-colors ${
                                    isActive
                                        ? 'bg-[#093c30] text-white'
                                        : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
