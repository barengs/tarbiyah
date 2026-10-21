import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/organisms/Sidebar';
import Navbar from '../components/organisms/Navbar';
import Footer from '../components/organisms/Footer';
import { useGetDashboardStatsQuery } from '../store/slices/dashboardApi';

/**
 * LAYOUT UTAMA DYNAMIK: SIM Akademik (e-Panyeppen Pro)
 *
 * 1. Tombol Toggle Sidebar ditempatkan di Navbar sisi paling kiri (desktop: collapse, mobile: slide-in).
 * 2. SearchBar pada navbar telah dihilangkan sesuai kebutuhan sistem.
 * 3. Header Sidebar tampil rapi dan fokus pada logo & nama sistem.
 */
export default function MainLayout() {
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Get academic meta & notifications feed dari database
    const { data: dashboardData } = useGetDashboardStatsQuery(undefined, {
        skip: !user,
    });

    // Auto-close mobile sidebar saat navigasi berpindah
    useEffect(() => {
        setMobileSidebarOpen(false);
    }, [location.pathname]);

    const handleToggleCollapse = useCallback(() => {
        setIsCollapsed((prev) => !prev);
    }, []);

    const handleOpenMobileMenu = useCallback(() => {
        setMobileSidebarOpen(true);
    }, []);

    const handleCloseMobileMenu = useCallback(() => {
        setMobileSidebarOpen(false);
    }, []);

    // Metadata akademik untuk navbar (hijri badge, semester, tahun ajaran)
    const academicMeta = dashboardData?.data?.academic_year || {};

    // Notifikasi untuk navbar bell dropdown
    const notifications = (dashboardData?.data?.recent_notices || []).map((n) => ({
        id: n.id,
        title: n.type,
        desc: n.desc,
        time: n.time,
        read: false,
    }));

    return (
        <div className="flex h-screen bg-[#f1f5f9] text-slate-800 overflow-hidden font-sans">
            {/* 1. SIDEBAR AREA */}
            <Sidebar
                collapsed={isCollapsed}
                mobileOpen={mobileSidebarOpen}
                onCloseMobile={handleCloseMobileMenu}
            />

            {/* 2. MAIN COLUMN (Navbar + Dynamic Content + Footer) */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* NAVBAR AREA (Dengan Toggle Sidebar di paling kiri, tanpa SearchBar) */}
                <Navbar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                    onOpenMobileMenu={handleOpenMobileMenu}
                    academicMeta={academicMeta}
                    notifications={notifications}
                />

                {/* DYNAMIC CONTENT AREA */}
                <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>

                {/* FOOTER AREA */}
                <Footer simple className="shrink-0 bg-white" />
            </div>
        </div>
    );
}
