import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/organisms/Sidebar';
import Navbar from '../components/organisms/Navbar';
import Footer from '../components/organisms/Footer';
import { useGetDashboardStatsQuery } from '../store/slices/dashboardApi';

/**
 * LAYOUT UTAMA DINAMIS: SIM Akademik (e-Panyeppen Pro)
 *
 * 1. Sidebar responsif (Desktop: static flex item w-64/w-20, Mobile: slide-in drawer dengan overlay).
 * 2. Main content flex-1 column, Navbar di atas, Outlet scrollable di tengah, Footer di bawah.
 * 3. Tidak ada overlap antara Sidebar, Navbar, dan Konten.
 */
export default function MainLayout() {
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const [isCollapsed, setIsCollapsed] = useState(() => {
        try {
            return localStorage.getItem('tarbiyah_sidebar_collapsed') === 'true';
        } catch {
            return false;
        }
    });
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
        setIsCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('tarbiyah_sidebar_collapsed', String(next));
            } catch {}
            return next;
        });
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
        <div className="flex h-screen w-full bg-[#f1f5f9] text-slate-800 overflow-hidden font-sans">
            {/* 1. SIDEBAR AREA */}
            <Sidebar
                collapsed={isCollapsed}
                mobileOpen={mobileSidebarOpen}
                onCloseMobile={handleCloseMobileMenu}
            />

            {/* 2. MAIN COLUMN (Navbar + Dynamic Content + Footer) */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
                {/* NAVBAR AREA (Dengan Toggle Sidebar di paling kiri, tanpa SearchBar) */}
                <Navbar
                    isCollapsed={isCollapsed}
                    onToggleCollapse={handleToggleCollapse}
                    onOpenMobileMenu={handleOpenMobileMenu}
                    academicMeta={academicMeta}
                    notifications={notifications}
                />

                {/* DYNAMIC CONTENT AREA */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
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
