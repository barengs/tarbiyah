import React from 'react';
import { PanelLeftClose, PanelLeftOpen, Menu } from 'lucide-react';
import Breadcrumb from '../molecules/Breadcrumb';
import HijriBadge from '../molecules/HijriBadge';
import NotificationBell from '../molecules/NotificationBell';
import UserDropdown from '../molecules/UserDropdown';

export default function Navbar({
    isCollapsed = false,
    onToggleCollapse,
    onOpenMobileMenu,
    breadcrumbItems,
    academicMeta,
    notifications = [],
    className = '',
}) {
    return (
        <header
            className={`h-16 pl-2 sm:pl-2.5 pr-4 lg:pr-6 bg-white border-b border-slate-200/90 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0 ${className}`}
        >
            {/* SISI KIRI: ICON TOGGLE SIDEBAR (MEPET KIRI, ICON-ONLY) & BREADCRUMB */}
            <div className="flex items-center gap-1.5 min-w-0">
                {/* 1. Toggle Sidebar Desktop: Icon murni tanpa border/box tebal */}
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={isCollapsed ? 'Rentangkan Sidebar' : 'Ciutkan Sidebar'}
                    title={isCollapsed ? 'Rentangkan Sidebar' : 'Ciutkan Sidebar'}
                    className="hidden lg:flex p-1.5 rounded text-slate-500 hover:text-[#093c30] hover:bg-slate-100 transition-colors shrink-0"
                >
                    {isCollapsed ? (
                        <PanelLeftOpen className="w-5 h-5 text-emerald-800" />
                    ) : (
                        <PanelLeftClose className="w-5 h-5 text-slate-600 hover:text-[#093c30]" />
                    )}
                </button>

                {/* 2. Hamburger Mobile: Icon murni */}
                <button
                    type="button"
                    onClick={onOpenMobileMenu}
                    aria-label="Buka Menu Navigasi"
                    title="Buka Menu"
                    className="flex lg:hidden p-1.5 rounded text-slate-500 hover:text-[#093c30] hover:bg-slate-100 transition-colors shrink-0"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Divider Pemisah Halus */}
                <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" />

                {/* Breadcrumb Navigasi Dinamis */}
                <Breadcrumb items={breadcrumbItems} />
            </div>

            {/* SISI KANAN: BADGE KALENDER HIJRIAH, NOTIFIKASI, & PROFIL */}
            <div className="flex items-center gap-3 shrink-0">
                {academicMeta && (
                    <HijriBadge
                        hijri={academicMeta.hijri || '14 Syawal 1446 H'}
                        triwulan={academicMeta.triwulan_detail || academicMeta.triwulan || 'Triwulan IV (Syawal - Dzulhijjah)'}
                        academicYear={academicMeta.hijri_year || '1446/1447 H'}
                    />
                )}

                <NotificationBell items={notifications} />

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                <UserDropdown />
            </div>
        </header>
    );
}
