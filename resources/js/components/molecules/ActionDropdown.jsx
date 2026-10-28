import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * ActionDropdown - Reusable Dropdown Action Menu Component
 * 
 * Digunakan untuk menyatukan berbagai tombol aksi (Tambah, Salin, Cetak, Simpan, dll)
 * ke dalam sebuah tombol dropdown yang rapi, modern, dan selaras dengan tema e-Panyeppen Pro.
 * 
 * Props:
 * - label: string (Teks tombol utama)
 * - icon: Lucide Icon Component
 * - variant: 'primary' (default emerald #093c30) | 'secondary' (slate) | 'emerald' | 'outline' | 'amber'
 * - size: 'sm' | 'md'
 * - align: 'right' | 'left'
 * - items: Array of {
 *     id: string,
 *     label: string,
 *     description?: string,
 *     icon?: Lucide Icon,
 *     iconColor?: string (Tailwind class, misal 'text-emerald-700'),
 *     badge?: string,
 *     onClick: () => void,
 *     disabled?: boolean,
 *     dividerBefore?: boolean,
 *     danger?: boolean,
 *   }
 */
export default function ActionDropdown({
    label = 'Menu Aksi',
    icon: Icon = null,
    variant = 'primary',
    size = 'md',
    align = 'right',
    items = [],
    className = '',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Tutup dropdown jika klik di luar area
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        function handleKeyDown(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Variant Style Buttons
    let btnStyle = 'bg-[#093c30] text-white hover:bg-[#064e3b] shadow-xs border border-transparent';
    if (variant === 'secondary') {
        btnStyle = 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-xs';
    } else if (variant === 'emerald') {
        btnStyle = 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs border border-transparent';
    } else if (variant === 'outline') {
        btnStyle = 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs';
    } else if (variant === 'amber') {
        btnStyle = 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs border border-transparent';
    }

    const sizeStyle = size === 'sm' 
        ? 'px-3 py-1.5 text-xs gap-1.5' 
        : 'px-3.5 py-2 text-xs font-semibold gap-2';

    return (
        <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(prev => !prev)}
                className={`inline-flex items-center justify-between rounded-md transition select-none ${sizeStyle} ${btnStyle}`}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-1.5">
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    <span>{label}</span>
                </div>
                <ChevronDown 
                    className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                    }`} 
                />
            </button>

            {isOpen && (
                <div 
                    className={`absolute mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                        align === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    {items.map((item, index) => {
                        if (!item) return null;

                        const ItemIcon = item.icon;
                        const isDanger = item.danger;

                        return (
                            <React.Fragment key={item.id || index}>
                                {item.dividerBefore && (
                                    <div className="my-1 border-t border-slate-100" />
                                )}
                                <button
                                    type="button"
                                    disabled={item.disabled}
                                    onClick={() => {
                                        setIsOpen(false);
                                        if (item.onClick) item.onClick();
                                    }}
                                    className={`w-full text-left px-3.5 py-2 text-xs flex items-start gap-2.5 transition-colors ${
                                        item.disabled 
                                            ? 'opacity-40 cursor-not-allowed'
                                            : isDanger 
                                                ? 'hover:bg-rose-50 text-rose-700' 
                                                : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                                    }`}
                                >
                                    {ItemIcon && (
                                        <ItemIcon 
                                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                                                item.iconColor || (isDanger ? 'text-rose-600' : 'text-[#093c30]')
                                            }`} 
                                        />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={`font-bold ${isDanger ? 'text-rose-700' : 'text-slate-900'}`}>
                                                {item.label}
                                            </span>
                                            {item.badge && (
                                                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </div>
                                        {item.description && (
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
