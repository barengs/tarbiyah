import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Layers,
    Building2,
    GraduationCap,
    Users,
    UserCheck,
    CalendarCheck2,
    ClipboardCheck,
    ScrollText,
    BookOpen,
    Clock,
    ShieldCheck,
    ExternalLink,
    ChevronDown,
} from 'lucide-react';

const NAVIGATION_ITEMS = [
    {
        name: 'Dashboard Utama',
        to: '/',
        icon: LayoutDashboard,
    },
    {
        name: 'Kurikulum',
        icon: Layers,
        children: [
            {
                name: 'Jenjang Pendidikan',
                to: '/kurikulum/jenjang',
                icon: Building2,
            },
            {
                name: 'Kelas',
                to: '/kurikulum/kelas',
                icon: GraduationCap,
            },
            {
                name: 'Rombel',
                to: '/kurikulum/rombel',
                icon: Users,
            },
            {
                name: 'Mata Pelajaran',
                to: '/kurikulum/mapel',
                icon: BookOpen,
            },
            {
                name: 'Jam Pelajaran',
                to: '/kurikulum/jam-pelajaran',
                icon: Clock,
            },
        ],
    },
    {
        name: 'Santri & Kenaikan Kelas',
        to: '/siswa',
        icon: UserCheck,
    },
    {
        name: 'Jadwal Pelajaran & Halaqah',
        to: '/kbm',
        icon: CalendarCheck2,
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

    // Inisialisasi status terbuka menu bertingkat
    const [openMenus, setOpenMenus] = useState(() => {
        const initial = {};
        NAVIGATION_ITEMS.forEach((item) => {
            if (item.children) {
                const isChildActive = item.children.some(
                    (child) =>
                        location.pathname === child.to ||
                        location.pathname.startsWith(child.to)
                );
                if (
                    isChildActive || 
                    location.pathname.startsWith('/kurikulum') || 
                    location.pathname.startsWith('/institusi') || 
                    location.pathname.startsWith('/kelas') ||
                    location.pathname.startsWith('/rombel') ||
                    location.pathname.startsWith('/mapel') ||
                    location.pathname.startsWith('/jam-pelajaran')
                ) {
                    initial[item.name] = true;
                }
            }
        });
        return initial;
    });

    // Otomatis buka accordion jika user mengakses URL anak
    useEffect(() => {
        NAVIGATION_ITEMS.forEach((item) => {
            if (item.children) {
                const isChildActive = item.children.some(
                    (child) =>
                        location.pathname === child.to ||
                        location.pathname.startsWith(child.to)
                );
                if (
                    isChildActive || 
                    location.pathname.startsWith('/kurikulum') || 
                    location.pathname.startsWith('/institusi') || 
                    location.pathname.startsWith('/kelas') ||
                    location.pathname.startsWith('/rombel') ||
                    location.pathname.startsWith('/mapel') ||
                    location.pathname.startsWith('/jam-pelajaran')
                ) {
                    setOpenMenus((prev) => ({ ...prev, [item.name]: true }));
                }
            }
        });
    }, [location.pathname]);

    const toggleSubMenu = (menuName) => {
        setOpenMenus((prev) => ({
            ...prev,
            [menuName]: !prev[menuName],
        }));
    };

    return (
        <>
            {/* Overlay untuk mobile saat sidebar terbuka */}
            {mobileOpen && (
                <div
                    onClick={onCloseMobile}
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
                />
            )}

            <aside
                className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-white border-r border-slate-200/90 transition-all duration-200 ease-in-out shrink-0 select-none ${
                    collapsed ? 'w-20' : 'w-64'
                } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${className}`}
            >
                <div>
                    {/* Header Sidebar: Logo & Nama Aplikasi Bersih */}
                    <div className="h-16 px-4 flex items-center border-b border-slate-100">
                        <Link to="/" className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-md bg-[#093c30] text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
                                <BookOpen className="w-5 h-5 text-emerald-300" />
                            </div>
                            {!collapsed && (
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[15px] font-extrabold text-slate-900 tracking-tight leading-none">
                                            e-Panyeppen
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                                        Sistem Informasi Akademik
                                    </p>
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* Label Navigasi */}
                    <div className="px-4 pt-4 pb-2">
                        {!collapsed ? (
                            <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
                                Navigasi Akademik
                            </p>
                        ) : (
                            <div className="w-6 h-px bg-slate-200 mx-auto" />
                        )}
                    </div>

                    {/* Daftar Menu Navigasi */}
                    <nav className="px-3 space-y-1">
                        {NAVIGATION_ITEMS.map((item) => {
                            const Icon = item.icon;

                            // JIKA MENU MEMILIKI SUB MENU (ACCORDION)
                            if (item.children && item.children.length > 0) {
                                const isChildActive = item.children.some(
                                    (child) =>
                                        location.pathname === child.to ||
                                        location.pathname.startsWith(child.to) ||
                                        (child.to === '/kurikulum/jenjang' && (location.pathname === '/institusi' || location.pathname === '/master/institusi')) ||
                                        (child.to === '/kurikulum/kelas' && (location.pathname === '/kelas' || location.pathname === '/master/kelas')) ||
                                        (child.to === '/kurikulum/rombel' && (location.pathname === '/rombel' || location.pathname === '/master/rombel')) ||
                                        (child.to === '/kurikulum/mapel' && (location.pathname === '/mapel' || location.pathname === '/master/mapel')) ||
                                        (child.to === '/kurikulum/jam-pelajaran' && (location.pathname === '/jam-pelajaran' || location.pathname === '/master/jam-pelajaran'))
                                );
                                const isOpen = !!openMenus[item.name];

                                return (
                                    <div key={item.name} className="space-y-1">
                                        {/* Tombol Menu Utama */}
                                        <button
                                            type="button"
                                            onClick={() => toggleSubMenu(item.name)}
                                            title={collapsed ? item.name : undefined}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                                                isChildActive
                                                    ? 'bg-emerald-50/80 text-[#093c30] font-semibold'
                                                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                                            } ${collapsed ? 'justify-center px-2' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Icon
                                                    className={`w-4 h-4 shrink-0 transition-colors ${
                                                        isChildActive ? 'text-[#093c30]' : 'text-slate-400'
                                                    }`}
                                                />
                                                {!collapsed && (
                                                    <span className="truncate">{item.name}</span>
                                                )}
                                            </div>
                                            {!collapsed && (
                                                <ChevronDown
                                                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                                        isOpen ? 'rotate-180 text-emerald-800' : ''
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
                                                        (child.to === '/kurikulum/jenjang' && (location.pathname === '/institusi' || location.pathname === '/master/institusi')) ||
                                                        (child.to === '/kurikulum/kelas' && (location.pathname === '/kelas' || location.pathname === '/master/kelas')) ||
                                                        (child.to === '/kurikulum/rombel' && (location.pathname === '/rombel' || location.pathname === '/master/rombel')) ||
                                                        (child.to === '/kurikulum/mapel' && (location.pathname === '/mapel' || location.pathname === '/master/mapel')) ||
                                                        (child.to === '/kurikulum/jam-pelajaran' && (location.pathname === '/jam-pelajaran' || location.pathname === '/master/jam-pelajaran'));

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
