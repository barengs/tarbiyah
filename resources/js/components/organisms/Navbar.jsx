import React from 'react';
import { Menu } from 'lucide-react';
import Breadcrumb from '../molecules/Breadcrumb';
import HijriBadge from '../molecules/HijriBadge';
import SearchBar from '../molecules/SearchBar';
import NotificationBell from '../molecules/NotificationBell';
import UserDropdown from '../molecules/UserDropdown';

export default function Navbar({
    onOpenMobileMenu,
    breadcrumbItems,
    academicMeta,
    notifications = [],
    searchValue,
    onSearchChange,
    className = '',
}) {
    return (
        <header
            className={`h-16 px-4 lg:px-8 bg-white border-b border-slate-200/90 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0 ${className}`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <button
                    type="button"
                    onClick={onOpenMobileMenu}
                    aria-label="Buka Menu"
                    className="w-8 h-8 rounded-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 lg:hidden shrink-0"
                >
                    <Menu className="w-4 h-4" />
                </button>

                <Breadcrumb items={breadcrumbItems} />
            </div>

            <div className="flex items-center gap-3 shrink-0">
                {academicMeta && (
                    <HijriBadge
                        hijri={academicMeta.hijri || '14 Syawal 1446 H'}
                        semester={academicMeta.semester || 'Genap'}
                        academicYear={academicMeta.name || '2024/2025'}
                    />
                )}

                <SearchBar value={searchValue} onChange={onSearchChange} />

                <NotificationBell items={notifications} />

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                <UserDropdown />
            </div>
        </header>
    );
}
