import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Layers,
    Building2,
    GraduationCap,
    Users,
    TrendingUp,
    UserCheck,
    Calendar,
    CalendarCheck2,
    ClipboardCheck,
    ScrollText,
    BookOpen,
    Clock,
    ShieldCheck,
    ExternalLink,
    ChevronDown,
    Settings,
    UserCog,
    LayoutGrid,
    Lock,
    Folder,
    FileText,
} from 'lucide-react';
import { useGetSidebarMenusQuery } from '../../store/slices/securityApi';

const ICON_MAP = {
    LayoutDashboard,
    Layers,
    Building2,
    GraduationCap,
    Users,
    TrendingUp,
    UserCheck,
    Calendar,
    CalendarCheck2,
    ClipboardCheck,
    ScrollText,
    BookOpen,
    Clock,
    ShieldCheck,
    ExternalLink,
    Settings,
    UserCog,
    LayoutGrid,
    Lock,
    Folder,
    FileText,
};

const DEFAULT_NAVIGATION_ITEMS = [
    {
        name: 'Dashboard Utama',
        to: '/',
        icon: LayoutDashboard,
    },
    {
        name: 'Jenjang & Kurikulum',
        icon: Building2,
        children: [
            { name: 'Jenjang Pendidikan', to: '/kurikulum/jenjang', icon: Building2 },
            { name: 'Tahun & Periode Triwulan', to: '/kurikulum/tahun-akademik', icon: Calendar },
            { name: 'Mata Pelajaran', to: '/kurikulum/mapel', icon: BookOpen },
            { name: 'Jam Pelajaran', to: '/kurikulum/jam-pelajaran', icon: Clock },
            { name: 'Guru & Pendidik', to: '/guru', icon: GraduationCap },
        ],
    },
    {
        name: 'Kelas & Rombel',
        icon: Layers,
        children: [
            { name: 'Tingkat Kelas', to: '/kurikulum/kelas', icon: Layers },
            { name: 'Rombongan Belajar (Rombel)', to: '/kurikulum/rombel', icon: Users },
        ],
    },
    {
        name: 'Santri & Kenaikan Kelas',
        icon: Users,
        children: [
            { name: 'Data Santri / Siswa', to: '/siswa', icon: UserCheck },
            { name: 'Kenaikan Kelas & Mutasi', to: '/kurikulum/kenaikan-kelas', icon: TrendingUp },
        ],
    },
    {
        name: 'Jadwal Pelajaran & Halaqah',
        to: '/kbm',
        icon: Clock,
    },
    {
        name: 'Presensi & Disiplin',
        to: '/presensi',
        icon: ClipboardCheck,
    },
    {
        name: 'Rekap Tahfizh & Nilai',
        to: '/rapor',
        icon: ScrollText,
    },
];

export default function Sidebar({
    collapsed = false,
    mobileOpen = false,
    onCloseMobile,
    className = '',
}) {
    const location = useLocation();
    const { data: sidebarRes } = useGetSidebarMenusQuery();

    // Transformasi menu dinamis dari API auth/menus
    const navigationItems = useMemo(() => {
        const rawMenus = sidebarRes?.data;
        if (!Array.isArray(rawMenus) || rawMenus.length === 0) {
            return DEFAULT_NAVIGATION_ITEMS;
        }

        return rawMenus.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const ResolvedIcon = ICON_MAP[item.icon] || LayoutDashboard;

            if (hasChildren) {
                return {
                    name: item.name,
                    icon: ResolvedIcon,
                    children: item.children.map((child) => ({
                        name: child.name,
                        to: child.path || '/',
                        icon: ICON_MAP[child.icon] || LayoutDashboard,
                    })),
                };
            }

            return {
                name: item.name,
                to: item.path || '/',
                icon: ResolvedIcon,
            };
        });
    }, [sidebarRes]);

    // Inisialisasi status terbuka menu bertingkat
    const [openMenus, setOpenMenus] = useState(() => {
        const initial = {};
        DEFAULT_NAVIGATION_ITEMS.forEach((item) => {
            if (item.children) {
                initial[item.name] = true;
            }
        });
        return initial;
    });

    // Otomatis buka grup jika rute anak sedang aktif
    useEffect(() => {
        navigationItems.forEach((item) => {
            if (item.children) {
                const isChildActive = item.children.some((c) =>
                    location.pathname === c.to ||
                    (c.to !== '/' && location.pathname.startsWith(c.to))
                );
                if (isChildActive) {
                    setOpenMenus((prev) => ({ ...prev, [item.name]: true }));
                }
            }
        });
    }, [location.pathname, navigationItems]);

    const toggleMenu = (name) => {
        setOpenMenus((prev) => ({
            ...prev,
            [name]: !prev[name],
        }));
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {mobileOpen && (
                <div
                    onClick={onCloseMobile}
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transition-all duration-200 ease-in-out ${
                    collapsed ? 'w-20' : 'w-64'
                } ${
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                } ${className}`}
            >
                {/* Header Brand */}
                <div className="h-16 flex items-center px-4 border-b border-slate-100 bg-white">
                    <Link to="/" className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#093c30] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                            P
                        </div>
                        {!collapsed && (
                            <div className="min-w-0 leading-tight">
                                <span className="text-[15px] font-bold text-[#093c30] tracking-tight block truncate">
                                    e-Panyeppen Pro
                                </span>
                                <span className="text-[11px] font-medium text-slate-500 tracking-wide block truncate">
                                    SIM Akademik
                                </span>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navigation Body */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
                    <nav className="space-y-1">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            const hasChildren = Boolean(item.children && item.children.length > 0);

                            // MENU BERTINGKAT (DROPDOWN)
                            if (hasChildren) {
                                const isOpen = Boolean(openMenus[item.name]);
                                const isAnyChildActive = item.children.some(
                                    (child) =>
                                        location.pathname === child.to ||
                                        (child.to !== '/' && location.pathname.startsWith(child.to))
                                );

                                return (
                                    <div key={item.name} className="space-y-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleMenu(item.name)}
                                            title={collapsed ? item.name : undefined}
                                            className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                                                isAnyChildActive
                                                    ? 'text-[#093c30] font-semibold bg-emerald-50/70'
                                                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                                            } ${collapsed ? 'justify-center px-2' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Icon
                                                    className={`w-4 h-4 shrink-0 transition-colors ${
                                                        isAnyChildActive
                                                            ? 'text-[#093c30]'
                                                            : 'text-slate-400'
                                                    }`}
                                                />
                                                {!collapsed && (
                                                    <span className="truncate">{item.name}</span>
                                                )}
                                            </div>
                                            {!collapsed && (
                                                <ChevronDown
                                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                                                        isOpen ? 'rotate-180 text-slate-600' : ''
                                                    }`}
                                                />
                                            )}
                                        </button>

                                        {/* Sub Menu Children */}
                                        {!collapsed && isOpen && (
                                            <div className="pl-4 ml-3 border-l-2 border-emerald-100/80 space-y-1 py-1">
                                                {item.children.map((child) => {
                                                    const ChildIcon = child.icon;
                                                    const isThisActive =
                                                        location.pathname === child.to ||
                                                        (child.to === '/kurikulum/tahun-akademik' && (location.pathname === '/kurikulum/triwulan' || location.pathname === '/master/tahun-akademik' || location.pathname === '/tahun-akademik')) ||
                                                        (child.to === '/kurikulum/jenjang' && (location.pathname === '/institusi' || location.pathname === '/master/institusi')) ||
                                                        (child.to === '/kurikulum/kelas' && (location.pathname === '/kelas' || location.pathname === '/master/kelas')) ||
                                                        (child.to === '/kurikulum/rombel' && (location.pathname === '/rombel' || location.pathname === '/master/rombel')) ||
                                                        (child.to === '/kurikulum/kenaikan-kelas' && (location.pathname === '/kenaikan-kelas' || location.pathname === '/master/kenaikan-kelas')) ||
                                                        (child.to === '/kurikulum/mapel' && (location.pathname === '/mapel' || location.pathname === '/master/mapel')) ||
                                                        (child.to === '/kurikulum/jam-pelajaran' && (location.pathname === '/jam-pelajaran' || location.pathname === '/master/jam-pelajaran')) ||
                                                        (child.to === '/admin/pengguna' && (location.pathname === '/admin/users' || location.pathname === '/admin/user'));

                                                    return (
                                                        <Link
                                                            key={child.to}
                                                            to={child.to}
                                                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                                                isThisActive
                                                                    ? 'bg-[#093c30] text-white shadow-2xs font-semibold'
                                                                    : 'text-slate-600 hover:text-[#093c30] hover:bg-slate-100/70'
                                                            }`}
                                                        >
                                                            <ChildIcon
                                                                className={`w-3.5 h-3.5 shrink-0 ${
                                                                    isThisActive ? 'text-emerald-300' : 'text-slate-400'
                                                                }`}
                                                            />
                                                            <span className="truncate">{child.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // MENU TUNGGAL
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.to === '/'}
                                    title={collapsed ? item.name : undefined}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                                            isActive
                                                ? 'bg-[#093c30] text-white shadow-2xs font-semibold'
                                                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                                        } ${collapsed ? 'justify-center px-2' : ''}`
                                    }
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon
                                                className={`w-4 h-4 shrink-0 transition-colors ${
                                                    isActive ? 'text-emerald-300' : 'text-slate-400'
                                                }`}
                                            />
                                            {!collapsed && (
                                                <span className="truncate">{item.name}</span>
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer Sidebar: Status Sinkronisasi EMIS */}
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    {!collapsed ? (
                        <div className="p-2.5 rounded-md border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-7 h-7 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">
                                        SIM EMIS 4.0
                                    </p>
                                    <p className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium leading-tight">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Tersinkronisasi
                                    </p>
                                </div>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 hover:text-[#093c30] flex items-center gap-0.5 shrink-0 px-2 py-0.5 rounded bg-slate-50 border border-slate-200">
                                Portal
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                            </span>
                        </div>
                    ) : (
                        <div className="flex justify-center" title="SIM EMIS 4.0 Tersinkronisasi">
                            <span className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-2xs">
                                <ShieldCheck className="w-4 h-4" />
                            </span>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
