import React from 'react';

/**
 * KOMPONEN FLAT TABS
 *
 * Mengikuti arahan UI/UX user:
 * "gunakan flat tab jika dalam satu halaman terdapat tabulasi."
 *
 * Tab dengan garis bawah (border-b-2) aktif, tanpa background blok tebal / tombol pil,
 * ramping dan menyatu secara elegan dengan layout.
 */
export default function FlatTabs({
    tabs = [],
    activeTab,
    onChange,
    className = '',
}) {
    return (
        <div className={`border-b border-slate-200/90 flex items-center gap-6 overflow-x-auto ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.value || activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.value || tab.id}
                        type="button"
                        onClick={() => onChange(tab.value || tab.id)}
                        className={`group pb-3 pt-1 text-xs sm:text-sm font-semibold transition-all duration-150 inline-flex items-center gap-2 border-b-2 whitespace-nowrap select-none ${
                            isActive
                                ? 'border-[#093c30] text-[#093c30] -mb-px'
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 -mb-px'
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
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded transition-colors ${
                                    isActive
                                        ? 'bg-[#093c30]/10 text-[#093c30]'
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70'
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
