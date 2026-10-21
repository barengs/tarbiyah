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
            className={`h-16 px-4 lg:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0 ${className}`}
        >
            {/* SISI KIRI: TOMBOL TOGGLE/MINIMIZE SIDEBAR & BREADCRUMB */}
            <div className="flex items-center gap-3 min-w-0">
                {/* 1. Tombol Toggle Sidebar di Desktop */}
                <button
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label={isCollapsed ? 'Rentangkan Sidebar' : 'Ciutkan Sidebar'}
                    title={isCollapsed ? 'Rentangkan Sidebar' : 'Ciutkan Sidebar'}
                    className="hidden lg:flex w-9 h-9 rounded-md border border-slate-200/90 hover:border-slate-300 text-slate-600 hover:text-[#093c30] hover:bg-slate-50 items-center justify-center transition-colors shadow-2xs shrink-0"
                >
                    {isCollapsed ? (
                        <PanelLeftOpen className="w-4 h-4 text-emerald-800" />
                    ) : (
                        <PanelLeftClose className="w-4 h-4 text-slate-600" />
                    )}
                </button>

                {/* 2. Tombol Hamburger di Layar Mobile */}
                <button
                    type="button"
                    onClick={onOpenMobileMenu}
                    aria-label="Buka Menu Navigasi"
                    title="Buka Menu"
                    className="flex lg:hidden w-9 h-9 rounded-md border border-slate-200/90 text-slate-600 hover:bg-slate-50 items-center justify-center transition-colors shrink-0"
                >
                    <Menu className="w-4 h-4" />
                </button>

                {/* Divider Halus */}
                <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

                {/* Breadcrumb Navigasi Dinamis */}
                <Breadcrumb items={breadcrumbItems} />
            </div>

            {/* SISI KANAN: BADGE KALENDER HIJRIAH, NOTIFIKASI, & PROFIL */}
            <div className="flex items-center gap-3 shrink-0">
                {academicMeta && (
                    <HijriBadge
                        hijri={academicMeta.hijri || '14 Syawal 1446 H'}
                        semester={academicMeta.semester || 'Genap'}
                        academicYear={academicMeta.name || '2024/2025'}
                    />
                )}

                <NotificationBell items={notifications} />

                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                <UserDropdown />
            </div>
        </header>
    );
}
