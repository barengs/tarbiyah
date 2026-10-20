import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../store/slices/authSlice';
import { 
    GraduationCap, 
    BookOpen, 
    Calendar, 
    Users, 
    Award, 
    Home, 
    Layers, 
    UserCheck,
    CheckSquare,
    LogOut,
    Printer
} from 'lucide-react';

export default function MainLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state) => state.auth);

    const handleLogout = () => {
        dispatch(logOut());
        navigate('/login');
    };

    const navigation = [
        { name: 'Dashboard', href: '/', icon: Home },
        { name: 'Institusi & Jenjang', href: '/master/institusi', icon: Layers },
        { name: 'Guru & Pendidik', href: '/master/guru', icon: UserCheck },
        { name: 'Data Kesiswaan', href: '/siswa', icon: Users },
        { name: 'Kurikulum & Mapel', href: '/master/mapel', icon: BookOpen },
        { name: 'Tahfidz (Leveling)', href: '/tahfidz', icon: Award },
        { name: 'Jadwal & Presensi', href: '/kbm', icon: Calendar },
        { name: 'Penilaian & Ujian', href: '/nilai', icon: CheckSquare },
        { name: 'Cetak Buku Rapor', href: '/rapor', icon: GraduationCap },
    ];

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
                <div className="flex-1 overflow-y-auto">
                    <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm font-bold tracking-tight">
                            TB
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 leading-tight">Tarbiyah</h1>
                            <p className="text-xs text-slate-500 font-medium">Manajemen Pendidikan</p>
                        </div>
                    </div>

                    <div className="p-4">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                            Menu Utama
                        </div>
                        <nav className="space-y-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex items-center justify-between mb-3 px-2">
                        <div className="truncate">
                            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                            <p className="text-xs text-slate-400 capitalize">{user?.role || 'Staff Akademik'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                    >
                        <LogOut className="w-4 h-4" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0">
                    <div className="text-sm text-slate-500 font-medium">
                        Sistem Pendidikan & Akademik Mandiri
                    </div>
                    <div className="flex items-center gap-3 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Tarbiyah v1.0 • Hybrid Monolith
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
