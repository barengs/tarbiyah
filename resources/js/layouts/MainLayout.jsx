import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Sidebar from '../components/organisms/Sidebar';
import Navbar from '../components/organisms/Navbar';
import Footer from '../components/organisms/Footer';
import { useGetDashboardStatsQuery } from '../store/slices/dashboardApi';
import { useNavigate } from 'react-router-dom';

/**
 * LAYOUT UTAMA DYNAMIK: SIM Akademik (e-Panyeppen Pro)
 *
 * Mekanisme Pembagian Layout Dinamis:
 * 1. Sidebar dapat di-collapse (state `isCollapsed`) atau dibuka via
 *    hamburger button di layar mobile (state `mobileSidebarOpen`).
 * 2. Navbar menampilkan Breadcrumb dinamis mengikuti location.pathname,
 *    badge kalender Hijriah & data semester yang dipull langsung dari
 *    database (useGetDashboardStatsQuery dari RTK Query), SearchBar,
 *    NotificationBell, dan UserDropdown (profile & logout) dari
 *    useSelector(authSlice).
 * 3. Content area meng-render <Outlet /> (dynamic page router) dalam
 *    sebuah container scrollable dengan padding dinamis.
 * 4. Footer dapat disembunyikan per halaman via LayoutContext API
 *    (disarankan tetap tampil) sesuai mekanisme atomic design.
 *
 * Struktur responsif:
 * - Desktop: Sidebar (fixed lebar) + Main Column (Navbar + Outlet + Footer)
 * - Mobile: Sidebar tersembunyi di balik overlay, dibuka lewat tombol hamburger.
 */
export default function MainLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');

    // Get academic meta & notifications feed dari database (endpoint /api/main/dashboard/stats)
    const { data: dashboardData, isLoading: isDashboardLoading } = useGetDashboardStatsQuery(undefined, {
        skip: !user,
    });

    // Auto-close mobile sidebar saat route berubah
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

    // Prepare academic metadata for navbar (hijri badge, semester, tahun ajaran)
    const academicMeta = dashboardData?.data?.academic_year || {};

    // Prepare notifications for navbar bell dropdown from database (recent_notices)
    const notifications = (dashboardData?.data?.recent_notices || []).map((n) => ({
        id: n.id,
        title: n.type,
        desc: n.desc,
        time: n.time,
        read: false,
    }));

    // Handle search
    const handleSearchChange = (e) => {
        setSearchValue(e.target.value);
    };

    return (
        <div className="flex h-screen bg-[#f1f5f9] text-slate-800 overflow-hidden font-sans">
            {/* 1. SIDEBAR AREA */}
            <Sidebar
                collapsed={isCollapsed}
                onToggleCollapse={handleToggleCollapse}
                mobileOpen={mobileSidebarOpen}
                onCloseMobile={handleCloseMobileMenu}
            />

            {/* 2. MAIN COLUMN (Navbar + Dynamic Content + Footer) */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* NAVBAR AREA */}
                <Navbar
                    onOpenMobileMenu={handleOpenMobileMenu}
                    academicMeta={academicMeta}
                    notifications={notifications}
                    searchValue={searchValue}
                    onSearchChange={handleSearchChange}
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
