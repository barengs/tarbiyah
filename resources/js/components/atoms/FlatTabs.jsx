import React from 'react';

/**
 * KOMPONEN FLAT TABS DENGAN WARNA LATAR HASIL SAMPING
 *
 * Sesuai arahan: "warna latar belakang tab agak lebih sedikit, saat ini terlalu kontras"
 *
 * Tab aktif:
 * - Menggunakan latar belakang netral soft (bg-slate-50 / bg-slate-100/40)
 * - Dipadukan dengan teks tegas (text-slate-900) dan garis bawah brand
 * - Border-radius atas minimal (rounded-t-md)
 *
 * Tab tidak aktif:
 * - Latar belakang transparan dengan hover efek (hover:bg-slate-100/50)
 * - Teks slate-500
 */
export default function FlatTabs({
    tabs = [],
    activeTab,
    onChange,
    className = '',
}) {
    return (
        <div className={`border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.value || activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.value || tab.id}
                        type="button"
                        onClick={() => onChange(tab.value || tab.id)}
                        className={`group px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 inline-flex items-center gap-2 border-b-2 rounded-t-md select-none ${
                            isActive
                                ? 'bg-slate-50 text-slate-900 border-[#093c30] -mb-px font-bold'
                                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-50/60 -mb-px'
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
                                        ? 'bg-slate-200 text-slate-700'
                                        : 'bg-slate-100/70 text-slate-500 group-hover:bg-slate-200/60'
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
