import React from 'react';
import { BookOpen, Users, Calendar, Award } from 'lucide-react';

export default function Dashboard() {
    const stats = [
        { label: 'Total Siswa Aktif', value: '450', sub: '90% Santri • 10% Luar', icon: Users, color: 'text-blue-600 bg-blue-50' },
        { label: 'Mata Pelajaran', value: '32', sub: 'Formal & Diniyah', icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Halaqah Tahfidz', value: '18', sub: 'Leveling Berjalan', icon: Award, color: 'text-amber-600 bg-amber-50' },
        { label: 'Pertemuan KBM Hari Ini', value: '24', sub: 'Jadwal Aktif', icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
    ];

    return (
        <div className="space-y-8 max-w-7xl">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Akademik</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Selamat datang di Sistem Manajemen Pendidikan (Tarbiyah).
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {stats.map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{item.value}</p>
                                    <p className="text-xs text-slate-400 mt-1">{item.sub}</p>
                                </div>
                                <div className={`p-3 rounded-xl ${item.color}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
