import React from 'react';

/**
 * KOMPONEN FLAT TABS DENGAN LATAR BELAKANG AKTIF
 *
 * Sesuai arahan: "berikan warna latar belakang untuk tab yang sedang aktif"
 *
 * Tab aktif:
 * - Memiliki latar belakang soft emerald/brand (bg-emerald-50)
 * - Teks tegas dan kontras (text-[#093c30] font-bold)
 * - Garis bawah penanda aktif (border-b-2 border-[#093c30] -mb-px)
 * - Border-radius atas minimal (rounded-t-md)
 *
 * Tab tidak aktif:
 * - Latar belakang transparan dengan hover efek (hover:bg-slate-100/70)
 * - Teks slate-600
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
                                ? 'bg-emerald-50 text-[#093c30] border-[#093c30] -mb-px font-bold shadow-2xs'
                                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100/70 -mb-px'
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
                                        : 'bg-slate-200/80 text-slate-600 group-hover:bg-slate-300/80'
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
