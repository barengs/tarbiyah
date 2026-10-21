import React from 'react';

/**
 * KOMPONEN FLAT TABS
 *
 * Tab aktif:
 * - Menggunakan latar belakang soft dark-green tint (bg-[#093c30]/[0.08])
 *   yang terlihat jelas terpisah dari kanvas, tetapi tetap lembut dan tidak mencolok.
 * - Dilengkapi garis tepi halus (border-t border-x) dan aksen bawah tebal (border-b-2 border-[#093c30]).
 * - Border-radius atas minimal (rounded-t-md).
 *
 * Tab tidak aktif:
 * - Transparan dengan hover abu-abu lembut (hover:bg-slate-200/50).
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
                        className={`group px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 inline-flex items-center gap-2 rounded-t-md select-none border-b-2 ${
                            isActive
                                ? 'bg-[#093c30]/[0.08] text-[#093c30] border-t border-x border-t-[#093c30]/20 border-x-[#093c30]/20 border-b-[#093c30] -mb-px font-bold'
                                : 'bg-transparent text-slate-500 border-t border-x border-t-transparent border-x-transparent border-b-transparent hover:text-slate-800 hover:bg-slate-200/50 -mb-px'
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
